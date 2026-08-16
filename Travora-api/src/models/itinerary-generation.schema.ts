import { z } from 'zod';

export const ItineraryGenerationSchema = z.object({
  dailyPlans: z
    .array(
      z.object({
        day: z.number().int().positive(),

        title: z
          .string()
          .min(1),

        activities: z
          .array(
            z.object({
              candidateId: z
                .string()
                .min(1),

              time: z
                .string()
                .min(1),

              title: z
                .string()
                .min(1),

              description: z
                .string()
                .min(1),

              location: z
                .string()
                .min(1),

              costTier: z.enum([
                'free',
                'low',
                'medium',
                'high',
              ]),
            }),
          )
          .min(1)
          .max(6),
      }),
    )
    .min(1),
});