import { Injectable, Logger } from '@nestjs/common';

import { TravelState } from '../travel.state';
import { BudgetService } from '../../tools/budget.service';
import { TripFeasibilityService } from '../../tools/trip-feasibility.service';

@Injectable()
export class TripFeasibilityNode {
  private readonly logger =
    new Logger(TripFeasibilityNode.name);

  constructor(
    private readonly budgetService: BudgetService,
    private readonly tripFeasibilityService: TripFeasibilityService,
  ) {}

  async invoke(state: TravelState) {
    this.logger.log(
      '📊 Trip Feasibility Node Started',
    );

    /*
     * The itinerary is now the authoritative
     * source for the generated daily plan.
     */
    const dailyPlans =
      state.itinerary?.dailyPlans ?? [];

    /*
     * Recalculate the complete trip budget
     * from the final itinerary.
     *
     * This is important because the itinerary
     * may have been generated or modified after
     * the initial recommendation.
     */
    const budgetBreakdown =
      this.budgetService.calculate(
        state,
        dailyPlans,
      );

    /*
     * Evaluate the final calculated budget.
     */
    const tripFeasibility =
      this.tripFeasibilityService.evaluate(
        budgetBreakdown,
      );

    this.logger.log({
      status:
        tripFeasibility.status,

      feasible:
        tripFeasibility.feasible,

      fitsBudget:
        tripFeasibility.fitsBudget,

      budget:
        tripFeasibility.budget,

      estimatedTotal:
        tripFeasibility.estimatedTotal,

      remaining:
        tripFeasibility.remaining,

      overBudget:
        tripFeasibility.overBudget,

      utilizationPercent:
        tripFeasibility.utilizationPercent,

      confidence:
        tripFeasibility.confidence,
    });

    /*
     * Return both values into TravelState.
     *
     * These become the canonical values
     * consumed by the ResponseAgent.
     */
    return {
      budgetBreakdown,
      tripFeasibility,
    };
  }
}