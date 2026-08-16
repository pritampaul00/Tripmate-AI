import { Injectable, Logger } from '@nestjs/common';

import { TravelState } from '../graph/travel.state';
import { BudgetBreakdown, BudgetCategory, BudgetRecommendation } from '../models/budget.model';
import { BudgetCurrency, TravelStyle } from '../models/trip-request.model';
import { Flight } from '../models/flight.model';
import { Hotel } from '../models/hotel.model';
import { CurrencyService } from './currency.service';

export interface BudgetCandidate {
  flight: Flight | null;
  hotel: Hotel | null;

  totalUsd: number;
  fixedCostUsd: number;

  budgetUsd: number;
  remainingUsd: number;
  overBudgetUsd: number;

  fitsBudget: boolean;

  qualityScore: number;

  selectionReason:
  | 'fits-budget'
  | 'closest-to-budget';
}

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(
    BudgetService.name,
  );

  constructor(
    private readonly currencyService: CurrencyService,
  ) { }

  calculate(
    state: TravelState,
    dailyPlans: any[] = [],
  ): BudgetBreakdown {
    const currency =
      state.tripRequest?.budget?.currency ??
      'USD';

    const budget =
      state.tripRequest?.budget?.amount ??
      state.budget ??
      null;

    const budgetUsd =
      budget == null
        ? null
        : this.currencyService.convertToUsd(
          budget,
          currency,
        );

    const travelers = Math.max(
      state.travelers ?? 1,
      1,
    );

    const days = Math.max(
      state.days ?? 1,
      1,
    );

    const hotelNights =
      this.calculateHotelNights(state);

    const selectedFlight =
      state.recommendation
        ?.recommendedFlight ?? null;

    const selectedHotel =
      state.recommendation
        ?.recommendedHotel ?? null;

    const flightUsd =
      this.parsePrice(
        selectedFlight?.price,
      ) ?? 0;

    const hotelUsdPerNight =
      this.parsePrice(
        selectedHotel?.price,
      ) ?? 0;

    const hotelUsd =
      hotelUsdPerNight *
      hotelNights;

    const activitiesUsd =
      this.calculateActivityCost(
        dailyPlans,
      );

    const policy =
      this.getPolicy(
        state.travelStyle as
        | TravelStyle
        | undefined,
      );

    const foodUsd =
      policy.foodPerTravelerPerDay *
      travelers *
      days;

    const transportationUsd =
      policy.transportPerTravelerPerDay *
      travelers *
      days;

    const miscellaneousUsd =
      policy.miscellaneousPerTravelerPerDay *
      travelers *
      days;

    /*
     * All calculations are performed in USD first.
     * Currency conversion happens only for the
     * final user-facing breakdown.
     */
    const totalUsd =
      this.round(
        flightUsd +
        hotelUsd +
        foodUsd +
        transportationUsd +
        activitiesUsd +
        miscellaneousUsd,
      );

    const conversion =
      this.currencyService.convertFromUsd(
        totalUsd,
        currency,
      );

    const fixedCost =
      this.round(
        this.currencyService
          .convertFromUsd(
            flightUsd + hotelUsd,
            currency,
          ).amount,
      );

    const variableCost =
      this.round(
        this.currencyService
          .convertFromUsd(
            foodUsd +
            transportationUsd +
            activitiesUsd +
            miscellaneousUsd,
            currency,
          ).amount,
      );

    const total =
      conversion.amount;

    const remaining =
      budget == null
        ? null
        : this.round(
          budget - total,
        );

    const overBudget =
      remaining != null &&
        remaining < 0
        ? Math.abs(remaining)
        : 0;

    const utilizationPercent =
      budget != null &&
        budget > 0
        ? this.round(
          (total / budget) * 100,
        )
        : null;

    const status =
      this.determineStatus(
        budget,
        remaining,
      );

    const health =
      this.determineHealth(
        utilizationPercent,
        remaining,
      );

    const risk =
      this.determineRisk(
        utilizationPercent,
      );

    const dailyAllowance =
      budget != null &&
        remaining != null &&
        days > 0
        ? this.round(
          Math.max(
            remaining,
            0,
          ) / days,
        )
        : null;

    const categoryBreakdown: Record<
      BudgetCategory,
      number
    > = {
      flights:
        this.convert(
          flightUsd,
          currency,
        ),

      hotel:
        this.convert(
          hotelUsd,
          currency,
        ),

      food:
        this.convert(
          foodUsd,
          currency,
        ),

      transportation:
        this.convert(
          transportationUsd,
          currency,
        ),

      activities:
        this.convert(
          activitiesUsd,
          currency,
        ),

      miscellaneous:
        this.convert(
          miscellaneousUsd,
          currency,
        ),
    };

    const largestExpense =
      this.getLargestExpense(
        categoryBreakdown,
      );

    const warnings: string[] = [];

    if (!selectedFlight) {
      warnings.push(
        'Flight cost is unavailable because no flight has been selected.',
      );
    }

    if (!selectedHotel) {
      warnings.push(
        'Hotel cost is unavailable because no hotel has been selected.',
      );
    }

    if (
      currency !== 'USD' &&
      conversion.source ===
      'fallback'
    ) {
      warnings.push(
        `Using a fallback USD→${currency} planning rate. Configure TRAVORA_USD_TO_${currency} or connect a live FX provider for current conversion.`,
      );
    }

    if (
      budget != null &&
      utilizationPercent != null &&
      utilizationPercent >= 100
    ) {
      warnings.push(
        'The current recommended combination exceeds the requested budget.',
      );
    }

    const assumptions = [
      `Food estimate: $${policy.foodPerTravelerPerDay} per traveler per day.`,

      `Transport estimate: $${policy.transportPerTravelerPerDay} per traveler per day.`,

      `Miscellaneous estimate: $${policy.miscellaneousPerTravelerPerDay} per traveler per day.`,

      'Activity costs come from the generated itinerary and are treated as trip-level estimates.',

      "Flight prices are treated as the provider's returned fare total, not multiplied by traveler count.",

      `Hotel prices are treated as per-room nightly prices and multiplied by ${hotelNights} night(s).`,
    ];

    const recommendations =
      this.buildRecommendations(
        currency,
        budget,
        total,
        remaining,
        utilizationPercent,
        categoryBreakdown,
        largestExpense,
        dailyAllowance,
      );

    const breakdown: BudgetBreakdown = {
      currency,
      budget,

      flights:
        categoryBreakdown.flights,

      hotel:
        categoryBreakdown.hotel,

      food:
        categoryBreakdown.food,

      transportation:
        categoryBreakdown.transportation,

      activities:
        categoryBreakdown.activities,

      miscellaneous:
        categoryBreakdown.miscellaneous,

      total,
      remaining,

      overBudget:
        this.round(overBudget),

      utilizationPercent,

      hotelNights,

      fixedCost,
      variableCost,

      status,

      health,
      risk,

      dailyAllowance,

      largestExpense,

      recommendations,

      fxRateFromUsd:
        conversion.rateFromUsd,

      fxSource:
        conversion.source,

      assumptions,
      warnings,
    };

    this.logger.log({
      currency,
      budget,
      budgetUsd,
      hotelNights,

      fixedCost,
      variableCost,

      total,
      remaining,

      utilizationPercent,

      health,
      risk,

      largestExpense,

      status,
    });

    return breakdown;
  }

  /**
   * Find the strongest flight + hotel combination.
   *
   * Selection has two modes:
   *
   * 1. At least one combination fits the budget.
   *    Choose the highest quality affordable combination.
   *
   * 2. Nothing fits the budget.
   *    Choose the combination with the smallest overage.
   *    Quality becomes the secondary tie-breaker.
   *
   * This prevents RecommendationAgent from falling back
   * to an arbitrary best-value combination when the
   * requested budget is too restrictive.
   */
  findBestAffordableCombination(
    state: TravelState,
    flights: Flight[],
    hotels: Hotel[],
  ): BudgetCandidate | null {
    const budget =
      state.tripRequest?.budget;

    if (
      !budget ||
      flights.length === 0 ||
      hotels.length === 0
    ) {
      return null;
    }

    const budgetUsd =
      this.currencyService.convertToUsd(
        budget.amount,
        budget.currency,
      );

    const nights =
      this.calculateHotelNights(
        state,
      );

    const variableReserveUsd =
      this.estimateVariableReserveUsd(
        state,
      );

    const maxFixedUsd =
      Math.max(
        budgetUsd -
        variableReserveUsd,
        0,
      );

    let bestAffordable:
      | BudgetCandidate
      | null = null;

    let closestOverBudget:
      | BudgetCandidate
      | null = null;

    for (const flight of flights) {
      const flightUsd =
        this.parsePrice(
          flight.price,
        );

      if (flightUsd == null) {
        continue;
      }

      for (const hotel of hotels) {
        const hotelUsdPerNight =
          this.parsePrice(
            hotel.price,
          );

        if (
          hotelUsdPerNight == null
        ) {
          continue;
        }

        const hotelUsd =
          hotelUsdPerNight *
          nights;

        const fixedCostUsd =
          flightUsd +
          hotelUsd;

        const totalUsd =
          fixedCostUsd +
          variableReserveUsd;

        const fitsBudget =
          totalUsd <=
          budgetUsd;

        const remainingUsd =
          this.round(
            budgetUsd -
            totalUsd,
          );

        const overBudgetUsd =
          this.round(
            Math.max(
              totalUsd -
              budgetUsd,
              0,
            ),
          );

        const flightScore =
          this.numericScore(
            (
              flight as Flight & {
                score?: number;
              }
            ).score,
          );

        const hotelScore =
          this.numericScore(
            (
              hotel as Hotel & {
                score?: number;
              }
            ).score,
          );

        /*
         * Quality remains important.
         *
         * We intentionally do not make price
         * the dominant factor when a combination
         * already fits the user's budget.
         */
        const qualityScore =
          this.round(
            flightScore * 0.55 +
            hotelScore * 0.45,
          );

        const candidate:
          BudgetCandidate = {
          flight,
          hotel,

          totalUsd:
            this.round(
              totalUsd,
            ),

          fixedCostUsd:
            this.round(
              fixedCostUsd,
            ),

          budgetUsd:
            this.round(
              budgetUsd,
            ),

          remainingUsd,

          overBudgetUsd,

          fitsBudget,

          qualityScore,

          selectionReason:
            fitsBudget
              ? 'fits-budget'
              : 'closest-to-budget',
        };

        /*
         * AFFORDABLE MODE
         */
        if (fitsBudget) {
          if (
            !bestAffordable ||
            this.isBetterAffordableCandidate(
              candidate,
              bestAffordable,
              maxFixedUsd,
            )
          ) {
            bestAffordable =
              candidate;
          }

          continue;
        }

        /*
         * CLOSEST-TO-BUDGET MODE
         *
         * If nothing fits, we still keep
         * the strongest candidate.
         */
        if (
          !closestOverBudget ||
          this.isBetterOverBudgetCandidate(
            candidate,
            closestOverBudget,
          )
        ) {
          closestOverBudget =
            candidate;
        }
      }
    }

    /*
     * Prefer an actually affordable
     * combination whenever one exists.
     */
    if (bestAffordable) {
      this.logger.log({
        mode: 'fits-budget',
        budgetUsd,
        totalUsd:
          bestAffordable.totalUsd,
        remainingUsd:
          bestAffordable.remainingUsd,
        qualityScore:
          bestAffordable.qualityScore,
        flight:
          bestAffordable.flight
            ?.flightNumber,
        hotel:
          bestAffordable.hotel?.name,
      });

      return bestAffordable;
    }

    /*
     * Nothing fits.
     *
     * Return the closest available
     * combination instead of null.
     */
    if (closestOverBudget) {
      this.logger.warn({
        mode: 'closest-to-budget',
        budgetUsd,
        totalUsd:
          closestOverBudget.totalUsd,
        overBudgetUsd:
          closestOverBudget.overBudgetUsd,
        qualityScore:
          closestOverBudget.qualityScore,
        flight:
          closestOverBudget.flight
            ?.flightNumber,
        hotel:
          closestOverBudget.hotel?.name,
      });

      return closestOverBudget;
    }

    return null;
  }

  estimateVariableReserveUsd(
    state: TravelState,
  ): number {
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

    const policy =
      this.getPolicy(
        state.travelStyle as
        | TravelStyle
        | undefined,
      );

    return this.round(
      (
        policy.foodPerTravelerPerDay +
        policy.transportPerTravelerPerDay +
        policy.miscellaneousPerTravelerPerDay
      ) *
      travelers *
      days,
    );
  }

  private determineStatus(
    budget: number | null,
    remaining: number | null,
  ): BudgetBreakdown['status'] {
    if (
      budget == null ||
      remaining == null
    ) {
      return 'no-budget';
    }

    if (remaining < 0) {
      return 'over-budget';
    }

    if (
      remaining <=
      Math.max(
        budget * 0.05,
        1,
      )
    ) {
      return 'on-budget';
    }

    return 'under-budget';
  }

  private determineHealth(
    utilizationPercent: number | null,
    remaining: number | null,
  ): BudgetBreakdown['health'] {
    if (
      utilizationPercent == null ||
      remaining == null
    ) {
      return 'unknown';
    }

    if (remaining < 0) {
      return 'over-budget';
    }

    if (
      utilizationPercent >= 95
    ) {
      return 'risky';
    }

    if (
      utilizationPercent >= 85
    ) {
      return 'tight';
    }

    return 'comfortable';
  }

  private determineRisk(
    utilizationPercent: number | null,
  ): BudgetBreakdown['risk'] {
    if (
      utilizationPercent == null
    ) {
      return 'unknown';
    }

    if (
      utilizationPercent >= 100
    ) {
      return 'high';
    }

    if (
      utilizationPercent >= 90
    ) {
      return 'medium';
    }

    return 'low';
  }

  private getLargestExpense(
    breakdown: Record<
      BudgetCategory,
      number
    >,
  ): BudgetCategory | null {
    const entries = Object.entries(
      breakdown,
    ) as [
      BudgetCategory,
      number,
    ][];

    if (entries.length === 0) {
      return null;
    }

    return entries.reduce(
      (largest, current) =>
        current[1] > largest[1]
          ? current
          : largest,
    )[0];
  }

  private buildRecommendations(
    currency: BudgetCurrency,
    budget: number | null,
    total: number,
    remaining: number | null,
    utilizationPercent: number | null,
    breakdown: Record<
      BudgetCategory,
      number
    >,
    largestExpense:
      | BudgetCategory
      | null,
    dailyAllowance:
      | number
      | null,
  ): BudgetRecommendation[] {
    const recommendations:
      BudgetRecommendation[] = [];

    if (budget == null) {
      recommendations.push({
        type: 'info',
        message:
          'No budget was provided, so this is an estimated trip cost.',
      });

      return recommendations;
    }

    if (
      remaining != null &&
      remaining < 0
    ) {
      recommendations.push({
        type: 'warning',
        message:
          `This plan exceeds your budget by ${this.formatMoney(
            Math.abs(
              remaining,
            ),
            currency,
          )}.`,
      });
    } else if (
      utilizationPercent != null &&
      utilizationPercent >= 95
    ) {
      recommendations.push({
        type: 'warning',
        message:
          'This plan leaves very little room for unexpected expenses.',
      });
    } else if (
      utilizationPercent != null &&
      utilizationPercent >= 85
    ) {
      recommendations.push({
        type: 'info',
        message:
          `The trip fits your budget, but only ${this.formatMoney(
            remaining ?? 0,
            currency,
          )} remains as a buffer.`,
      });
    } else {
      recommendations.push({
        type: 'info',
        message:
          `The trip fits comfortably within your ${this.formatMoney(
            budget,
            currency,
          )} budget.`,
      });
    }

    if (
      largestExpense != null
    ) {
      const largestAmount =
        breakdown[
        largestExpense
        ];

      if (
        largestAmount >=
        budget * 0.45
      ) {
        recommendations.push({
          type: 'saving-opportunity',

          message:
            `${this.formatCategory(
              largestExpense,
            )} is the largest expense at ${this.formatMoney(
              largestAmount,
              currency,
            )}. Changing this category could have the biggest impact on your budget.`,
        });
      }
    }

    if (
      remaining != null &&
      remaining > 0 &&
      dailyAllowance != null
    ) {
      recommendations.push({
        type: 'info',

        message:
          `You have approximately ${this.formatMoney(
            dailyAllowance,
            currency,
          )} available per trip day from the remaining budget.`,
      });
    }

    return recommendations;
  }

  private formatCategory(
    category: BudgetCategory,
  ): string {
    const labels: Record<
      BudgetCategory,
      string
    > = {
      flights: 'Flights',
      hotel: 'Accommodation',
      food: 'Food',
      transportation:
        'Transportation',
      activities: 'Activities',
      miscellaneous:
        'Miscellaneous',
    };

    return labels[category];
  }

  private formatMoney(
    amount: number,
    currency: BudgetCurrency,
  ): string {
    return `${currency} ${this.round(
      amount,
    ).toFixed(2)}`;
  }

  /**
   * Compare two candidates that both fit
   * within the budget.
   *
   * Quality is the primary decision.
   * Spending efficiency is the secondary
   * decision.
   */
  private isBetterAffordableCandidate(
    candidate: BudgetCandidate,
    current: BudgetCandidate,
    maxFixedUsd: number,
  ): boolean {
    if (
      candidate.qualityScore !==
      current.qualityScore
    ) {
      return (
        candidate.qualityScore >
        current.qualityScore
      );
    }

    if (
      candidate.totalUsd !==
      current.totalUsd
    ) {
      return (
        candidate.totalUsd <
        current.totalUsd
      );
    }

    const candidateDistance =
      Math.abs(
        maxFixedUsd -
        candidate.fixedCostUsd,
      );

    const currentDistance =
      Math.abs(
        maxFixedUsd -
        current.fixedCostUsd,
      );

    return (
      candidateDistance <
      currentDistance
    );
  }

  /**
   * Compare two candidates when nothing
   * fits the budget.
   *
   * Overage is the primary decision.
   * Quality is the secondary decision.
   * Total price is the final tie-breaker.
   */
  private isBetterOverBudgetCandidate(
    candidate: BudgetCandidate,
    current: BudgetCandidate,
  ): boolean {
    if (
      candidate.overBudgetUsd !==
      current.overBudgetUsd
    ) {
      return (
        candidate.overBudgetUsd <
        current.overBudgetUsd
      );
    }

    if (
      candidate.qualityScore !==
      current.qualityScore
    ) {
      return (
        candidate.qualityScore >
        current.qualityScore
      );
    }

    return (
      candidate.totalUsd <
      current.totalUsd
    );
  }

  private numericScore(
    value?: number,
  ): number {
    return typeof value ===
      'number' &&
      Number.isFinite(value)
      ? value
      : 50;
  }

  private getPolicy(
    style?: TravelStyle,
  ) {
    switch (style) {
      case 'Luxury':
        return {
          foodPerTravelerPerDay: 60,
          transportPerTravelerPerDay: 18,
          miscellaneousPerTravelerPerDay: 15,
        };

      case 'Budget':
      case 'Backpacking':
        return {
          foodPerTravelerPerDay: 20,
          transportPerTravelerPerDay: 8,
          miscellaneousPerTravelerPerDay: 6,
        };

      case 'Family':
        return {
          foodPerTravelerPerDay: 28,
          transportPerTravelerPerDay: 10,
          miscellaneousPerTravelerPerDay: 8,
        };

      case 'Couple':
        return {
          foodPerTravelerPerDay: 30,
          transportPerTravelerPerDay: 10,
          miscellaneousPerTravelerPerDay: 8,
        };

      default:
        return {
          foodPerTravelerPerDay: 30,
          transportPerTravelerPerDay: 10,
          miscellaneousPerTravelerPerDay: 8,
        };
    }
  }

  private calculateHotelNights(
    state: TravelState,
  ): number {
    if (
      state.startDate &&
      state.endDate
    ) {
      const start =
        new Date(
          `${state.startDate}T00:00:00`,
        );

      const end =
        new Date(
          `${state.endDate}T00:00:00`,
        );

      return Math.max(
        Math.round(
          (end.getTime() -
            start.getTime()) /
          86400000,
        ),
        0,
      );
    }

    if (
      state.tripRequest
        ?.durationNights !=
      null
    ) {
      return Math.max(
        state.tripRequest
          .durationNights,
        0,
      );
    }

    return Math.max(
      (state.days ?? 1) - 1,
      0,
    );
  }

  private calculateActivityCost(
    dailyPlans: any[],
  ): number {
    return dailyPlans.reduce(
      (dayTotal, day) => {
        return (
          dayTotal +
          (
            day.activities ?? []
          ).reduce(
            (
              activityTotal: number,
              activity: any,
            ) => {
              const cost =
                Number(
                  activity.estimatedCost,
                ) || 0;

              return (
                activityTotal +
                Math.max(
                  cost,
                  0,
                )
              );
            },
            0,
          )
        );
      },
      0,
    );
  }

  private parsePrice(
    price?: unknown,
  ): number | null {
    if (
      typeof price === 'number'
    ) {
      return Number.isFinite(
        price,
      )
        ? price
        : null;
    }

    if (
      typeof price !== 'string'
    ) {
      return null;
    }

    if (
      /unknown|contact|unavailable|n\/a|not available/i.test(
        price,
      )
    ) {
      return null;
    }

    const match =
      price
        .replace(/,/g, '')
        .match(
          /\d+(?:\.\d+)?/,
        );

    if (!match) {
      return null;
    }

    const value =
      Number(match[0]);

    return Number.isFinite(value)
      ? value
      : null;
  }

  public convertFromUsd(
    amountUsd: number,
    currency: BudgetCurrency,
  ): number {
    return this.round(
      this.currencyService.convertFromUsd(
        amountUsd,
        currency,
      ).amount,
    );
  }

  private convert(
    amountUsd: number,
    currency: BudgetCurrency,
  ): number {
    return this.round(
      this.currencyService
        .convertFromUsd(
          amountUsd,
          currency,
        ).amount,
    );
  }

  private round(
    value: number,
  ): number {
    return (
      Math.round(
        value * 100,
      ) / 100
    );
  }
}