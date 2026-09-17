import React, { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectDropdownProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  containerClassName?: string;
}

export const SelectDropdown = forwardRef<
  HTMLSelectElement,
  SelectDropdownProps
>(
  (
    {
      options,
      value,
      onChange,
      className = "",
      containerClassName = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={`relative flex items-center ${containerClassName}`}>
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          className={`h-[40px] w-full appearance-none rounded-xl border border-[#dfe2e8] bg-white px-3.5 pr-9 text-[13px] font-medium text-[#303747] outline-none transition-colors hover:border-[#cfd3dc] focus:border-[#5b4fcf] focus:ring-1 focus:ring-[#5b4fcf]/20 cursor-pointer ${className}`}
          style={{ fontFamily: "'General Sans', sans-serif" }}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className="pointer-events-none absolute right-3 text-[#777f90]"
        />
      </div>
    );
  },
);

SelectDropdown.displayName = "SelectDropdown";
