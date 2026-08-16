"use client";

import type { Flight } from "@/types/flight";

interface RecommendedFlightProps {
  flight: Flight | null;
  recommendationReason: string;
  verifiedAt?: string;
  alternatives?: Flight[];
}

function formatTime(dateTime?: string) {
  if (!dateTime) {
    return "-";
  }

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return dateTime;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(dateTime?: string) {
  if (!dateTime) {
    return "-";
  }

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return dateTime;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(minutes?: number) {
  if (
    minutes === undefined ||
    minutes === null ||
    Number.isNaN(minutes)
  ) {
    return "-";
  }

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hrs}h`;
  }

  return `${hrs}h ${mins}m`;
}

function formatStops(stops?: number) {
  if (stops === undefined || stops === null) {
    return "Unknown";
  }

  if (stops === 0) {
    return "Direct flight";
  }

  if (stops === 1) {
    return "1 stop";
  }

  return `${stops} stops`;
}

export default function RecommendedFlight({
  flight,
  recommendationReason,
  verifiedAt,
  alternatives = [],
}: RecommendedFlightProps) {
  if (!flight) {
    return (
      <div className="rounded-[14px] border border-white/10 bg-[#1e2738] p-8">
        <h2
          className="font-serif text-2xl font-semibold text-[#f2ecdf]"
        >
          No Recommended Flight
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#98a1b3]">
          No recommended flight is available for the current search.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Flight ticket */}
      <div
        className="
          relative grid
          grid-cols-[1fr_220px]
          overflow-visible
          rounded-[14px]
          bg-[#e8e1d2]
          text-[#151c29]
          max-[760px]:grid-cols-1
        "
      >
        {/* Ticket main */}
        <div className="px-[34px] py-[30px]">
          {/* Airline */}
          <div className="flex items-start justify-between">
            <div
              className="font-serif text-[22px] font-semibold"
            >
              {flight.airline}

              <span
                className="
                  ml-[10px]
                  rounded-full
                  bg-[#151c29]
                  px-[9px]
                  py-1
                  font-mono
                  text-[10px]
                  tracking-[0.1em]
                  text-[#f2ecdf]
                "
              >
                Top pick
              </span>
            </div>
          </div>

          {/* Route */}
          <div className="mt-[26px] flex items-center gap-[22px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[10px]">
            {/* Departure */}
            <div>
              <div
                className="font-serif text-[38px] font-bold"
              >
                {flight.departure}
              </div>

              <div className="mt-1 font-mono text-[11px] text-[#6a6255]">
                {formatTime(flight.departureTime)}
                {" · "}
                {formatDate(flight.departureTime)}
              </div>
            </div>

            {/* Route line */}
            <div className="flex-1 text-center max-[760px]:w-full">
              <div className="mb-[6px] font-mono text-[10.5px] tracking-[0.08em] text-[#6a6255]">
                {formatDuration(flight.duration)}
              </div>

              <div className="mx-1 h-px bg-[#6a6255]" />

              <div className="mt-[6px] font-mono text-[10px] tracking-[0.08em] text-[#6a6255]">
                {formatStops(flight.stops)}
              </div>
            </div>

            {/* Arrival */}
            <div>
              <div
                className="font-serif text-[38px] font-bold"
              >
                {flight.arrival}
              </div>

              <div className="mt-1 font-mono text-[11px] text-[#6a6255]">
                {formatTime(flight.arrivalTime)}
                {" · "}
                {formatDate(flight.arrivalTime)}
              </div>
            </div>
          </div>

          {/* Flight data */}
          <div className="mt-7 flex gap-[34px] border-t border-dashed border-[rgba(21,28,41,0.14)] pt-[22px]">
            <div>
              <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
                Flight No.
              </div>

              <div className="font-mono text-[14px] font-semibold">
                {flight.flightNumber}
              </div>
            </div>

            <div>
              <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
                Cabin
              </div>

              <div className="font-mono text-[14px] font-semibold">
                {flight.travelClass ?? "Economy"}
              </div>
            </div>

            <div>
              <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
                Fare Type
              </div>

              <div className="font-mono text-[14px] font-semibold">
                {flight.fareType ?? "Standard"}
              </div>
            </div>

            {flight.emissions && (
              <div>
                <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
                  Emissions
                </div>

                <div className="font-mono text-[14px] font-semibold">
                  {flight.emissions}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price stub */}
        <div
          className="
            relative
            flex
            flex-col
            justify-between
            bg-[#f2ecdf]
            px-6
            py-[30px]
          "
        >
          {/* Perforation */}
          <div
            className="
              absolute
              left-0
              top-0
              bottom-0
              border-l-[1.5px]
              border-dashed
              border-[#6a6255]
              max-[760px]:hidden
            "
          >
            <span
              className="
                absolute
                -left-[11px]
                -top-[11px]
                h-[22px]
                w-[22px]
                rounded-full
                bg-[#151c29]
              "
            />

            <span
              className="
                absolute
                -bottom-[11px]
                -left-[11px]
                h-[22px]
                w-[22px]
                rounded-full
                bg-[#151c29]
              "
            />
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
              Estimated Price
            </div>

            <div
              className="font-serif mt-[6px] text-[30px] font-bold"
            >
              {flight.price}
            </div>

            <div className="mt-1 text-[11.5px] text-[#6a6255]">
              Round-trip, per person
            </div>
          </div>

          {verifiedAt && (
            <div className="mt-5 flex items-center gap-[6px] font-mono text-[10px] text-[#a13a2e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a13a2e]" />

              Checked{" "}
              {new Date(verifiedAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </div>
          )}
        </div>
      </div>

      {/* Why + alternatives */}
      <div className="mt-[22px] grid grid-cols-[1.4fr_1fr] gap-5 max-[760px]:grid-cols-1">
        {/* Why this flight */}
        <div className="rounded-xl border border-[rgba(232,225,210,0.14)] bg-[#1e2738] px-[26px] py-6">
          <h4
            className="font-serif mb-3 text-base font-semibold text-[#f2ecdf]"
          >
            Why this flight
          </h4>

          <p className="text-sm leading-[1.65] text-[#c9c3b4]">
            {recommendationReason}
          </p>
        </div>

        {/* Alternatives */}
        <div className="rounded-xl border border-[rgba(232,225,210,0.14)] bg-[#1e2738] px-[26px] py-6">
          <h4
            className="font-serif mb-3 text-base font-semibold text-[#f2ecdf]"
          >
            Alternatives considered
          </h4>

          {alternatives.length > 0 ? (
            alternatives.map((alt, index) => (
              <div
                key={`${alt.airline}-${alt.flightNumber}-${index}`}
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-[rgba(232,225,210,0.14)]
                  py-3
                  text-[13.5px]
                  last:border-b-0
                "
              >
                <span className="min-w-0">
                  {alt.airline}
                  {" · "}
                  {formatStops(alt.stops)}
                </span>

                <span className="shrink-0 font-mono text-[#d9b276]">
                  {alt.price}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm leading-[1.65] text-[#98a1b3]">
              No alternative flights were available for comparison.
            </p>
          )}
        </div>
      </div>
    </>
  );
}