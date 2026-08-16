import { Injectable, Logger } from '@nestjs/common';

import { Hotel } from '../models/hotel.model';

import { HotelRankCategory, HotelRanking, RankedHotel } from '../models/hotel-ranking.model';

import { TripPreferences, TravelStyle } from '../models/trip-request.model';

@Injectable()
export class HotelRankingService {
  private readonly logger = new Logger(
    HotelRankingService.name,
  );

  rank(
    hotels: Hotel[],
    preferences?: TripPreferences['accommodation'],
    travelStyle?: TravelStyle,
  ): HotelRanking {
    const warnings: string[] = [];
    const originalCount = hotels.length;

    if (hotels.length === 0) {
      return {
        bestValue: null,
        cheapest: null,
        bestRated: null,
        bestLocation: null,
        bestForCouples: null,
        bestForFamilies: null,
        rankedHotels: [],
        filteredCount: 0,
        originalCount: 0,
        warnings: ['No hotel offers were returned.'],
      };
    }

    /*
     * ---------------------------------------------------------
     * 1. Apply accommodation category filter
     * ---------------------------------------------------------
     */

    let eligible = this.applyCategoryFilter(
      hotels,
      preferences?.category,
    );

    if (eligible.length === 0) {
      eligible = [...hotels];

      warnings.push(
        'No hotel matched the requested accommodation category. Showing the closest available options instead.',
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. Build comparison datasets
     * ---------------------------------------------------------
     */

    const prices = eligible
      .map((hotel) =>
        this.parsePrice(hotel.price),
      )
      .filter(
        (value): value is number =>
          value !== null,
      );

    const ratings = eligible
      .map((hotel) => hotel.rating)
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value),
      );

    const reviewCounts = eligible
      .map((hotel) => hotel.reviews)
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value),
      );

    const distances = eligible
      .map((hotel) =>
        this.parseDistanceKm(
          hotel.distanceFromCenter,
        ),
      )
      .filter(
        (value): value is number =>
          value !== null,
      );

    if (prices.length === 0) {
      warnings.push(
        'Some or all hotel offers did not include a usable nightly price.',
      );
    }

    if (ratings.length === 0) {
      warnings.push(
        'Some or all hotel offers did not include a usable rating.',
      );
    }

    if (reviewCounts.length === 0) {
      warnings.push(
        'Some or all hotel offers did not include review counts.',
      );
    }

    if (distances.length === 0) {
      warnings.push(
        'Hotel location distance was unavailable for the returned offers.',
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. Score every eligible hotel
     * ---------------------------------------------------------
     *
     * The ranking remains deterministic.
     *
     * No AI is involved here.
     *
     * We intentionally keep ALL ranked hotels because other
     * backend services may need the complete candidate set.
     * The recommendation layer will limit what reaches the
     * frontend to the recommended hotel + 3 alternatives.
     * ---------------------------------------------------------
     */

    const rankedHotels: RankedHotel[] = eligible
      .map((hotel): RankedHotel => {
        const price =
          this.parsePrice(hotel.price);

        const rating =
          this.parseNumber(hotel.rating);

        const reviews =
          this.parseNumber(hotel.reviews);

        const distance =
          this.parseDistanceKm(
            hotel.distanceFromCenter,
          );

        /*
         * Lower price is better.
         */

        const priceScore =
          this.inverseScore(
            price,
            prices,
          );

        /*
         * Rating is adjusted by review confidence.
         *
         * This prevents a 5.0 rating with one review from
         * automatically beating a 4.6 rating with thousands
         * of reviews.
         */

        const ratingScore =
          this.confidenceAdjustedRating(
            rating,
            reviews,
          );

        /*
         * Review count contributes independently.
         */

        const reviewScore =
          this.reviewConfidenceScore(
            reviews,
          );

        /*
         * Lower distance is better.
         */

        const locationScore =
          this.inverseScore(
            distance,
            distances,
          );

        /*
         * Travel-style preference scores.
         */

        const coupleScore =
          this.preferenceScore(
            hotel,
            'couple',
          );

        const familyScore =
          this.preferenceScore(
            hotel,
            'family',
          );

        /*
         * Property type provides a small additional signal.
         */

        const propertyScore =
          this.propertyTypeScore(hotel);

        /*
         * -----------------------------------------------------
         * Base value score
         * -----------------------------------------------------
         */

        let valueScore =
          priceScore * 0.30 +
          ratingScore * 0.30 +
          reviewScore * 0.15 +
          locationScore * 0.15 +
          propertyScore * 0.10;

        /*
         * Travel style adjustment.
         */

        if (travelStyle === 'Couple') {
          valueScore +=
            coupleScore * 0.08;
        } else if (
          travelStyle === 'Family'
        ) {
          valueScore +=
            familyScore * 0.08;
        }

        /*
         * Penalize hotels with extremely weak review evidence.
         */

        const lowReviewPenalty =
          this.lowReviewPenalty(
            reviews,
          );

        const finalScore =
          valueScore -
          lowReviewPenalty;

        return {
          ...hotel,

          score: this.round(
            Math.max(
              0,
              Math.min(
                finalScore,
                100,
              ),
            ),
          ),

          tags: [],
        };
      })
      .sort((a, b) => {
        /*
         * Primary sort:
         * overall score.
         */

        if (b.score !== a.score) {
          return b.score - a.score;
        }

        /*
         * Secondary sort:
         * confidence-adjusted rating.
         */

        const aRating =
          this.confidenceAdjustedRating(
            this.parseNumber(a.rating),
            this.parseNumber(a.reviews),
          );

        const bRating =
          this.confidenceAdjustedRating(
            this.parseNumber(b.rating),
            this.parseNumber(b.reviews),
          );

        if (bRating !== aRating) {
          return bRating - aRating;
        }

        /*
         * Final sort:
         * lower price.
         */

        const aPrice =
          this.parsePrice(a.price) ??
          Number.POSITIVE_INFINITY;

        const bPrice =
          this.parsePrice(b.price) ??
          Number.POSITIVE_INFINITY;

        return aPrice - bPrice;
      });

    /*
     * ---------------------------------------------------------
     * 4. Identify category winners
     * ---------------------------------------------------------
     */

    const cheapest =
      this.minBy(
        rankedHotels,
        (hotel) =>
          this.parsePrice(
            hotel.price,
          ),
      );

    const bestRated =
      this.maxBy(
        rankedHotels,
        (hotel) =>
          this.confidenceAdjustedRating(
            this.parseNumber(
              hotel.rating,
            ),
            this.parseNumber(
              hotel.reviews,
            ),
          ),
      );

    const bestLocation =
      this.minBy(
        rankedHotels,
        (hotel) =>
          this.parseDistanceKm(
            hotel.distanceFromCenter,
          ),
      );

    const bestForCouples =
      this.maxBy(
        rankedHotels,
        (hotel) =>
          this.coupleScore(hotel),
      );

    const bestForFamilies =
      this.maxBy(
        rankedHotels,
        (hotel) =>
          this.familyScore(hotel),
      );

    /*
     * Since rankedHotels is sorted by score, the first hotel
     * is the deterministic best-value hotel.
     */

    const bestValue =
      rankedHotels[0] ?? null;

    /*
     * ---------------------------------------------------------
     * 5. Assign ranking tags
     * ---------------------------------------------------------
     */

    const categoryMap = new Map<
      string,
      Set<HotelRankCategory>
    >();

    const addTag = (
      hotel: RankedHotel | null,
      tag: HotelRankCategory,
    ) => {
      if (!hotel) {
        return;
      }

      const key =
        this.hotelKey(hotel);

      if (!categoryMap.has(key)) {
        categoryMap.set(
          key,
          new Set<HotelRankCategory>(),
        );
      }

      categoryMap
        .get(key)!
        .add(tag);
    };

    addTag(
      bestValue,
      'best-value',
    );

    addTag(
      cheapest,
      'cheapest',
    );

    addTag(
      bestRated,
      'best-rated',
    );

    addTag(
      bestLocation,
      'best-location',
    );

    addTag(
      bestForCouples,
      'best-for-couples',
    );

    addTag(
      bestForFamilies,
      'best-for-families',
    );

    for (const hotel of rankedHotels) {
      hotel.tags = Array.from(
        categoryMap.get(
          this.hotelKey(hotel),
        ) ?? [],
      );
    }

    /*
     * ---------------------------------------------------------
     * 6. Logging
     * ---------------------------------------------------------
     */

    this.logger.log({
      originalCount,

      filteredCount:
        eligible.length,

      bestValue:
        bestValue?.name,

      cheapest:
        cheapest?.name,

      bestRated:
        bestRated?.name,

      bestLocation:
        bestLocation?.name,

      bestForCouples:
        bestForCouples?.name,

      bestForFamilies:
        bestForFamilies?.name,
    });

    /*
     * ---------------------------------------------------------
     * 7. Return complete ranking
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     * Do not slice rankedHotels here.
     *
     * BudgetService may need all candidates.
     * RecommendationAgent will expose only the top 3
     * alternatives to the frontend.
     * ---------------------------------------------------------
     */

    return {
      bestValue,

      cheapest,

      bestRated,

      bestLocation,

      bestForCouples,

      bestForFamilies,

      rankedHotels,

      filteredCount:
        eligible.length,

      originalCount,

      warnings,
    };
  }

  /*
   * =========================================================
   * Category filtering
   * =========================================================
   */

  private applyCategoryFilter(
    hotels: Hotel[],
    category?: NonNullable<
      TripPreferences['accommodation']
    >['category'],
  ): Hotel[] {
    if (!category) {
      return [...hotels];
    }

    return hotels.filter((hotel) => {
      const price =
        this.parsePrice(hotel.price);

      if (price === null) {
        return false;
      }

      switch (category) {
        case 'Budget':
          return price <= 80;

        case 'Mid-range':
          return (
            price > 80 &&
            price <= 200
          );

        case 'Luxury':
          return price > 200;

        default:
          return true;
      }
    });
  }

  /*
   * =========================================================
   * Couples scoring
   * =========================================================
   */

  private coupleScore(
    hotel: Hotel,
  ): number {
    let score =
      this.basePreferenceScore(
        hotel,
      );

    const amenities =
      this.normalizedAmenities(
        hotel,
      );

    if (
      amenities.some((item) =>
        /spa|pool|restaurant|bar|room service/i.test(
          item,
        ),
      )
    ) {
      score += 12;
    }

    if (
      /villa|resort|boutique|suite/i.test(
        `${hotel.name} ${hotel.description}`,
      )
    ) {
      score += 12;
    }

    if (
      amenities.some((item) =>
        /kitchen|washer|family|kids/i.test(
          item,
        ),
      )
    ) {
      score -= 3;
    }

    return Math.min(
      score,
      100,
    );
  }

  /*
   * =========================================================
   * Family scoring
   * =========================================================
   */

  private familyScore(
    hotel: Hotel,
  ): number {
    let score =
      this.basePreferenceScore(
        hotel,
      );

    const amenities =
      this.normalizedAmenities(
        hotel,
      );

    if (
      amenities.some((item) =>
        /pool|restaurant|parking|laundry|kitchen|family|kids/i.test(
          item,
        ),
      )
    ) {
      score += 10;
    }

    if (
      /family|suite|apartment|residence/i.test(
        `${hotel.name} ${hotel.description}`,
      )
    ) {
      score += 10;
    }

    return Math.min(
      score,
      100,
    );
  }

  /*
   * =========================================================
   * Preference scoring
   * =========================================================
   */

  private preferenceScore(
    hotel: Hotel,
    style: 'couple' | 'family',
  ): number {
    return style === 'couple'
      ? this.coupleScore(hotel)
      : this.familyScore(hotel);
  }

  /*
   * =========================================================
   * Base preference score
   * =========================================================
   */

  private basePreferenceScore(
    hotel: Hotel,
  ): number {
    const rating =
      this.parseNumber(
        hotel.rating,
      );

    const reviews =
      this.parseNumber(
        hotel.reviews,
      );

    return this.confidenceAdjustedRating(
      rating,
      reviews,
    );
  }

  /*
   * =========================================================
   * Amenities
   * =========================================================
   */

  private normalizedAmenities(
    hotel: Hotel,
  ): string[] {
    return (
      hotel.amenities ?? []
    ).map((item) =>
      item.toLowerCase(),
    );
  }

  /*
   * =========================================================
   * Property type
   * =========================================================
   */

  private propertyTypeScore(
    hotel: Hotel,
  ): number {
    const text =
      `${hotel.name} ${hotel.description}`.toLowerCase();

    if (
      /hotel|boutique|resort|suite/.test(
        text,
      )
    ) {
      return 100;
    }

    if (
      /apartment|residence|serviced apartment/.test(
        text,
      )
    ) {
      return 75;
    }

    if (
      /hostel|capsule/.test(
        text,
      )
    ) {
      return 50;
    }

    return 65;
  }

  /*
   * =========================================================
   * Rating confidence
   * =========================================================
   */

  private confidenceAdjustedRating(
    rating: number | null,
    reviews: number | null,
  ): number {
    if (
      rating === null ||
      !Number.isFinite(rating)
    ) {
      return 50;
    }

    const safeRating =
      Math.max(
        0,
        Math.min(
          rating,
          5,
        ),
      );

    if (
      reviews === null ||
      reviews <= 0
    ) {
      return 35;
    }

    const confidence =
      Math.min(
        Math.log10(
          reviews + 1,
        ) / 3,
        1,
      );

    const baseline = 3.5;

    const adjustedRating =
      safeRating * confidence +
      baseline *
        (1 - confidence);

    return (
      adjustedRating / 5
    ) * 100;
  }

  /*
   * =========================================================
   * Review confidence
   * =========================================================
   */

  private reviewConfidenceScore(
    reviews: number | null,
  ): number {
    if (
      reviews === null ||
      reviews <= 0
    ) {
      return 20;
    }

    return Math.min(
      (Math.log10(
        reviews + 1,
      ) /
        3) *
        100,
      100,
    );
  }

  /*
   * =========================================================
   * Low review penalty
   * =========================================================
   */

  private lowReviewPenalty(
    reviews: number | null,
  ): number {
    if (
      reviews === null ||
      reviews <= 0
    ) {
      return 25;
    }

    if (reviews < 5) {
      return 20;
    }

    if (reviews < 20) {
      return 10;
    }

    if (reviews < 100) {
      return 5;
    }

    return 0;
  }

  /*
   * =========================================================
   * Direct score
   * =========================================================
   */

  private directScore(
    value: number | undefined | null,
    values: number[],
  ): number {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return 50;
    }

    if (values.length <= 1) {
      return 100;
    }

    const min =
      Math.min(...values);

    const max =
      Math.max(...values);

    if (max === min) {
      return 100;
    }

    return (
      ((value - min) /
        (max - min)) *
      100
    );
  }

  /*
   * =========================================================
   * Inverse score
   * =========================================================
   *
   * Used where smaller values are better.
   *
   * Price:
   * cheaper = higher score
   *
   * Distance:
   * closer = higher score
   * =========================================================
   */

  private inverseScore(
    value: number | null,
    values: number[],
  ): number {
    if (
      value === null ||
      !Number.isFinite(value)
    ) {
      return 50;
    }

    if (values.length <= 1) {
      return 100;
    }

    const min =
      Math.min(...values);

    const max =
      Math.max(...values);

    if (max === min) {
      return 100;
    }

    return (
      ((max - value) /
        (max - min)) *
      100
    );
  }

  /*
   * =========================================================
   * Number parsing
   * =========================================================
   */

  private parseNumber(
    value: unknown,
  ): number | null {
    if (
      typeof value === 'number'
    ) {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (
      typeof value !== 'string'
    ) {
      return null;
    }

    const cleaned =
      value
        .replace(/,/g, '')
        .replace(
          /[^\d.-]/g,
          '',
        );

    if (!cleaned) {
      return null;
    }

    const parsed =
      Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  /*
   * =========================================================
   * Price parsing
   * =========================================================
   */

  private parsePrice(
    value: unknown,
  ): number | null {
    if (
      typeof value === 'number'
    ) {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (
      typeof value !== 'string'
    ) {
      return null;
    }

    if (
      /unknown|contact|n\/a|not available/i.test(
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

    const number =
      Number(match[0]);

    return Number.isFinite(number)
      ? number
      : null;
  }

  /*
   * =========================================================
   * Distance parsing
   * =========================================================
   */

  private parseDistanceKm(
    value?: string,
  ): number | null {
    if (!value) {
      return null;
    }

    const match =
      value
        .replace(/,/g, '')
        .match(
          /(\d+(?:\.\d+)?)\s*(km|mi|miles?|m)\b/i,
        );

    if (!match) {
      return null;
    }

    const distance =
      Number(match[1]);

    if (
      !Number.isFinite(
        distance,
      )
    ) {
      return null;
    }

    const unit =
      match[2].toLowerCase();

    if (unit === 'm') {
      return distance / 1000;
    }

    if (
      unit.startsWith('mi')
    ) {
      return distance * 1.60934;
    }

    return distance;
  }

  /*
   * =========================================================
   * Minimum value
   * =========================================================
   */

  private minBy(
    hotels: RankedHotel[],
    getter: (
      hotel: RankedHotel,
    ) => number | null,
  ): RankedHotel | null {
    let best:
      | RankedHotel
      | null = null;

    let bestValue =
      Number.POSITIVE_INFINITY;

    for (
      const hotel of hotels
    ) {
      const value =
        getter(hotel);

      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      if (
        value < bestValue
      ) {
        bestValue = value;
        best = hotel;
      }
    }

    return best;
  }

  /*
   * =========================================================
   * Maximum value
   * =========================================================
   */

  private maxBy(
    hotels: RankedHotel[],
    getter: (
      hotel: RankedHotel,
    ) => number | null,
  ): RankedHotel | null {
    let best:
      | RankedHotel
      | null = null;

    let bestValue =
      Number.NEGATIVE_INFINITY;

    for (
      const hotel of hotels
    ) {
      const value =
        getter(hotel);

      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      if (
        value > bestValue
      ) {
        bestValue = value;
        best = hotel;
      }
    }

    return best;
  }

  /*
   * =========================================================
   * Hotel identity key
   * =========================================================
   */

  private hotelKey(
    hotel: Hotel,
  ): string {
    return [
      hotel.name,
      hotel.address,
      hotel.price,
    ].join('|');
  }

  /*
   * =========================================================
   * Rounding
   * =========================================================
   */

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