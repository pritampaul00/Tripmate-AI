export interface Hotel {
  name: string;

  address: string;

  description: string;

  website: string;

  propertyToken?: string;

  price?: string;

  rating?: number;

  reviews?: number;

  amenities?: string[];

  distanceFromCenter?: string;

  roomType?: string;

  cancellationPolicy?: string;

  checkedAt?: string;
}