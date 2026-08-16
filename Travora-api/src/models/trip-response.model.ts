import { BudgetBreakdown } from './itinerary.model';
import { Flight, } from './flight.model';
import { Hotel } from './hotel.model';
import { FlightRanking } from './flight-ranking.model';
import { HotelRanking } from './hotel-ranking.model';
import { TripRequest } from './trip-request.model';
import { DailyPlan } from './itinerary.model';
import { TripFeasibility } from './trip-feasibility.model';
import {HotelRecommendationExplanation} from './recommendation.model';

export interface TripDatePlan {
  startDate?: string;
  endDate?: string;
  days: number;
  nights: number;
  flexible: boolean;
  source: 'explicit' | 'derived-from-start' | 'flexible-window' | 'missing';
  searchWindow?: {
    startDate: string;
    endDate: string;
  };
  assumptions: string[];
}

export interface TripMapStop {
  id?: string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  time?: string;
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

export interface TripPlan {
  id: string;
  status: 'ready' | 'partial';
  request: TripRequest;
  dates: TripDatePlan;
  summary: {
    destination: string;
    origin: string;
    travelers: number;
    days: number;
    nights: number;
    travelStyle?: string;
    budget?: number;
    currency: string;
    summary: string;
  };
  recommendedFlight: Flight | null;
  availableFlights: Flight[];
  recommendedHotel: Hotel | null;
  availableHotels: Hotel[];
  flightAlternatives: Flight[];
  hotelAlternatives: Hotel[];
  flightRanking: FlightRanking | null;
  hotelRanking: HotelRanking | null;
  budget: BudgetBreakdown | null;
  hotelExplanation: HotelRecommendationExplanation | null;
  totalEstimatedCost: string;
  itinerary: {
    days: DailyPlan[];
  };
  map: TripMap;
  optimization: TripOptimization;
  explanations: {
    flight: string;
    hotel: string;
  };
  // bookingTips: {
  //   flight: string[];
  //   hotel: string[];
  // };
  travelTips: Array<{
    tag: string;
    title: string;
    description: string;
  }>;
  assumptions: string[];
  warnings: string[];
  tripFeasibility:
  TripFeasibility | null;
}

export interface TripPlanResponse {
  success: boolean;
  trip: TripPlan;
}
