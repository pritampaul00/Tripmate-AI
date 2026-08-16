import { z } from 'zod';

export const RecommendationSchema = z.object({
  selectedHotelIndex: z.number().int().nonnegative(),
});
