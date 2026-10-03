"use client";

import { useCallback, useState, type ReactNode } from "react";

import { ConfirmModal } from "@/components/ui";

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  /** `danger` for anything that cannot be undone. */
  tone?: "default" | "danger";
  icon?: ReactNode;
  /** May be async; the dialog shows a spinner until it settles, then closes. */
  onConfirm: () => void | Promise<unknown>;
}

/**
 * One confirmation dialog for every important employer action. Render
 * `dialog` once in the page, call `confirm(...)` from the click handler.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (!busy) setRequest(null);
  }, [busy]);

  const run = async () => {
    if (!request) return;
    setBusy(true);
    try {
      await request.onConfirm();
    } finally {
      setBusy(false);
      setRequest(null);
    }
  };

  const dialog = (
    <ConfirmModal
      open={request !== null}
      title={request?.title ?? ""}
      description={request?.description ?? ""}
      confirmLabel={request?.confirmLabel}
      tone={request?.tone}
      icon={request?.icon}
      confirmLoading={busy}
      onClose={close}
      onConfirm={() => void run()}
    />
  );

  return { confirm: setRequest, dialog };
}
