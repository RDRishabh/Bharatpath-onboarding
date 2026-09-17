"use client";

import { useEffect } from "react";
import { usePageHeader } from "@/components/layout/header-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  cancelRemoveMember,
  clearToast,
  confirmRemoveMember,
  selectEmployerSettings,
} from "@/store/employer/settings";

import { SettingsTabs } from "./settings-tabs";
import { CompanyTab } from "./company-tab";
import { TeamTab } from "./team-tab";
import { PaymentTab } from "./payment-tab";
import { SubscriptionTab } from "./subscription-tab";
import { InvoicesTab } from "./invoices-tab";
import { AccountTab } from "./account-tab";
import { InviteMemberModal } from "./invite-member-modal";
import { AddPaymentMethodModal } from "./add-payment-method-modal";
import { BuyCreditsModal } from "./buy-credits-modal";

export function EmployerSettingsPage() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(selectEmployerSettings);

  usePageHeader(
    "Settings & Billing",
    "Company profile, team access, billing and account security"
  );

  useEffect(() => {
    if (!settings.toast) return;

    const timer = window.setTimeout(() => {
      dispatch(clearToast());
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [dispatch, settings.toast]);

  const renderTab = () => {
    switch (settings.activeTab) {
      case "company":
        return <CompanyTab />;
      case "team":
        return <TeamTab />;
      case "payment":
        return <PaymentTab />;
      case "subscription":
        return <SubscriptionTab />;
      case "invoices":
        return <InvoicesTab />;
      case "account":
        return <AccountTab />;
      default:
        return <CompanyTab />;
    }
  };

  return (
    <div className="min-h-full bg-[#f7f8fa] font-sans text-[#111827]">
      <SettingsTabs />

      <main className="w-full max-w-[1000px] py-4">
        {renderTab()}
      </main>

      {settings.inviteModalOpen && <InviteMemberModal />}
      {settings.paymentModalOpen && <AddPaymentMethodModal />}
      {settings.checkoutModalOpen && <BuyCreditsModal />}

      {settings.removeMemberId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-5">
          <div className="w-full max-w-[440px] rounded-[13px] border border-[#dfe4ea] bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <h3 className="m-0 text-[15px] font-bold">
              Remove team member?
            </h3>

            <p className="mt-2 text-xs leading-[18px] text-[#718096]">
              This member will immediately lose access to the employer account.
            </p>

            <div className="mt-[18px] flex justify-end gap-2">
              <button
                type="button"
                className="min-h-9 cursor-pointer rounded-lg border border-[#d6dbe2] bg-white px-3.5 text-xs font-bold text-[#172033]"
                onClick={() => dispatch(cancelRemoveMember())}
              >
                Cancel
              </button>

              <button
                type="button"
                className="min-h-9 cursor-pointer rounded-lg border border-[#c0392b] bg-[#c0392b] px-3.5 text-xs font-bold text-white"
                onClick={() => dispatch(confirmRemoveMember())}
              >
                Remove member
              </button>
            </div>
          </div>
        </div>
      )}

      {settings.toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-[#121a28] px-[15px] py-2.5 text-[11px] text-white shadow-[0_8px_25px_rgba(15,23,42,0.18)]">
          {settings.toast}
        </div>
      )}
    </div>
  );
}