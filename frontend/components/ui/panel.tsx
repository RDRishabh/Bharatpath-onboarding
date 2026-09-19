import { ReactNode } from "react";

export interface PanelProps {
  title?: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  footerClassName?: string;
}

export function Panel({
  title,
  meta,
  footer,
  children,
  className = "",
  footerClassName = "",
}: PanelProps) {
  const hasHeader = title != null || meta != null;

  return (
    <div
      className={`flex flex-col rounded-[16px] border border-(--border-card) bg-white p-5 ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3">
          {title != null && (
            <h2 className="text-[14px] font-semibold leading-[18px] text-(--navy)">
              {title}
            </h2>
          )}
          {meta != null && (
            <span className="shrink-0 text-[12px] font-medium text-(--ink-muted)">
              {meta}
            </span>
          )}
        </div>
      )}

      <div className={hasHeader ? "mt-3.5 flex-1" : "flex-1"}>{children}</div>

      {footer != null && (
        <p
          className={`mt-3.5 text-[12px] font-normal leading-[17px] text-(--ink-muted) ${footerClassName}`}
        >
          {footer}
        </p>
      )}
    </div>
  );
}
