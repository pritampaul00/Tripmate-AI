"use client";

interface ReportFooterProps {
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  statusLabel?: string;
}

function formatDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReportFooter({
  origin,
  destination,
  startDate,
  endDate,
  statusLabel = "Ready to travel · all totals reconciled",
}: ReportFooterProps) {
  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  const dateRange =
    formattedStart && formattedEnd
      ? `${formattedStart} – ${formattedEnd}`
      : formattedStart || formattedEnd || "";

  const routeLabel =
    origin && destination
      ? `${origin} → ${destination}`
      : destination || origin || "your trip";

  const footerNote = [
    `Report generated for ${routeLabel}`,
    dateRange,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(
      ". Model version and all data sources are logged above for reproducibility.",
    );

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#e8e1d2] text-[#151c29]">
      <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-[18px] px-7 py-11">
        <div>
          <div className="font-serif text-xl font-bold">
            Travora
          </div>

          <p className="mt-1.5 max-w-[520px] text-xs text-[#6a6255]">
            {footerNote}
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs text-[#5c7a5e]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#5c7a5e]" />
          {statusLabel}
        </div>
      </div>
    </div>
  );
}