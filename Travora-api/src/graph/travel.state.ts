import { Annotation } from '@langchain/langgraph';

import { Flight } from '../models/flight.model';
import { Hotel } from '../models/hotel.model';
import { Itinerary } from '../models/itinerary.model';
import { Recommendation } from '../models/recommendation.model';
import { TripRequest } from '../models/trip-request.model';
import { FlightRanking } from '../models/flight-ranking.model';
import { HotelRanking } from '../models/hotel-ranking.model';
import { PlannedDayCandidate } from '../models/activity-planning.model';
import { BudgetBreakdown } from '../models/budget.model';
import { TripFeasibility } from '../models/trip-feasibility.model';

export const TravelStateAnnotation = Annotation.Root({
  // Original user request
  message: Annotation<string>(),

  // Canonical parsed request. All new planning logic should use this object.
  tripRequest: Annotation<TripRequest | undefined>(),

  // Trip details
  origin: Annotation<string | undefined>(),
  originIata: Annotation<string | undefined>(),

  destination: Annotation<string | undefined>(),

  startDate: Annotation<string | undefined>(),
  endDate: Annotation<string | undefined>(),

  days: Annotation<number | undefined>(),

  travelers: Annotation<number | undefined>(),

  budget: Annotation<number | null>(),

  travelStyle: Annotation<string | undefined>(),

  // Search results
  flights: Annotation<Flight[]>({
    default: () => [],
    reducer: (_, value) => value,
  }),

  flightRanking: Annotation<FlightRanking | undefined>(),

  hotels: Annotation<Hotel[]>({
    default: () => [],
    reducer: (_, value) => value,
  }),

  hotelRanking: Annotation<HotelRanking | undefined>(),

  // Deterministic activity candidates selected before LLM refinement
  plannedDayCandidates: Annotation<PlannedDayCandidate[]>({
    default: () => [],
    reducer: (_, value) => value,
  }),

  // Recommendations
  recommendation: Annotation<Recommendation | undefined>(),

  // Generated itinerary
  itinerary: Annotation<Itinerary | undefined>(),

  budgetBreakdown: Annotation<
    BudgetBreakdown | undefined
  >({
    default: () =>
      undefined,

    reducer: (
      _,
      value,
    ) => value,
  }),

  tripFeasibility: Annotation<
    TripFeasibility | undefined
  >({
    default: () =>
      undefined,

    reducer: (
      _,
      value,
    ) => value,
  }),
});

export type TravelState = typeof TravelStateAnnotation.State;
