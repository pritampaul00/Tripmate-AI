// export interface Hotel {
//   name: string;
//   address: string;
//   description: string;
//   website: string;
//   price?: string;
//   rating?: number;
//   reviews?: number;
//   thumbnail?: string;
//   amenities?: string[];
//   distanceFromCenter?: string;
// }


export interface Hotel {
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
  tags?: HotelRankCategory[];
}

export type HotelRankCategory =
  | "best-value"
  | "cheapest"
  | "best-rated"
  | "best-location"
  | "best-for-couples"
  | "best-for-families";