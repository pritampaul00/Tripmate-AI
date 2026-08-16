import { Injectable } from '@nestjs/common';

export type ActivityCostTier = 'free' | 'low' | 'medium' | 'high';

@Injectable()
export class ItineraryCostService {
  estimateUsd(tier: ActivityCostTier, travelers: number): number {
    const party = Math.max(travelers, 1);
    const perParty = {
      free: 0,
      low: 8,
      medium: 20,
      high: 45,
    }[tier];

    return Math.round(perParty * party * 100) / 100;
  }
}
