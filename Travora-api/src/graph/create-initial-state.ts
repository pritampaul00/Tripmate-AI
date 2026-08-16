import { TravelState } from './travel.state';
import { TripRequest } from '../models/trip-request.model';

export function createInitialState(
  message: string,
  request: TripRequest,
): TravelState {
  return {
    message,

    tripRequest: request,

    origin: request.origin,
    originIata: undefined,
    destination: request.destination,

    startDate: request.dates.startDate,
    endDate: request.dates.endDate,

    days: request.durationDays,
    budget: request.budget?.amount ?? null,
    travelers: request.travelers.total,
    travelStyle: request.travelStyle,

    flights: [],
    flightRanking: undefined,
    hotels: [],
    hotelRanking: undefined,
    recommendation: undefined,
    itinerary: undefined,
    plannedDayCandidates: [],

    budgetBreakdown: undefined,

    tripFeasibility: undefined,
  };
}
