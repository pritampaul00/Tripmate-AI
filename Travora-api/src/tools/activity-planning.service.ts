import { Injectable } from '@nestjs/common';
import { ActivityCandidate, PlannedDayCandidate } from '../models/activity-planning.model';
import { TravelState } from '../graph/travel.state';
import { DestinationActivityService } from './destination-activity.service';

@Injectable()
export class ActivityPlanningService {
  constructor(private readonly destinationActivityService: DestinationActivityService) {}

  plan(state: TravelState): PlannedDayCandidate[] {
    const candidates = this.destinationActivityService.getCandidates(state.destination);
    const days = Math.max(state.days ?? 1, 1);
    if (!candidates.length) return [];

    const ranked = candidates
      .map((candidate) => ({ ...candidate, score: this.score(candidate, state) }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const clusters = this.buildClusters(ranked, days);
    const used = new Set<string>();

    return clusters.map((cluster, index) => {
      const selected = cluster
        .filter((candidate) => !used.has(candidate.id))
        .sort((a, b) => this.timePreferenceScore(a, index) - this.timePreferenceScore(b, index))
        .slice(0, 6);

      selected.forEach((candidate) => used.add(candidate.id));

      return {
        day: index + 1,
        title: this.buildDayTitle(selected, index + 1),
        area: this.primaryArea(selected),
        activities: selected,
      };
    });
  }

  getCandidateMap(state: TravelState): Map<string, ActivityCandidate> {
    return new Map(
      this.destinationActivityService
        .getCandidates(state.destination)
        .map((candidate) => [candidate.id, candidate]),
    );
  }

  private score(candidate: ActivityCandidate, state: TravelState): number {
    const interests = state.tripRequest?.preferences.interests ?? [];
    const normalizedInterests = interests.map((value) => value.toLowerCase());
    const style = state.travelStyle?.toLowerCase();

    let score = 35;
    score += candidate.interests.some((interest) => normalizedInterests.includes(interest.toLowerCase())) ? 35 : 0;
    score += candidate.interests.some((interest) => normalizedInterests.some((value) => value.includes(interest.toLowerCase()) || interest.toLowerCase().includes(value))) ? 8 : 0;
    score += candidate.travelStyles?.some((value) => value.toLowerCase() === style) ? 15 : 0;

    if (state.travelStyle === 'Couple' && candidate.interests.includes('romantic')) score += 12;
    if (state.travelStyle === 'Family' && candidate.category === 'nature') score += 5;
    if (state.travelStyle === 'Budget' && candidate.costTier === 'free') score += 10;
    if (state.travelStyle === 'Luxury' && candidate.costTier === 'high') score += 5;

    return score;
  }

  private buildClusters(candidates: ActivityCandidate[], days: number): ActivityCandidate[][] {
    const result: ActivityCandidate[][] = Array.from({ length: days }, () => []);
    const remaining = [...candidates];

    for (let day = 0; day < days && remaining.length > 0; day++) {
      const anchor = remaining.shift()!;
      const cluster = [anchor];

      while (cluster.length < 4 && remaining.length > 0) {
        const nearestIndex = remaining.reduce((bestIndex, candidate, index) => {
          const bestDistance = this.distanceKm(anchor, remaining[bestIndex]);
          const candidateDistance = this.distanceKm(anchor, candidate);
          return candidateDistance < bestDistance ? index : bestIndex;
        }, 0);
        cluster.push(remaining.splice(nearestIndex, 1)[0]);
      }

      cluster.sort((a, b) => this.timePreferenceScore(a, day) - this.timePreferenceScore(b, day));
      result[day] = cluster;
    }

    for (const candidate of remaining) {
      const target = result.reduce((bestIndex, current, index) => {
        const best = result[bestIndex];
        const currentAnchor = current[0];
        const bestAnchor = best[0];
        if (!currentAnchor) return index;
        if (!bestAnchor) return bestIndex;
        return this.distanceKm(candidate, currentAnchor) < this.distanceKm(candidate, bestAnchor)
          ? index
          : bestIndex;
      }, 0);
      if (result[target].length < 6) result[target].push(candidate);
    }

    return result;
  }

  private distanceKm(a: ActivityCandidate, b: ActivityCandidate): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(Math.min(1, value)));
  }

  private timePreferenceScore(candidate: ActivityCandidate, dayIndex: number): number {
    const preferred = dayIndex % 2 === 0 ? ['morning', 'afternoon', 'evening'] : ['morning', 'afternoon', 'evening'];
    const index = preferred.indexOf(candidate.timePreference);
    return index === -1 ? 3 : index;
  }

  private primaryArea(activities: ActivityCandidate[]): string {
    return activities[0]?.area ?? 'Central area';
  }

  private buildDayTitle(activities: ActivityCandidate[], day: number): string {
    const area = this.primaryArea(activities);
    return activities.length ? `${area} highlights` : `Day ${day}`;
  }
}
