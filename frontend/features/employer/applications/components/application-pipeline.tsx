"use client";

import { useMemo } from "react";

import type {
  EmployerApplication,
} from "../types";

import {
  APPLICATION_COLUMNS,
} from "../data";

import { ApplicationColumn } from "./application-column";

interface ApplicationPipelineProps {
  applications: EmployerApplication[];

  onApplicationClick: (
    id: string,
  ) => void;
}

export function ApplicationPipeline({
  applications,
  onApplicationClick,
}: ApplicationPipelineProps) {
  const columns = useMemo(() => {
    return APPLICATION_COLUMNS.map(
      (column) => {
        const items =
          applications.filter(
            (application) => {
              if (
                application.stage !==
                column.stage
              ) {
                return false;
              }

              if (
                column.outcome
              ) {
                return (
                  application.outcome ===
                  column.outcome
                );
              }

              return true;
            },
          );

        return {
          column,
          applications: items,
        };
      },
    );
  }, [applications]);

  return (
    <div
      className="
        min-h-0
        flex-1
        overflow-x-auto
        overflow-y-hidden
        pb-2
      "
    >
      <div className="flex min-w-max gap-3">
        {columns.map(
          ({
            column,
            applications: items,
          }) => (
            <ApplicationColumn
              key={column.id}
              column={column}
              applications={items}
              onApplicationClick={
                onApplicationClick
              }
            />
          ),
        )}
      </div>
    </div>
  );
}