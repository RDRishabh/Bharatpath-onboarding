"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  openPaymentModal,
  selectPaymentMethods,
} from "@/store/employer/settings";

export function PaymentTab() {
  const dispatch = useAppDispatch();
  const methods = useAppSelector(selectPaymentMethods);

  return (
    <section className="max-w-[488px] rounded-xl border border-[#e0e4e9] bg-white p-5 shadow-[0_1px_2px_rgba(17,24,39,0.02)]">
      <div className="mb-3">
        <h2 className="m-0 text-[13px] font-bold leading-[18px]">
          Payment methods
        </h2>
      </div>

      <div className="mb-3">
        {methods.map((method) => (
          <div
            key={method.id}
            className="flex min-h-[59px] items-center gap-2.5 rounded-[10px] bg-[#f2f4f6] px-3"
          >
            <div className="w-[22px] text-[19px] font-bold">₹</div>

            <div className="flex-1">
              <strong className="block text-xs">{method.label}</strong>
              {method.isDefault && (
                <small className="mt-0.5 block text-[10px] text-[#718096]">
                  Default method
                </small>
              )}
            </div>

            <span className="w-fit rounded-full bg-[#e9f6f0] px-2 py-1 text-[10px] font-bold text-[#13875e]">
              {method.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-1 min-h-9 cursor-pointer rounded-lg border border-[#d6dbe2] bg-white px-3.5 text-xs font-bold text-[#172033]"
        onClick={() => dispatch(openPaymentModal())}
      >
        Add payment method
      </button>
    </section>
  );
}
