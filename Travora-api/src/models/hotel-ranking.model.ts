import { Hotel } from './hotel.model';

export type HotelRankCategory =
  | 'best-value'
  | 'cheapest'
  | 'best-rated'
  | 'best-location'
  | 'best-for-couples'
  | 'best-for-families';

export interface RankedHotel extends Hotel {
  score: number;
  tags: HotelRankCategory[];
}

export interface HotelRanking {
  bestValue: RankedHotel | null;
  cheapest: RankedHotel | null;
  bestRated: RankedHotel | null;
  bestLocation: RankedHotel | null;
  bestForCouples: RankedHotel | null;
  bestForFamilies: RankedHotel | null;
  rankedHotels: RankedHotel[];
  filteredCount: number;
  originalCount: number;
  warnings: string[];
}
