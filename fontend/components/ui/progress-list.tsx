export type ProgressListTone = "warning" | "info" | "neutral";

export interface ProgressListItem {
  id?: string;
  label: string;
  value: number;
  display?: string;
  tone?: ProgressListTone;
}

export interface ProgressListProps {
  items: ProgressListItem[];
  className?: string;
  getTone?: (item: ProgressListItem) => ProgressListTone;
}

const BAR_TONES: Record<ProgressListTone, string> = {
  warning: "bg-(--amber-ink)",
  info: "bg-(--indigo-weak)",
  neutral: "bg-(--ink-muted)",
};

export function ProgressList({
  items,
  className = "",
  getTone,
}: ProgressListProps) {
  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {items.map((item) => {
        const tone =
          item.tone ?? getTone?.(item) ?? (item.value >= 30 ? "warning" : "info");
        const width = Math.min(100, Math.max(0, item.value));

        return (
          <div
            key={item.id ?? item.label}
            className="flex flex-col gap-1.5"
          >
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-[13px] font-medium leading-[17px] text-(--navy)">
                {item.label}
              </span>
              <span className="shrink-0 text-[12px] font-semibold leading-4 text-(--ink-muted)">
                {item.display ?? `${item.value}%`}
              </span>
            </div>

            <span className="block h-1.5 overflow-hidden rounded-full bg-(--border-hair)">
              <span
                className={`block h-full rounded-full ${BAR_TONES[tone]}`}
                style={{
                  width: `${width}%`,
                  transition: "width 0.4s",
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
