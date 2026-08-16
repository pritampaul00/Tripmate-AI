import { z } from "zod";

export const ItinerarySchema = z.object({
  summary: z.object({
    destination: z.string(),
    origin: z.string(),
    travelers: z.number(),
    totalDays: z.number(),
    travelDates: z.string(),
    estimatedBudget: z.number().nullable(),
    travelStyle: z.string(),
  }),

  flightRecommendationReason: z.string(),

  flightBookingTips: z.array(z.string()).length(5),

  hotelRecommendationReason: z.string(),

  hotelBookingTips: z.array(z.string()).length(5),

  dailyPlans: z.array(
    z.object({
      day: z.number(),
      title: z.string(),

      activities: z.array(
        z.object({
          time: z.string(),
          title: z.string(),
          description: z.string(),
          location: z.string(),
          estimatedCost: z.number(),
        }),
      ),
    }),
  ),

  travelTips: z
    .array(
      z.object({
        tag: z.enum([
          "WEATHER",
          "TRANSIT",
          "BOOKING WINDOW",
          "MONEY",
          "CROWDS",
          "SAFETY",
        ]),

        title: z.string(),

        description: z.string(),
      }),
    )
    .length(6),
});