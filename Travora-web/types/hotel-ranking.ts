import { Hotel } from './hotel';


export interface HotelRanking {
  rankedHotels: Hotel[];

  bestValue: Hotel | null;
  cheapest: Hotel | null;
  bestRated: Hotel | null;
  bestLocation: Hotel | null;
  bestForCouples: Hotel | null;
  bestForFamilies: Hotel | null;

  warnings?: string[];
}