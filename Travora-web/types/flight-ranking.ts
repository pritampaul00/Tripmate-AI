import { Flight } from './flight';


export interface FlightRanking {
  rankedFlights: Flight[];

  bestValue: Flight | null;
  cheapest: Flight | null;
  fastest: Flight | null;
  fewestStops: Flight | null;
  lowestEmissions: Flight | null;

  warnings?: string[];
}