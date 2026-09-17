"use client";

import React from "react";
import { SearchInput } from "@/components/ui/search-input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { StudentStatus } from "../types";

export interface StudentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: StudentStatus | "all";
  onStatusChange: (status: StudentStatus | "all") => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All link states" },
  { value: "linked", label: "Linked" },
  { value: "invited", label: "Invited" },
  { value: "consent_pending", label: "Consent pending" },
];

export function StudentFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: StudentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onClear={() => onSearchChange("")}
        placeholder="Name, course or code"
        containerClassName="w-full sm:w-[320px]"
      />

      <SelectDropdown
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => onStatusChange(e.target.value as StudentStatus | "all")}
        containerClassName="w-full sm:w-[170px]"
      />
    </div>
  );
}
