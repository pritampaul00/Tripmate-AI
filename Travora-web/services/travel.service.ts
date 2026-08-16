import axios from "axios";
import type { TripPlanResponse } from "@/types/trip-plan";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function planTrip(data: {
  message: string;
}): Promise<TripPlanResponse> {
  const response = await axios.post<TripPlanResponse>(
    `${API_URL}/travel`,
    data,
  );

  return response.data;
}