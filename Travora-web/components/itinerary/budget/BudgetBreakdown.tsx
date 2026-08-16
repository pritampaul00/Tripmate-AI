"use client";

import type { TripBudgetBreakdown } from "@/types/trip-plan";

interface BudgetBreakdownProps {
  budget: TripBudgetBreakdown | null;
}

const budgetItems = [
  {
    key: "flights",
    label: "Flights",
  },
  {
    key: "hotel",
    label: "Hotel",
  },
  {
    key: "food",
    label: "Food",
  },
  {
    key: "transportation",
    label: "Transportation",
  },
  {
    key: "activities",
    label: "Activities",
  },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
  },
] as const;

export default function BudgetBreakdown({
  budget,
}: BudgetBreakdownProps) {
  if (!budget) {
    return (
      <section>
        <div className="rounded-[14px] bg-[#e8e1d2] p-8 text-center text-[#151c29]">
          <h2 className="font-serif text-2xl font-semibold">
            Budget Information Unavailable
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6a6255]">
            A budget breakdown could not be generated for this trip.
          </p>
        </div>
      </section>
    );
  }

  const currency = budget.currency ?? "USD";

  const computedTotal = budgetItems.reduce(
    (sum, item) => sum + budget[item.key],
    0,
  );

  const total = budget.total;

  const remaining = Math.max(
    budget.remaining ?? 0,
    0,
  );

  const overBudget = Math.max(
    budget.overBudget ?? 0,
    0,
  );

  const largestCategory = budgetItems.reduce(
    (largest, item) => {
      return budget[item.key] >
        budget[largest.key]
        ? item
        : largest;
    },
    budgetItems[0],
  );

  const largestPercentage =
    total > 0
      ? (budget[largestCategory.key] / total) * 100
      : 0;

  const totalMatches =
    Math.abs(computedTotal - total) < 0.01;

  const reconcileString = budgetItems
    .map(
      (item) =>
        `${currency} ${budget[item.key]}`,
    )
    .join(" + ");

  const status =
    budget.status ??
    (overBudget > 0
      ? "over-budget"
      : remaining > 0
        ? "within-budget"
        : "fully-allocated");

  return (
    <section>
      <div className="rounded-[14px] bg-[#e8e1d2] p-8 text-[#151c29] lg:p-[34px]">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-[22px] font-semibold">
              Estimated Cost
            </h2>

            <p className="mt-1.5 max-w-[380px] text-[13.5px] text-[#6a6255]">
              Every figure below sums to the total on the right, no rounding gaps.
            </p>
          </div>

          <div className="text-right">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#6a6255]">
              Total Estimated
            </p>

            <p className="mt-1.5 font-serif text-[30px] font-bold">
              {currency} {total}
            </p>

            <p
              className={`mt-1 font-mono text-[11.5px] ${
                overBudget > 0
                  ? "text-[#a13a2e]"
                  : "text-[#6a6255]"
              }`}
            >
              {overBudget > 0
                ? `${currency} ${overBudget} over budget`
                : budget.budget != null
                  ? `against your ${currency} ${budget.budget} cap`
                  : `${currency} ${remaining} remaining`}
            </p>
          </div>
        </div>

        {/* Status pills */}
        {(budget.budget != null || budget.hotelNights != null) && (
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#151c29]/10 bg-[#151c29]/5 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#151c29]">
              Status: {status}
            </span>

            {budget.budget != null && (
              <span className="rounded-full border border-[#151c29]/10 bg-[#151c29]/5 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#151c29]">
                Budget: {currency} {budget.budget}
              </span>
            )}

            {budget.hotelNights != null && (
              <span className="rounded-full border border-[#151c29]/10 bg-[#151c29]/5 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#151c29]">
                {budget.hotelNights} hotel nights
              </span>
            )}
          </div>
        )}

        {/* Category grid */}
        <div className="mt-[26px] grid grid-cols-1 gap-4 md:grid-cols-2">
          {budgetItems.map((item) => {
            const value = budget[item.key];

            const percentage =
              total > 0
                ? (value / total) * 100
                : 0;

            return (
              <div
                key={item.key}
                className="border-b border-[#151c29]/[0.14] pb-4"
              >
                <div className="flex items-center justify-between text-[14.5px]">
                  <span className="font-semibold">
                    {item.label}
                  </span>

                  <span className="font-mono">
                    {currency} {value}
                  </span>
                </div>

                <p className="mt-[3px] text-[11.5px] text-[#6a6255]">
                  {percentage.toFixed(0)}% of estimated cost
                </p>

                <div className="mt-[9px] h-1 overflow-hidden rounded-full bg-[#151c29]/[0.14]">
                  <div
                    className="h-full rounded-full bg-[#a13a2e]"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Reconciliation */}
        <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-[#151c29]/[0.14] pt-5 font-mono text-[12.5px] text-[#5c7a5e] lg:flex-row lg:items-center lg:justify-between">
          <span>
            {reconcileString} = {currency} {computedTotal}
          </span>

          <span>
            {totalMatches
              ? "Budget reconciled"
              : `Backend total: ${currency} ${total}`}
          </span>
        </div>

        {/* Insights */}
        <div className="mt-[22px] flex flex-col gap-2.5">
          <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
            <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
            <p>
              {largestCategory.label} is the largest estimated expense at{" "}
              {currency} {budget[largestCategory.key]}, representing{" "}
              {largestPercentage.toFixed(0)}% of the total.
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
            <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
            <p>
              {overBudget > 0
                ? `The itinerary is ${currency} ${overBudget} above the requested budget.`
                : remaining > 0
                  ? `The itinerary leaves ${currency} ${remaining} available for unexpected expenses or additional spending.`
                  : "The estimated budget is fully allocated across the planned expenses."}
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
            <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
            <p>
              {totalMatches
                ? "All six expense categories reconcile with the backend generated total."
                : "The category values differ from the backend generated total. Review the generated budget before relying on the estimate."}
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
            <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
            <p>
              Keep the {largestCategory.label.toLowerCase()} estimate in mind
              when adjusting the itinerary, since it has the largest impact
              on the overall trip cost.
            </p>
          </div>

          {budget.health && (
            <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
              <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
              <p>Budget health: {budget.health}</p>
            </div>
          )}

          {budget.risk && (
            <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
              <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
              <p>Budget risk: {budget.risk}</p>
            </div>
          )}

          {budget.dailyAllowance != null && (
            <div className="flex items-start gap-2.5 text-[13.5px] text-[#3a3327]">
              <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#a13a2e]" />
              <p>
                Daily allowance: {currency} {budget.dailyAllowance}
              </p>
            </div>
          )}
        </div>

        {/* Backend recommendations */}
        {budget.recommendations &&
          budget.recommendations.length > 0 && (
            <div className="mt-6 border-t border-dashed border-[#151c29]/[0.14] pt-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6a6255]">
                Budget Recommendations
              </p>

              <div className="space-y-2.5">
                {budget.recommendations.map(
                  (recommendation, index) => (
                    <div
                      key={`${recommendation.type}-${index}`}
                      className="rounded-xl bg-[#151c29]/5 p-3.5"
                    >
                      <p className="text-[13.5px] leading-6 text-[#3a3327]">
                        {recommendation.message}
                      </p>

                      {recommendation.savings != null && (
                        <p className="mt-1 text-xs text-[#a13a2e]">
                          Potential savings: {currency}{" "}
                          {recommendation.savings}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        {/* Warnings */}
        {budget.warnings && budget.warnings.length > 0 && (
          <div className="mt-6 border-t border-dashed border-[#151c29]/[0.14] pt-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#6a6255]">
              Budget Warnings
            </p>

            <div className="space-y-2">
              {budget.warnings.map((warning, index) => (
                <p
                  key={`${warning}-${index}`}
                  className="text-[13.5px] leading-6 text-[#a13a2e]"
                >
                  {warning}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}