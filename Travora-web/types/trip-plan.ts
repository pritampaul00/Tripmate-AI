import { Flight } from "./flight";
import { Hotel } from "./hotel";
import { FlightRanking } from "./flight-ranking";
import { HotelRanking } from "./hotel-ranking";

export interface TripFeasibility {
  status:
    | "comfortable"
    | "tight"
    | "risky"
    | "over-budget"
    | "unknown"
    | string;

  feasible: boolean;
  fitsBudget: boolean;
  budget: number | null;
  estimatedTotal: number;
  remaining: number;
  overBudget: number;

  utilizationPercent: number;
  confidence: number;

  reasons: string[];
  warnings: string[];
  assumptions: string[];
}

export interface TripBudgetBreakdown {
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
  health?: string;
  risk?: string;

  dailyAllowance?: number | null;
  largestExpense?: string | null;

  recommendations?: {
    type: "info" | "warning" | "saving-opportunity";
    message: string;
    savings?: number;
  }[];

  fxRateFromUsd?: number;
  fxSource?: string;

  assumptions?: string[];
  warnings?: string[];
}

export interface TripDateInfo {
  startDate?: string;
  endDate?: string;

  days: number;
  nights: number;

  flexible: boolean;

  source:
    | "explicit"
    | "flexible-window"
    | "missing"
    | string;

  searchWindow?: {
    startDate: string;
    endDate: string;
  };

  assumptions: string[];
}

export interface TripSummary {
  destination: string;
  origin: string;

  travelers: number;

  days: number;
  nights: number;

  travelStyle?: string;

  budget?: number;
  currency: string;
  summary: string;
}

export interface TripActivity {
  id?: string;

  time: string;
  title: string;
  description: string;
  location: string;

  area?: string;

  latitude?: number;
  longitude?: number;

  durationMinutes?: number;

  category?: string;

  estimatedCost: number;
}

export interface TripDay {
  day: number;
  title: string;
  subtotal: number;
  activities: TripActivity[];
}

export interface TripItinerary {
  days: TripDay[];
}

export interface TripMapStop {
  id?: string;

  title: string;
  location: string;

  latitude?: number;
  longitude?: number;

  time: string;
}

export interface TripMapDay {
  day: number;
  title: string;

  area?: string;

  stops: TripMapStop[];
}

export interface TripMap {
  destination: string;
  days: TripMapDay[];
}

export interface TripRecommendation {
  recommendedFlight: Flight | null;
  recommendedHotel: Hotel | null;

  flightAlternatives: Flight[];
  hotelAlternatives: Hotel[];

  flightPriceInsights: {
    currentPrice: string;
    lowestPrice?: string;
    priceLevel?: string;
    typicalRange?: string;
  } | null;

  decision?: {
    type:
      | "best-value"
      | "budget-optimized"
      | "closest-to-budget"
      | "best-available";

    confidence: number;
    reason: string;
    summary: string;

    signals: string[];
    tradeoffs: string[];

    budgetImpact?: {
      currency: string;
      budget: number;
      estimatedTotal: number;
      remaining: number;
      overBudget: number;
      fitsBudget: boolean;
      utilizationPercent?: number;
    };
  };

  alternativeInsights?: {
    type: "flight" | "hotel";
    name: string;
    price?: string;
    priceDifference?: number;
    score?: number;
    scoreDifference?: number;
    signals: string[];
    reason: string;
  }[];
}

export interface TripOptimization {
  flight: {
    recommended: Flight | null;
    cheapest: Flight | null;
    fastest: Flight | null;
    fewestStops: Flight | null;
    lowestEmissions: Flight | null;
  };

  hotel: {
    recommended: Hotel | null;
    cheapest: Hotel | null;
    bestRated: Hotel | null;
    bestLocation: Hotel | null;
    bestForCouples: Hotel | null;
    bestForFamilies: Hotel | null;
  };

  budgetFit: {
    requestedBudget: number | null;
    currency: string;
    estimatedTotal: number | null;
    remaining: number | null;
    status: string;
  };
}

export interface TripExplanations {
  flight: string;
  hotel: string;
}

export interface HotelRecommendationAlternative {
  name: string;

  price?: string;

  rating?: number;

  reviews?: number;

  website?: string;

  reason: string;
}

export interface HotelRecommendationExplanation {
  reason: string;

  alternatives: HotelRecommendationAlternative[];
}

// export interface TripBookingTips {
//   flight: string[];
//   hotel: string[];
// }

export interface TravelTip {
  tag:
    | "WEATHER"
    | "TRANSIT"
    | "BOOKING WINDOW"
    | "MONEY"
    | "CROWDS"
    | "SAFETY"
    | string;

  title: string;
  description: string;
}

export interface TripPlan {
  id: string;

  status: "ready" | "partial" | string;

  request: unknown;

  dates: TripDateInfo;

  summary: TripSummary;

  recommendedFlight: Flight | null;
  availableFlights: Flight[];

  recommendedHotel: Hotel | null;
  availableHotels: Hotel[];

  flightAlternatives: Flight[];
  hotelAlternatives: Hotel[];

  flightRanking: FlightRanking | null;
  hotelRanking: HotelRanking | null;

  budget: TripBudgetBreakdown | null;

  tripFeasibility?: TripFeasibility;

  totalEstimatedCost: string;

  itinerary: TripItinerary;

  map: TripMap;

  optimization: TripOptimization;

  explanations: TripExplanations;

  hotelExplanation?: HotelRecommendationExplanation;

  //bookingTips: TripBookingTips;

  travelTips: TravelTip[];

  assumptions: string[];

  warnings: string[];
}

export interface TripPlanResponse {
  success: boolean;
  trip: TripPlan;
}