"use client";

import { motion } from "framer-motion";

import type { TripPlan } from "@/types/trip-plan";

import ReportPage from "@/components/report/ReportPage";
import ReportSection from "@/components/report/ReportSection";
import ReportContent from "@/components/report/ReportContent";
import ReportHero from "@/components/report/hero/ReportHero";
import ReportFooter from "../report/ReportFooter";

import RecommendedFlight from "./flight/RecommendedFlight";
import RecommendedHotel from "./hotel/RecommendedHotel";
import DailyTimeline from "./daily/DailyTimeline";
import BudgetBreakdown from "./budget/BudgetBreakdown";
import TripFeasibility from "./budget/TripFeasibility";
import TravelTips from "./tips/TravelTips";

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

interface TripPageProps {
  trip: TripPlan;
}

export default function TripPage({
  trip,
}: TripPageProps) {
  const dailyPlans =
    trip.itinerary?.days ?? [];

  const totalActivities =
    dailyPlans.reduce(
      (count, day) =>
        count +
        (day.activities?.length ?? 0),
      0,
    );

  return (
    <ReportPage>
      {/* =====================================================
          FULL WIDTH HERO
          ===================================================== */}

      <ReportHero
        summary={trip.summary}
        dates={trip.dates}
        totalEstimatedCost={
          trip.totalEstimatedCost
        }
        recommendedFlight={
          trip.recommendedFlight
        }
        recommendedHotel={
          trip.recommendedHotel
        }
        totalActivities={
          totalActivities
        }
      />

      {/* =====================================================
          REPORT SECTIONS
          Each ReportSection carries its own 1040px measure,
          so nothing here should re-wrap or re-pad the content.
          ===================================================== */}

      <ReportContent>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
        >
          {/* Flight */}
          <ReportSection
            number={1}
            title="Recommended Flight"
          >
            <RecommendedFlight
              flight={
                trip.recommendedFlight
              }
              recommendationReason={
                trip.explanations?.flight ??
                "No flight recommendation explanation is available."
              }
              verifiedAt={trip.recommendedFlight?.checkedAt}
              alternatives={
                trip.flightAlternatives ??
                []
              }
            />
          </ReportSection>

          {/* Hotel */}
          <ReportSection
            number={2}
            title="Accommodation"
          >
            <RecommendedHotel
              hotel={
                trip.recommendedHotel
              }
              hotelExplanation={
                trip.hotelExplanation ??
                null
              }
            />
          </ReportSection>

          {/* Daily itinerary */}
          <ReportSection
            number={3}
            title="Daily Itinerary"
          >
            <DailyTimeline
              dailyPlans={
                dailyPlans
              }
            />
          </ReportSection>

          {/* Budget */}
          <ReportSection
            number={4}
            title="Budget Analysis"
          >
            <BudgetBreakdown
              budget={
                trip.budget
              }
            />
          </ReportSection>

          {/* Trip feasibility */}
          <ReportSection
            number={5}
            title="Trip Feasibility"
          >
            <TripFeasibility
              feasibility={
                trip.tripFeasibility
              }
            />
          </ReportSection>

          {/* Travel recommendations */}
          <ReportSection
            number={6}
            title="Recommendations for These Dates"
          >
            <TravelTips
              travelTips={
                trip.travelTips ?? []
              }
              startDate={
                trip.dates?.startDate
              }
              endDate={
                trip.dates?.endDate
              }
            />
          </ReportSection>
        </motion.div>
      </ReportContent>
      <ReportFooter
        origin={trip.summary.origin}
        destination={trip.summary.destination}
        startDate={trip.dates?.startDate}
        endDate={trip.dates?.endDate}
      />
    </ReportPage>
  );
}