"use client";

import { useState } from "react";
import {
  Clock3,
  FileText,
  LockKeyholeOpen,
  Phone,
  X,
} from "lucide-react";

import { useAppSelector } from "@/store/hooks";

import {
  selectSelectedDispute,
} from "@/store/admin/disputes/selectors";

import { useDisputes } from "../hooks/use-disputes";

import { StateBadge } from "../../shared/status-badge";

export function DisputeDrawer() {
  const selectedDispute = useAppSelector(
    selectSelectedDispute,
  );

  const { closeDispute } = useDisputes();

  const [resolutionNote, setResolutionNote] =
    useState("");

  if (!selectedDispute) {
    return null;
  }

  return (
    <>
      {/* ================================================================
          BACKDROP
          ================================================================ */}

      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={closeDispute}
      />

      {/* ================================================================
          DRAWER
          ================================================================ */}

      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-[520px] max-w-full flex-col bg-white shadow-[0_30px_70px_-24px_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
        aria-label="Dispute review"
      >
        {/* ============================================================
            HEADER
            ============================================================ */}

        <div className="flex flex-none items-start gap-3 border-b border-[#e5e8ee] px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-[18px] font-bold leading-[23px] tracking-[-0.012em] text-[#172033] [text-wrap:pretty]">
              {selectedDispute.title}
            </h2>

            <p className="text-[12px] font-normal leading-[17px] text-[#7b8494]">
              {selectedDispute.parties} · raised{" "}
              {selectedDispute.raised}
            </p>
          </div>

          {/* Close */}

          <button
            type="button"
            onClick={closeDispute}
            aria-label="Close"
            title="Close"
            className="grid h-8 w-8 flex-none cursor-pointer place-items-center rounded-lg text-[#7b8494] transition-colors hover:bg-[#f5f6f8] hover:text-[#172033]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ============================================================
            SCROLLABLE BODY
            ============================================================ */}

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* ==========================================================
              STATUS
              ========================================================== */}

          <div className="flex">
            <StateBadge
              state={selectedDispute.status}
            />
          </div>

          {/* ==========================================================
              CLAIM
              ========================================================== */}

          <section className="flex flex-col gap-2">
            <span className="text-[11px] font-bold leading-[14px] tracking-[0.06em] text-[#7b8494]">
              CLAIM
            </span>

            <p className="text-[13px] font-normal leading-[18px] text-[#3e4757] [text-wrap:pretty]">
              {selectedDispute.claim}
            </p>
          </section>

          {/* ==========================================================
              EVIDENCE
              ========================================================== */}

          <section className="flex flex-col gap-3">
            <span className="text-[11px] font-bold leading-[14px] tracking-[0.06em] text-[#7b8494]">
              EVIDENCE ON FILE
            </span>

            <div className="flex flex-col gap-2">
              {selectedDispute.evidence.map(
                (evidence, index) => (
                  <div
                    key={evidence.label}
                    className="flex items-center gap-3 rounded-[10px] border border-[#e5e8ee] px-4 py-3"
                  >
                    {/* ==================================================
                        ICON
                        ================================================== */}

                    <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#f0f2f5] text-[#172033]">
                      {getEvidenceIcon(
                        evidence.label,
                        index,
                      )}
                    </span>

                    {/* ==================================================
                        CONTENT
                        ================================================== */}

                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold leading-[17px] text-[#172033]">
                        {evidence.label}
                      </span>

                      <span className="text-[11px] font-normal leading-[14px] text-[#7b8494]">
                        {evidence.meta}
                      </span>
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ==========================================================
              RESOLUTION NOTE
              ========================================================== */}

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold leading-[17px] text-[#172033]">
              Resolution note
            </span>

            <textarea
              rows={3}
              value={resolutionNote}
              onChange={(event) =>
                setResolutionNote(
                  event.target.value,
                )
              }
              placeholder="Shared with both parties and written to the audit trail"
              aria-label="Resolution note"
              className="w-full resize-y rounded-[10px] border border-[#e5e8ee] px-4 py-3 text-[13px] font-medium leading-[18px] text-[#172033] outline-none placeholder:text-[#7b8494] focus:border-[#315c9f] focus:ring-1 focus:ring-[#315c9f]"
            />
          </label>
        </div>

        {/* ============================================================
            FOOTER
            ============================================================ */}

        <div className="flex flex-none gap-[10px] border-t border-[#e5e8ee] p-4">
          {/* Request Evidence */}

          <button
            type="button"
            onClick={closeDispute}
            className="flex-1 cursor-pointer rounded-lg border border-[#e5e8ee] bg-white px-3 py-3 text-[13px] font-semibold leading-[17px] text-[#172033] transition-colors hover:bg-[#f8f9fb]"
          >
            Request evidence
          </button>

          {/* Record Resolution */}

          <button
            type="button"
            onClick={closeDispute}
            className="flex-[1.4] cursor-pointer rounded-lg border-0 bg-[#5b4fcf] px-3 py-3 text-[13px] font-semibold leading-[17px] text-white transition-colors hover:bg-[#4f44bc]"
          >
            Record resolution
          </button>
        </div>
      </aside>
    </>
  );
}

/* ==========================================================================
   EVIDENCE ICON
   ========================================================================== */

function getEvidenceIcon(
  label: string,
  index: number,
) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes("call") ||
    normalized.includes("phone")
  ) {
    return (
      <Phone className="h-4 w-4" />
    );
  }

  if (
    normalized.includes("unlock") ||
    normalized.includes("record")
  ) {
    return (
      <LockKeyholeOpen className="h-4 w-4" />
    );
  }

  if (
    normalized.includes("seen") ||
    normalized.includes("time") ||
    normalized.includes("clock")
  ) {
    return (
      <Clock3 className="h-4 w-4" />
    );
  }

  if (index === 0) {
    return (
      <Phone className="h-4 w-4" />
    );
  }

  if (index === 1) {
    return (
      <LockKeyholeOpen className="h-4 w-4" />
    );
  }

  return (
    <FileText className="h-4 w-4" />
  );
}