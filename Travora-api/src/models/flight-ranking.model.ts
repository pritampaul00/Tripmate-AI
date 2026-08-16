import { Flight } from './flight.model';

export type FlightRankCategory =
  | 'best-value'
  | 'cheapest'
  | 'fastest'
  | 'fewest-stops'
  | 'lowest-emissions';

export interface RankedFlight extends Flight {
  score: number;
  tags: FlightRankCategory[];
}

export interface FlightRanking {
  bestValue: RankedFlight | null;
  cheapest: RankedFlight | null;
  fastest: RankedFlight | null;
  fewestStops: RankedFlight | null;
  lowestEmissions: RankedFlight | null;
  rankedFlights: RankedFlight[];
  filteredCount: number;
  originalCount: number;
  warnings: string[];
}
