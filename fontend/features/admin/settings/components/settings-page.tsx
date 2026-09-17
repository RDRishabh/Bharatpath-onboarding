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
    setTab,
    setKybMode,
    toggleCheck,
  } = useSettings();

  return (
    <div className="min-w-0">
      <SettingsTabs
        activeTab={state.tab}
        onChange={setTab}
      />

      {state.tab === "approval" ? (
        <KybApprovalTab
          kybMode={state.kybMode}
          autoChecks={state.autoChecks}
          onKybModeChange={setKybMode}
          onToggleCheck={toggleCheck}
        />
      ) : (
        <PlatformTab />
      )}
    </div>
  );
}

export const AdminSettingsPage =
  SettingsPage;