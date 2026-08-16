"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import VerificationStamp from "./VerificationStamp";

interface ReportHeroProps {
  summary: {
    destination: string;
    origin: string;
    travelers?: number;
    days?: number;
    nights?: number;
    travelStyle?: string;
    budget?: number;
    currency?: string;
    summary: string;
  };

  dates?: {
    startDate?: string;
    endDate?: string;
    days?: number;
    nights?: number;
  };

  totalEstimatedCost: string | number;

  recommendedFlight?: {
    airline?: string;
    flightNumber?: string;
  } | null;

  recommendedHotel?: {
    name?: string;
    rating?: number;
    reviews?: number;
  } | null;

  totalActivities: number;
}

export default function ReportHero({
  summary,
  dates,
  totalEstimatedCost,
  recommendedFlight,
  recommendedHotel,
  totalActivities,
}: ReportHeroProps) {
  const destination =
    summary.destination || "Your Destination";

  const origin =
    summary.origin || "Your Origin";

  const travelers =
    summary.travelers ?? 1;

  const days =
    dates?.days ??
    summary.days ??
    0;

  const nights =
    dates?.nights ??
    summary.nights ??
    Math.max(days - 1, 0);

  const startDate =
    dates?.startDate;

  const endDate =
    dates?.endDate;

  const formatDate = (
    value?: string,
  ) => {
    if (!value) return "";

    const parsed = new Date(
      `${value}T00:00:00`,
    );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return value;
    }

    return parsed.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  const formattedStart =
    formatDate(startDate);

  const formattedEnd =
    formatDate(endDate);

  const dateRange =
    formattedStart &&
      formattedEnd
      ? `${formattedStart} – ${formattedEnd}`
      : formattedStart ||
      formattedEnd ||
      "";

  const durationLabel =
    days > 0
      ? `${days} day${days === 1 ? "" : "s"}, ${nights} night${nights === 1 ? "" : "s"}`
      : "";

  const travelerLabel =
    travelers === 1
      ? "Solo traveler"
      : `${travelers} travelers`;

  const currency =
    summary.currency ??
    "USD";

  const budget =
    summary.budget;

  const costDisplay =
    typeof totalEstimatedCost ===
      "number"
      ? `${totalEstimatedCost} ${currency}`
      : totalEstimatedCost;

  const budgetDisplay =
    typeof budget === "number"
      ? `of ${budget.toLocaleString()} ${currency} budget`
      : "";

  /*
   * The backend generates the actual
   * trip-specific executive summary.
   *
   * Do not generate a generic summary
   * in the frontend.
   */
  const summaryText =
    summary.summary ||
    `Your ${durationLabel || "trip"} from ${origin} to ${destination} is ready.`;

  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 18,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.7,
        ease: "easeOut",
      }}
      className="
    relative
    left-1/2
    w-screen
    -translate-x-1/2
    overflow-hidden
    border-b
    border-[rgba(232,225,210,0.14)]
    bg-[#151b28]
  "
    >
      {/* Background */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
        "
        style={{
          background: `
            radial-gradient(
              circle at 82% 8%,
              rgba(184,137,63,0.16),
              transparent 38%
            ),
            radial-gradient(
              circle at 8% 92%,
              rgba(111,57,69,0.18),
              transparent 38%
            ),
            linear-gradient(
              110deg,
              #151b28 0%,
              #171b27 48%,
              #2a2928 100%
            )
          `,
        }}
      />

      {/* Content */}
      <div
        className="
    relative
    mx-auto
    w-full
    max-w-[1040px]
    px-7
    pb-0
    pt-14
    lg:pt-16
  "
      >
        {/* Eyebrow */}
        <motion.div
          initial={{
            opacity: 0,
            y: 8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.1,
            duration: 0.5,
          }}
          className="
            flex
            items-center
            gap-3
            font-mono
            text-[11px]
            uppercase
            tracking-[0.24em]
            text-[#d9b276]
          "
        >
          <span className="h-px w-6 bg-[#d9b276]" />

          <span>
            Travora · Verified Travel Dossier
          </span>
        </motion.div>

        {/* Verification stamp */}
        <div
          className="
            absolute
            right-4
            top-10
            lg:right-0
            lg:top-12
          "
        >
          <VerificationStamp />
        </div>

        {/* Route */}
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.16,
            duration: 0.5,
          }}
          className="
            mt-7
            flex
            items-center
            gap-3
            font-mono
            text-[12px]
            uppercase
            tracking-[0.18em]
            text-[#929caf]
          "
        >
          <span>
            {origin}
          </span>

          <ArrowRight
            size={15}
            strokeWidth={1.5}
            className="opacity-70"
          />

          <span>
            {destination}
          </span>
        </motion.div>

        {/* Destination */}
        <motion.h1
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
            duration: 0.65,
          }}
          className="
            mt-3
            max-w-[850px]
            font-serif
            text-[clamp(76px,10vw,132px)]
            font-extrabold
            leading-[0.88]
            tracking-[-0.045em]
            text-[#f2ecdf]
          "        >
          {destination}
        </motion.h1>

        {/* Meta pills */}
        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
            duration: 0.5,
          }}
          className="
            mt-7
            flex
            flex-wrap
            gap-2
          "
        >
          {[
            travelers
              ? travelerLabel
              : null,

            durationLabel ||
            null,

            dateRange ||
            null,
          ]
            .filter(Boolean)
            .map(
              (item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-[rgba(232,225,210,0.15)]
                    bg-white/[0.015]
                    px-4
                    py-2
                    font-sans
                    text-[12px]
                    text-[#e9e3d7]
                  "
                >
                  <span
                    className="
                      h-[5px]
                      w-[5px]
                      rounded-full
                      bg-[#d9b276]
                    "
                  />

                  {item}
                </div>
              ),
            )}
        </motion.div>

        {/* Executive summary */}
        <motion.div
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.4,
            duration: 0.6,
          }}
          className="
            mt-11
            border-t
            border-[rgba(232,225,210,0.14)]
            pb-10
            pt-8
          "
        >
          <p
            className="
              mb-4
              font-mono
              text-[10px]
              uppercase
              tracking-[0.22em]
              text-[#d9b276]
            "
          >
            Executive Summary
          </p>

          <p
            className="
              max-w-[850px]
              text-[19px]
              leading-[1.7]
              text-[#d8d2c3]
              lg:text-[21px]
            "
          >
            {summaryText}
          </p>
        </motion.div>
      </div>

      {/* Quick facts */}
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 0.5,
          duration: 0.6,
        }}
        className="
    relative
    mx-auto
    w-full
    max-w-[1040px]
  "
      >
        <div
          className="
      grid
      grid-cols-2
      border-t
      border-[rgba(232,225,210,0.14)]
      md:grid-cols-4
    "
        >
          {/* Cost */}
          <div
            className="
              min-h-[118px]
              border-r
              border-[rgba(232,225,210,0.14)]
              px-6
              py-6
            "
          >
            <p
              className="
                mb-2
                font-mono
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#929caf]
              "
            >
              Estimated Cost
            </p>

            <p
              className="
                text-[21px]
                font-semibold
                text-[#f2ecdf]
              "
            >
              {costDisplay}
            </p>

            {budgetDisplay && (
              <p
                className="
                  mt-1
                  text-xs
                  text-[#929caf]
                "
              >
                {budgetDisplay}
              </p>
            )}
          </div>

          {/* Flight */}
          <div
            className="
              min-h-[118px]
              border-r
              border-[rgba(232,225,210,0.14)]
              px-6
              py-6
            "
          >
            <p
              className="
                mb-2
                font-mono
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#929caf]
              "
            >
              Flight
            </p>

            <p
              className="
                text-[19px]
                font-semibold
                text-[#f2ecdf]
              "
            >
              {recommendedFlight
                ?.airline ??
                "Not selected"}
            </p>

            {recommendedFlight
              ?.flightNumber && (
                <p
                  className="
                  mt-1
                  text-xs
                  text-[#929caf]
                "
                >
                  {
                    recommendedFlight.flightNumber
                  }
                </p>
              )}
          </div>

          {/* Hotel */}
          <div
            className="
              min-h-[118px]
              border-r
              border-[rgba(232,225,210,0.14)]
              px-6
              py-6
            "
          >
            <p
              className="
                mb-2
                font-mono
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#929caf]
              "
            >
              Stay
            </p>

            <p
              className="
                max-w-[190px]
                text-[18px]
                font-semibold
                leading-tight
                text-[#f2ecdf]
              "
            >
              {recommendedHotel
                ?.name ??
                "Not selected"}
            </p>

            {(recommendedHotel
              ?.rating !==
              undefined ||
              recommendedHotel
                ?.reviews !==
              undefined) && (
                <p
                  className="
                  mt-1
                  text-xs
                  text-[#929caf]
                "
                >
                  {recommendedHotel.rating !==
                    undefined
                    ? `${recommendedHotel.rating}★`
                    : ""}

                  {recommendedHotel.rating !==
                    undefined &&
                    recommendedHotel.reviews !==
                    undefined
                    ? " · "
                    : ""}

                  {recommendedHotel.reviews !==
                    undefined
                    ? `${recommendedHotel.reviews.toLocaleString()} reviews`
                    : ""}
                </p>
              )}
          </div>

          {/* Activities */}
          <div
            className="
              min-h-[118px]
              px-6
              py-6
            "
          >
            <p
              className="
                mb-2
                font-mono
                text-[10px]
                uppercase
                tracking-[0.16em]
                text-[#929caf]
              "
            >
              Planned Stops
            </p>

            <p
              className="
                text-[19px]
                font-semibold
                text-[#f2ecdf]
              "
            >
              {totalActivities}{" "}
              activities
            </p>

            <p
              className="
                mt-1
                text-xs
                text-[#929caf]
              "
            >
              across {days || "your"}{" "}
              days
            </p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}