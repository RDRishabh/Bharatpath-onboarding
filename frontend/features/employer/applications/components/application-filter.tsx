"use client";

import { AppSelect } from "@/components/ui/app-select";

interface ApplicationFilterProps {
  value: string;
  total: number;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function ApplicationFilter({
  value,
  total,
  options,
  onChange,
}: ApplicationFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <AppSelect
        value={value}
        onChange={onChange}
        options={options}
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