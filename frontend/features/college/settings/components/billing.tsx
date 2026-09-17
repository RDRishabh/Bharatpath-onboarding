"use client";

import { Receipt } from "lucide-react";

import { useSettings } from "../hooks/use-settings";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function Billing() {
  const {
    seats,
    invoices,
    requestSeats,
    isRequestingSeats,
  } = useSettings();

  const percentage =
    seats.total > 0
      ? Math.min((seats.used / seats.total) * 100, 100)
      : 0;

  const handleRequestSeats = async () => {
    await requestSeats(50);
  };

  return (
    <div
      className="flex w-full flex-col gap-4 px-4 pb-10"
      style={{
        fontFamily: "'General Sans', sans-serif",
      }}
    >
      {/* Billing Cards */}
      <div
        className="
          grid
          w-full
          grid-cols-1
          gap-4
          min-[1024px]:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]
        "
      >
        {/* =========================
            Seat Block
        ========================= */}
        <section
          className="
            flex
            flex-col
            gap-[14px]
            rounded-[12px]
            border
            border-[#e1e5eb]
            bg-white
            p-5
            shadow-[0_4px_12px_rgba(19,26,38,0.024)]
          "
        >
          {/* Title + Status */}
          <div className="flex items-center gap-[10px]">
            <span className="flex-1 text-[14px] font-semibold leading-[18px] text-[#131A26]">
              Seat block
            </span>

            <span
              className="
                whitespace-nowrap
                rounded-full
                bg-[#eaf6f0]
                px-[10px]
                py-1
                text-[11px]
                font-semibold
                leading-[14px]
                text-[#00845a]
              "
            >
              {seats.status}
            </span>
          </div>

          {/* Seat Count */}
          <span
            className="
              text-[28px]
              font-bold
              leading-8
              tracking-[-0.02em]
              text-[#131A26]
            "
          >
            {seats.used} / {seats.total}
          </span>

          {/* Progress */}
          <span className="block h-2 overflow-hidden rounded-full bg-[#eef0f3]">
            <span
              className="
                block
                h-full
                rounded-full
                bg-[#3566b8]
                transition-all
              "
              style={{
                width: `${percentage}%`,
              }}
            />
          </span>

          {/* Description */}
          <p
            className="
              text-[12px]
              font-normal
              leading-[17px]
              text-[#131A26]
            "
          >
            Seat pricing is confirmed on your invoice. Contact your
            BharatPath partner manager to change the block mid-term.
          </p>

          {/* Actions */}
          <div
            className="
              flex
              gap-[10px]
              border-t
              border-[#eef0f3]
              pt-3
            "
          >
            <button
              type="button"
              disabled={isRequestingSeats}
              onClick={handleRequestSeats}
              className="
                flex-1
                rounded-[8px]
                border-0
                bg-[#5a4bd6]
                px-3
                py-3
                text-[13px]
                font-semibold
                leading-[17px]
                text-white
                transition
                hover:bg-[#4f41c8]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {isRequestingSeats
                ? "Requesting..."
                : "Request more seats"}
            </button>

            <button
              type="button"
              className="
                flex-1
                rounded-[8px]
                border
                border-[#e1e5eb]
                bg-white
                px-3
                py-3
                text-[13px]
                font-semibold
                leading-[17px]
                text-[#131A26]
                transition
                hover:bg-[#f8fafc]
              "
              onClick={() => {
                // Replace with real quote download later.
              }}
            >
              Download quote
            </button>
          </div>
        </section>

        {/* =========================
            Invoices
        ========================= */}
        <section
          className="
            overflow-x-auto
            rounded-[12px]
            border
            border-[#e1e5eb]
            bg-white
            shadow-[0_4px_12px_rgba(19,26,38,0.024)]
          "
        >
          {/* Invoice Title */}
          <div
            className="
              min-w-[420px]
              border-b
              border-[#e1e5eb]
              px-5
              py-4
              text-[14px]
              font-semibold
              leading-[18px]
              text-[#131A26]
            "
          >
            Invoices
          </div>

          {/* Table Header */}
          <div
            className="
              grid
              min-w-[420px]
              grid-cols-[minmax(160px,1fr)_104px_88px]
              gap-3
              border-b
              border-[#e1e5eb]
              bg-[#f3f5f7]
              px-5
              py-3
            "
          >
            <span
              className="
                text-[11px]
                font-bold
                leading-[14px]
                text-[#64748b]
              "
            >
              INVOICE
            </span>

            <span
              className="
                text-[11px]
                font-bold
                leading-[14px]
                text-[#64748b]
              "
            >
              AMOUNT
            </span>

            <span
              className="
                text-right
                text-[11px]
                font-bold
                leading-[14px]
                text-[#64748b]
              "
            >
              STATUS
            </span>
          </div>

          {/* Invoice Rows */}
          {invoices.map((invoice, index) => (
            <div
              key={invoice.id}
              className={[
                "grid min-h-[52px] min-w-[420px]",
                "grid-cols-[minmax(160px,1fr)_104px_88px]",
                "items-center gap-3 px-5 py-3",
                index > 0
                  ? "border-t border-[#eef0f3]"
                  : "",
              ].join(" ")}
            >
              {/* Invoice */}
              <div className="flex min-w-0 items-center gap-[10px]">
                <Receipt
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-[#64748b]"
                />

                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span
                    className="
                      truncate
                      text-[13px]
                      font-semibold
                      leading-[17px]
                      text-[#131A26]
                    "
                  >
                    {invoice.id}
                  </span>

                  <span
                    className="
                      text-[11px]
                      font-normal
                      leading-[14px]
                      text-[#64748b]
                    "
                  >
                    {invoice.date}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <span
                className="
                  flex
                  items-center
                  text-[13px]
                  font-semibold
                  leading-[17px]
                  text-[#131A26]
                "
              >
                {formatCurrency(invoice.amount)}
              </span>

              {/* Status */}
              <span className="flex items-center justify-end">
                <span
                  className="
                    whitespace-nowrap
                    rounded-full
                    bg-[#eaf6f0]
                    px-[10px]
                    py-1
                    text-[11px]
                    font-semibold
                    leading-[14px]
                    text-[#00845a]
                  "
                >
                  {invoice.status}
                </span>
              </span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}