"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { PortalShell } from "@/components/layout/portal-shell";
import { QueueStatusBanner } from "@/components/banner";
import { DemoStatePanel } from "@/components/demo-state";

type QueueLoad = "normal" | "surge";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const [queueLoad, setQueueLoad] = useState<QueueLoad>("normal");
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const banner = useMemo(() => {
    if (queueLoad === "surge") {
      return {
        variant: "warning" as const,
        title: "Queue above SLA",
        message:
          "5 KYB submissions and 5 integrity flags are waiting. Oldest item has been open 4 days.",
      };
    }

    return {
      variant: "success" as const,
      title: "Queues within SLA",
      message:
        "Oldest KYB submission is 14 hours old. Automatic approval is off.",
    };
  }, [queueLoad]);

  const handleQueueLoadChange = (value: QueueLoad) => {
    setQueueLoad(value);

    // Changing demo state should show the appropriate banner again.
    setBannerDismissed(false);

    // Close the demo controls after selection.
    setDemoPanelOpen(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* =========================================================
          GLOBAL BANNER
          Outside the complete PortalShell
         ========================================================= */}
      {!bannerDismissed && (
        <QueueStatusBanner
          variant={banner.variant}
          title={banner.title}
          message={banner.message}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* =========================================================
          COMPLETE PORTAL UI
         ========================================================= */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <PortalShell
          portal="admin"
          demoPanel={
            demoPanelOpen ? (
              <DemoStatePanel
                label="Queue load"
                options={[
                  {
                    id: "normal",
                    label: "Within SLA",
                    active: queueLoad === "normal",
                    onClick: () => handleQueueLoadChange("normal"),
                  },
                  {
                    id: "surge",
                    label: "Queue surge",
                    active: queueLoad === "surge",
                    onClick: () => handleQueueLoadChange("surge"),
                  },
                ]}
              />
            ) : null
          }
          onDemoStateClick={() => {
            setDemoPanelOpen((previous) => !previous);
          }}
        >
          {children}
        </PortalShell>
      </div>
    </div>
  );
}