"use client";

import { AppSelect } from "@/components/ui/app-select";

import {
  APPLICATION_JOB_OPTIONS,
} from "../data";

interface ApplicationFilterProps {
  value: string;
  total: number;
  onChange: (value: string) => void;
}

export function ApplicationFilter({
  value,
  total,
  onChange,
}: ApplicationFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <AppSelect
        value={value}
        onChange={onChange}
        options={APPLICATION_JOB_OPTIONS}
        className="w-[178px]"
      />

      <span className="text-[12px] font-medium text-[#777f90]">
        {total}{" "}
        {total === 1
          ? "in pipeline"
          : "in pipeline"}
      </span>
    </div>
  );
}