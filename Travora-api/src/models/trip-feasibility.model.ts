export type FeasibilityStatus =
  | 'comfortable'
  | 'feasible'
  | 'tight'
  | 'over-budget'
  | 'insufficient-data';

export interface TripFeasibility {
  status: FeasibilityStatus;

  feasible: boolean;

  fitsBudget: boolean | null;

  budget: number | null;

  estimatedTotal: number;

  remaining: number | null;

  overBudget: number;

  utilizationPercent: number | null;

  confidence: number;

  reasons: string[];

  warnings: string[];

  assumptions: string[];
}