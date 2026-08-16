export type TravelStyle =
  | 'Solo'
  | 'Couple'
  | 'Family'
  | 'Friends'
  | 'Business'
  | 'Backpacking'
  | 'Adventure'
  | 'Luxury'
  | 'Budget';

export type BudgetCurrency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'KRW';

export interface TripBudget {
  amount: number;
  currency: BudgetCurrency;
}

export interface TripTravelers {
  adults: number;
  children: number;
  infants: number;
  total: number;
}

export type DateResolutionSource =
  | 'explicit'
  | 'derived-from-start'
  | 'flexible-window'
  | 'missing';

// export interface TripDates {
//   startDate?: string;
//   endDate?: string;
//   flexible: boolean;
//   source?: DateResolutionSource;
//   searchWindow?: {
//     startDate: string;
//     endDate: string;
//   };
// }

export interface TripDates {
  startDate?: string;
  endDate?: string;
  flexible: boolean;
  source?: DateResolutionSource;
  searchWindow?: {
    startDate: string;
    endDate: string;
  };
  assumptions: string[];
}

export interface TripPreferences {
  interests: string[];
  flight?: {
    cabin?: 'Economy' | 'Premium Economy' | 'Business' | 'First';
    maxStops?: number;
  };
  accommodation?: {
    category?: 'Budget' | 'Mid-range' | 'Luxury';
  };
}

export interface TripRequest {
  rawMessage: string;
  origin?: string;
  destination?: string;
  durationDays?: number;
  durationNights?: number;
  travelers: TripTravelers;
  budget?: TripBudget;
  dates: TripDates;
  travelStyle?: TravelStyle;
  preferences: TripPreferences;
  //missingFields: Array<'origin' | 'destination' | 'dates'>;
  missingFields: Array<'origin' | 'destination'>;
  assumptions: string[];
}
