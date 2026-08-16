export interface TripSummary {
  destination: string;
  origin: string;
  travelers: number;
  totalDays: number;
  travelDates: string;
  estimatedBudget: number;
  travelStyle: string;
  summary: string;
}

export type ActivityCategory =
  | 'attraction'
  | 'food'
  | 'shopping'
  | 'culture'
  | 'nature'
  | 'nightlife'
  | 'experience';

export interface Activity {
  id?: string;

  time: string;

  title: string;

  description: string;

  location: string;

  area?: string;

  latitude?: number;

  longitude?: number;

  durationMinutes?: number;

  category?: ActivityCategory | string;

  estimatedCost: number;

  currency?: string;

  bestTime?: string;

  tags?: string[];
}

export interface DailyPlan {
  day: number;

  date?: string;

  title: string;

  summary?: string;

  subtotal: number;

  estimatedTravelTimeMinutes?: number;

  activities: Activity[];

  morning?: string;

  afternoon?: string;

  evening?: string;
}

export interface BudgetBreakdown {
  currency?: string;

  budget?: number | null;

  flights: number;

  hotel: number;

  food: number;

  transportation: number;

  activities: number;

  miscellaneous: number;

  total: number;

  remaining: number | null;

  overBudget?: number;

  utilizationPercent?: number | null;

  hotelNights?: number;

  fixedCost?: number;

  variableCost?: number;

  status?: string;

  fxRateFromUsd?: number;

  fxSource?: string;

  assumptions?: string[];

  warnings?: string[];
}

export interface TravelTip {
  tag:
    | 'WEATHER'
    | 'TRANSIT'
    | 'BOOKING WINDOW'
    | 'MONEY'
    | 'CROWDS'
    | 'SAFETY';

  title: string;

  description: string;
}

export interface Itinerary {
  summary: TripSummary;

  flightRecommendationReason: string;

  flightBookingTips: string[];

  hotelRecommendationReason: string;

  hotelBookingTips: string[];

  dailyPlans: DailyPlan[];

  budgetBreakdown: BudgetBreakdown;

  travelTips: TravelTip[];

  totalEstimatedCost: string;

  assumptions?: string[];

  warnings?: string[];

  totalEstimatedActivityCost?: number;
}