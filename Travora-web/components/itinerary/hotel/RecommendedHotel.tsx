"use client";

import type { Hotel } from "@/types/hotel";

interface HotelAlternative {
  name: string;
  price?: string;
}

interface HotelExplanation {
  reason?: string;
  alternatives?: HotelAlternative[];
}

interface RecommendedHotelProps {
  //hotel: Hotel;
  hotel: Hotel | null;
  hotelExplanation?: HotelExplanation | null;
}

export default function RecommendedHotel({
  hotel,
  hotelExplanation,
}: RecommendedHotelProps) {
  const alternatives =
    hotelExplanation?.alternatives ?? [];

  if (!hotel) {
    return (
      <div className="rounded-[14px] bg-[#e8e1d2] p-8 text-[#151c29] lg:px-[34px]">
        <div
          className="font-serif text-[26px] font-semibold"
        >
          No Recommended Hotel
        </div>

        <p className="mt-3 text-[14.5px] leading-[1.7] text-[#3a3327]">
          No suitable hotel was available for
          the selected dates.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-[#e8e1d2] p-8 text-[#151c29] lg:px-[34px]">
      {/* Hotel top */}
      <div className="flex items-start justify-between gap-8">
        <div>
          <div
            className="font-serif text-[26px] font-semibold"
          >
            {hotel.name}
          </div>

          {hotel.address && (
            <div className="mt-2 font-mono text-xs text-[#6a6255]">
              {hotel.address}
            </div>
          )}
        </div>

        {hotel.price && (
          <div className="shrink-0 text-right">
            <div
              className="font-serif text-[26px] font-bold"
            >
              {hotel.price}
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
              per night
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 flex flex-wrap gap-x-9 gap-y-4 border-t border-dashed border-[rgba(21,28,41,0.14)] pt-5">
        <div>
          <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
            Rating
          </div>

          <div className="text-[15px] font-semibold">
            {hotel.rating ?? "N/A"}
            {hotel.reviews
              ? ` · ${hotel.reviews.toLocaleString()} reviews`
              : ""}
          </div>
        </div>

        <div>
          <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
            Room type
          </div>

          <div className="text-[15px] font-semibold">
            {hotel.roomType ?? "N/A"}
          </div>
        </div>

        <div>
          <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
            Cancellation
          </div>

          <div className="text-[15px] font-semibold">
            {hotel.cancellationPolicy ??
              "Check policy"}
          </div>
        </div>

        <div>
          <div className="mb-[5px] font-mono text-[10px] uppercase tracking-[0.1em] text-[#6a6255]">
            Checked
          </div>

          <div className="font-mono text-[14px] font-semibold">
            {hotel.checkedAt ?? "Recently"}
          </div>
        </div>
      </div>

      {/* Description */}
      {hotel.description && (
        <div className="mt-[22px] text-[14.5px] leading-[1.7] text-[#3a3327]">
          {hotel.description}
        </div>
      )}

      {/* Bottom cards */}
      <div className="mt-[22px] grid grid-cols-[1.4fr_1fr] gap-5">
        {/* Why hotel */}
        <div className="rounded-xl border border-[rgba(21,28,41,0.14)] bg-[#f2ecdf] px-[26px] py-6">
          <h4
            className="font-serif mb-3 text-base font-semibold text-[#151c29]"
          >
            Why this hotel
          </h4>

          <p className="text-sm leading-[1.65] text-[#3a3327]">
            {hotelExplanation?.reason ??
              "This hotel offers the strongest overall combination of location, price, rating, and suitability for your trip."}
          </p>
        </div>

        {/* Alternatives */}
        <div className="rounded-xl border border-[rgba(21,28,41,0.14)] bg-[#f2ecdf] px-[26px] py-6">
          <h4
            className="font-serif mb-3 text-base font-semibold text-[#151c29]"
          >
            Alternative considered
          </h4>

          {alternatives.length > 0 ? (
            alternatives.map(
              (alternative, index) => (
                <div
                  key={`${alternative.name}-${index}`}
                  className="flex items-center justify-between border-b border-[rgba(21,28,41,0.14)] py-3 text-[13.5px] last:border-b-0"
                >
                  <span>
                    {alternative.name}
                  </span>

                  <span className="font-mono text-[#a13a2e]">
                    {alternative.price ?? "N/A"}
                  </span>
                </div>
              ),
            )
          ) : (
            <p className="text-sm leading-[1.65] text-[#3a3327]">
              No alternative hotels were
              available for comparison.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}