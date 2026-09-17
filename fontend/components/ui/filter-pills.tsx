export interface FilterPillOption<T extends string = string> {
  value: T;
  label: string;
}

export interface FilterPillsProps<T extends string = string> {
  options: FilterPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: FilterPillsProps<T>) {
  return (
    <div
      className={`flex gap-2 overflow-x-auto ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-2 text-[12px] font-semibold transition-colors ${
              selected
                ? "border-[#3566b8] bg-[#edf2fa] text-[#2c5aa0]"
                : "border-[#dfe2e8] bg-white text-[#777f90] hover:bg-[#f8f9fb]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
