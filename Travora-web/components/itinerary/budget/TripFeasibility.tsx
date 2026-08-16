"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";

import type { TripFeasibility as TripFeasibilityType } from "@/types/trip-plan";

interface TripFeasibilityProps {
  feasibility?: TripFeasibilityType;
}

export default function TripFeasibility({
  feasibility,
}: TripFeasibilityProps) {
  if (!feasibility) {
    return null;
  }

  const isOverBudget =
    feasibility.overBudget > 0 ||
    feasibility.status === "over-budget";

  const isTight =
    feasibility.status === "tight" ||
    feasibility.status === "risky";

  const statusColor = isOverBudget
    ? "#e07165" : isTight
    ? "#d9b276" : "#8fb59a";

  const StatusIcon = isOverBudget
    ? XCircle : isTight
    ? AlertTriangle : CheckCircle2;

  const statusLabel = isOverBudget
    ? "Over Budget" : isTight
    ? "Budget Requires Attention" : "Trip Is Feasible";

  return (
    <section>
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#1e2738]">
        {/* Header */}
        <div className="border-b border-white/10 p-7 lg:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d9b276]">
                Trip Feasibility
              </p>

              <h2 className="mt-2 font-serif text-3xl font-semibold text-[#f2ecdf]">
                {statusLabel}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
                The feasibility assessment combines your budget,
                estimated trip cost, remaining funds and overall
                budget utilization.
              </p>
            </div>

            <div
              className="flex shrink-0 items-center gap-3 rounded-2xl border px-5 py-4"
              style={{ borderColor: `${statusColor}40`, backgroundColor: `${statusColor}12`}}
            >
              <StatusIcon
                className="h-6 w-6"
                style={{ color: statusColor }}
              />

              <div>
                <p
                  className="font-mono text-xs uppercase tracking-[0.15em]"
                  style={{ color: statusColor }}
                >
                  {feasibility.status}
                </p>

                <p className="mt-1 text-xs text-white/50">
                  Confidence {feasibility.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 border-b border-white/10 lg:grid-cols-4">
          <Metric
            label="Budget"
            value={
              feasibility.budget != null
                ? `$${ feasibility.budget}`: "No budget" }
          />

          <Metric
            label="Estimated Total"
            value={`$${feasibility.estimatedTotal}`}
          />

          <Metric
            label={
              feasibility.overBudget > 0
                ? "Over Budget" : "Remaining" }

            value={feasibility.overBudget > 0 ? `$${feasibility.overBudget}`: `$${Math.max(feasibility.remaining, 0,)}`}
          />

          <Metric
            label="Utilization"
            value={`${feasibility.utilizationPercent.toFixed(0)}%`}
          />
        </div>

        {/* Utilization */}
        <div className="p-7 lg:p-9">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Budget Utilization
            </p>

            <span className="font-mono text-sm text-white/60">
              {feasibility.utilizationPercent.toFixed(1)}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{
                width: `${Math.min(
                  feasibility.utilizationPercent,
                  100,
                )}%`,
              }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
              }}
              className="h-full rounded-full"
              style={{
                backgroundColor: statusColor,
              }}
            />
          </div>

          {/* Reasons */}
          {feasibility.reasons?.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                Assessment
              </p>

              <div className="mt-4 space-y-3">
                {feasibility.reasons.map(
                  (reason, index) => (
                    <div
                      key={`${reason}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#8fb59a]" />

                      <p className="text-sm leading-6 text-white/65">
                        {reason}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {feasibility.warnings?.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d9b276]">
                Warnings
              </p>

              <div className="mt-4 space-y-3">
                {feasibility.warnings.map(
                  (warning, index) => (
                    <div
                      key={`${warning}-${index}`}
                      className="flex items-start gap-3"
                    >
                      <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[#d9b276]" />

                      <p className="text-sm leading-6 text-white/60">
                        {warning}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Assumptions */}
          {feasibility.assumptions?.length > 0 && (
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                Assumptions
              </p>

              <div className="mt-4 space-y-2">
                {feasibility.assumptions.map(
                  (assumption, index) => (
                    <p
                      key={`${assumption}-${index}`}
                      className="text-sm leading-6 text-white/50"
                    >
                      {assumption}
                    </p>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({
  label,
  value,
}: MetricProps) {
  return (
    <div className="border-r border-white/10 px-5 py-5 last:border-r-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-[#f2ecdf]">
        {value}
      </p>
    </div>
  );
}