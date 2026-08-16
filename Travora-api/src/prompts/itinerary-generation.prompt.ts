import { TravelState } from '../graph/travel.state';
import { PlannedDayCandidate } from '../models/activity-planning.model';

export function buildItineraryGenerationPrompt(
  state: TravelState,
  plannedDays: PlannedDayCandidate[] = [],
): string {
  const travelers =
    state.travelers ?? 1;

  const interests =
    state.tripRequest?.preferences.interests ?? [];

  const candidateContext =
    plannedDays
      .map((day) => {
        const activities =
          day.activities
            .map(
              (activity) =>
                `candidateId=${activity.id}
title=${activity.title}
area=${activity.area}
timePreference=${activity.timePreference}
durationMinutes=${activity.durationMinutes}
costTier=${activity.costTier}
interests=${activity.interests.join(', ') || 'none'}`,
            )
            .join('\n\n');

        return `DAY ${day.day}
AREA=${day.area}

${activities}`;
      })
      .join(
        '\n\n====================\n\n',
      );

  return `
Create a ${state.days}-day itinerary for ${travelers} traveler(s) visiting ${state.destination}.

Travel style: ${state.travelStyle ?? 'General'}

Interests:
${
  interests.length
    ? interests.join(', ')
    : 'none specified'
}

Dates:
${
  state.startDate &&
  state.endDate
    ? `${state.startDate} to ${state.endDate}`
    : 'flexible'
}

CANDIDATE ACTIVITIES
====================

${candidateContext || 'No candidates are available.'}

STRICT RULES

1. Return exactly ${state.days} daily plans.

2. Number the plans sequentially from 1 through ${state.days}.

3. Every activity MUST contain candidateId.

4. candidateId MUST exactly match one of the supplied candidate IDs.

5. Never invent a candidateId.

6. Use only supplied candidates.

7. Use a candidate only on the day to which it belongs.

8. Never use the same candidate more than once.

9. Keep activities in chronological order.

10. Preserve the candidate's title.

11. Preserve the candidate's location.

12. Preserve the candidate's costTier.

13. You may rewrite the description to make it useful and concise.

14. Do not invent attractions, restaurants, venues, prices, opening hours, transportation times, hotels, flights, or live conditions.

15. Do not create generic activities such as lunch, dinner, shopping, or sightseeing unless they exist as supplied candidates.

16. Prefer 3 to 5 activities on a full day.

17. Arrival or departure days may contain fewer activities.

18. Keep each day geographically coherent.

19. Do not move candidates between days.

20. Do not calculate the trip budget.

21. Do not generate budget totals.

22. Do not generate flight information.

23. Do not generate hotel information.

24. Do not generate travel tips.

25. Do not generate booking tips.

26. Do not generate a trip summary.

27. Do not generate fields that are not part of the output schema.

28. Return ONLY structured data matching the provided schema.

OUTPUT STRUCTURE

dailyPlans
  day
  title
  activities
    candidateId
    time
    title
    description
    location
    costTier
`;
}