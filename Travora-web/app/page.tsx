"use client";

import { useState } from "react";

import Hero from "@/components/landing/Hero";
import TripPage from "@/components/itinerary/TripPage";
import type { TripPlanResponse } from "@/types/trip-plan";

export default function Home() {
  const [trip, setTrip] = useState<TripPlanResponse | null>(null);

  const handleTripGenerated = (
    generatedTrip: TripPlanResponse,
  ) => {
    console.log("Generated Trip:", generatedTrip);
    setTrip(generatedTrip);
  };

  if (!trip) {
    return (
      <Hero
        onTripGenerated={handleTripGenerated}
      />
    );
  }

  return <TripPage trip={trip.trip} />;
}