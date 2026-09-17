"use client";

import { useAppSelector } from "@/store/hooks";
import {
  selectInvoices,
  selectTotalSpent,
} from "@/store/employer/settings";

export function InvoicesTab() {
  const invoices = useAppSelector(selectInvoices);
  const totalSpent = useAppSelector(selectTotalSpent);

  return (
    <>
      <div className="mb-2.5 flex items-start justify-between gap-4">
        <h2 className="m-0 text-[13px] font-bold leading-[18px]">
          Billing history
        </h2>

        <span className="text-[11px] text-[#8b6575]">
          Total spent · ₹{totalSpent.toLocaleString("en-IN")}
        </span>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#e0e4e9] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.02)]">
        <div className="grid min-h-[37px] grid-cols-[minmax(0,1fr)_105px_95px_28px] items-center gap-[18px] bg-[#f4f6f8] px-[18px] text-[10px] font-extrabold text-[#657083] max-sm:grid-cols-[minmax(0,1fr)_75px_65px_22px] max-sm:gap-2 max-sm:px-2.5">
          <span>DESCRIPTION</span>
          <span>AMOUNT</span>
          <span>STATUS</span>
          <span />
        </div>

        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="grid min-h-[59px] grid-cols-[minmax(0,1fr)_105px_95px_28px] items-center gap-[18px] border-t border-[#edf0f3] px-[18px] max-sm:grid-cols-[minmax(0,1fr)_75px_65px_22px] max-sm:gap-2 max-sm:px-2.5"
          >
            <div>
              <strong className="block text-xs">{invoice.description}</strong>
              <small className="mt-0.5 block text-[10px] text-[#718096]">
                {invoice.date}
              </small>
            </div>

            <strong className="text-xs">
              ₹{invoice.amount.toLocaleString("en-IN")}
            </strong>

            <span className="w-fit rounded-full bg-[#e9f6f0] px-2 py-1 text-[10px] font-bold text-[#13875e]">
              {invoice.status.toUpperCase()}
            </span>

            <button
              type="button"
              aria-label={`Download invoice ${invoice.description}`}
              className="cursor-pointer border-0 bg-transparent text-[17px] text-[#4e5a6c]"
            >
              ⇩
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
