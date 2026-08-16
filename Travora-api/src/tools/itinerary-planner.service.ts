// import { Injectable, Logger } from '@nestjs/common';

// import {
//   Activity,
//   DailyPlan,
//   Itinerary,
// } from '../models/itinerary.model';

// @Injectable()
// export class ItineraryPlannerService {
//   private readonly logger =
//     new Logger(
//       ItineraryPlannerService.name,
//     );

//   /**
//    * Normalize and validate an existing itinerary.
//    *
//    * This service does not generate activities.
//    * The ItineraryAgent remains responsible for
//    * generating the initial itinerary.
//    *
//    * This service makes the generated itinerary
//    * deterministic and usable by the rest of
//    * the backend.
//    */
//   plan(
//     itinerary: Itinerary,
//   ): Itinerary {
//     if (!itinerary) {
//       throw new Error(
//         'Itinerary is required.',
//       );
//     }

//     const dailyPlans =
//       Array.isArray(
//         itinerary.dailyPlans,
//       )
//         ? itinerary.dailyPlans
//         : [];

//     const plannedDays =
//       dailyPlans.map(
//         (day, index) =>
//           this.normalizeDay(
//             day,
//             index + 1,
//           ),
//       );

//     const totalEstimatedActivityCost =
//       this.round(
//         plannedDays.reduce(
//           (total, day) =>
//             total +
//             day.subtotal,
//           0,
//         ),
//       );

//     const warnings =
//       [
//         ...(itinerary.warnings ?? []),
//         ...this.generateWarnings(
//           plannedDays,
//         ),
//       ];

//     const assumptions =
//       [
//         ...(itinerary.assumptions ?? []),
//         'Activity costs are estimates and may change at booking time.',
//         'Travel time is estimated from the available itinerary information.',
//       ];

//     this.logger.log({
//       days:
//         plannedDays.length,

//       activities:
//         plannedDays.reduce(
//           (count, day) =>
//             count +
//             day.activities.length,
//           0,
//         ),

//       totalEstimatedActivityCost,
//     });

//     return {
//       ...itinerary,

//       dailyPlans:
//         plannedDays,

//       totalEstimatedActivityCost,

//       warnings:
//         this.uniqueStrings(
//           warnings,
//         ),

//       assumptions:
//         this.uniqueStrings(
//           assumptions,
//         ),
//     };
//   }

//   /**
//    * Normalize a single day.
//    */
//   private normalizeDay(
//     day: DailyPlan,
//     fallbackDay: number,
//   ): DailyPlan {
//     const activities =
//       Array.isArray(
//         day.activities,
//       )
//         ? day.activities
//             .filter(
//               (activity) =>
//                 this.isValidActivity(
//                   activity,
//                 ),
//             )
//             .map(
//               (activity, index) =>
//                 this.normalizeActivity(
//                   activity,
//                   fallbackDay,
//                   index,
//                 ),
//             )
//         : [];

//     const subtotal =
//       this.round(
//         activities.reduce(
//           (total, activity) =>
//             total +
//             Math.max(
//               Number(
//                 activity.estimatedCost,
//               ) || 0,
//               0,
//             ),
//           0,
//         ),
//       );

//     return {
//       ...day,

//       day:
//         Number.isFinite(day.day) &&
//         day.day > 0
//           ? day.day
//           : fallbackDay,

//       title:
//         day.title?.trim() ||
//         `Day ${fallbackDay}`,

//       summary:
//         day.summary?.trim() ||
//         undefined,

//       subtotal,

//       estimatedTravelTimeMinutes:
//         this.normalizeNumber(
//           day.estimatedTravelTimeMinutes,
//         ),

//       activities,
//     };
//   }

//   /**
//    * Normalize an activity without changing
//    * the original meaning supplied by the LLM.
//    */
//   private normalizeActivity(
//     activity: Activity,
//     day: number,
//     index: number,
//   ): Activity {
//     const id =
//       activity.id?.trim() ||
//       `day-${day}-activity-${index + 1}`;

//     const estimatedCost =
//       Math.max(
//         Number(
//           activity.estimatedCost,
//         ) || 0,
//         0,
//       );

//     const durationMinutes =
//       this.normalizeNumber(
//         activity.durationMinutes,
//       );

//     const latitude =
//       this.normalizeCoordinate(
//         activity.latitude,
//         -90,
//         90,
//       );

//     const longitude =
//       this.normalizeCoordinate(
//         activity.longitude,
//         -180,
//         180,
//       );

//     return {
//       ...activity,

//       id,

//       time:
//         activity.time?.trim() ||
//         '',

//       title:
//         activity.title?.trim() ||
//         'Untitled activity',

//       description:
//         activity.description?.trim() ||
//         '',

//       location:
//         activity.location?.trim() ||
//         'Location unavailable',

//       area:
//         activity.area?.trim() ||
//         undefined,

//       category:
//         activity.category?.trim() ||
//         'attraction',

//       estimatedCost,

//       currency:
//         activity.currency?.trim() ||
//         undefined,

//       durationMinutes,

//       bestTime:
//         activity.bestTime?.trim() ||
//         undefined,

//       tags:
//         Array.isArray(
//           activity.tags,
//         )
//           ? this.uniqueStrings(
//               activity.tags
//                 .filter(
//                   (
//                     tag,
//                   ) =>
//                     typeof tag ===
//                     'string',
//                 )
//                 .map(
//                   (tag) =>
//                     tag.trim(),
//                 )
//                 .filter(
//                   Boolean,
//                 ),
//             )
//           : [],

//       latitude,

//       longitude,
//     };
//   }

//   /**
//    * Basic activity validation.
//    *
//    * Activities without a meaningful title
//    * or location are discarded.
//    */
//   private isValidActivity(
//     activity: Activity,
//   ): boolean {
//     if (!activity) {
//       return false;
//     }

//     if (
//       typeof activity.title !==
//         'string' ||
//       activity.title.trim()
//         .length === 0
//     ) {
//       return false;
//     }

//     if (
//       typeof activity.location !==
//         'string' ||
//       activity.location.trim()
//         .length === 0
//     ) {
//       return false;
//     }

//     return true;
//   }

//   /**
//    * Detect basic itinerary quality problems.
//    */
//   private generateWarnings(
//     dailyPlans: DailyPlan[],
//   ): string[] {
//     const warnings: string[] = [];

//     if (
//       dailyPlans.length ===
//       0
//     ) {
//       warnings.push(
//         'No daily itinerary was generated.',
//       );

//       return warnings;
//     }

//     const emptyDays =
//       dailyPlans.filter(
//         (day) =>
//           day.activities
//             .length === 0,
//       );

//     if (
//       emptyDays.length > 0
//     ) {
//       warnings.push(
//         `${emptyDays.length} day(s) contain no activities.`,
//       );
//     }

//     const overloadedDays =
//       dailyPlans.filter(
//         (day) =>
//           day.activities
//             .length > 8,
//       );

//     if (
//       overloadedDays.length > 0
//     ) {
//       warnings.push(
//         'Some days contain more than 8 activities and may be too busy.',
//       );
//     }

//     const longDays =
//       dailyPlans.filter(
//         (day) =>
//           day.estimatedTravelTimeMinutes !=
//             null &&
//           day.estimatedTravelTimeMinutes >
//             180,
//       );

//     if (
//       longDays.length > 0
//     ) {
//       warnings.push(
//         'Some days contain more than 3 hours of estimated travel time.',
//       );
//     }

//     return warnings;
//   }

//   private normalizeNumber(
//     value?: number,
//   ): number | undefined {
//     if (
//       value == null ||
//       !Number.isFinite(value)
//     ) {
//       return undefined;
//     }

//     return Math.max(
//       Math.round(value),
//       0,
//     );
//   }

//   private normalizeCoordinate(
//     value: number | undefined,
//     minimum: number,
//     maximum: number,
//   ): number | undefined {
//     if (
//       value == null ||
//       !Number.isFinite(value)
//     ) {
//       return undefined;
//     }

//     if (
//       value < minimum ||
//       value > maximum
//     ) {
//       return undefined;
//     }

//     return value;
//   }

//   private uniqueStrings(
//     values: string[],
//   ): string[] {
//     return Array.from(
//       new Set(
//         values.filter(
//           (value) =>
//             typeof value ===
//               'string' &&
//             value.trim()
//               .length > 0,
//         ),
//       ),
//     );
//   }

//   private round(
//     value: number,
//   ): number {
//     return (
//       Math.round(
//         value * 100,
//       ) / 100
//     );
//   }
// }


import { Injectable, Logger } from '@nestjs/common';

import {
  Activity,
  DailyPlan,
  Itinerary,
} from '../models/itinerary.model';

@Injectable()
export class ItineraryPlannerService {
  private readonly logger =
    new Logger(ItineraryPlannerService.name);

  /*
   * Approximate distance above which we consider
   * two consecutive activities geographically far apart.
   *
   * This is a planning heuristic, not a routing distance.
   */
  private readonly FAR_DISTANCE_KM = 8;

  /**
   * Normalize, validate and geographically organize
   * an existing itinerary.
   */
  plan(
    itinerary: Itinerary,
  ): Itinerary {
    if (!itinerary) {
      throw new Error(
        'Itinerary is required.',
      );
    }

    const dailyPlans =
      Array.isArray(
        itinerary.dailyPlans,
      )
        ? itinerary.dailyPlans
        : [];

    const plannedDays =
      dailyPlans.map(
        (day, index) =>
          this.normalizeDay(
            day,
            index + 1,
          ),
      );

    const totalEstimatedActivityCost =
      this.round(
        plannedDays.reduce(
          (total, day) =>
            total + day.subtotal,
          0,
        ),
      );

    const warnings = [
      ...(itinerary.warnings ?? []),
      ...this.generateWarnings(
        plannedDays,
      ),
    ];

    const assumptions = [
      ...(itinerary.assumptions ?? []),
      'Activity costs are estimates and may change at booking time.',
      'Travel time is estimated from the available itinerary information.',
      'Geographic optimization uses activity coordinates when available.',
    ];

    this.logger.log({
      days:
        plannedDays.length,

      activities:
        plannedDays.reduce(
          (count, day) =>
            count +
            day.activities.length,
          0,
        ),

      totalEstimatedActivityCost,

      geographicallyOptimized:
        plannedDays.some(
          (day) =>
            day.activities.some(
              (activity) =>
                activity.latitude != null &&
                activity.longitude != null,
            ),
        ),
    });

    return {
      ...itinerary,

      dailyPlans:
        plannedDays,

      totalEstimatedActivityCost,

      warnings:
        this.uniqueStrings(
          warnings,
        ),

      assumptions:
        this.uniqueStrings(
          assumptions,
        ),
    };
  }

  /**
   * Normalize and geographically organize
   * a single day.
   */
  private normalizeDay(
    day: DailyPlan,
    fallbackDay: number,
  ): DailyPlan {
    const activities =
      Array.isArray(
        day.activities,
      )
        ? day.activities
            .filter(
              (activity) =>
                this.isValidActivity(
                  activity,
                ),
            )
            .map(
              (activity, index) =>
                this.normalizeActivity(
                  activity,
                  fallbackDay,
                  index,
                ),
            )
        : [];

    /*
     * Phase 2F.4:
     *
     * Reorder activities so that geographically
     * close activities are kept together whenever
     * coordinates are available.
     */
    const organizedActivities =
      this.organizeActivitiesByLocation(
        activities,
      );

    const subtotal =
      this.round(
        organizedActivities.reduce(
          (total, activity) =>
            total +
            Math.max(
              Number(
                activity.estimatedCost,
              ) || 0,
              0,
            ),
          0,
        ),
      );

    return {
      ...day,

      day:
        Number.isFinite(day.day) &&
        day.day > 0
          ? day.day
          : fallbackDay,

      title:
        day.title?.trim() ||
        `Day ${fallbackDay}`,

      summary:
        day.summary?.trim() ||
        undefined,

      subtotal,

      estimatedTravelTimeMinutes:
        this.normalizeNumber(
          day.estimatedTravelTimeMinutes,
        ),

      activities:
        organizedActivities,
    };
  }

  /**
   * Normalize an activity.
   */
  private normalizeActivity(
    activity: Activity,
    day: number,
    index: number,
  ): Activity {
    const id =
      activity.id?.trim() ||
      `day-${day}-activity-${index + 1}`;

    const estimatedCost =
      Math.max(
        Number(
          activity.estimatedCost,
        ) || 0,
        0,
      );

    const durationMinutes =
      this.normalizeNumber(
        activity.durationMinutes,
      );

    const latitude =
      this.normalizeCoordinate(
        activity.latitude,
        -90,
        90,
      );

    const longitude =
      this.normalizeCoordinate(
        activity.longitude,
        -180,
        180,
      );

    return {
      ...activity,

      id,

      time:
        activity.time?.trim() ||
        '',

      title:
        activity.title?.trim() ||
        'Untitled activity',

      description:
        activity.description?.trim() ||
        '',

      location:
        activity.location?.trim() ||
        'Location unavailable',

      area:
        activity.area?.trim() ||
        undefined,

      category:
        activity.category?.trim() ||
        'attraction',

      estimatedCost,

      currency:
        activity.currency?.trim() ||
        undefined,

      durationMinutes,

      bestTime:
        activity.bestTime?.trim() ||
        undefined,

      tags:
        Array.isArray(
          activity.tags,
        )
          ? this.uniqueStrings(
              activity.tags
                .filter(
                  (tag) =>
                    typeof tag ===
                    'string',
                )
                .map(
                  (tag) =>
                    tag.trim(),
                )
                .filter(
                  Boolean,
                ),
            )
          : [],

      latitude,

      longitude,
    };
  }

  /**
   * Organize activities geographically.
   *
   * Strategy:
   *
   * 1. Keep activities without coordinates in
   *    their original relative position.
   *
   * 2. If coordinates exist, use a nearest-neighbor
   *    traversal to reduce unnecessary movement.
   *
   * 3. Never invent coordinates.
   */
  private organizeActivitiesByLocation(
    activities: Activity[],
  ): Activity[] {
    if (
      activities.length <= 2
    ) {
      return activities;
    }

    const coordinateActivities =
      activities.filter(
        (activity) =>
          this.hasCoordinates(
            activity,
          ),
      );

    /*
     * Not enough geographic information.
     * Preserve the LLM ordering.
     */
    if (
      coordinateActivities.length <
      2
    ) {
      return activities;
    }

    const noCoordinateActivities =
      activities.filter(
        (activity) =>
          !this.hasCoordinates(
            activity,
          ),
      );

    /*
     * Start with the first geographically
     * located activity from the original plan.
     *
     * This avoids radically changing the
     * beginning of the LLM-generated itinerary.
     */
    const first =
      coordinateActivities[0];

    const remaining =
      coordinateActivities.slice(1);

    const ordered: Activity[] = [
      first,
    ];

    let current = first;

    while (
      remaining.length > 0
    ) {
      let closestIndex = 0;
      let closestDistance =
        Number.POSITIVE_INFINITY;

      for (
        let index = 0;
        index < remaining.length;
        index++
      ) {
        const candidate =
          remaining[index];

        const distance =
          this.distanceKm(
            current,
            candidate,
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closestIndex =
            index;
        }
      }

      const [next] =
        remaining.splice(
          closestIndex,
          1,
        );

      ordered.push(next);

      current = next;
    }

    /*
     * Activities without coordinates are appended
     * rather than being incorrectly positioned.
     */
    return [
      ...ordered,
      ...noCoordinateActivities,
    ];
  }

  /**
   * Generate warnings for days where activities
   * are geographically scattered.
   */
  private generateWarnings(
    dailyPlans: DailyPlan[],
  ): string[] {
    const warnings: string[] = [];

    if (
      dailyPlans.length ===
      0
    ) {
      warnings.push(
        'No daily itinerary was generated.',
      );

      return warnings;
    }

    const emptyDays =
      dailyPlans.filter(
        (day) =>
          day.activities
            .length === 0,
      );

    if (
      emptyDays.length > 0
    ) {
      warnings.push(
        `${emptyDays.length} day(s) contain no activities.`,
      );
    }

    const overloadedDays =
      dailyPlans.filter(
        (day) =>
          day.activities
            .length > 8,
      );

    if (
      overloadedDays.length > 0
    ) {
      warnings.push(
        'Some days contain more than 8 activities and may be too busy.',
      );
    }

    const longDays =
      dailyPlans.filter(
        (day) =>
          day.estimatedTravelTimeMinutes !=
            null &&
          day.estimatedTravelTimeMinutes >
            180,
      );

    if (
      longDays.length > 0
    ) {
      warnings.push(
        'Some days contain more than 3 hours of estimated travel time.',
      );
    }

    /*
     * Detect geographically scattered days.
     */
    for (
      const day of dailyPlans
    ) {
      const distances =
        this.getConsecutiveDistances(
          day.activities,
        );

      if (
        distances.length ===
        0
      ) {
        continue;
      }

      const farConnections =
        distances.filter(
          (distance) =>
            distance >
            this.FAR_DISTANCE_KM,
        );

      if (
        farConnections.length >
        0
      ) {
        warnings.push(
          `Day ${day.day} contains activities that are geographically far apart. Consider grouping nearby locations together.`,
        );
      }
    }

    return warnings;
  }

  /**
   * Calculate distances between consecutive
   * geographically-known activities.
   */
  private getConsecutiveDistances(
    activities: Activity[],
  ): number[] {
    const distances: number[] = [];

    for (
      let index = 1;
      index < activities.length;
      index++
    ) {
      const previous =
        activities[index - 1];

      const current =
        activities[index];

      if (
        !this.hasCoordinates(
          previous,
        ) ||
        !this.hasCoordinates(
          current,
        )
      ) {
        continue;
      }

      distances.push(
        this.distanceKm(
          previous,
          current,
        ),
      );
    }

    return distances;
  }

  /**
   * Haversine distance between two activities.
   *
   * This represents geographic distance,
   * not actual road or transit distance.
   */
  private distanceKm(
    first: Activity,
    second: Activity,
  ): number {
    if (
      !this.hasCoordinates(
        first,
      ) ||
      !this.hasCoordinates(
        second,
      )
    ) {
      return Number.POSITIVE_INFINITY;
    }

    const earthRadiusKm =
      6371;

    const lat1 =
      this.toRadians(
        first.latitude!,
      );

    const lat2 =
      this.toRadians(
        second.latitude!,
      );

    const deltaLat =
      this.toRadians(
        second.latitude! -
          first.latitude!,
      );

    const deltaLon =
      this.toRadians(
        second.longitude! -
          first.longitude!,
      );

    const a =
      Math.sin(
        deltaLat / 2,
      ) **
        2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
          deltaLon / 2,
        ) **
          2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return (
      earthRadiusKm * c
    );
  }

  private hasCoordinates(
    activity: Activity,
  ): boolean {
    return (
      activity.latitude !=
        null &&
      activity.longitude !=
        null &&
      Number.isFinite(
        activity.latitude,
      ) &&
      Number.isFinite(
        activity.longitude,
      )
    );
  }

  private toRadians(
    degrees: number,
  ): number {
    return (
      (degrees *
        Math.PI) /
      180
    );
  }

  private isValidActivity(
    activity: Activity,
  ): boolean {
    if (!activity) {
      return false;
    }

    if (
      typeof activity.title !==
        'string' ||
      activity.title.trim()
        .length === 0
    ) {
      return false;
    }

    if (
      typeof activity.location !==
        'string' ||
      activity.location.trim()
        .length === 0
    ) {
      return false;
    }

    return true;
  }

  private normalizeNumber(
    value?: number,
  ): number | undefined {
    if (
      value == null ||
      !Number.isFinite(value)
    ) {
      return undefined;
    }

    return Math.max(
      Math.round(value),
      0,
    );
  }

  private normalizeCoordinate(
    value: number | undefined,
    minimum: number,
    maximum: number,
  ): number | undefined {
    if (
      value == null ||
      !Number.isFinite(value)
    ) {
      return undefined;
    }

    if (
      value < minimum ||
      value > maximum
    ) {
      return undefined;
    }

    return value;
  }

  private uniqueStrings(
    values: string[],
  ): string[] {
    return Array.from(
      new Set(
        values.filter(
          (value) =>
            typeof value ===
              'string' &&
            value.trim()
              .length > 0,
        ),
      ),
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