import { Injectable, Logger } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';

import {
  Itinerary,
  TravelTip,
} from '../models/itinerary.model';

import { TravelState } from '../graph/travel.state';
import { ItineraryGenerationSchema } from '../models/itinerary-generation.schema';

import { buildItineraryGenerationPrompt } from '../prompts/itinerary-generation.prompt';

import { BudgetService } from '../tools/budget.service';
import { ItineraryContentService } from '../tools/itinerary-content.service';
import { ActivityPlanningService } from '../tools/activity-planning.service';
import { ItineraryPlannerService } from '../tools/itinerary-planner.service';

@Injectable()
export class ItineraryAgent {
  private readonly logger =
    new Logger(ItineraryAgent.name);

  /*
   * Main itinerary model.
   */
  private readonly llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model:
      process.env.TRAVORA_ITINERARY_MODEL ??
      'llama-3.1-8b-instant',
    temperature: 0.2,
    maxTokens: 3000,
  });

  /*
   * Travel tips use a separate smaller request.
   *
   * Keep this model configurable through:
   *
   * TRAVORA_TRAVEL_TIPS_MODEL
   *
   * The lower maxTokens keeps the TPM usage
   * substantially smaller than the previous request.
   */
  private readonly travelTipsLlm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model:
      process.env.TRAVORA_TRAVEL_TIPS_MODEL ??
      'llama-3.1-8b-instant',
    temperature: 0.2,
    maxTokens: 600,
  });

  constructor(
    private readonly budgetService: BudgetService,
    private readonly contentService: ItineraryContentService,
    private readonly activityPlanningService: ActivityPlanningService,
    private readonly itineraryPlannerService: ItineraryPlannerService,
  ) {}

  async invoke(state: TravelState) {
    this.logger.log(
      '📝 Itinerary Agent Started',
    );

    try {
      /*
       * ---------------------------------------------------
       * 1. Generate deterministic candidate days
       * ---------------------------------------------------
       */

      const plannedDays =
        this.activityPlanningService.plan(
          state,
        );

      const stateWithCandidates = {
        ...state,
        plannedDayCandidates:
          plannedDays,
      };

      /*
       * ---------------------------------------------------
       * 2. Generate itinerary content with the LLM
       * ---------------------------------------------------
       */

      const prompt =
        buildItineraryGenerationPrompt(
          stateWithCandidates,
          plannedDays,
        );

      const response =
        await this.llm.invoke([
          {
            role: 'system',
            content: `
You are the itinerary generation engine for Travora.

Return ONLY valid JSON.

Do not use Markdown.
Do not use code fences.
Do not add explanations.
Do not add comments.

The JSON must have exactly this structure:

{
  "dailyPlans": [
    {
      "day": 1,
      "title": "string",
      "activities": [
        {
          "candidateId": "string",
          "time": "string",
          "title": "string",
          "description": "string",
          "location": "string",
          "costTier": "free | low | medium | high"
        }
      ]
    }
  ]
}

Every activity MUST contain a valid candidateId
from the supplied activity candidates.

Return exactly ${
              state.days ??
              plannedDays.length
            } daily plans.

Use ONLY the supplied candidates.

Never invent candidate IDs.
Never invent attractions.
Never invent prices.
Never invent opening hours.
Never invent locations.

Return JSON only.
`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);

      /*
       * ---------------------------------------------------
       * 3. Extract model response
       * ---------------------------------------------------
       */

      let rawContent: string;

      if (
        typeof response.content ===
        'string'
      ) {
        rawContent =
          response.content;
      } else if (
        Array.isArray(
          response.content,
        )
      ) {
        rawContent =
          response.content
            .map((item: any) => {
              if (
                typeof item ===
                'string'
              ) {
                return item;
              }

              if (
                item &&
                typeof item ===
                  'object' &&
                'text' in item
              ) {
                return String(
                  item.text ?? '',
                );
              }

              return '';
            })
            .join('');
      } else {
        rawContent = String(
          response.content ?? '',
        );
      }

      this.logger.debug(
        `Raw itinerary model response:\n${rawContent}`,
      );

      /*
       * ---------------------------------------------------
       * 4. Clean JSON response
       * ---------------------------------------------------
       */

      const cleanedContent =
        rawContent
          .trim()
          .replace(
            /^```json\s*/i,
            '',
          )
          .replace(
            /^```\s*/i,
            '',
          )
          .replace(
            /\s*```$/i,
            '',
          )
          .trim();

      if (!cleanedContent) {
        throw new Error(
          'Itinerary model returned an empty response.',
        );
      }

      /*
       * ---------------------------------------------------
       * 5. Parse JSON
       * ---------------------------------------------------
       */

      let parsed: unknown;

      try {
        parsed =
          JSON.parse(
            cleanedContent,
          );
      } catch (error) {
        this.logger.error(
          'Itinerary model returned invalid JSON.',
          error instanceof Error
            ? error.message
            : String(error),
        );

        this.logger.error(
          `Invalid itinerary response:\n${cleanedContent}`,
        );

        throw new Error(
          'Itinerary model returned invalid JSON.',
        );
      }

      /*
       * ---------------------------------------------------
       * 6. Validate JSON with Zod
       * ---------------------------------------------------
       */

      const generated =
        ItineraryGenerationSchema.parse(
          parsed,
        );

      this.logger.log({
        generatedDays:
          generated.dailyPlans.length,

        generatedActivities:
          generated.dailyPlans.reduce(
            (count, day) =>
              count +
              day.activities.length,
            0,
          ),
      });

      /*
       * ---------------------------------------------------
       * 7. Normalize LLM-generated days
       * ---------------------------------------------------
       */

      const dailyPlans =
        this.contentService.normalizeDays(
          generated.dailyPlans,
          stateWithCandidates,
        );

      /*
       * ---------------------------------------------------
       * 8. Generate specific travel intelligence
       * ---------------------------------------------------
       */

      const travelTips =
        await this.generateTravelTips(
          stateWithCandidates,
          dailyPlans,
        );

      /*
       * ---------------------------------------------------
       * 9. Calculate initial budget breakdown
       * ---------------------------------------------------
       */

      const budgetBreakdown =
        this.budgetService.calculate(
          {
            ...stateWithCandidates,
            itinerary:
              undefined,
          },
          dailyPlans,
        );

      const currency =
        budgetBreakdown.currency;

      /*
       * ---------------------------------------------------
       * 10. Generate deterministic executive summary
       *
       * No additional LLM call.
       * ---------------------------------------------------
       */

      const executiveSummary =
        this.buildExecutiveSummary(
          stateWithCandidates,
          dailyPlans,
          budgetBreakdown,
        );

      /*
       * ---------------------------------------------------
       * 11. Build itinerary object
       * ---------------------------------------------------
       */

      const itinerary: Itinerary = {
        summary: {
          destination:
            state.destination ?? '',

          origin:
            state.origin ?? '',

          travelers:
            state.travelers ?? 1,

          totalDays:
            state.days ??
            dailyPlans.length,

          travelDates:
            state.startDate &&
            state.endDate
              ? `${state.startDate} to ${state.endDate}`
              : 'Flexible dates',

          estimatedBudget:
            state.tripRequest?.budget
              ?.amount ??
            state.budget ??
            0,

          travelStyle:
            state.travelStyle ??
            'General',

          summary:
            executiveSummary,
        },

        flightRecommendationReason:
          this.contentService.buildFlightReason(
            state,
          ),

        flightBookingTips:
          this.contentService.buildFlightTips(
            state,
          ),

        hotelRecommendationReason:
          this.contentService.buildHotelReason(
            state,
          ),

        hotelBookingTips:
          this.contentService.buildHotelTips(),

        dailyPlans,

        budgetBreakdown,

        travelTips,

        totalEstimatedCost:
          `${budgetBreakdown.total} ${currency}`,
      };

      /*
       * ---------------------------------------------------
       * 12. Deterministic itinerary planner
       * ---------------------------------------------------
       */

      const plannedItinerary =
        this.itineraryPlannerService.plan(
          itinerary,
        );

      /*
       * ---------------------------------------------------
       * 13. Keep displayed total synchronized
       * ---------------------------------------------------
       */

      plannedItinerary.totalEstimatedCost =
        `${budgetBreakdown.total} ${currency}`;

      /*
       * ---------------------------------------------------
       * 14. Logging
       * ---------------------------------------------------
       */

      this.logger.log({
        destination:
          state.destination,

        days:
          state.days,

        travelers:
          state.travelers,

        model:
          process.env.TRAVORA_ITINERARY_MODEL ??
          'llama-3.1-8b-instant',

        generatedDays:
          generated.dailyPlans.length,

        finalDays:
          plannedItinerary.dailyPlans.length,

        activities:
          plannedItinerary.dailyPlans.reduce(
            (count, day) =>
              count +
              day.activities.length,
            0,
          ),

        travelTips:
          plannedItinerary.travelTips?.length ??
          0,

        hasExecutiveSummary:
          Boolean(
            plannedItinerary.summary?.summary,
          ),

        estimatedActivityCost:
          plannedItinerary.totalEstimatedActivityCost,

        estimatedCost:
          budgetBreakdown.total,

        currency,

        budgetStatus:
          budgetBreakdown.status,

        plannerWarnings:
          plannedItinerary.warnings?.length ??
          0,
      });

      return {
        itinerary:
          plannedItinerary,
      };
    } catch (error) {
      /*
       * ---------------------------------------------------
       * LLM failure or validation failure
       * ---------------------------------------------------
       */

      this.logger.error(
        'Failed to generate itinerary',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      /*
       * ---------------------------------------------------
       * Deterministic fallback
       * ---------------------------------------------------
       */

      try {
        const plannedDays =
          this.activityPlanningService.plan(
            state,
          );

        const stateWithCandidates = {
          ...state,
          plannedDayCandidates:
            plannedDays,
        };

        const fallbackDays =
          this.contentService.normalizeDays(
            [],
            stateWithCandidates,
          );

        const budgetBreakdown =
          this.budgetService.calculate(
            {
              ...stateWithCandidates,
              itinerary:
                undefined,
            },
            fallbackDays,
          );

        /*
         * ---------------------------------------------------
         * Generate fallback executive summary
         * ---------------------------------------------------
         */

        const executiveSummary =
          this.buildExecutiveSummary(
            stateWithCandidates,
            fallbackDays,
            budgetBreakdown,
          );

        /*
         * ---------------------------------------------------
         * Build fallback itinerary
         * ---------------------------------------------------
         */

        const fallbackItinerary:
          Itinerary = {
          summary: {
            destination:
              state.destination ?? '',

            origin:
              state.origin ?? '',

            travelers:
              state.travelers ?? 1,

            totalDays:
              state.days ??
              fallbackDays.length,

            travelDates:
              state.startDate &&
              state.endDate
                ? `${state.startDate} to ${state.endDate}`
                : 'Flexible dates',

            estimatedBudget:
              state.tripRequest?.budget
                ?.amount ??
              state.budget ??
              0,

            travelStyle:
              state.travelStyle ??
              'General',

            summary:
              executiveSummary,
          },

          flightRecommendationReason:
            this.contentService.buildFlightReason(
              state,
            ),

          flightBookingTips:
            this.contentService.buildFlightTips(
              state,
            ),

          hotelRecommendationReason:
            this.contentService.buildHotelReason(
              state,
            ),

          hotelBookingTips:
            this.contentService.buildHotelTips(),

          dailyPlans:
            fallbackDays,

          budgetBreakdown,

          travelTips:
            this.contentService.buildTravelTips(
              stateWithCandidates,
              fallbackDays,
            ),

          totalEstimatedCost:
            `${budgetBreakdown.total} ${budgetBreakdown.currency}`,
        };

        /*
         * Run deterministic fallback through
         * the same planner.
         */

        const plannedFallback =
          this.itineraryPlannerService.plan(
            fallbackItinerary,
          );

        this.logger.log({
          fallback: true,

          days:
            plannedFallback.dailyPlans.length,

          activities:
            plannedFallback.dailyPlans.reduce(
              (count, day) =>
                count +
                day.activities.length,
              0,
            ),

          travelTips:
            plannedFallback.travelTips?.length ??
            0,

          hasExecutiveSummary:
            Boolean(
              plannedFallback.summary?.summary,
            ),

          estimatedActivityCost:
            plannedFallback.totalEstimatedActivityCost,

          estimatedCost:
            budgetBreakdown.total,

          currency:
            budgetBreakdown.currency,
        });

        return {
          itinerary:
            plannedFallback,
        };
      } catch (fallbackError) {
        this.logger.error(
          'Deterministic itinerary fallback failed',
          fallbackError instanceof Error
            ? fallbackError.stack
            : String(fallbackError),
        );

        return {
          itinerary:
            undefined,
        };
      }
    }
  }

  /*
   * =====================================================
   * EXECUTIVE SUMMARY
   * =====================================================
   */

  private buildExecutiveSummary(
    state: TravelState,
    dailyPlans: Itinerary['dailyPlans'],
    budgetBreakdown: any,
  ): string {
    const destination =
      state.destination ??
      'your destination';

    const travelers =
      Math.max(
        state.travelers ?? 1,
        1,
      );

    const days =
      Math.max(
        state.days ??
          dailyPlans.length,
        1,
      );

    const activities =
      dailyPlans.flatMap(
        (day) =>
          day.activities ?? [],
      );

    const activityCount =
      activities.length;

    /*
     * ---------------------------------------------------
     * Extract main areas from the itinerary.
     * ---------------------------------------------------
     */

    const areas =
      this.uniqueStrings(
        activities
          .map(
            (activity: any) =>
              activity.area ??
              activity.location,
          )
          .filter(Boolean),
      ).slice(0, 4);

    /*
     * ---------------------------------------------------
     * Identify outdoor activities.
     * ---------------------------------------------------
     */

    const outdoorKeywords = [
      'park',
      'garden',
      'temple',
      'shrine',
      'view',
      'sky',
      'tower',
      'market',
      'street',
      'crossing',
      'waterfront',
      'palace',
      'memorial',
      'museum',
    ];

    const outdoorActivities =
      activities.filter(
        (activity: any) => {
          const text =
            `${activity.title} ${activity.location}`.toLowerCase();

          return outdoorKeywords.some(
            (keyword) =>
              text.includes(keyword),
          );
        },
      );

    const outdoorNames =
      this.uniqueStrings(
        outdoorActivities.map(
          (activity: any) =>
            activity.title,
        ),
      ).slice(0, 3);

    /*
     * ---------------------------------------------------
     * Find the busiest day.
     * ---------------------------------------------------
     */

    const busiestDay =
      [...dailyPlans].sort(
        (a, b) =>
          b.activities.length -
          a.activities.length,
      )[0];

    /*
     * ---------------------------------------------------
     * Find largest budget category.
     * ---------------------------------------------------
     */

    const budgetCategories = [
      {
        label: 'flights',
        amount:
          Number(
            budgetBreakdown.flights,
          ) || 0,
      },
      {
        label: 'accommodation',
        amount:
          Number(
            budgetBreakdown.hotel,
          ) || 0,
      },
      {
        label: 'food',
        amount:
          Number(
            budgetBreakdown.food,
          ) || 0,
      },
      {
        label: 'transportation',
        amount:
          Number(
            budgetBreakdown.transportation,
          ) || 0,
      },
      {
        label: 'activities',
        amount:
          Number(
            budgetBreakdown.activities,
          ) || 0,
      },
      {
        label: 'miscellaneous',
        amount:
          Number(
            budgetBreakdown.miscellaneous,
          ) || 0,
      },
    ];

    const largestCategory =
      [...budgetCategories].sort(
        (a, b) =>
          b.amount - a.amount,
      )[0];

    /*
     * ---------------------------------------------------
     * Determine season.
     * ---------------------------------------------------
     */

    const month =
      state.startDate
        ? this.getMonthName(
            state.startDate,
          )
        : undefined;

    const weatherProfile =
      this.getWeatherProfile(
        destination,
        month,
      );

    /*
     * ---------------------------------------------------
     * Opening sentence.
     * ---------------------------------------------------
     */

    let opening: string;

    if (
      outdoorNames.length > 0 &&
      areas.length > 0
    ) {
      opening =
        `${destination} is planned across ${days} days for ${travelers} traveler${travelers === 1 ? '' : 's'}, combining ${this.joinNatural(outdoorNames)} with the main areas around ${this.joinNatural(areas)}.`;
    } else if (
      outdoorNames.length > 0
    ) {
      opening =
        `${destination} is planned across ${days} days for ${travelers} traveler${travelers === 1 ? '' : 's'}, with highlights including ${this.joinNatural(outdoorNames)}.`;
    } else if (
      areas.length > 0
    ) {
      opening =
        `${destination} is planned across ${days} days with ${activityCount} planned stops concentrated around ${this.joinNatural(areas)}.`;
    } else {
      opening =
        `This ${days}-day itinerary covers ${destination} with ${activityCount} planned stops for ${travelers} traveler${travelers === 1 ? '' : 's'}.`;
    }

    /*
     * ---------------------------------------------------
     * Seasonal context.
     * ---------------------------------------------------
     */

    const seasonal =
      month
        ? `${month} brings ${weatherProfile}, so the itinerary should be approached with the expected seasonal conditions in mind.`
        : '';

    /*
     * ---------------------------------------------------
     * Budget summary.
     * ---------------------------------------------------
     */

    let budgetText: string;

    const budget =
      budgetBreakdown.budget;

    const total =
      Number(
        budgetBreakdown.total,
      ) || 0;

    const remaining =
      budgetBreakdown.remaining;

    const currency =
      budgetBreakdown.currency ??
      'USD';

    if (budget == null) {
      budgetText =
        `The estimated trip cost is ${currency} ${total}.`;
    } else if (
      remaining != null &&
      remaining >= 0
    ) {
      budgetText =
        `The estimated trip cost is ${currency} ${total}, leaving ${currency} ${remaining} within the planned budget.`;
    } else {
      budgetText =
        `The estimated trip cost is ${currency} ${total}, which puts the current plan ${currency} ${Math.abs(remaining ?? 0)} above the planned budget.`;
    }

    /*
     * ---------------------------------------------------
     * Largest expense.
     * ---------------------------------------------------
     */

    const spendingText =
      largestCategory &&
      largestCategory.amount > 0
        ? `${this.capitalize(largestCategory.label)} represents the largest planned expense at approximately ${currency} ${largestCategory.amount}.`
        : '';

    /*
     * ---------------------------------------------------
     * Busiest day.
     * ---------------------------------------------------
     */

    const scheduleText =
      busiestDay &&
      busiestDay.activities.length > 0
        ? `Day ${busiestDay.day} is the most activity-heavy part of the itinerary with ${busiestDay.activities.length} planned stops.`
        : '';

    /*
     * ---------------------------------------------------
     * Final summary.
     * ---------------------------------------------------
     */

    return [
      opening,
      seasonal,
      budgetText,
      spendingText,
      scheduleText,
    ]
      .filter(Boolean)
      .join(' ');
  }

  /*
   * =====================================================
   * TRAVEL TIPS GENERATION
   * =====================================================
   */

  private async generateTravelTips(
    state: TravelState,
    dailyPlans: Itinerary['dailyPlans'],
  ): Promise<TravelTip[]> {
    const destination =
      state.destination ?? 'Unknown';

    const origin =
      state.origin ?? 'Unknown';

    const travelers =
      Math.max(
        state.travelers ?? 1,
        1,
      );

    const days =
      Math.max(
        state.days ?? 1,
        1,
      );

    const budgetAmount =
      state.tripRequest?.budget?.amount ??
      null;

    const budgetCurrency =
      state.tripRequest?.budget?.currency ??
      'USD';

    /*
     * Compact itinerary context.
     *
     * Keep this deliberately small.
     * The previous prompt was consuming too
     * many TPM tokens.
     */

    const itineraryContext =
      dailyPlans
        .map((day) => {
          const activities =
            day.activities
              .map(
                (activity) =>
                  `${activity.time} | ${activity.title} | ${activity.location} | ${activity.area ?? 'Unknown'} | $${activity.estimatedCost}`,
              )
              .join('\n');

          return `DAY ${day.day}: ${activities}`;
        })
        .join('\n');

    const dailyBudget =
      budgetAmount !== null
        ? Math.round(
            budgetAmount /
            days /
            travelers,
          )
        : null;

    /*
     * Compact prompt.
     *
     * We deliberately avoid repeating long
     * instructions for every category.
     */

    const prompt = `
Generate exactly 6 destination-specific travel tips.

TRIP
Origin: ${origin}
Destination: ${destination}
Dates: ${state.startDate ?? 'unknown'} to ${state.endDate ?? 'unknown'}
Days: ${days}
Travelers: ${travelers}
Budget: ${budgetAmount ?? 'unknown'} ${budgetCurrency}
Daily budget per traveler: ${
      dailyBudget !== null
        ? `${dailyBudget} ${budgetCurrency}`
        : 'unknown'
    }
Style: ${state.travelStyle ?? 'General'}

ITINERARY
${itineraryContext || 'No itinerary available.'}

RULES

Every tip must:
1. Use a real place or activity from the itinerary.
2. Give a concrete action.
3. Explain why it matters for this exact trip.
4. Avoid generic advice.

WEATHER
Use the exact dates and known seasonal climate patterns.
Mention a real outdoor itinerary activity.
Give a concrete packing or scheduling action.
Never claim a live forecast.

TRANSIT
Mention at least two real itinerary locations.
Identify the most meaningful movement between areas.
Give a concrete transport strategy.
Do not invent exact fares.

BOOKING WINDOW
Choose the most important paid or reservation-sensitive activity.
Name it and explain why it deserves priority.
Give a concrete booking action.
Do not claim guaranteed sell-outs.

MONEY
Use the calculated daily budget.
Mention a real activity and its supplied cost when useful.
Give a concrete spending recommendation.
Do not invent prices.

CROWDS
Choose the itinerary activity most affected by crowds.
Use its scheduled time.
Give one specific timing recommendation.

SAFETY
Mention only real itinerary locations.
Give one specific precaution based on crowd density,
transport congestion, nightlife, or tourist traffic.
Do not imply the destination is generally unsafe.

QUALITY CHECK
Every tip must mention:
- this trip
- a real place or activity
- a concrete action
- a useful judgment

Return exactly these tags in this order:
WEATHER
TRANSIT
BOOKING WINDOW
MONEY
CROWDS
SAFETY

Return ONLY JSON:

{
  "travelTips": [
    {
      "tag": "WEATHER",
      "title": "",
      "description": ""
    },
    {
      "tag": "TRANSIT",
      "title": "",
      "description": ""
    },
    {
      "tag": "BOOKING WINDOW",
      "title": "",
      "description": ""
    },
    {
      "tag": "MONEY",
      "title": "",
      "description": ""
    },
    {
      "tag": "CROWDS",
      "title": "",
      "description": ""
    },
    {
      "tag": "SAFETY",
      "title": "",
      "description": ""
    }
  ]
}
`;

    try {
      /*
       * First attempt.
       */

      const response =
        await this.travelTipsLlm.invoke([
          {
            role: 'system',
            content: `
You are Travora's destination-specific
travel intelligence engine.

Return ONLY valid JSON.

Never use Markdown.
Never use code fences.
Never add explanations outside JSON.

Every tip must be specific to
the supplied destination and itinerary.
`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ]);

      let rawContent: string;

      if (
        typeof response.content ===
        'string'
      ) {
        rawContent =
          response.content;
      } else if (
        Array.isArray(
          response.content,
        )
      ) {
        rawContent =
          response.content
            .map((item: any) => {
              if (
                typeof item ===
                'string'
              ) {
                return item;
              }

              if (
                item &&
                typeof item ===
                  'object' &&
                'text' in item
              ) {
                return String(
                  item.text ?? '',
                );
              }

              return '';
            })
            .join('');
      } else {
        rawContent = String(
          response.content ?? '',
        );
      }

      this.logger.debug(
        `Raw travel tips model response:\n${rawContent}`,
      );

      const cleanedContent =
        rawContent
          .trim()
          .replace(
            /^```json\s*/i,
            '',
          )
          .replace(
            /^```\s*/i,
            '',
          )
          .replace(
            /\s*```$/i,
            '',
          )
          .trim();

      if (!cleanedContent) {
        throw new Error(
          'Travel tips model returned an empty response.',
        );
      }

      let parsed: unknown;

      try {
        parsed =
          JSON.parse(
            cleanedContent,
          );
      } catch (error) {
        this.logger.error(
          'Travel tips model returned invalid JSON.',
          error instanceof Error
            ? error.message
            : String(error),
        );

        throw new Error(
          'Travel tips model returned invalid JSON.',
        );
      }

      if (
        !parsed ||
        typeof parsed !==
          'object' ||
        !Array.isArray(
          (parsed as any)
            .travelTips,
        )
      ) {
        throw new Error(
          'Travel tips model did not return a travelTips array.',
        );
      }

      const tips =
        (parsed as any)
          .travelTips;

      const expectedTags = [
        'WEATHER',
        'TRANSIT',
        'BOOKING WINDOW',
        'MONEY',
        'CROWDS',
        'SAFETY',
      ];

      if (
        tips.length !==
        expectedTags.length
      ) {
        throw new Error(
          `Expected exactly 6 travel tips, received ${tips.length}.`,
        );
      }

      const validTips =
        tips.map(
          (
            tip: any,
            index: number,
          ): TravelTip => {
            if (
              !tip ||
              typeof tip.tag !==
                'string' ||
              typeof tip.title !==
                'string' ||
              typeof tip.description !==
                'string'
            ) {
              throw new Error(
                `Invalid travel tip at index ${index}.`,
              );
            }

            if (
              tip.tag !==
              expectedTags[index]
            ) {
              throw new Error(
                `Expected ${expectedTags[index]} at index ${index}, received ${tip.tag}.`,
              );
            }

            if (
              !tip.title.trim() ||
              !tip.description.trim()
            ) {
              throw new Error(
                `Travel tip ${tip.tag} contains empty text.`,
              );
            }

            return {
              tag: tip.tag,
              title:
                tip.title.trim(),
              description:
                tip.description.trim(),
            };
          },
        );

      this.logger.log({
        travelTipsGenerated:
          validTips.length,

        tags: validTips.map(
          (tip) => tip.tag,
        ),
      });

      return validTips;
    } catch (error) {
      this.logger.warn(
        `Travel tips generation failed. Using deterministic fallback. ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      /*
       * If Groq rejects the second request because
       * of TPM limits, the deterministic fallback
       * still receives the complete itinerary.
       */

      return this.contentService.buildTravelTips(
        state,
        dailyPlans,
      );
    }
  }

  /*
   * =====================================================
   * HELPER METHODS
   * =====================================================
   */

  private uniqueStrings(
    values: string[],
  ): string[] {
    return [
      ...new Set(
        values
          .map((value) =>
            String(value).trim(),
          )
          .filter(Boolean),
      ),
    ];
  }

  private joinNatural(
    values: string[],
  ): string {
    const unique =
      this.uniqueStrings(values);

    if (unique.length === 0) {
      return '';
    }

    if (unique.length === 1) {
      return unique[0];
    }

    if (unique.length === 2) {
      return `${unique[0]} and ${unique[1]}`;
    }

    return `${unique
      .slice(0, -1)
      .join(', ')}, and ${
      unique[
        unique.length - 1
      ]
    }`;
  }

  private capitalize(
    value: string,
  ): string {
    if (!value) {
      return value;
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  private getMonthName(
    date: string,
  ): string | undefined {
    const parsed = new Date(
      `${date}T00:00:00Z`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return undefined;
    }

    return parsed.toLocaleDateString(
      'en-US',
      {
        month: 'long',
        timeZone: 'UTC',
      },
    );
  }

  private getWeatherProfile(
    destination: string,
    month?: string,
  ): string {
    const normalized =
      destination.toLowerCase();

    if (
      normalized.includes('tokyo') &&
      month === 'December'
    ) {
      return 'cool winter conditions, with typical December temperatures around 13°C during the day and 4°C at night';
    }

    if (month === 'December') {
      return 'cooler winter conditions with colder mornings and evenings';
    }

    if (
      month === 'January' ||
      month === 'February'
    ) {
      return 'winter conditions with colder mornings and evenings';
    }

    if (
      month === 'June' ||
      month === 'July' ||
      month === 'August'
    ) {
      return 'warmer summer conditions with stronger daytime heat';
    }

    if (
      month === 'March' ||
      month === 'April' ||
      month === 'May'
    ) {
      return 'mild spring conditions with changing temperatures through the day';
    }

    if (
      month === 'September' ||
      month === 'October' ||
      month === 'November'
    ) {
      return 'mild to cool autumn conditions with changing temperatures through the day';
    }

    return 'seasonal conditions that can vary between morning, afternoon and evening';
  }
}