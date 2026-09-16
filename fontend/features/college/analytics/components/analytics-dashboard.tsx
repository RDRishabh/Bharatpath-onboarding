"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { usePageHeader } from "@/components/layout/header-context";
import {
  BarChart,
  Button,
  FilterPills,
  Panel,
  ProgressList,
  StatCard,
} from "@/components/ui";

import { AnalyticsCohort, CollegeAnalytics } from "../types";
import { OutcomesTable } from "./outcomes-table";

const COHORT_OPTIONS: { value: AnalyticsCohort; label: string }[] = [
  { value: "2025-26", label: "Cohort 2025-26" },
  { value: "2024-25", label: "Cohort 2024-25" },
  { value: "all", label: "All cohorts" },
];

interface AnalyticsDashboardProps {
  data: CollegeAnalytics;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [cohort, setCohort] = useState<AnalyticsCohort>("2025-26");

  const headerAction = useMemo(
    () => (
      <Button
        type="button"
        variant="primary"
        size="md"
        icon={<Download size={15} strokeWidth={2.2} />}
        onClick={() => exportOutcomes(data)}
        className="shadow-sm"
      >
        Export report
      </Button>
    ),
    [data],
  );

  usePageHeader(
    "Analytics & Outcomes",
    "Cohort score analytics and platform-sourced outcomes",
    {
      stat: {
        label: `${data.seats.used} of ${data.seats.total} seats used`,
        progress:
          data.seats.total > 0
            ? (data.seats.used / data.seats.total) * 100
            : 0,
      },
      action: headerAction,
    },
  );

  const cohortLabel =
    COHORT_OPTIONS.find((option) => option.value === cohort)?.label ??
    "Cohort 2025-26";

  return (
    <div
      className="mx-auto max-w-[1280px] space-y-5"
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills
          options={COHORT_OPTIONS}
          value={cohort}
          onChange={setCohort}
        />

        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={<Download size={15} strokeWidth={2.2} />}
          onClick={() => exportOutcomes(data)}
        >
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <StatCard
            key={metric.id}
            value={metric.value}
            label={metric.label}
            delta={metric.delta}
            deltaLabel={metric.deltaLabel}
          />
        ))}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Average score by course"
          meta={cohortLabel}
          footer="Bars show the mean verified score of consenting students in each course."
        >
          <BarChart
            items={data.courseScores.map((course) => ({
              label: course.label,
              value: course.score,
            }))}
          />
        </Panel>

        <Panel
          title="Where students lose points"
          footer="Share of your cohort scoring below the platform median on each attribute."
          footerClassName="mt-0 border-t border-(--border-hair) pt-3"
          className="rounded-[12px] shadow-[0_4px_12px_rgba(19,26,38,0.024)]"
        >
          <ProgressList
            items={data.skillGaps.map((gap) => ({
              label: gap.label,
              value: gap.percentageBelowMedian,
              display: `${gap.percentageBelowMedian}% below median`,
            }))}
          />
        </Panel>
      </div>

      <OutcomesTable outcomes={data.outcomes} />
    </div>
  );
}

function exportOutcomes(data: CollegeAnalytics) {
  downloadCsv("bharatpath-outcomes.csv", [
    ["Role", "Employer", "Applied", "Stage", "Students"],
    ...data.outcomes.map((outcome) => [
      outcome.role,
      outcome.employer,
      outcome.applied,
      outcome.stage,
      String(outcome.students),
    ]),
  ]);
}
