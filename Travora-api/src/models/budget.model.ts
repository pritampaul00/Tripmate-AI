import { BudgetCurrency } from './trip-request.model';

export type BudgetStatus =
  | 'under-budget'
  | 'on-budget'
  | 'over-budget'
  | 'no-budget';

export type BudgetHealth =
  | 'comfortable'
  | 'tight'
  | 'risky'
  | 'over-budget'
  | 'unknown';

export type BudgetRisk =
  | 'low'
  | 'medium'
  | 'high'
  | 'unknown';

export type BudgetCategory =
  | 'flights'
  | 'hotel'
  | 'food'
  | 'transportation'
  | 'activities'
  | 'miscellaneous';

export interface BudgetRecommendation {
  type:
    | 'info'
    | 'warning'
    | 'saving-opportunity';

  message: string;

  savings?: number;

  category?: BudgetCategory;
}

export interface BudgetBreakdown {
  currency: BudgetCurrency;
  budget: number | null;

  flights: number;
  hotel: number;
  food: number;
  transportation: number;
  activities: number;
  miscellaneous: number;

  total: number;
  remaining: number | null;
  overBudget: number;

  utilizationPercent: number | null;

  hotelNights: number;

  fixedCost: number;
  variableCost: number;

  status: BudgetStatus;

  health: BudgetHealth;
  risk: BudgetRisk;

  dailyAllowance: number | null;

  largestExpense: BudgetCategory | null;

  recommendations: BudgetRecommendation[];

  fxRateFromUsd: number;
  fxSource: 'configured' | 'fallback';

  assumptions: string[];
  warnings: string[];
}

export interface BudgetAnalysis {
  budget: BudgetBreakdown;

  budgetScore: number;

  summary: string;

  alternatives: BudgetRecommendation[];
}