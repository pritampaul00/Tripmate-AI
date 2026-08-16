import { ActivityCostTier } from '../tools/itinerary-cost.service';

export type ActivityCategory =
  | 'attraction'
  | 'culture'
  | 'food'
  | 'shopping'
  | 'nightlife'
  | 'nature'
  | 'viewpoint'
  | 'entertainment'
  | 'architecture';

export interface ActivityCandidate {
  id: string;
  title: string;
  description: string;
  location: string;
  area: string;
  latitude: number;
  longitude: number;
  category: ActivityCategory;
  interests: string[];
  travelStyles?: string[];
  costTier: ActivityCostTier;
  durationMinutes: number;
  timePreference: 'morning' | 'afternoon' | 'evening' | 'any';
  score?: number;
}

export interface PlannedDayCandidate {
  day: number;
  title: string;
  area: string;
  activities: ActivityCandidate[];
}
