"use client";

import { motion } from "framer-motion";

interface TravelTip {
  tag: string;
  title: string;
  description: string;
}

interface TravelTipsProps {
  travelTips: TravelTip[];
  startDate?: string;
  endDate?: string;
}

const categoryStyles: Record<
  string,
  {
    label: string;
    accent: string;
  }
> = {
  WEATHER: {
    label: "Weather",
    accent: "#8FA8C7",
  },
  TRANSIT: {
    label: "Transit",
    accent: "#8FB59A",
  },
  "BOOKING WINDOW": {
    label: "Booking Window",
    accent: "#D9B276",
  },
  MONEY: {
    label: "Money",
    accent: "#B89A68",
  },
  CROWDS: {
    label: "Crowds",
    accent: "#A98FBD",
  },
  SAFETY: {
    label: "Safety",
    accent: "#B98278",
  },
};

function formatDateRange(
  startDate?: string,
  endDate?: string,
) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return null;
  }

  const month = start.toLocaleDateString("en-US", {
    month: "short",
  });

  const startDay = start.getDate();
  const endDay = end.getDate();

  return `${month} ${startDay}-${endDay}`;
}

export default function TravelTips({
  travelTips,
  startDate,
  endDate,
}: TravelTipsProps) {
  const dateRange = formatDateRange(
    startDate,
    endDate,
  );

  if (!travelTips.length) {
    return (
      <section>
        <div className="rounded-2xl border border-[#394456] bg-[#1F293B] p-8 text-center">
          <p className="text-[#C0C6D1]">
            No travel recommendations are available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="grid gap-5 md:grid-cols-2">
        {travelTips.map((tip, index) => {
          const category =
            categoryStyles[tip.tag] ?? {
              label: tip.tag,
              accent: "#D9B276",
            };

          const showDate =
            tip.tag === "WEATHER" && dateRange;

          return (
            <motion.div
              key={`${tip.tag}-${tip.title}-${index}`}
              initial={{
                opacity: 0,
                y: 20,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
                margin: "-80px",
              }}
              transition={{
                duration: 0.45,
                delay: index * 0.06,
              }}
              whileHover={{
                y: -3,
              }}
              className="
                group
                min-h-[220px]
                rounded-2xl
                border
                border-[#394456]
                bg-[#1F293B]
                p-7
                transition-all
                duration-300
                hover:border-[#4A566A]
              "
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      category.accent,
                  }}
                />

                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{
                    color: category.accent,
                  }}
                >
                  {category.label}
                </p>

                {showDate && (
                  <>
                    <span className="text-[#667085]">
                      ·
                    </span>

                    <p
                      className="font-mono text-[10px] uppercase tracking-[0.18em]"
                      style={{
                        color: category.accent,
                      }}
                    >
                      {dateRange}
                    </p>
                  </>
                )}
              </div>

              <h3
                className="
                  font-serif
                  mt-5
                  text-[21px]
                  leading-[1.3]
                  text-[#F2ECDF]
                "
              >
                {tip.title}
              </h3>

              <p
                className="
                  mt-4
                  text-[15px]
                  leading-7
                  text-[#C0C6D1]
                "
              >
                {tip.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}