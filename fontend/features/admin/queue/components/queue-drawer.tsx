"use client";

import {
  AlertCircle,
  Check,
  Eye,
  FileText,
  Minus,
  X,
} from "lucide-react";

import { useAppSelector } from "@/store/hooks";

import {
  selectAdminQueue,
  selectIntegrityItems,
  selectKybItems,
} from "@/store/admin/queue/selectors";

import { useQueue } from "../hooks/use-queue";

export function QueueDrawer() {
  const { openReviewId } =
    useAppSelector(selectAdminQueue);

  const kybItems = useAppSelector(
    selectKybItems,
  );

  const integrityItems = useAppSelector(
    selectIntegrityItems,
  );

  const { closeReview } = useQueue();

  /*
   * ================================================================
   * FIND CURRENT ITEM
   * ================================================================
   */

  const item = [
    ...kybItems,
    ...integrityItems,
  ].find(
    (queueItem) =>
      queueItem.id === openReviewId,
  );

  if (!item) {
    return null;
  }

  const isKyb = item.type === "KYB";

  /*
   * ================================================================
   * VERIFICATION CHECKS
   * ================================================================
   */

  const verificationChecks = isKyb
    ? [
        {
          label: "GSTIN active",
          detail: item.secondary,
          status: "Passed" as const,
        },
        {
          label: "PAN matches entity",
          detail: "AAECS1234F",
          status: "Passed" as const,
        },
        {
          label: "Registered address",
          detail: "Matches utility bill",
          status:
            item.risk === "High"
              ? ("Attention" as const)
              : ("Passed" as const),
        },
        {
          label: "Bank account",
          detail: "Not submitted",
          status: "Not run" as const,
        },
      ]
    : [
        {
          label: "Device fingerprint",
          detail:
            "Shared with 3 other accounts",
          status: "Attention" as const,
        },
        {
          label: "Score trajectory",
          detail:
            "Retest +180 in 6 days",
          status: "Attention" as const,
        },
        {
          label: "Identity document",
          detail:
            "Aadhaar last 4 · 8821",
          status: "Passed" as const,
        },
        {
          label: "Prior flags",
          detail: "None on record",
          status: "Passed" as const,
        },
      ];

  /*
   * ================================================================
   * DOCUMENTS
   * ================================================================
   */

  const documents = isKyb
    ? [
        {
          name: "GST certificate.pdf",
          meta: "Uploaded 03 Sep · 240 KB",
        },
        {
          name: "PAN card.jpg",
          meta: "Uploaded 03 Sep · 180 KB",
        },
        {
          name: "Address proof.pdf",
          meta: "Uploaded 03 Sep · 310 KB",
        },
      ]
    : [
        {
          name: "Session log.csv",
          meta: "Generated 04 Sep · 62 KB",
        },
        {
          name: "Mock interview recording",
          meta: "12 min · flagged segment 04:20",
        },
      ];

  /*
   * ================================================================
   * RISK STYLES
   * ================================================================
   */

  const riskStyles = {
    High: {
      background: "bg-[#fff0f1]",
      text: "text-[#c92f3f]",
    },

    Medium: {
      background: "bg-[#fff5df]",
      text: "text-[#9a6b18]",
    },

    Low: {
      background: "bg-[#eef7f1]",
      text: "text-[#2f7b4b]",
    },
  };

  const riskStyle =
    riskStyles[
      item.risk as keyof typeof riskStyles
    ] ?? riskStyles.Medium;

  /*
   * ================================================================
   * STATUS STYLES
   * ================================================================
   */

  const getStatusStyle = (
    status: "Passed" | "Attention" | "Not run",
  ) => {
    if (status === "Passed") {
      return {
        icon:
          "bg-[#eef7f1] text-[#2f7b4b]",
        badge:
          "bg-[#eef7f1] text-[#2f7b4b]",
      };
    }

    if (status === "Attention") {
      return {
        icon:
          "bg-[#fff5df] text-[#9a6b18]",
        badge:
          "bg-[#fff5df] text-[#9a6b18]",
      };
    }

    return {
      icon:
        "bg-[#f0f2f5] text-[#687182]",
      badge:
        "bg-[#f0f2f5] text-[#687182]",
    };
  };

  /*
   * ================================================================
   * DRAWER
   * ================================================================
   */

  return (
    <div className="fixed inset-0 z-[100]">
      {/* ============================================================
          BACKDROP
          ============================================================ */}

      <button
        type="button"
        aria-label="Close drawer"
        onClick={closeReview}
        className="absolute inset-0 cursor-default bg-[#172033]/30"
      />

      {/* ============================================================
          DRAWER PANEL
          ============================================================ */}

      <aside className="absolute right-0 top-0 flex h-full w-[520px] max-w-full flex-col bg-white shadow-[-20px_0_60px_-24px_rgba(0,0,0,0.5)]">
        {/* ==========================================================
            HEADER
            ========================================================== */}

        <div className="flex shrink-0 items-start gap-3 border-b border-[#e5e7eb] px-4 py-3">
          {/* Avatar */}

          <span
            className={[
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              isKyb
                ? "bg-[#eef0ff] text-[#385da8]"
                : "bg-[#fff5df] text-[#9a6b18]",
              "text-[13px] font-bold leading-[17px]",
            ].join(" ")}
          >
            {item.initials}
          </span>

          {/* Name + submitted */}

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-[18px] font-bold leading-[23px] tracking-[-0.012em] text-[#172033]">
              {item.name}
            </p>

            <p className="truncate text-[12px] leading-[17px] text-[#7b8494]">
              {item.submitted}
            </p>
          </div>

          {/* Close */}

          <button
            type="button"
            onClick={closeReview}
            aria-label="Close"
            title="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#7b8494] transition-colors hover:bg-[#f5f6f8] hover:text-[#172033]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ==========================================================
            SCROLLABLE BODY
            ========================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-5">
            {/* ======================================================
                RISK + TYPE
                ====================================================== */}

            <div className="flex gap-2">
              {/* Risk */}

              <span
                className={[
                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1",
                  "text-[11px] font-semibold leading-[14px]",
                  riskStyle.background,
                  riskStyle.text,
                ].join(" ")}
              >
                Risk · {item.risk}
              </span>

              {/* Queue type */}

              <span
                className={[
                  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1",
                  "text-[11px] font-semibold leading-[14px]",
                  isKyb
                    ? "bg-[#eef0ff] text-[#385da8]"
                    : "bg-[#fff5df] text-[#9a6b18]",
                ].join(" ")}
              >
                {isKyb
                  ? "KYB submission"
                  : "Integrity flag"}
              </span>
            </div>

            {/* ======================================================
                VERIFICATION CHECKS
                ====================================================== */}

            <section className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.06em] text-[#7b8494]">
                Verification checks
              </h3>

              <div className="flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb]">
                {verificationChecks.map(
                  (check, index) => {
                    const styles =
                      getStatusStyle(
                        check.status,
                      );

                    return (
                      <div
                        key={check.label}
                        className={[
                          "flex items-center gap-3 px-4 py-3",
                          index > 0
                            ? "border-t border-[#eef0f3]"
                            : "",
                        ].join(" ")}
                      >
                        {/* Status icon */}

                        <span
                          className={[
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                            styles.icon,
                          ].join(" ")}
                        >
                          {check.status ===
                            "Passed" && (
                            <Check className="h-4 w-4" />
                          )}

                          {check.status ===
                            "Attention" && (
                            <AlertCircle className="h-4 w-4" />
                          )}

                          {check.status ===
                            "Not run" && (
                            <Minus className="h-4 w-4" />
                          )}
                        </span>

                        {/* Check information */}

                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-[13px] font-semibold leading-[17px] text-[#172033]">
                            {check.label}
                          </p>

                          <p className="truncate text-[11px] leading-[14px] text-[#7b8494]">
                            {check.detail}
                          </p>
                        </div>

                        {/* Status */}

                        <span
                          className={[
                            "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1",
                            "text-[11px] font-semibold leading-[14px]",
                            styles.badge,
                          ].join(" ")}
                        >
                          {check.status}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* ======================================================
                DOCUMENTS
                ====================================================== */}

            <section className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold uppercase leading-[14px] tracking-[0.06em] text-[#7b8494]">
                Documents
              </h3>

              <div className="flex flex-col gap-2">
                {documents.map(
                  (document) => (
                    <div
                      key={document.name}
                      className="flex items-center gap-3 rounded-[10px] border border-[#e5e7eb] px-4 py-3"
                    >
                      {/* File icon */}

                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0f2f5]">
                        <FileText className="h-4 w-4 text-[#172033]" />
                      </span>

                      {/* Document information */}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-[13px] font-semibold leading-[17px] text-[#172033]">
                          {document.name}
                        </p>

                        <p className="truncate text-[11px] leading-[14px] text-[#7b8494]">
                          {document.meta}
                        </p>
                      </div>

                      {/* Open document */}

                      <button
                        type="button"
                        aria-label={`Open ${document.name}`}
                        title="Open document"
                        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-[#e5e7eb] bg-white text-[#7b8494] transition-colors hover:bg-[#f5f6f8] hover:text-[#172033]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ),
                )}
              </div>
            </section>

            {/* ======================================================
                DECISION NOTE
                ====================================================== */}

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold leading-[17px] text-[#172033]">
                Decision note
              </span>

              <textarea
                rows={3}
                placeholder="Recorded in the audit trail against your operator ID"
                aria-label="Decision note"
                className="w-full resize-y rounded-[10px] border border-[#e5e7eb] px-4 py-3 text-[13px] font-medium leading-[18px] text-[#172033] outline-none transition-colors placeholder:text-[#7b8494] focus:border-[#315c9f]"
              />
            </label>
          </div>
        </div>

        {/* ==========================================================
            FOOTER
            ========================================================== */}

        <div className="flex shrink-0 gap-2 border-t border-[#e5e7eb] px-2 py-3">
          {/* Request info */}

          <button
            type="button"
            onClick={closeReview}
            className="flex-1 cursor-pointer rounded-lg border border-[#e5e7eb] bg-white px-3 py-3 text-[13px] font-semibold leading-[17px] text-[#172033] transition-colors hover:bg-[#f8f9fb]"
          >
            Request info
          </button>

          {/* Reject */}

          <button
            type="button"
            onClick={closeReview}
            className="flex-1 cursor-pointer rounded-lg border border-[#c92f3f] bg-white px-3 py-3 text-[13px] font-semibold leading-[17px] text-[#c92f3f] transition-colors hover:bg-[#fff7f7]"
          >
            Reject
          </button>

          {/* Approve */}

          <button
            type="button"
            onClick={closeReview}
            className="flex-[1.4] cursor-pointer rounded-lg bg-[#5b4fcf] px-3 py-3 text-[13px] font-semibold leading-[17px] text-white transition-colors hover:bg-[#4f44bc]"
          >
            Approve
          </button>
        </div>
      </aside>
    </div>
  );
}