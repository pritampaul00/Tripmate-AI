import { Injectable } from '@nestjs/common';

import { Activity, DailyPlan, TravelTip } from '../models/itinerary.model';

import { TravelState } from '../graph/travel.state';

import { ItineraryCostService, ActivityCostTier } from './itinerary-cost.service';

import { ActivityCandidate } from '../models/activity-planning.model';

interface GeneratedActivity {
  time: string;
  title: string;
  description: string;
  location: string;
  candidateId?: string;
  costTier: ActivityCostTier;
}

interface GeneratedDay {
  day: number;
  title: string;
  activities: GeneratedActivity[];
}

@Injectable()
export class ItineraryContentService {
  constructor(
    private readonly costService: ItineraryCostService,
  ) { }

  normalizeDays(
    days: GeneratedDay[],
    state: TravelState,
  ): DailyPlan[] {
    const expected = Math.max(state.days ?? 1, 1);
    const travelers = Math.max(state.travelers ?? 1, 1);

    const candidateMap = new Map<string, ActivityCandidate>();

    for (const day of state.plannedDayCandidates ?? []) {
      for (const candidate of day.activities) {
        candidateMap.set(candidate.id, candidate);
      }
    }

    const candidateDayIds = new Map<number, Set<string>>();

    for (const day of state.plannedDayCandidates ?? []) {
      candidateDayIds.set(
        day.day,
        new Set(
          day.activities.map(
            (activity) => activity.id,
          ),
        ),
      );
    }

    const normalized = Array.from(
      { length: expected },
      (_, index) => {
        const dayNumber = index + 1;

        const source =
          days.find(
            (day) => day.day === dayNumber,
          ) ?? days[index];

        const seen = new Set<string>();

        const allowedIds =
          candidateDayIds.get(dayNumber);

        const activities = (
          source?.activities ?? []
        )
          .filter(
            (activity) =>
              candidateMap.size === 0 ||
              Boolean(
                activity.candidateId &&
                candidateMap.has(
                  activity.candidateId,
                ),
              ),
          )
          .filter(
            (activity) =>
              candidateMap.size === 0 ||
              Boolean(
                activity.candidateId &&
                allowedIds?.has(
                  activity.candidateId,
                ),
              ),
          )
          .filter(
            (activity) =>
              this.isSpecificActivity(activity),
          )
          .filter((activity) => {
            const candidate =
              activity.candidateId
                ? candidateMap.get(
                  activity.candidateId,
                )
                : undefined;

            const key =
              candidate?.id ??
              `${activity.title.toLowerCase()}|${activity.location.toLowerCase()}`;

            if (seen.has(key)) {
              return false;
            }

            seen.add(key);
            return true;
          })
          .sort(
            (a, b) =>
              this.timeToMinutes(a.time) -
              this.timeToMinutes(b.time),
          )
          .slice(0, 8)
          .map(
            (activity): Activity => {
              const candidate =
                activity.candidateId
                  ? candidateMap.get(
                    activity.candidateId,
                  )
                  : undefined;

              return {
                id: candidate?.id,
                time: activity.time,
                title:
                  candidate?.title ??
                  activity.title,
                description:
                  activity.description ||
                  candidate?.description ||
                  '',
                location:
                  candidate?.location ??
                  activity.location,
                area: candidate?.area,
                latitude:
                  candidate?.latitude,
                longitude:
                  candidate?.longitude,
                durationMinutes:
                  candidate?.durationMinutes,
                category:
                  candidate?.category,
                estimatedCost:
                  this.costService.estimateUsd(
                    candidate?.costTier ??
                    activity.costTier,
                    travelers,
                  ),
              };
            },
          );

        return {
          day: dayNumber,
          title:
            source?.title?.trim() ||
            `Day ${dayNumber}`,
          subtotal: activities.reduce(
            (sum, activity) =>
              sum + activity.estimatedCost,
            0,
          ),
          activities,
        };
      },
    );

    if (candidateMap.size > 0) {
      const fallback =
        this.buildCandidateFallback(
          state,
          travelers,
          expected,
        );

      return normalized.map(
        (day, index) => {
          if (day.activities.length > 0) {
            return day;
          }

          return fallback[index];
        },
      );
    }

    return normalized;
  }

  private buildCandidateFallback(
    state: TravelState,
    travelers: number,
    expected: number,
  ): DailyPlan[] {
    return Array.from(
      { length: expected },
      (_, index) => {
        const planned =
          state.plannedDayCandidates?.find(
            (day) =>
              day.day === index + 1,
          );

        const activities =
          (planned?.activities ?? [])
            .slice(0, 6)
            .map(
              (
                candidate,
                activityIndex,
              ): Activity => ({
                id: candidate.id,
                time: this.defaultTime(
                  activityIndex,
                ),
                title: candidate.title,
                description:
                  candidate.description,
                location:
                  candidate.location,
                area: candidate.area,
                latitude:
                  candidate.latitude,
                longitude:
                  candidate.longitude,
                durationMinutes:
                  candidate.durationMinutes,
                category:
                  candidate.category,
                estimatedCost:
                  this.costService.estimateUsd(
                    candidate.costTier,
                    travelers,
                  ),
              }),
            );

        return {
          day: index + 1,
          title:
            planned?.title ||
            `Day ${index + 1}`,
          subtotal: activities.reduce(
            (sum, activity) =>
              sum + activity.estimatedCost,
            0,
          ),
          activities,
        };
      },
    );
  }

  private defaultTime(
    index: number,
  ): string {
    return (
      [
        '09:00',
        '11:30',
        '14:00',
        '16:30',
        '19:00',
        '20:30',
      ][index] ?? '09:00'
    );
  }

  private isSpecificActivity(
    activity: GeneratedActivity,
  ): boolean {
    const text =
      `${activity.title} ${activity.description}`.toLowerCase();

    const generic = [
      'explore the city',
      'explore the area',
      'walk around the city',
      'enjoy the local culture',
      'visit a restaurant',
      'have lunch',
      'have dinner',
      'evening stroll',
      'free time',
      'relax',
    ];

    return Boolean(
      activity.time?.trim() &&
      activity.title?.trim() &&
      activity.description?.trim() &&
      activity.location?.trim() &&
      !generic.some((phrase) =>
        text.includes(phrase),
      ),
    );
  }

  private timeToMinutes(
    value: string,
  ): number {
    const match = value.match(
      /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i,
    );

    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    let hours = Number(match[1]);
    const minutes = Number(
      match[2] ?? 0,
    );

    const period =
      match[3]?.toUpperCase();

    if (
      period === 'PM' &&
      hours < 12
    ) {
      hours += 12;
    }

    if (
      period === 'AM' &&
      hours === 12
    ) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  buildFlightReason(
    state: TravelState,
  ): string {
    const flight =
      state.recommendation?.recommendedFlight;

    if (!flight) {
      return 'No flight was selected yet.';
    }

    const flights =
      state.flights ?? [];

    if (flights.length <= 1) {
      return `${flight.airline} ${flight.flightNumber} was selected as the best available fit for this trip.`;
    }

    const parsePrice = (
      price?: string,
    ): number => {
      if (!price) {
        return Infinity;
      }

      const match =
        price.match(/[\d,.]+/);

      if (!match) {
        return Infinity;
      }

      const value = Number(
        match[0].replace(/,/g, ''),
      );

      return Number.isFinite(value)
        ? value
        : Infinity;
    };

    const formatDuration = (
      minutes?: number,
    ): string | null => {
      if (
        typeof minutes !== 'number' ||
        Number.isNaN(minutes)
      ) {
        return null;
      }

      const hours =
        Math.floor(minutes / 60);

      const mins =
        minutes % 60;

      if (hours === 0) {
        return `${mins}m`;
      }

      if (mins === 0) {
        return `${hours}h`;
      }

      return `${hours}h ${mins}m`;
    };

    const recommendedPrice =
      parsePrice(flight.price);

    const recommendedDuration =
      typeof flight.duration === 'number'
        ? flight.duration
        : null;

    const recommendedStops =
      flight.stops ?? 0;

    const alternatives =
      flights
        .filter(
          (candidate) =>
            candidate.flightNumber !==
            flight.flightNumber,
        );

    const cheaperAlternatives =
      alternatives
        .filter(
          (candidate) =>
            parsePrice(candidate.price) <
            recommendedPrice,
        )
        .sort(
          (a, b) =>
            parsePrice(a.price) -
            parsePrice(b.price),
        );

    const cheapest =
      cheaperAlternatives[0];

    /*
     * Start with the actual comparison set.
     */
    const comparisonCount =
      flights.length;

    /*
     * ---------------------------------------------------
     * Case 1: Recommended flight is the cheapest
     * ---------------------------------------------------
     */

    if (!cheapest) {
      const durationText =
        formatDuration(
          recommendedDuration ?? undefined,
        );

      const stopText =
        recommendedStops === 0
          ? 'a direct journey'
          : `${recommendedStops} stop${recommendedStops === 1
            ? ''
            : 's'
          }`;

      let reason =
        `${flight.airline} ${flight.flightNumber} is the strongest option among ${comparisonCount} flights compared for your dates. At ${flight.price}, it is also the lowest-priced option in the comparison set`;

      if (durationText) {
        reason += `, with a ${durationText} journey`;
      }

      reason += ` and ${stopText}.`;

      return reason;
    }

    /*
     * ---------------------------------------------------
     * Cheapest alternative
     * ---------------------------------------------------
     */

    const cheapestPrice =
      parsePrice(cheapest.price);

    const premium =
      recommendedPrice -
      cheapestPrice;

    /*
     * ---------------------------------------------------
     * Compare travel time
     * ---------------------------------------------------
     */

    let timeDifference: number | null =
      null;

    if (
      recommendedDuration !== null &&
      typeof cheapest.duration ===
      'number'
    ) {
      timeDifference =
        cheapest.duration -
        recommendedDuration;
    }

    /*
     * ---------------------------------------------------
     * Compare stops
     * ---------------------------------------------------
     */

    const cheapestStops =
      cheapest.stops ?? 0;

    const fewerStops =
      recommendedStops <
      cheapestStops;

    /*
     * ---------------------------------------------------
     * Best case:
     * More expensive, but significantly faster.
     * ---------------------------------------------------
     */

    if (
      premium > 0 &&
      timeDifference !== null &&
      timeDifference > 0
    ) {
      const savedTime =
        formatDuration(
          timeDifference,
        );

      return `${flight.airline} ${flight.flightNumber} is the strongest fit among ${comparisonCount} flights for your dates. It costs $${Math.round(
        premium,
      )} more than the cheapest option, ${cheapest.airline} ${cheapest.flightNumber
        } at ${cheapest.price}, but saves ${savedTime} of travel time. For a $${Math.round(
          premium,
        )} premium, the shorter journey makes it the better overall choice.`;
    }

    /*
     * ---------------------------------------------------
     * More expensive, but fewer stops.
     * ---------------------------------------------------
     */

    if (
      premium > 0 &&
      fewerStops
    ) {
      const stopsAvoided =
        cheapestStops -
        recommendedStops;

      return `${flight.airline} ${flight.flightNumber} is the strongest fit among ${comparisonCount} flights for your dates. It costs $${Math.round(
        premium,
      )} more than the cheapest option, ${cheapest.airline} ${cheapest.flightNumber
        } at ${cheapest.price}, but avoids ${stopsAvoided} additional stop${stopsAvoided === 1
          ? ''
          : 's'
        }.`;
    }

    /*
     * ---------------------------------------------------
     * Same price advantage, faster journey.
     * ---------------------------------------------------
     */

    if (
      premium > 0 &&
      timeDifference !== null &&
      timeDifference < 0
    ) {
      const slowerBy =
        formatDuration(
          Math.abs(timeDifference),
        );

      return `${flight.airline} ${flight.flightNumber} is the strongest fit among ${comparisonCount} flights for your dates. It costs $${Math.round(
        premium,
      )} more than ${cheapest.airline} ${cheapest.flightNumber
        } at ${cheapest.price}, but the selected flight is ${slowerBy} slower. The recommendation reflects the overall fit of the available options.`;
    }

    /*
     * ---------------------------------------------------
     * No measurable advantage.
     * ---------------------------------------------------
     *
     * Do not invent a reason.
     */

    if (
      premium > 0
    ) {
      return `${flight.airline} ${flight.flightNumber} is the strongest fit among ${comparisonCount} flights for your dates. It costs $${Math.round(
        premium,
      )} more than the cheapest option, ${cheapest.airline} ${cheapest.flightNumber
        } at ${cheapest.price}. The available flight data does not show a meaningful difference in stops or journey time, so the recommendation is based on the overall ranking of the available options.`;
    }

    /*
     * ---------------------------------------------------
     * Fallback
     * ---------------------------------------------------
     */

    const durationText =
      formatDuration(
        recommendedDuration ?? undefined,
      );

    return `${flight.airline} ${flight.flightNumber} is the strongest fit among ${comparisonCount} flights for your dates.${durationText
      ? ` The journey takes ${durationText}`
      : ''
      }.`;
  }

  buildHotelReason(
    state: TravelState,
  ): string {
    const hotel =
      state.recommendation?.recommendedHotel;

    if (!hotel) {
      return 'No hotel was selected yet.';
    }

    const hotels =
      state.hotels ?? [];

    const ranking =
      state.hotelRanking;

    if (hotels.length <= 1) {
      let reason =
        `${hotel.name} was selected as the best available hotel for your dates.`;

      if (
        hotel.rating !== undefined
      ) {
        reason +=
          ` It has a ${hotel.rating.toFixed(
            1,
          )}/5 rating`;

        if (
          hotel.reviews !== undefined
        ) {
          reason +=
            ` from ${hotel.reviews.toLocaleString()} reviews`;
        }

        reason += '.';
      }

      return reason;
    }

    const parsePrice = (
      price?: string,
    ): number | null => {
      if (!price) {
        return null;
      }

      const match =
        price
          .replace(/,/g, '')
          .match(/\d+(?:\.\d+)?/);

      if (!match) {
        return null;
      }

      const value =
        Number(match[0]);

      return Number.isFinite(value)
        ? value
        : null;
    };

    const recommendedPrice =
      parsePrice(hotel.price);

    const recommendedRating =
      typeof hotel.rating ===
        'number'
        ? hotel.rating
        : null;

    const recommendedReviews =
      typeof hotel.reviews ===
        'number'
        ? hotel.reviews
        : null;

    const bestValue =
      ranking?.bestValue;

    const cheapest =
      ranking?.cheapest;

    const bestRated =
      ranking?.bestRated;

    const bestLocation =
      ranking?.bestLocation;

    const selectedRankedHotel =
      ranking?.rankedHotels?.find(
        (candidate) =>
          this.hotelKey(
            candidate,
          ) ===
          this.hotelKey(
            hotel,
          ),
      );

    const score =
      selectedRankedHotel?.score;

    /*
     * Base.
     */
    let reason =
      `${hotel.name} is the strongest hotel fit among ${hotels.length} options compared for your dates.`;

    /*
     * Best value.
     */
    if (
      bestValue &&
      this.hotelKey(
        bestValue,
      ) ===
      this.hotelKey(
        hotel,
      )
    ) {
      /*
       * If there is a cheaper hotel,
       * explain the premium.
       */
      if (
        cheapest &&
        this.hotelKey(
          cheapest,
        ) !==
        this.hotelKey(
          hotel,
        ) &&
        recommendedPrice !== null
      ) {
        const cheapestPrice =
          parsePrice(
            cheapest.price,
          );

        if (
          cheapestPrice !== null &&
          cheapestPrice <
          recommendedPrice
        ) {
          const premium =
            recommendedPrice -
            cheapestPrice;

          const cheapestRating =
            typeof cheapest.rating ===
              'number'
              ? cheapest.rating
              : null;

          if (
            recommendedRating !==
            null &&
            cheapestRating !==
            null &&
            recommendedRating >
            cheapestRating
          ) {
            const ratingDifference =
              recommendedRating -
              cheapestRating;

            reason +=
              ` It costs $${Math.round(
                premium,
              )} more per night than ${cheapest.name} at ${cheapest.price}, but its ${recommendedRating.toFixed(
                1,
              )}/5 rating is ${ratingDifference.toFixed(
                1,
              )} points higher.`;

            if (
              recommendedReviews !==
              null &&
              typeof cheapest.reviews ===
              'number' &&
              recommendedReviews >
              cheapest.reviews
            ) {
              reason +=
                ` It also has ${recommendedReviews.toLocaleString()} reviews compared with ${cheapest.reviews.toLocaleString()}.`;
            }

            reason +=
              ' The premium is supported by the stronger guest feedback.';

            return reason;
          }

          reason +=
            ` It costs $${Math.round(
              premium,
            )} more per night than ${cheapest.name} at ${cheapest.price}, but ranks higher overall.`;

          if (
            recommendedRating !==
            null &&
            cheapestRating !==
            null &&
            recommendedRating >
            cheapestRating
          ) {
            reason +=
              ` Its ${recommendedRating.toFixed(
                1,
              )}/5 rating is also higher than the cheaper option's ${cheapestRating.toFixed(
                1,
              )}/5.`;
          }

          return reason;
        }
      }

      /*
       * Selected hotel is both best value
       * and cheapest.
       */
      if (
        cheapest &&
        this.hotelKey(
          cheapest,
        ) ===
        this.hotelKey(
          hotel,
        )
      ) {
        reason +=
          ` It is also the cheapest available option at ${hotel.price}.`;

        if (
          recommendedRating !==
          null
        ) {
          reason +=
            ` It carries a ${recommendedRating.toFixed(
              1,
            )}/5 rating`;

          if (
            recommendedReviews !==
            null
          ) {
            reason +=
              ` from ${recommendedReviews.toLocaleString()} reviews`;
          }

          reason += '.';
        }

        return reason;
      }
    }

    /*
     * Best rated.
     */
    if (
      bestRated &&
      this.hotelKey(
        bestRated,
      ) ===
      this.hotelKey(
        hotel,
      )
    ) {
      if (
        recommendedRating !==
        null
      ) {
        reason +=
          ` It has the highest available rating at ${recommendedRating.toFixed(
            1,
          )}/5`;

        if (
          recommendedReviews !==
          null
        ) {
          reason +=
            ` from ${recommendedReviews.toLocaleString()} reviews`;
        }

        reason += '.';
      } else {
        reason +=
          ' It has the highest available guest rating.';
      }

      return reason;
    }

    /*
     * Best location.
     */
    if (
      bestLocation &&
      this.hotelKey(
        bestLocation,
      ) ===
      this.hotelKey(
        hotel,
      )
    ) {
      reason +=
        ' It also ranks highest for location among the compared hotels.';

      if (
        hotel.distanceFromCenter
      ) {
        reason +=
          ` The property is listed as ${hotel.distanceFromCenter} from the center.`;
      }

      return reason;
    }

    /*
     * Fallback.
     */
    if (
      recommendedRating !==
      null
    ) {
      reason +=
        ` It has a ${recommendedRating.toFixed(
          1,
        )}/5 rating`;

      if (
        recommendedReviews !==
        null
      ) {
        reason +=
          ` from ${recommendedReviews.toLocaleString()} reviews`;
      }

      reason += '.';
    } else if (
      score !== undefined
    ) {
      reason +=
        ` Its overall ranking score is ${Math.round(
          score,
        )}.`;
    }

    return reason;
  }



  buildFlightTips(
    state: TravelState,
  ): string[] {
    const flight =
      state.recommendation
        ?.recommendedFlight;

    const tips = [
      'Confirm the baggage allowance before booking.',
      'Check the fare change and cancellation conditions.',
      'Verify the connection airport and minimum connection time.',
      'Compare the final checkout price with nearby dates if your dates are flexible.',
      'Keep your passport and booking confirmation accessible during the journey.',
    ];

    if (flight?.stops === 0) {
      tips[2] =
        'Confirm the baggage allowance and airport terminal before booking.';
    }

    return tips;
  }

  buildHotelTips(): string[] {
    return [
      'Check the cancellation policy before payment.',
      'Confirm the room type and occupancy for all travelers.',
      'Verify check-in and check-out times.',
      'Check the property location against the daily itinerary and nearest station.',
      'Read recent reviews before finalizing the booking.',
    ];
  }

  buildExecutiveSummary(
    state: TravelState,
    dailyPlans: DailyPlan[],
    budgetBreakdown: {
      currency: string;
      budget: number | null;
      total: number;
      remaining: number | null;
      flights: number;
      hotel: number;
      food: number;
      transportation: number;
      activities: number;
      miscellaneous: number;
    },
  ): string {
    const destination =
      state.destination ??
      'your destination';

    const travelers = Math.max(
      state.travelers ?? 1,
      1,
    );

    const days = Math.max(
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
     * MAIN AREAS
     * ---------------------------------------------------
     */

    const areas =
      this.uniqueStrings(
        activities
          .map(
            (activity) =>
              activity.area ??
              activity.location,
          )
          .filter(Boolean),
      ).slice(0, 4);

    /*
     * ---------------------------------------------------
     * OUTDOOR ACTIVITIES
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
    ];

    const outdoorActivities =
      activities.filter(
        (activity) => {
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
          (activity) =>
            activity.title,
        ),
      ).slice(0, 3);

    /*
     * ---------------------------------------------------
     * BUSIEST DAY
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
     * LARGEST BUDGET CATEGORY
     * ---------------------------------------------------
     */

    const budgetCategories = [
      {
        label: 'flights',
        amount:
          budgetBreakdown.flights,
      },
      {
        label: 'accommodation',
        amount:
          budgetBreakdown.hotel,
      },
      {
        label: 'food',
        amount:
          budgetBreakdown.food,
      },
      {
        label: 'transportation',
        amount:
          budgetBreakdown.transportation,
      },
      {
        label: 'activities',
        amount:
          budgetBreakdown.activities,
      },
      {
        label: 'miscellaneous',
        amount:
          budgetBreakdown.miscellaneous,
      },
    ];

    const largestCategory =
      [...budgetCategories].sort(
        (a, b) =>
          b.amount - a.amount,
      )[0];

    /*
     * ---------------------------------------------------
     * SEASON
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
     * OPENING
     * ---------------------------------------------------
     */

    let opening: string;

    if (outdoorNames.length > 0) {
      opening =
        `${destination} is planned across ${days} days for ${travelers} traveler${travelers === 1 ? '' : 's'}, combining ${this.joinNatural(outdoorNames)} with the main areas of ${this.joinNatural(areas) || destination}.`;
    } else if (areas.length > 0) {
      opening =
        `${destination} is planned across ${days} days with ${activityCount} planned stops concentrated around ${this.joinNatural(areas)}.`;
    } else {
      opening =
        `This ${days}-day itinerary covers ${destination} with ${activityCount} planned stops for ${travelers} traveler${travelers === 1 ? '' : 's'}.`;
    }

    /*
     * ---------------------------------------------------
     * WEATHER
     * ---------------------------------------------------
     */

    const seasonal =
      month
        ? `${month} brings ${weatherProfile}, so the itinerary is structured around the expected seasonal conditions.`
        : '';

    /*
     * ---------------------------------------------------
     * BUDGET
     * ---------------------------------------------------
     */

    let budgetText: string;

    if (
      budgetBreakdown.remaining == null
    ) {
      budgetText =
        `The estimated trip cost is ${budgetBreakdown.currency} ${budgetBreakdown.total}.`;
    } else if (
      budgetBreakdown.remaining >= 0
    ) {
      budgetText =
        `The estimated trip cost is ${budgetBreakdown.currency} ${budgetBreakdown.total}, leaving ${budgetBreakdown.currency} ${budgetBreakdown.remaining} within the planned budget.`;
    } else {
      budgetText =
        `The estimated trip cost is ${budgetBreakdown.currency} ${budgetBreakdown.total}, which puts the current plan ${budgetBreakdown.currency} ${Math.abs(budgetBreakdown.remaining)} above the planned budget.`;
    }

    /*
     * ---------------------------------------------------
     * LARGEST EXPENSE
     * ---------------------------------------------------
     */

    const spendingText =
      largestCategory &&
        largestCategory.amount > 0
        ? `${this.capitalize(largestCategory.label)} represents the largest planned expense at approximately ${budgetBreakdown.currency} ${largestCategory.amount}.`
        : '';

    /*
     * ---------------------------------------------------
     * BUSIEST DAY
     * ---------------------------------------------------
     */

    const scheduleText =
      busiestDay
        ? `Day ${busiestDay.day} is the most activity-heavy block with ${busiestDay.activities.length} planned stops.`
        : '';

    /*
     * ---------------------------------------------------
     * FINAL SUMMARY
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
      .join(', ')}, and ${unique[
      unique.length - 1
      ]
      }`;
  }

  private capitalize(
    value: string,
  ): string {
    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  }

  buildTravelTips(
    state: TravelState,
    dailyPlans: DailyPlan[],
  ): TravelTip[] {
    const destination =
      state.destination ??
      'your destination';

    const travelers = Math.max(
      state.travelers ?? 1,
      1,
    );

    const days = Math.max(
      state.days ?? 1,
      1,
    );

    const budget =
      state.tripRequest?.budget
        ?.amount ?? null;

    const currency =
      state.tripRequest?.budget
        ?.currency ?? 'USD';

    const dailyBudget =
      budget !== null
        ? Math.round(
          budget /
          days /
          travelers,
        )
        : null;

    const activities =
      dailyPlans.flatMap(
        (day) =>
          day.activities ?? [],
      );

    const month =
      state.startDate
        ? this.getMonthName(
          state.startDate,
        )
        : undefined;

    const startDate =
      state.startDate
        ? this.formatShortDate(
          state.startDate,
        )
        : undefined;

    const endDate =
      state.endDate
        ? this.formatShortDate(
          state.endDate,
        )
        : undefined;

    const dateRange =
      startDate && endDate
        ? `${startDate}-${endDate}`
        : month
          ? month
          : 'your travel dates';

    /*
     * WEATHER
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
    ];

    const outdoorActivities =
      activities.filter(
        (activity) => {
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
        outdoorActivities
          .map(
            (activity) =>
              activity.title,
          )
          .filter(Boolean),
      ).slice(0, 4);

    const weatherProfile =
      this.getWeatherProfile(
        destination,
        month,
      );

    /*
     * TRANSIT
     */

    const areas =
      this.uniqueStrings(
        activities
          .map(
            (activity) =>
              activity.area ??
              activity.location,
          )
          .filter(Boolean),
      );

    const firstAreas =
      areas.slice(0, 5);

    const hasTokyo =
      this.isDestination(
        destination,
        'tokyo',
      );

    const outsideTokyoStops =
      this.uniqueStrings(
        activities
          .filter((activity) => {
            const text =
              `${activity.title} ${activity.location} ${activity.area ?? ''}`.toLowerCase();

            return [
              'kawaguchiko',
              'fuji',
              'hakone',
              'yokohama',
              'nikko',
              'kamakura',
              'narita',
              'disneyland',
              'disneysea',
            ].some((place) =>
              text.includes(place),
            );
          })
          .map(
            (activity) =>
              activity.area ??
              activity.location,
          ),
      );

    /*
     * BOOKING
     */

    const paidActivities =
      [...activities]
        .filter(
          (activity) =>
            activity.estimatedCost > 0,
        )
        .sort(
          (a, b) =>
            b.estimatedCost -
            a.estimatedCost,
        );

    const bookingPriority =
      paidActivities[0] ?? null;

    /*
     * MONEY
     */

    const expensiveActivities =
      [...activities]
        .filter(
          (activity) =>
            activity.estimatedCost > 0,
        )
        .sort(
          (a, b) =>
            b.estimatedCost -
            a.estimatedCost,
        )
        .slice(0, 2);

    /*
     * CROWDS
     */

    const busiestDay =
      [...dailyPlans]
        .sort(
          (a, b) =>
            b.activities.length -
            a.activities.length,
        )[0];

    const busiestActivities =
      busiestDay?.activities
        ?.slice(0, 4)
        .map(
          (activity) =>
            `${activity.time} ${activity.title}`,
        )
        .join(', ') ??
      '';

    const busiestStartTime =
      busiestDay?.activities?.length
        ? [...busiestDay.activities]
          .sort(
            (a, b) =>
              this.timeToMinutes(
                a.time,
              ) -
              this.timeToMinutes(
                b.time,
              ),
          )[0]?.time
        : undefined;

    const busiestDayDate =
      busiestDay?.day
        ? this.getDateForDay(
          state.startDate,
          busiestDay.day,
        )
        : undefined;

    const busiestDayWeekday =
      busiestDayDate
        ? this.getWeekday(
          busiestDayDate,
        )
        : undefined;

    /*
     * SAFETY
     */

    const safetyKeywords = [
      'crossing',
      'station',
      'market',
      'street',
      'temple',
      'shibuya',
      'shinjuku',
      'asakusa',
      'nakamise',
    ];

    const safetyPlaces =
      this.uniqueStrings(
        activities
          .filter(
            (activity) => {
              const text =
                `${activity.title} ${activity.location}`.toLowerCase();

              return safetyKeywords.some(
                (keyword) =>
                  text.includes(keyword),
              );
            },
          )
          .map(
            (activity) =>
              activity.location,
          )
          .filter(Boolean),
      ).slice(0, 2);

    /*
     * SPECIFIC CONTENT
     */

    const weatherPlaces =
      outdoorNames.length
        ? outdoorNames.join(', ')
        : `${destination}'s main outdoor stops`;

    let weatherTitle =
      `${destination} in ${dateRange}`;

    let weatherDescription =
      outdoorNames.length
        ? `${destination} typically sees ${weatherProfile}. Your itinerary puts ${weatherPlaces} outdoors, so schedule the longer outdoor stops while daylight is available and carry ${weatherProfile.includes('cold') || weatherProfile.includes('chilly') ? 'a warm outer layer' : 'weather-appropriate layers'}.`
        : `${destination} typically sees ${weatherProfile}. Your ${dateRange} itinerary has limited outdoor exposure, so pack around the seasonal range rather than treating the trip as a generic city break.`;

    if (hasTokyo && month === 'December') {
      weatherTitle =
        `Tokyo in December, ${dateRange}`;

      weatherDescription =
        outdoorNames.length
          ? `Tokyo's December climate averages about 13°C for the daytime high and 4°C for the low. Your outdoor stops include ${weatherPlaces}, so the 9:00 AM and evening portions of the itinerary will feel colder than the middle of the day. Pack a proper winter jacket and a lighter layer for indoor stops.`
          : `Tokyo's December climate averages about 13°C for the daytime high and 4°C for the low. For ${dateRange}, plan around chilly mornings and evenings and use a winter jacket rather than relying on a light travel layer.`;
    }

    /*
     * TRANSIT CONTENT
     */

    let transitTitle =
      firstAreas.length >= 2
        ? `Move efficiently between ${firstAreas.slice(0, 3).join(', ')}`
        : `Plan transport in ${destination}`;

    let transitDescription =
      firstAreas.length >= 2
        ? `Your itinerary connects ${firstAreas.slice(0, 4).join(', ')}. Keep consecutive stops within the same area where possible, because the itinerary already concentrates several activities around these locations.`
        : `Your itinerary has ${activities.length} planned stops. Keep the longest cross-city movements between major activity blocks rather than between consecutive attractions.`;

    if (hasTokyo) {
      transitTitle =
        outsideTokyoStops.length
          ? `Use Tokyo transit, then budget for ${outsideTokyoStops[0]}`
          : 'Use an IC card instead of a JR Pass';

      transitDescription =
        outsideTokyoStops.length
          ? `Most of the itinerary stays within Tokyo, while ${outsideTokyoStops.join(' and ')} requires separate intercity travel. For the Tokyo portion, an IC card is more flexible than buying a nationwide rail pass just for city travel.`
          : `Your itinerary is concentrated inside Tokyo across ${firstAreas.slice(0, 4).join(', ')}. A 7-day nationwide JR Pass costs ¥50,000 through the official online service, while the Tokyo Subway 24-hour ticket is ¥1,000 and becomes worthwhile at roughly 6 subway rides. For this city-focused plan, an IC card or selected subway passes is the more sensible choice.`;
    }

    /*
     * BOOKING CONTENT
     */

    let bookingTitle =
      bookingPriority
        ? `Reserve ${bookingPriority.title}`
        : 'Secure timed-entry activities';

    let bookingDescription =
      bookingPriority
        ? `${bookingPriority.title} is the highest-cost paid activity in the itinerary at approximately $${bookingPriority.estimatedCost}. Give it priority over lower-cost experiences and secure its time slot before the trip.`
        : 'No paid activity is currently present in the itinerary. Prioritize any activity that requires a fixed entry time before departure.';

    const bookingText =
      `${bookingPriority?.title ?? ''} ${bookingPriority?.location ?? ''}`.toLowerCase();

    if (
      hasTokyo &&
      bookingText.includes(
        'shibuya sky',
      )
    ) {
      bookingTitle =
        'Reserve Shibuya Sky first';

      bookingDescription =
        `Shibuya Sky is the highest-cost paid activity in the current itinerary at approximately $${bookingPriority?.estimatedCost ?? 0}. Official tickets are currently sold up to 2 weeks ahead, so set a reminder for the release window instead of waiting until arrival.`;
    }

    /*
     * MONEY CONTENT
     */

    const expensiveNames =
      expensiveActivities.length
        ? expensiveActivities
          .map(
            (activity) =>
              `${activity.title} ($${activity.estimatedCost})`,
          )
          .join(', ')
        : 'the paid activities in your itinerary';

    let moneyTitle =
      dailyBudget !== null
        ? `${currency} ${dailyBudget} per traveler per day`
        : 'Track spending by day';

    let moneyDescription =
      dailyBudget !== null
        ? `Your ${currency} ${budget} budget gives you approximately ${currency} ${dailyBudget} per traveler per day across ${days} days. The two largest planned paid items are ${expensiveNames}, so those costs already consume part of each day's allowance.`
        : `Your itinerary contains ${activities.length} planned activities. Track spending against the largest paid items first so additional experiences do not distort the trip budget.`;

    if (hasTokyo) {
      moneyTitle =
        dailyBudget !== null
          ? `Keep ${currency} ${dailyBudget} as your daily guide`
          : 'Track Tokyo spending by day';

      moneyDescription =
        dailyBudget !== null
          ? `Your ${currency} ${budget} budget gives you approximately ${currency} ${dailyBudget} per traveler per day. The largest planned paid items are ${expensiveNames}. In Tokyo, keep some cash available for smaller food stalls and market purchases around places such as Nakamise-dori or Ameyoko if they appear in your itinerary.`
          : `Your itinerary includes ${expensiveNames}. Keep some yen available for smaller purchases around markets and food stalls, while using cards for larger planned expenses.`;
    }

    /*
     * CROWDS CONTENT
     */

    let crowdTitle =
      busiestDay
        ? `Day ${busiestDay.day} has ${busiestDay.activities.length} planned stops`
        : 'Protect the busiest itinerary block';

    let crowdDescription =
      busiestDay
        ? `Day ${busiestDay.day} has the highest activity count with ${busiestDay.activities.length} stops: ${busiestActivities}. Start at ${busiestStartTime ?? 'the first scheduled time'} so the later stops do not get compressed.`
        : 'Keep the most activity-heavy day on schedule so later reservations are not affected by early delays.';

    if (
      hasTokyo &&
      busiestDay
    ) {
      const weekdayText =
        busiestDayWeekday
          ? `${busiestDayWeekday}, `
          : '';

      crowdTitle =
        `Day ${busiestDay.day} is your busiest day`;

      crowdDescription =
        `${weekdayText}Day ${busiestDay.day} contains ${busiestDay.activities.length} planned stops: ${busiestActivities}. Start with ${busiestStartTime ?? 'the first scheduled activity'} and protect that time because major Tokyo areas such as ${firstAreas.slice(0, 2).join(' and ')} can become substantially busier later in the day.`;
    }

    /*
     * SAFETY CONTENT
     */

    const safetyNames =
      safetyPlaces.length
        ? safetyPlaces.join(' and ')
        : `${destination}'s busiest tourist areas`;

    let safetyTitle =
      safetyPlaces.length
        ? `Stay alert around ${safetyNames}`
        : `Stay alert in busy areas`;

    let safetyDescription =
      safetyPlaces.length
        ? `${destination} is generally manageable for travelers, but ${safetyNames} can involve dense pedestrian traffic. Keep your phone and wallet secured when moving through these specific areas.`
        : `${destination} is generally manageable for travelers. Keep your phone, wallet, passport and booking details secured in crowded transport and tourist areas.`;

    if (
      hasTokyo &&
      safetyPlaces.length
    ) {
      safetyTitle =
        `Stay alert around ${safetyNames}`;

      safetyDescription =
        `Tokyo is generally a low-risk destination, but ${safetyNames} are among the busier locations represented in this itinerary. Keep your phone and wallet secured while moving through dense pedestrian traffic, especially when entering or leaving stations and markets.`;
    }

    return [
      {
        tag: 'WEATHER',
        title: weatherTitle,
        description:
          weatherDescription,
      },

      {
        tag: 'TRANSIT',
        title: transitTitle,
        description:
          transitDescription,
      },

      {
        tag: 'BOOKING WINDOW',
        title: bookingTitle,
        description:
          bookingDescription,
      },

      {
        tag: 'MONEY',
        title: moneyTitle,
        description:
          moneyDescription,
      },

      {
        tag: 'CROWDS',
        title: crowdTitle,
        description:
          crowdDescription,
      },

      {
        tag: 'SAFETY',
        title: safetyTitle,
        description:
          safetyDescription,
      },
    ];
  }

  private uniqueStrings(
    values: string[],
  ): string[] {
    return Array.from(
      new Set(
        values
          .map((value) =>
            value?.trim(),
          )
          .filter(Boolean),
      ),
    );
  }

  private isDestination(
    destination: string,
    value: string,
  ): boolean {
    return destination
      .toLowerCase()
      .includes(value.toLowerCase());
  }

  private hotelKey(
    hotel: {
      name: string;
      address: string;
      price?: string;
    },
  ): string {
    return [
      hotel.name,
      hotel.address,
      hotel.price,
    ].join('|');
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

  private formatShortDate(
    date: string,
  ): string {
    const parsed = new Date(
      `${date}T00:00:00Z`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return date;
    }

    return parsed.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      },
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

  private getDateForDay(
    startDate: string | undefined,
    dayNumber: number,
  ): string | undefined {
    if (!startDate) {
      return undefined;
    }

    const parsed = new Date(
      `${startDate}T00:00:00Z`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return undefined;
    }

    parsed.setUTCDate(
      parsed.getUTCDate() +
      dayNumber -
      1,
    );

    return parsed
      .toISOString()
      .slice(0, 10);
  }

  private getWeekday(
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
        weekday: 'long',
        timeZone: 'UTC',
      },
    );
  }
}