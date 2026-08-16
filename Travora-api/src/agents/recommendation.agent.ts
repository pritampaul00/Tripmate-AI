import { Injectable, Logger } from '@nestjs/common';

import { TravelState } from '../graph/travel.state';

import { FlightRankingService } from '../tools/flight-ranking.service';
import { HotelRankingService } from '../tools/hotel-ranking.service';
import { BudgetService } from '../tools/budget.service';
import { Flight } from '../models/flight.model';
import { Hotel } from '../models/hotel.model';
import { SerpHotelService } from '../tools/serp-hotel.service';

import { HotelRanking, RankedHotel } from '../models/hotel-ranking.model';

import {
  Recommendation,
  RecommendationAlternative,
  RecommendationDecision,
  RecommendationSignal,
  HotelRecommendationAlternative,
  HotelRecommendationExplanation,
} from '../models/recommendation.model';

@Injectable()
export class RecommendationAgent {
  private readonly logger =
    new Logger(RecommendationAgent.name);

  /*
   * Keep this small.
   *
   * The frontend only needs the recommended option
   * plus up to three alternatives.
   */
  private readonly MAX_ALTERNATIVES = 3;

  constructor(
    private readonly flightRankingService: FlightRankingService,
    private readonly hotelRankingService: HotelRankingService,
    private readonly budgetService: BudgetService,
    private readonly serpHotelService: SerpHotelService,
  ) { }

  async invoke(state: TravelState) {
    this.logger.log(
      '⭐ Recommendation Agent Started',
    );

    /*
     * =========================================================
     * 1. Flight ranking
     * =========================================================
     */

    const flightRanking =
      state.flightRanking ??
      this.flightRankingService.rank(
        state.flights,
        state.tripRequest?.preferences.flight,
      );

    /*
     * =========================================================
     * 2. Hotel ranking
     * =========================================================
     */

    const hotelRanking: HotelRanking =
      state.hotelRanking ??
      this.hotelRankingService.rank(
        state.hotels,
        state.tripRequest?.preferences.accommodation,
        state.tripRequest?.travelStyle,
      );

    /*
     * =========================================================
     * 3. Initial recommendation
     * =========================================================
     */

    let recommendedFlight: Flight | null =
      flightRanking.bestValue;

    let recommendedHotel: RankedHotel | null =
      hotelRanking.bestValue;

    /*
     * =========================================================
     * 4. Fallbacks
     * =========================================================
     */

    if (
      !recommendedFlight &&
      state.flights.length > 0
    ) {
      recommendedFlight =
        state.flights[0];
    }

    if (
      !recommendedHotel &&
      state.hotels.length > 0
    ) {
      recommendedHotel =
        this.getRankedHotel(
          state.hotels[0],
          hotelRanking.rankedHotels,
        );
    }

    /*
     * =========================================================
     * 5. Budget-aware selection
     *
     * BudgetService remains the deterministic authority
     * for the final flight + hotel combination.
     * =========================================================
     */

    let budgetCandidate:
      | ReturnType<
        BudgetService['findBestAffordableCombination']
      >
      | null = null;

    if (
      state.tripRequest?.budget &&
      flightRanking.rankedFlights.length > 0 &&
      hotelRanking.rankedHotels.length > 0
    ) {
      budgetCandidate =
        this.budgetService.findBestAffordableCombination(
          state,
          flightRanking.rankedFlights,
          hotelRanking.rankedHotels,
        );

      if (
        budgetCandidate?.flight &&
        budgetCandidate.hotel
      ) {
        recommendedFlight =
          budgetCandidate.flight;

        recommendedHotel =
          this.getRankedHotel(
            budgetCandidate.hotel,
            hotelRanking.rankedHotels,
          );

        this.logger.log({
          budgetAwareSelection: true,

          selectionReason:
            budgetCandidate.selectionReason,

          selectedFlight:
            recommendedFlight.flightNumber,

          selectedHotel:
            recommendedHotel?.name,

          totalUsd:
            budgetCandidate.totalUsd,

          fixedCostUsd:
            budgetCandidate.fixedCostUsd,

          budgetUsd:
            budgetCandidate.budgetUsd,

          remainingUsd:
            budgetCandidate.remainingUsd,

          overBudgetUsd:
            budgetCandidate.overBudgetUsd,

          fitsBudget:
            budgetCandidate.fitsBudget,

          qualityScore:
            budgetCandidate.qualityScore,
        });
      } else {
        this.logger.warn(
          'Unable to find a usable flight + hotel combination.',
        );
      }
    }

    /*
     * =========================================================
     * 6. Selected hotel detail enrichment
     *
     * The original state.hotels collection contains the
     * normalized hotel data returned by SerpHotelService.
     * Re-merge it after ranking so the selected hotel keeps
     * its address, website, amenities, room type,
     * cancellation policy, distance and checkedAt fields.
     *
     * No second SerpAPI request is made here.
     * =========================================================
     */

    recommendedHotel =
      await this.enrichRecommendedHotelDetails(
        recommendedHotel,
        state,
      );

    /*
     * =========================================================
     * 16. Recommendation decision
     * =========================================================
     */

    const decision =
      this.buildRecommendationDecision(
        state,
        flightRanking,
        hotelRanking,
        recommendedFlight,
        recommendedHotel,
        budgetCandidate,
      );

    /*
     * =========================================================
     * 16. Selected keys
     * =========================================================
     */

    const recommendedFlightKey =
      recommendedFlight
        ? this.flightKey(
          recommendedFlight,
        )
        : null;

    const recommendedHotelKey =
      recommendedHotel
        ? this.hotelKey(
          recommendedHotel,
        )
        : null;

    /*
     * =========================================================
     * 16. Flight alternatives
     *
     * Maximum 3.
     * =========================================================
     */

    // const flightAlternatives =
    //   flightRanking.rankedFlights
    //     .filter(
    //       (flight) =>
    //         this.flightKey(flight) !==
    //         recommendedFlightKey,
    //     )
    //     .slice(
    //       0,
    //       this.MAX_ALTERNATIVES,
    //     )
    //     .map(
    //       (flight) =>
    //         this.toFlightResponse(
    //           flight,
    //         ),
    //     );

    const flightAlternatives =
      flightRanking.rankedFlights
        .filter(
          (flight) =>
            this.flightKey(flight) !==
            recommendedFlightKey,
        )
        .slice(0, 3);
    /*
     * =========================================================
     * 16. Hotel alternatives
     *
     * Maximum 3.
     *
     * Do not expose score/tags/thumbnail.
     * =========================================================
     */

    // const hotelAlternatives =
    //   hotelRanking.rankedHotels
    //     .filter(
    //       (hotel) =>
    //         this.hotelKey(hotel) !==
    //         recommendedHotelKey,
    //     )
    //     .slice(
    //       0,
    //       this.MAX_ALTERNATIVES,
    //     )
    //     .map(
    //       (hotel) =>
    //         this.toHotelResponse(
    //           hotel,
    //         ),
    //     );

    const hotelAlternatives =
      hotelRanking.rankedHotels
        .filter(
          (hotel) =>
            this.hotelKey(hotel) !==
            recommendedHotelKey,
        )
        .slice(0, 3);
    /*
     * =========================================================
     * 16. Flight price insights
     * =========================================================
     */

    const lowestPrice =
      flightRanking.cheapest?.price;

    const currentPrice =
      recommendedFlight?.price;

    const flightPriceInsights =
      currentPrice
        ? {
          currentPrice,
          lowestPrice,

          priceLevel:
            lowestPrice &&
              currentPrice ===
              lowestPrice
              ? 'lowest available'
              : 'above the lowest available fare',
        }
        : null;

    /*
     * =========================================================
     * 16. Alternative intelligence
     *
     * Maximum 3 flights + 3 hotels.
     * =========================================================
     */

    const alternativeInsights =
      this.buildAlternativeInsights(
        flightRanking.rankedFlights,
        hotelRanking.rankedHotels,
        recommendedFlight,
        recommendedHotel,
      );

    /*
     * =========================================================
     * 16. Hotel explanation
     *
     * Keep the explanation short.
     *
     * Actual hotel information comes from the structured
     * recommendedHotel object.
     * =========================================================
     */

    const hotelExplanation =
      this.buildHotelExplanation(
        hotelRanking,
        recommendedHotel,
      );

    /*
     * =========================================================
     * 16. Clean selected hotel
     *
     * Do not expose:
     * - thumbnail
     * - score
     * - tags
     *
     * Keep only fields useful to the frontend.
     * =========================================================
     */

    const recommendedHotelResponse =
      recommendedHotel
        ? this.toHotelResponse(
          recommendedHotel,
        )
        : null;

    /*
     * =========================================================
     * 16. Final recommendation
     * =========================================================
     */

    const recommendation: Recommendation = {
      recommendedFlight,

      recommendedHotel:
        recommendedHotelResponse,

      flightAlternatives,

      hotelAlternatives,

      flightPriceInsights,

      decision,

      alternativeInsights,

      hotelExplanation,
    };

    /*
     * =========================================================
     * 16. Logging
     * =========================================================
     */

    const selectedFlightRanking =
      flightRanking.rankedFlights.find(
        (flight) =>
          recommendedFlight
            ? this.flightKey(flight) ===
            this.flightKey(
              recommendedFlight,
            )
            : false,
      );

    const selectedHotelRanking =
      hotelRanking.rankedHotels.find(
        (hotel) =>
          recommendedHotel
            ? this.hotelKey(hotel) ===
            this.hotelKey(
              recommendedHotel,
            )
            : false,
      );

    this.logger.log({
      selectedFlight:
        recommendedFlight?.flightNumber,

      selectedHotel:
        recommendedHotel?.name,

      flightScore:
        selectedFlightRanking?.score,

      hotelScore:
        selectedHotelRanking?.score,

      hotelTags:
        selectedHotelRanking?.tags,

      recommendationType:
        decision.type,

      confidence:
        decision.confidence,

      signals:
        decision.signals,

      flightAlternatives:
        flightAlternatives.length,

      hotelAlternatives:
        hotelAlternatives.length,
    });

    return {
      recommendation,
      flightRanking,
      hotelRanking,
    };
  }

  /*
   * =========================================================
   * Recommendation Decision
   * =========================================================
   */

  private buildRecommendationDecision(
    state: TravelState,
    flightRanking: any,
    hotelRanking: HotelRanking,
    recommendedFlight: Flight | null,
    recommendedHotel: RankedHotel | null,
    budgetCandidate:
      | ReturnType<
        BudgetService['findBestAffordableCombination']
      >
      | null,
  ): RecommendationDecision {
    const signals: RecommendationSignal[] =
      [];

    const tradeoffs: string[] =
      [];

    /*
     * ---------------------------------------------------------
     * Flight signals
     * ---------------------------------------------------------
     */

    if (
      recommendedFlight &&
      flightRanking.cheapest &&
      this.flightKey(
        recommendedFlight,
      ) ===
      this.flightKey(
        flightRanking.cheapest,
      )
    ) {
      this.addSignal(
        signals,
        'best-price',
      );
    }

    if (
      recommendedFlight &&
      flightRanking.bestValue &&
      this.flightKey(
        recommendedFlight,
      ) ===
      this.flightKey(
        flightRanking.bestValue,
      )
    ) {
      this.addSignal(
        signals,
        'best-value',
      );
    }

    if (
      recommendedFlight &&
      flightRanking.fastest &&
      this.flightKey(
        recommendedFlight,
      ) ===
      this.flightKey(
        flightRanking.fastest,
      )
    ) {
      this.addSignal(
        signals,
        'fastest',
      );
    }

    if (
      recommendedFlight &&
      flightRanking.fewestStops &&
      this.flightKey(
        recommendedFlight,
      ) ===
      this.flightKey(
        flightRanking.fewestStops,
      )
    ) {
      this.addSignal(
        signals,
        'fewest-stops',
      );
    }

    if (
      recommendedFlight &&
      flightRanking.lowestEmissions &&
      this.flightKey(
        recommendedFlight,
      ) ===
      this.flightKey(
        flightRanking.lowestEmissions,
      )
    ) {
      this.addSignal(
        signals,
        'lowest-emissions',
      );
    }

    /*
     * ---------------------------------------------------------
     * Budget decision
     * ---------------------------------------------------------
     */

    if (
      budgetCandidate?.flight &&
      budgetCandidate.hotel
    ) {
      if (
        budgetCandidate.fitsBudget
      ) {
        this.addSignal(
          signals,
          'budget-fit',
        );

        const type =
          budgetCandidate.selectionReason ===
            'fits-budget'
            ? 'budget-optimized'
            : 'best-value';

        const remaining =
          budgetCandidate.remainingUsd;

        if (
          recommendedFlight &&
          flightRanking.cheapest &&
          this.flightKey(
            recommendedFlight,
          ) !==
          this.flightKey(
            flightRanking.cheapest,
          )
        ) {
          tradeoffs.push(
            'The selected flight is not the cheapest available option, but it has a stronger overall ranking.',
          );
        }

        if (
          budgetCandidate.overBudgetUsd ===
          0
        ) {
          tradeoffs.push(
            `The plan preserves ${this.formatUsd(
              remaining,
            )} as a budget buffer.`,
          );
        }

        return {
          type,

          confidence:
            this.calculateConfidence(
              signals,
              true,
            ),

          reason:
            recommendedHotel
              ? `Travora selected ${recommendedHotel.name} as part of the strongest available combination within your budget.`
              : 'Travora selected the strongest available combination within your budget.',

          summary:
            `This combination fits your requested budget with ${this.formatUsd(
              remaining,
            )} remaining.`,

          signals,

          tradeoffs,

          budgetImpact: {
            currency:
              state.tripRequest?.budget
                ?.currency ?? 'USD',

            budget:
              state.tripRequest?.budget
                ?.amount ??
              budgetCandidate.budgetUsd,

            estimatedTotal:
              this.convertUsdToBudgetCurrency(
                budgetCandidate.totalUsd,
                state,
              ),

            remaining:
              this.convertUsdToBudgetCurrency(
                Math.max(
                  budgetCandidate.remainingUsd,
                  0,
                ),
                state,
              ),

            overBudget:
              this.convertUsdToBudgetCurrency(
                budgetCandidate.overBudgetUsd,
                state,
              ),

            fitsBudget:
              budgetCandidate.fitsBudget,

            utilizationPercent:
              budgetCandidate.budgetUsd >
                0
                ? this.round(
                  (budgetCandidate.totalUsd /
                    budgetCandidate.budgetUsd) *
                  100,
                )
                : undefined,
          },
        };
      }

      /*
       * -------------------------------------------------------
       * Closest to budget
       * -------------------------------------------------------
       */

      this.addSignal(
        signals,
        'closest-to-budget',
      );

      const overBudget =
        budgetCandidate.overBudgetUsd;

      tradeoffs.push(
        `The selected plan exceeds the budget by ${this.formatUsd(
          overBudget,
        )}.`,
      );

      if (
        recommendedFlight &&
        flightRanking.cheapest &&
        this.flightKey(
          recommendedFlight,
        ) !==
        this.flightKey(
          flightRanking.cheapest,
        )
      ) {
        tradeoffs.push(
          'A cheaper flight exists, but the selected combination provides a stronger overall result.',
        );
      }

      return {
        type: 'closest-to-budget',

        confidence:
          this.calculateConfidence(
            signals,
            false,
          ),

        reason:
          recommendedHotel
            ? `Travora selected ${recommendedHotel.name} as part of the combination with the smallest available budget overage.`
            : 'Travora selected the combination with the smallest available budget overage.',

        summary:
          `This combination is ${this.formatUsd(
            overBudget,
          )} over your requested budget.`,

        signals,

        tradeoffs,

        budgetImpact: {
          currency:
            state.tripRequest?.budget
              ?.currency ?? 'USD',

          budget:
            state.tripRequest?.budget
              ?.amount ??
            budgetCandidate.budgetUsd,

          estimatedTotal:
            this.convertUsdToBudgetCurrency(
              budgetCandidate.totalUsd,
              state,
            ),

          remaining: 0,

          overBudget:
            this.convertUsdToBudgetCurrency(
              budgetCandidate.overBudgetUsd,
              state,
            ),

          fitsBudget: false,

          utilizationPercent:
            budgetCandidate.budgetUsd >
              0
              ? this.round(
                (budgetCandidate.totalUsd /
                  budgetCandidate.budgetUsd) *
                100,
              )
              : undefined,
        },
      };
    }

    /*
     * ---------------------------------------------------------
     * No budget case
     * ---------------------------------------------------------
     */

    if (
      signals.length === 0
    ) {
      signals.push(
        'best-value',
      );
    }

    return {
      type: 'best-value',

      confidence:
        this.calculateConfidence(
          signals,
          true,
        ),

      reason:
        recommendedHotel
          ? `Travora selected ${recommendedHotel.name} as the strongest available hotel option for this trip.`
          : 'Travora selected the strongest available options for this trip.',

      summary:
        recommendedHotel
          ? `${recommendedHotel.name} is the strongest available hotel option based on the current ranking.`
          : 'This is the strongest available combination based on the current ranking.',

      signals,

      tradeoffs,
    };
  }

  /*
   * =========================================================
   * Hotel Explanation
   * =========================================================
   */

  private buildHotelExplanation(
  hotelRanking: HotelRanking,
  recommendedHotel: RankedHotel | null,
): HotelRecommendationExplanation {
  if (!recommendedHotel) {
    return {
      reason:
        'No suitable hotel was available for the selected dates.',

      name: '',

      address: '',

      description: '',

      website: '',

      alternatives: [],
    };
  }

  const rankedHotels =
    hotelRanking.rankedHotels ?? [];

  const comparisonCount =
    rankedHotels.length;

  const recommendedKey =
    this.hotelKey(recommendedHotel);

  const recommendedPrice =
    this.parsePrice(
      recommendedHotel.price,
    );

  const recommendedRating =
    recommendedHotel.rating;

  const recommendedReviews =
    recommendedHotel.reviews;

  /*
   * ---------------------------------------------------------
   * Ranking signals
   * ---------------------------------------------------------
   */

  const isBestValue =
    Boolean(
      hotelRanking.bestValue &&
      this.hotelKey(
        hotelRanking.bestValue,
      ) === recommendedKey,
    );

  const isCheapest =
    Boolean(
      hotelRanking.cheapest &&
      this.hotelKey(
        hotelRanking.cheapest,
      ) === recommendedKey,
    );

  const isBestRated =
    Boolean(
      hotelRanking.bestRated &&
      this.hotelKey(
        hotelRanking.bestRated,
      ) === recommendedKey,
    );

  const isBestLocation =
    Boolean(
      hotelRanking.bestLocation &&
      this.hotelKey(
        hotelRanking.bestLocation,
      ) === recommendedKey,
    );

  /*
   * ---------------------------------------------------------
   * Find useful comparison points
   * ---------------------------------------------------------
   */

  const cheaperAlternative =
    rankedHotels
      .filter(
        (hotel) =>
          this.hotelKey(hotel) !==
          recommendedKey,
      )
      .map((hotel) => ({
        hotel,
        price:
          this.parsePrice(
            hotel.price,
          ),
      }))
      .filter(
        (item) =>
          item.price !== null &&
          recommendedPrice !== null &&
          item.price < recommendedPrice,
      )
      .sort(
        (a, b) =>
          (b.price ?? 0) -
          (a.price ?? 0),
      )[0];

  /*
   * ---------------------------------------------------------
   * Build "Why this hotel?"
   * ---------------------------------------------------------
   */

  const reasonParts: string[] = [];

  if (isBestValue) {
    reasonParts.push(
      `It offers the strongest overall value among ${comparisonCount} available hotels`,
    );
  } else if (isCheapest) {
    reasonParts.push(
      `It is the lowest-priced option among ${comparisonCount} available hotels`,
    );
  } else if (isBestRated) {
    reasonParts.push(
      `It has the strongest guest rating among the available hotels`,
    );
  } else if (isBestLocation) {
    reasonParts.push(
      `It has the strongest location ranking among the available hotels`,
    );
  } else {
    reasonParts.push(
      `It ranked highest overall among ${comparisonCount} available hotels`,
    );
  }

  /*
   * Price
   */

  if (
    recommendedPrice !== null &&
    recommendedHotel.price
  ) {
    reasonParts.push(
      `at ${recommendedHotel.price} per night`,
    );
  }

  /*
   * Rating and reviews
   */

  if (
    recommendedRating !== undefined &&
    recommendedReviews !== undefined
  ) {
    reasonParts.push(
      `with a ${recommendedRating.toFixed(
        1,
      )}/5 rating from ${recommendedReviews.toLocaleString()} reviews`,
    );
  } else if (
    recommendedRating !== undefined
  ) {
    reasonParts.push(
      `with a ${recommendedRating.toFixed(
        1,
      )}/5 rating`,
    );
  }

  let reason =
    reasonParts.join(' ') + '.';

  /*
   * ---------------------------------------------------------
   * Add a useful price comparison
   * ---------------------------------------------------------
   */

  if (
    cheaperAlternative &&
    recommendedPrice !== null &&
    cheaperAlternative.price !== null
  ) {
    const premium =
      recommendedPrice -
      cheaperAlternative.price;

    if (premium > 0) {
      reason +=
        ` It costs ${this.formatUsd(
          premium,
        )} more per night than ${cheaperAlternative.hotel.name}, but ranks higher overall.`;
    }
  } else if (
    isCheapest
  ) {
    reason +=
      ' It also gives you the lowest nightly cost among the compared options.';
  }

  /*
   * ---------------------------------------------------------
   * Location context
   * ---------------------------------------------------------
   */

  if (
    isBestLocation &&
    recommendedHotel.distanceFromCenter
  ) {
    reason +=
      ` Its location is ${recommendedHotel.distanceFromCenter}.`;
  }

  /*
   * ---------------------------------------------------------
   * Alternatives
   *
   * Always exclude the recommended hotel.
   * Maximum 3 alternatives.
   * ---------------------------------------------------------
   */

  const alternatives:
    HotelRecommendationAlternative[] =
    rankedHotels
      .filter(
        (hotel) =>
          this.hotelKey(hotel) !==
          recommendedKey,
      )
      .slice(
        0,
        this.MAX_ALTERNATIVES,
      )
      .map(
        (
          hotel,
        ): HotelRecommendationAlternative => {
          const hotelPrice =
            this.parsePrice(
              hotel.price,
            );

          const priceDifference =
            hotelPrice !== null &&
            recommendedPrice !== null
              ? this.round(
                  hotelPrice -
                    recommendedPrice,
                )
              : undefined;

          let alternativeReason =
            'Another strong hotel option considered for this trip.';

          if (
            priceDifference !==
              undefined &&
            priceDifference < 0
          ) {
            alternativeReason =
              `It is ${this.formatUsd(
                Math.abs(
                  priceDifference,
                ),
              )} cheaper per night than the recommended hotel.`;
          } else if (
            priceDifference !==
              undefined &&
            priceDifference > 0
          ) {
            alternativeReason =
              `It costs ${this.formatUsd(
                priceDifference,
              )} more per night than the recommended hotel.`;
          } else if (
            hotel.rating !==
              undefined &&
            recommendedRating !==
              undefined &&
            hotel.rating >
              recommendedRating
          ) {
            alternativeReason =
              'It has a higher guest rating, but the recommended hotel ranked higher overall.';
          } else if (
            hotel.rating !==
              undefined &&
            recommendedRating !==
              undefined &&
            hotel.rating <
              recommendedRating
          ) {
            alternativeReason =
              'It has a lower guest rating than the recommended hotel.';
          }

          return {
            name:
              hotel.name,

            address:
              hotel.address,

            description:
              hotel.description,

            website:
              hotel.website,

            price:
              hotel.price,

            rating:
              hotel.rating,

            reviews:
              hotel.reviews,

            roomType:
              hotel.roomType,

            cancellationPolicy:
              hotel.cancellationPolicy,

            reason:
              alternativeReason,
          };
        },
      );

  /*
   * ---------------------------------------------------------
   * Return
   * ---------------------------------------------------------
   */

  return {
    reason,

    name:
      recommendedHotel.name,

    address:
      recommendedHotel.address,

    description:
      recommendedHotel.description,

    website:
      recommendedHotel.website,

    price:
      recommendedHotel.price,

    rating:
      recommendedHotel.rating,

    reviews:
      recommendedHotel.reviews,

    roomType:
      recommendedHotel.roomType,

    cancellationPolicy:
      recommendedHotel.cancellationPolicy,

    distanceFromCenter:
      recommendedHotel.distanceFromCenter,

    checkedAt:
      recommendedHotel.checkedAt,

    alternatives,
  };
}
  



  /*
   * =========================================================
   * Alternative Insights
   * =========================================================
   */

  private buildAlternativeInsights(
    flights: Flight[],
    hotels: RankedHotel[],
    recommendedFlight: Flight | null,
    recommendedHotel: RankedHotel | null,
  ): RecommendationAlternative[] {
    const insights:
      RecommendationAlternative[] =
      [];

    /*
     * ---------------------------------------------------------
     * Flight alternatives
     *
     * Maximum 3.
     * ---------------------------------------------------------
     */

    if (recommendedFlight) {
      const recommendedPrice =
        this.parsePrice(
          recommendedFlight.price,
        );

      const recommendedScore =
        this.numericScore(
          (
            recommendedFlight as Flight & {
              score?: number;
            }
          ).score,
        );

      for (
        const flight of flights.slice(
          0,
          this.MAX_ALTERNATIVES + 1,
        )
      ) {
        if (
          this.flightKey(flight) ===
          this.flightKey(
            recommendedFlight,
          )
        ) {
          continue;
        }

        if (
          insights.filter(
            (item) =>
              item.type ===
              'flight',
          ).length >=
          this.MAX_ALTERNATIVES
        ) {
          break;
        }

        const price =
          this.parsePrice(
            flight.price,
          );

        const score =
          this.numericScore(
            (
              flight as Flight & {
                score?: number;
              }
            ).score,
          );

        const signals:
          RecommendationSignal[] =
          [];

        if (
          price !== null &&
          recommendedPrice !== null &&
          price <
          recommendedPrice
        ) {
          this.addSignal(
            signals,
            'price-saving',
          );
        }

        if (
          score <
          recommendedScore
        ) {
          this.addSignal(
            signals,
            'best-value',
          );
        }

        const priceDifference =
          price !== null &&
            recommendedPrice !== null
            ? this.round(
              price -
              recommendedPrice,
            )
            : undefined;

        const scoreDifference =
          score !== null &&
            recommendedScore !== null
            ? this.round(
              score -
              recommendedScore,
            )
            : undefined;

        insights.push({
          type: 'flight',

          name:
            flight.flightNumber,

          price:
            flight.price,

          priceDifference,

          score,

          scoreDifference,

          signals,

          reason:
            this.buildAlternativeReason(
              priceDifference,
              scoreDifference,
              'flight',
            ),
        });
      }
    }

    /*
     * ---------------------------------------------------------
     * Hotel alternatives
     *
     * Maximum 3.
     * ---------------------------------------------------------
     */

    if (recommendedHotel) {
      const recommendedPrice =
        this.parsePrice(
          recommendedHotel.price,
        );

      const recommendedScore =
        this.numericScore(
          recommendedHotel.score,
        );

      for (
        const hotel of hotels.slice(
          0,
          this.MAX_ALTERNATIVES + 1,
        )
      ) {
        if (
          this.hotelKey(hotel) ===
          this.hotelKey(
            recommendedHotel,
          )
        ) {
          continue;
        }

        if (
          insights.filter(
            (item) =>
              item.type ===
              'hotel',
          ).length >=
          this.MAX_ALTERNATIVES
        ) {
          break;
        }

        const price =
          this.parsePrice(
            hotel.price,
          );

        const score =
          this.numericScore(
            hotel.score,
          );

        const signals:
          RecommendationSignal[] =
          [];

        if (
          price !== null &&
          recommendedPrice !== null &&
          price <
          recommendedPrice
        ) {
          this.addSignal(
            signals,
            'price-saving',
          );
        }

        if (
          score <
          recommendedScore
        ) {
          this.addSignal(
            signals,
            'best-value',
          );
        }

        const priceDifference =
          price !== null &&
            recommendedPrice !== null
            ? this.round(
              price -
              recommendedPrice,
            )
            : undefined;

        const scoreDifference =
          score !== null &&
            recommendedScore !== null
            ? this.round(
              score -
              recommendedScore,
            )
            : undefined;

        insights.push({
          type: 'hotel',

          name:
            hotel.name,

          price:
            hotel.price,

          priceDifference,

          score,

          scoreDifference,

          signals,

          reason:
            this.buildAlternativeReason(
              priceDifference,
              scoreDifference,
              'hotel',
            ),
        });
      }
    }

    return insights;
  }

  /*
   * =========================================================
   * Alternative Explanation
   * =========================================================
   */

  private buildAlternativeReason(
    priceDifference:
      | number
      | undefined,

    scoreDifference:
      | number
      | undefined,

    type:
      | 'flight'
      | 'hotel',
  ): string {
    const label =
      type === 'flight'
        ? 'flight'
        : 'hotel';

    if (
      priceDifference !==
      undefined &&
      priceDifference < 0
    ) {
      return `This ${label} is ${this.formatUsd(
        Math.abs(
          priceDifference,
        ),
      )} cheaper than the recommendation.`;
    }

    if (
      priceDifference !==
      undefined &&
      priceDifference > 0
    ) {
      return `This ${label} costs ${this.formatUsd(
        priceDifference,
      )} more than the recommendation.`;
    }

    if (
      scoreDifference !==
      undefined &&
      scoreDifference < 0
    ) {
      return `This ${label} has a lower overall ranking than the recommendation.`;
    }

    if (
      scoreDifference !==
      undefined &&
      scoreDifference > 0
    ) {
      return `This ${label} has a higher individual ranking, but was not selected for the final combination.`;
    }

    return `This ${label} is an alternative to the recommended option.`;
  }

  /*
   * =========================================================
   * Response mapping
   * =========================================================
   *
   * This is where we control exactly what reaches the
   * frontend.
   *
   * Thumbnail is intentionally excluded.
   * Ranking score and tags are intentionally excluded.
   * =========================================================
   */

  private toHotelResponse(
    hotel: Hotel,
  ): Hotel {
    return {
      name:
        hotel.name,

      address:
        hotel.address,

      description:
        hotel.description,

      website:
        hotel.website,

      price:
        hotel.price,

      rating:
        hotel.rating,

      reviews:
        hotel.reviews,

      amenities:
        hotel.amenities,

      distanceFromCenter:
        hotel.distanceFromCenter,

      roomType:
        hotel.roomType,

      cancellationPolicy:
        hotel.cancellationPolicy,

      checkedAt:
        hotel.checkedAt,
    };
  }

  private toFlightResponse(
    flight: Flight,
  ): Flight {
    return {
      ...flight,
    };
  }

  /*
   * =========================================================
   * Helpers
   * =========================================================
   */

  private addSignal(
    signals: RecommendationSignal[],
    signal: RecommendationSignal,
  ): void {
    if (
      !signals.includes(signal)
    ) {
      signals.push(signal);
    }
  }

  private calculateConfidence(
    signals: RecommendationSignal[],
    fitsBudget: boolean,
  ): number {
    let confidence = 70;

    if (
      signals.includes(
        'best-value',
      )
    ) {
      confidence += 8;
    }

    if (
      signals.includes(
        'budget-fit',
      )
    ) {
      confidence += 10;
    }

    if (
      signals.includes(
        'best-price',
      )
    ) {
      confidence += 5;
    }

    if (
      signals.includes(
        'fewest-stops',
      )
    ) {
      confidence += 3;
    }

    if (
      signals.includes(
        'fastest',
      )
    ) {
      confidence += 3;
    }

    if (
      signals.includes(
        'lowest-emissions',
      )
    ) {
      confidence += 2;
    }

    if (
      signals.includes(
        'closest-to-budget',
      )
    ) {
      confidence += 4;
    }

    if (!fitsBudget) {
      confidence -= 8;
    }

    return Math.min(
      Math.max(
        confidence,
        0,
      ),
      100,
    );
  }

  private parsePrice(
    value?: string,
  ): number | null {
    if (!value) {
      return null;
    }

    if (
      /unknown|contact|unavailable|n\/a/i.test(
        value,
      )
    ) {
      return null;
    }

    const match =
      value
        .replace(/,/g, '')
        .match(
          /\d+(?:\.\d+)?/,
        );

    if (!match) {
      return null;
    }

    const parsed =
      Number(match[0]);

    return Number.isFinite(parsed)
      ? parsed
      : null;
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

  private convertUsdToBudgetCurrency(
    amountUsd: number,
    state: TravelState,
  ): number {
    const currency =
      state.tripRequest?.budget
        ?.currency ??
      'USD';

    return this.round(
      this.budgetService.convertFromUsd(
        amountUsd,
        currency,
      ),
    );
  }

  private formatUsd(
    value: number,
  ): string {
    return `$${this.round(
      value,
    ).toFixed(2)}`;
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

  private flightKey(
    flight: {
      airline: string;
      flightNumber: string;
      departureTime: string;
      arrivalTime: string;
      price: string;
    },
  ): string {
    return [
      flight.airline,
      flight.flightNumber,
      flight.departureTime,
      flight.arrivalTime,
      flight.price,
    ].join('|');
  }

  private async enrichRecommendedHotelDetails(
    recommendedHotel: RankedHotel | null,
    state: TravelState,
  ): Promise<RankedHotel | null> {
    if (!recommendedHotel) {
      return null;
    }

    /*
     * Find the original hotel from the SerpAPI search results.
     * We need the propertyToken to request detailed information.
     */
    const sourceHotel =
      state.hotels.find(
        (hotel) =>
          this.hotelKey(hotel) ===
          this.hotelKey(recommendedHotel),
      ) ??
      state.hotels.find(
        (hotel) =>
          hotel.name.trim().toLowerCase() ===
          recommendedHotel.name.trim().toLowerCase(),
      );

    if (!sourceHotel) {
      this.logger.warn(
        `Could not find source hotel for ${recommendedHotel.name}`,
      );

      return recommendedHotel;
    }

    /*
     * If there is no property token, we cannot make
     * the Google Hotels property-details request.
     */
    if (!sourceHotel.propertyToken) {
      this.logger.warn(
        `No property token available for ${sourceHotel.name}`,
      );

      return {
        ...recommendedHotel,
        ...sourceHotel,
      };
    }

    /*
     * Fetch detailed information ONLY for the selected hotel.
     *
     * This is intentionally done after deterministic ranking
     * so we do not make detail requests for every hotel.
     */
    const detailedHotel =
      await this.serpHotelService.getHotelDetails(
        sourceHotel,
        state.tripRequest?.dates?.startDate ?? '',
        state.tripRequest?.dates?.endDate ?? '',
        state.tripRequest?.travelers?.total ?? 1,
      );

    if (!detailedHotel) {
      this.logger.warn(
        `No detailed hotel information returned for ${sourceHotel.name}`,
      );

      return {
        ...recommendedHotel,
        ...sourceHotel,
      };
    }

    /*
     * Preserve the ranking information while replacing
     * the hotel fields with the detailed SerpAPI data.
     */
    return {
      ...recommendedHotel,

      name:
        detailedHotel.name ||
        sourceHotel.name ||
        recommendedHotel.name,

      address:
        detailedHotel.address ||
        sourceHotel.address ||
        recommendedHotel.address,

      description:
        detailedHotel.description ||
        sourceHotel.description ||
        recommendedHotel.description,

      website:
        detailedHotel.website ||
        sourceHotel.website ||
        recommendedHotel.website,

      price:
        detailedHotel.price ||
        sourceHotel.price ||
        recommendedHotel.price,

      rating:
        detailedHotel.rating ??
        sourceHotel.rating ??
        recommendedHotel.rating,

      reviews:
        detailedHotel.reviews ??
        sourceHotel.reviews ??
        recommendedHotel.reviews,

      amenities:
        detailedHotel.amenities ??
        sourceHotel.amenities ??
        recommendedHotel.amenities,

      distanceFromCenter:
        detailedHotel.distanceFromCenter ??
        sourceHotel.distanceFromCenter ??
        recommendedHotel.distanceFromCenter,

      roomType:
        detailedHotel.roomType ??
        sourceHotel.roomType ??
        recommendedHotel.roomType,

      cancellationPolicy:
        detailedHotel.cancellationPolicy ??
        sourceHotel.cancellationPolicy ??
        recommendedHotel.cancellationPolicy,

      checkedAt:
        detailedHotel.checkedAt ??
        sourceHotel.checkedAt ??
        recommendedHotel.checkedAt,
    };
  }

  private getRankedHotel(
    hotel: Hotel | null,
    rankedHotels: RankedHotel[],
  ): RankedHotel | null {
    if (!hotel) {
      return null;
    }

    return (
      rankedHotels.find(
        (rankedHotel) =>
          this.hotelKey(
            rankedHotel,
          ) ===
          this.hotelKey(
            hotel,
          ),
      ) ?? null
    );
  }

  // private hotelKey(
  //   hotel: {
  //     name: string;
  //     address: string;
  //     price?: string;
  //   },
  // ): string {
  //   return [
  //     hotel.name,
  //     hotel.address,
  //     hotel.price,
  //   ].join('|');
  // }

  private hotelKey(
    hotel: {
      name: string;
      address?: string;
      price?: string;
      propertyToken?: string;
    },
  ): string {
    if (hotel.propertyToken) {
      return `property:${hotel.propertyToken}`;
    }

    return [
      hotel.name.trim().toLowerCase(),
      hotel.price ?? '',
    ].join('|');
  }
}