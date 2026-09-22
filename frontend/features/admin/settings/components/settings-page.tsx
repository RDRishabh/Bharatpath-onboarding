"use client";

import { usePageHeader } from "@/components/layout/header-context";

import { useSettings } from "../hooks/use-settings";

import { ErrorState } from "@/components/ui";

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

      {error ? <ErrorState error={error} fallback="Could not read the current KYB mode." className="mt-4" /> : null}

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