import React, { InputHTMLAttributes, forwardRef } from "react";
import { Search, X } from "lucide-react";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = "Search...",
      className = "",
      containerClassName = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={`relative flex items-center ${containerClassName}`}>
        <Search
          size={16}
          strokeWidth={2}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a91a0] pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`h-[40px] w-full rounded-xl border border-[#dfe2e8] bg-white pl-10 pr-9 text-[13px] text-[#151b2b] placeholder:text-[#8a91a0] outline-none transition-colors focus:border-[#5b4fcf] focus:ring-1 focus:ring-[#5b4fcf]/20 ${className}`}
          style={{ fontFamily: "'General Sans', sans-serif" }}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full text-[#8a91a0] hover:bg-[#f3f4f7] hover:text-[#151b2b]"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
