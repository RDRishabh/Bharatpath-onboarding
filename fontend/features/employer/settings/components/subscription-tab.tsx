"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  openCheckoutModal,
  selectEmployerCreditBalance,
} from "@/store/employer/settings";

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[111px] rounded-[10px] border border-[#e0e4e9] bg-white p-[15px]">
      <span className="mb-2 block text-base text-[#315eaa]">{icon}</span>
      <strong className="block text-xs">{title}</strong>
      <p className="mt-1.5 text-[10px] leading-[15px] text-[#718096]">
        {children}
      </p>
    </div>
  );
}

export function SubscriptionTab() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectEmployerCreditBalance);

  return (
    <>
      <div className="mb-2.5">
        <h2 className="m-0 text-[13px] font-bold leading-[18px]">
          Credits &amp; billing
        </h2>
        <p className="mt-0.5 text-xs leading-4 text-[#718096]">
          BharatPath runs on pay-as-you-go credits — no subscription
        </p>
      </div>

      <section className="flex min-h-[92px] items-center justify-between rounded-[11px] bg-[#121a28] px-[18px] py-4 text-white">
        <div>
          <span className="block text-[10px] font-extrabold tracking-[0.07em] text-[#aeb8c8]">
            UNLOCK BALANCE
          </span>

          <strong className="mt-0.5 block text-[32px] leading-[35px]">
            {balance}
            <small className="text-xs font-medium text-[#c4cbd5]">
              {" "}
              credits
            </small>
          </strong>
        </div>

        <button
          type="button"
          className="min-h-9 min-w-[100px] cursor-pointer rounded-lg border-0 bg-white px-3.5 text-xs font-bold text-[#101827]"
          onClick={() => dispatch(openCheckoutModal())}
        >
          Buy credits
        </button>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <InfoCard icon="♙" title="Pay per unlock">
          1 credit reveals one candidate&apos;s contact details and exact
          score.
        </InfoCard>

        <InfoCard icon="∞" title="Never expires">
          Unused credits carry over — there&apos;s no monthly reset.
        </InfoCard>

        <InfoCard icon="▤" title="Buy as you go">
          No subscription or lock-in — top up in packs whenever you need to.
        </InfoCard>
      </div>
    </>
  );
}
