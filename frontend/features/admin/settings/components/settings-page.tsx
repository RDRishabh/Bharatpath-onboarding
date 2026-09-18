"use client";

import { usePageHeader } from "@/components/layout/header-context";

import { useSettings } from "../hooks/use-settings";

import { SettingsTabs } from "./settings-tabs";
import { KybApprovalTab } from "./kyb-approval-tab";
import { PlatformTab } from "./platform-tab";

export function SettingsPage() {
  usePageHeader(
    "Settings",
    "Approval mode, verification checks and platform controls",
  );

  const {
    state,
    isLoading,
    error,
    setTab,
  } = useSettings();

  return (
    <div className="min-w-0">
      <SettingsTabs
        activeTab={state.tab}
        onChange={setTab}
      />

      {error ? <p className="mt-4 rounded-lg border border-[#f0c8cc] bg-[#fff7f7] p-3 text-[12px] text-[#9f2432]" role="alert">Could not read the current KYB mode.</p> : null}

      {state.tab === "approval" ? (
        <KybApprovalTab
          kybMode={state.kybMode}
          isLoading={isLoading}
          hasError={Boolean(error)}
        />
      ) : (
        <PlatformTab />
      )}
    </div>
  );
}

export const AdminSettingsPage =
  SettingsPage;