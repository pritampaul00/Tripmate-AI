import { Injectable, Logger } from '@nestjs/common';

import { BudgetBreakdown } from '../models/budget.model';
import { TripFeasibility } from '../models/trip-feasibility.model';

@Injectable()
export class TripFeasibilityService {
  private readonly logger =
    new Logger(TripFeasibilityService.name);

  evaluate(
    budgetBreakdown: BudgetBreakdown | null | undefined,
  ): TripFeasibility {
    if (!budgetBreakdown) {
      return {
        status: 'insufficient-data',

        feasible: false,

        fitsBudget: null,

        budget: null,

        estimatedTotal: 0,

        remaining: null,

        overBudget: 0,

        utilizationPercent: null,

        confidence: 0,

        reasons: [
          'A complete budget breakdown is not available yet.',
        ],

        warnings: [
          'Trip feasibility could not be evaluated because budget information is incomplete.',
        ],

        assumptions: [],
      };
    }

    const {
      budget,
      total,
      remaining,
      overBudget,
      utilizationPercent,
      status,
      health,
      warnings,
      assumptions,
    } = budgetBreakdown;

    /*
     * No budget supplied.
     */
    if (budget == null) {
      const confidence =
        this.calculateNoBudgetConfidence(
          budgetBreakdown,
        );

      return {
        status:
          total > 0
            ? 'feasible'
            : 'insufficient-data',

        feasible: total > 0,

        fitsBudget: null,

        budget: null,

        estimatedTotal: total,

        remaining: null,

        overBudget: 0,

        utilizationPercent: null,

        confidence,

        reasons: [
          'A trip cost could be estimated from the selected flight, accommodation and planned expenses.',
          'No spending limit was provided, so affordability against a user-defined budget cannot be determined.',
        ],

        warnings: [
          ...warnings,
          'No user budget was provided.',
        ],

        assumptions: [
          ...assumptions,
          'Feasibility is based on estimated trip cost because no maximum budget was specified.',
        ],
      };
    }

    /*
     * Budget exists but there is no meaningful
     * estimated trip cost.
     */
    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return {
        status: 'insufficient-data',

        feasible: false,

        fitsBudget: null,

        budget,

        estimatedTotal: 0,

        remaining,

        overBudget: 0,

        utilizationPercent,

        confidence: 20,

        reasons: [
          'The available trip data is insufficient to calculate a meaningful total cost.',
        ],

        warnings: [
          ...warnings,
          'Estimated trip cost is unavailable or invalid.',
        ],

        assumptions,
      };
    }

    /*
     * -------------------------------------------------------
     * Over budget
     * -------------------------------------------------------
     */
    if (
      remaining != null &&
      remaining < 0
    ) {
      const confidence =
        this.calculateConfidence(
          budgetBreakdown,
          false,
        );

      const reasons = [
        `The estimated trip cost is ${this.formatMoney(
          total,
          budgetBreakdown.currency,
        )}.`,

        `The requested budget is ${this.formatMoney(
          budget,
          budgetBreakdown.currency,
        )}.`,

        `The current plan exceeds the budget by ${this.formatMoney(
          Math.abs(remaining),
          budgetBreakdown.currency,
        )}.`,
      ];

      const feasibilityWarnings = [
        ...warnings,
        'The current recommendation does not fit within the requested budget.',
      ];

      if (
        health === 'over-budget'
      ) {
        feasibilityWarnings.push(
          'The selected trip requires reducing or changing one or more major expenses.',
        );
      }

      this.logger.warn({
        status: 'over-budget',
        budget,
        total,
        overBudget: Math.abs(
          remaining,
        ),
        utilizationPercent,
      });

      return {
        status: 'over-budget',

        feasible: false,

        fitsBudget: false,

        budget,

        estimatedTotal: total,

        remaining: 0,

        overBudget:
          Math.abs(remaining),

        utilizationPercent,

        confidence,

        reasons,

        warnings:
          feasibilityWarnings,

        assumptions,
      };
    }

    /*
     * -------------------------------------------------------
     * Comfortable
     * -------------------------------------------------------
     */
    if (
      utilizationPercent != null &&
      utilizationPercent < 85
    ) {
      const confidence =
        this.calculateConfidence(
          budgetBreakdown,
          true,
        );

      const reasons = [
        `The estimated trip cost is ${this.formatMoney(
          total,
          budgetBreakdown.currency,
        )}.`,

        `The plan uses approximately ${this.round(
          utilizationPercent,
        )}% of the available budget.`,

        `Approximately ${this.formatMoney(
          remaining ?? 0,
          budgetBreakdown.currency,
        )} remains available as a buffer.`,
      ];

      this.logger.log({
        status: 'comfortable',
        budget,
        total,
        remaining,
        utilizationPercent,
      });

      return {
        status: 'comfortable',

        feasible: true,

        fitsBudget: true,

        budget,

        estimatedTotal: total,

        remaining,

        overBudget: 0,

        utilizationPercent,

        confidence,

        reasons,

        warnings,

        assumptions,
      };
    }

    /*
     * -------------------------------------------------------
     * Tight
     * -------------------------------------------------------
     */
    if (
      utilizationPercent != null &&
      utilizationPercent >= 85
    ) {
      const confidence =
        this.calculateConfidence(
          budgetBreakdown,
          true,
        );

      const reasons = [
        `The estimated trip cost is ${this.formatMoney(
          total,
          budgetBreakdown.currency,
        )}.`,

        `The plan uses approximately ${this.round(
          utilizationPercent,
        )}% of the available budget.`,

        `Only ${this.formatMoney(
          remaining ?? 0,
          budgetBreakdown.currency,
        )} remains as a buffer.`,
      ];

      const feasibilityWarnings = [
        ...warnings,
        'The trip fits the requested budget but leaves limited room for unexpected expenses.',
      ];

      this.logger.log({
        status: 'tight',
        budget,
        total,
        remaining,
        utilizationPercent,
      });

      return {
        status: 'tight',

        feasible: true,

        fitsBudget: true,

        budget,

        estimatedTotal: total,

        remaining,

        overBudget: 0,

        utilizationPercent,

        confidence,

        reasons,

        warnings:
          feasibilityWarnings,

        assumptions,
      };
    }

    /*
     * Fallback.
     */
    return {
      status:
        status === 'over-budget'
          ? 'over-budget'
          : 'feasible',

      feasible:
        status !==
        'over-budget',

      fitsBudget:
        status !==
        'over-budget',

      budget,

      estimatedTotal: total,

      remaining,

      overBudget,

      utilizationPercent,

      confidence:
        this.calculateConfidence(
          budgetBreakdown,
          status !==
            'over-budget',
        ),

      reasons: [
        `The estimated trip cost is ${this.formatMoney(
          total,
          budgetBreakdown.currency,
        )}.`,
      ],

      warnings,

      assumptions,
    };
  }

  private calculateConfidence(
    breakdown: BudgetBreakdown,
    fitsBudget: boolean,
  ): number {
    let confidence = 75;

    /*
     * Complete fixed costs improve confidence.
     */
    if (
      breakdown.flights > 0 &&
      breakdown.hotel > 0
    ) {
      confidence += 10;
    }

    /*
     * Complete variable estimates improve confidence.
     */
    if (
      breakdown.food >= 0 &&
      breakdown.transportation >= 0 &&
      breakdown.miscellaneous >= 0
    ) {
      confidence += 5;
    }

    /*
     * Activities are available.
     */
    if (
      breakdown.activities > 0
    ) {
      confidence += 3;
    }

    /*
     * FX fallback slightly reduces confidence.
     */
    if (
      breakdown.fxSource ===
      'fallback'
    ) {
      confidence -= 5;
    }

    /*
     * An over-budget result is still a valid
     * feasibility determination, but has less
     * confidence because actual booking prices
     * can change.
     */
    if (!fitsBudget) {
      confidence -= 5;
    }

    return Math.min(
      Math.max(
        confidence,
        0,
      ),
      100,
    );
  }

  private calculateNoBudgetConfidence(
    breakdown: BudgetBreakdown,
  ): number {
    let confidence = 55;

    if (
      breakdown.flights > 0
    ) {
      confidence += 10;
    }

    if (
      breakdown.hotel > 0
    ) {
      confidence += 10;
    }

    if (
      breakdown.food >= 0 &&
      breakdown.transportation >= 0
    ) {
      confidence += 5;
    }

    if (
      breakdown.fxSource ===
      'fallback'
    ) {
      confidence -= 5;
    }

    return Math.min(
      Math.max(
        confidence,
        0,
      ),
      100,
    );
  }

  private formatMoney(
    amount: number,
    currency: string,
  ): string {
    return `${currency} ${this.round(
      amount,
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
}