import { Flight } from './flight.model';
import { Hotel } from './hotel.model';

export type RecommendationType =
  | 'best-value'
  | 'budget-optimized'
  | 'closest-to-budget'
  | 'best-available';

export type RecommendationSignal =
  | 'best-price'
  | 'best-value'
  | 'fastest'
  | 'fewest-stops'
  | 'lowest-emissions'
  | 'budget-fit'
  | 'closest-to-budget'
  | 'price-saving'
  | 'premium-choice';

export interface FlightPriceInsights {
  currentPrice: string;
  lowestPrice?: string;
  priceLevel?: string;
  typicalRange?: string;
}

export interface RecommendationAlternative {
  type: 'flight' | 'hotel';

  name: string;

  price?: string;

  rating?: number;

  reviews?: number;

  priceDifference?: number;

  score?: number;

  scoreDifference?: number;

  signals: RecommendationSignal[];

  reason: string;

  website?: string;
}

export interface HotelRecommendationAlternative {
  name: string;

  address?: string;

  description?: string;

  website?: string;

  price?: string;

  rating?: number;

  reviews?: number;

  thumbnail?: string;

  amenities?: string[];

  distanceFromCenter?: string;

  roomType?: string;

  cancellationPolicy?: string;

  checkedAt?: string;

  score?: number;

  reason: string;
}

export interface HotelRecommendationExplanation {
  reason: string;

  name: string;

  address: string;

  description: string;

  website: string;

  price?: string;

  rating?: number;

  reviews?: number;

  thumbnail?: string;

  amenities?: string[];

  distanceFromCenter?: string;

  roomType?: string;

  cancellationPolicy?: string;

  checkedAt?: string;

  score?: number;

  alternatives: HotelRecommendationAlternative[];
}

export interface RecommendationBudgetImpact {
  currency: string;

  budget: number;

  estimatedTotal: number;

  remaining: number;

  overBudget: number;

  fitsBudget: boolean;

  utilizationPercent?: number;
}

export interface RecommendationDecision {
  type: RecommendationType;

  confidence: number;

  reason: string;

  summary: string;

  signals: RecommendationSignal[];

  tradeoffs: string[];

  budgetImpact?: RecommendationBudgetImpact;
}

export interface Recommendation {
  recommendedFlight: Flight | null;

  recommendedHotel: Hotel | null;

  flightAlternatives: Flight[];

  hotelAlternatives: Hotel[];

  flightPriceInsights: FlightPriceInsights | null;

  decision: RecommendationDecision;

  alternativeInsights: RecommendationAlternative[];

  hotelExplanation?: HotelRecommendationExplanation;
}