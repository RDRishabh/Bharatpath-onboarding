"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { ChevronDown } from "lucide-react";

interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  className?: string;
  placeholder?: string;
}

export function AppSelect({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Select",
}: AppSelectProps) {
  const [open, setOpen] = useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const selectedOption = options.find(
    (option) => option.value === value,
  );

  /* =====================================================
     CLOSE WHEN CLICKING OUTSIDE
     ===================================================== */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  /* =====================================================
     CLOSE WITH ESCAPE
     ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open]);

  /* =====================================================
     SELECT OPTION
     ===================================================== */

  function handleSelect(option: AppSelectOption) {
    onChange(option.value);

    // IMPORTANT:
    // close dropdown immediately after selection
    setOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* =================================================
          TRIGGER
          ================================================= */}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="
          flex h-[36px] w-full
          items-center justify-between
          gap-2
          rounded-[8px]
          border border-[#e1e5ea]
          bg-white
          px-3
          text-left
          transition-colors
          hover:bg-[#f8f9fb]
          focus:outline-none
        "
      >
        <span className="truncate text-[11px] font-semibold text-[#283247]">
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronDown
          size={14}
          className={`shrink-0 text-[#687386] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* =================================================
          DROPDOWN
          ================================================= */}

      {open && (
        <div
          role="listbox"
          className="
            absolute
            right-0
            top-[calc(100%+6px)]
            z-[80]
            w-full
            min-w-[140px]
            overflow-hidden
            rounded-[10px]
            border border-[#e1e5ea]
            bg-white
            p-1
            shadow-[0_8px_24px_rgba(19,26,38,0.10)]
          "
        >
          {options.map((option) => {
            const selected =
              option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() =>
                  handleSelect(option)
                }
                className={`
                  flex
                  w-full
                  items-center
                  rounded-[7px]
                  px-2.5
                  py-2
                  text-left
                  text-[11px]
                  transition-colors
                  ${
                    selected
                      ? "bg-[#f2f0ff] font-semibold text-[#51449a]"
                      : "font-medium text-[#4f5969] hover:bg-[#f7f8fa]"
                  }
                `}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}