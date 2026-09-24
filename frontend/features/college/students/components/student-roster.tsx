"use client";

import React, { useMemo, useState } from "react";
import { Armchair, Mail } from "lucide-react";
import { usePageHeader } from "@/components/layout/header-context";
import { Button } from "@/components/ui/button";
import type { RosterImport } from "@/store/college/types";

import { StudentStatus } from "../types";
import { useStudents } from "../hooks/use-students";
import { StudentFilters } from "./student-filters";
import { StudentTable } from "./student-table";
import { BulkUploadCard } from "./bulk-upload-card";
import { LinkStatesSummary } from "./link-states-summary";
import { InviteStudentModal } from "./invite-student-modal";
import { StudentDetailModal } from "./student-detail-modal";
import { ReferralCodesCard } from "./referral-codes-card";
import { RosterImportsCard } from "./roster-imports-card";
import { RosterRowsModal } from "./roster-rows-modal";

export function StudentRoster() {
  const {
    students,
    isLoadingStudents,
    studentsPagination,
    seats,
    isLoadingSeats,
    referralCodes,
    isLoadingReferralCodes,
    rosterImports,
    isLoadingRosterImports,
    issueReferralCode,
    isIssuingCode,
    revokeReferralCode,
    isRevokingCode,
    uploadRosterImport,
    commitRosterImport,
    isCommittingRoster,
    discardRosterImport,
    isDiscardingRoster,
    sendRosterInvitations,
    isSendingInvitations,
  } = useStudents();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(
    null,
  );
  const [rowsPreview, setRowsPreview] = useState<RosterImport | null>(null);

  /*
   * The roster only lists individually-visible (linked) students. Invited and
   * consent-pending counts come from the outstanding roster-import invitations.
   */
  const linkedCount = students.length;

  const { invitedCount, consentPendingCount } = useMemo(() => {
    let invited = 0;
    let pending = 0;

    for (const roster of rosterImports) {
      invited += roster.invitations.sent;
      pending += roster.invitations.pending;
    }

    return { invitedCount: invited, consentPendingCount: pending };
  }, [rosterImports]);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();

    return students.filter((student) => {
      const matchesSearch =
        !query || student.name.toLowerCase().includes(query);

      const matchesStatus = status === "all" || student.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, status]);

  const headerAction = useMemo(
    () => (
      <Button
        type="button"
        variant="primary"
        size="md"
        icon={<Mail size={15} strokeWidth={2.2} />}
        onClick={() => setIsInviteModalOpen(true)}
        className="shadow-sm"
      >
        Invite students
      </Button>
    ),
    [],
  );

  const seatLabel = seats
    ? `${seats.used} of ${seats.allocated} seats used`
    : "Seats";

  const seatProgress =
    seats && seats.allocated > 0
      ? (seats.used / seats.allocated) * 100
      : 0;

  usePageHeader(
    "Students",
    "Roster, invites, bulk upload and consent...",
    {
      stat: {
        icon: Armchair,
        label: seatLabel,
        progress: seatProgress,
        isLoading: isLoadingSeats,
      },
      action: headerAction,
    },
  );

  return (
    <div
      className="mx-auto max-w-[1280px] space-y-5"
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {/* 1. FILTER & SEARCH BAR */}
      <StudentFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
      />

      {/* 2. STUDENT ROSTER TABLE CARD */}
      <StudentTable
        students={filteredStudents}
        currentPage={studentsPagination.currentPage}
        hasNextPage={studentsPagination.hasNextPage}
        onNextPage={studentsPagination.goToNextPage}
        onPreviousPage={studentsPagination.goToPreviousPage}
        isLoading={isLoadingStudents}
        onView={(student) => setViewingStudentId(student.id)}
      />

      {/* 3. BOTTOM CARDS: BULK UPLOAD & LINK STATES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <BulkUploadCard
          onUpload={(args) => uploadRosterImport(args).unwrap()}
        />
        <LinkStatesSummary
          linkedCount={linkedCount}
          invitedCount={invitedCount}
          consentPendingCount={consentPendingCount}
          isLoading={isLoadingStudents || isLoadingRosterImports}
        />
      </div>

      {/* 4. ROSTER IMPORT PIPELINE & REFERRAL CODES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RosterImportsCard
          imports={rosterImports}
          isLoading={isLoadingRosterImports}
          onViewRows={(import_) => setRowsPreview(import_)}
          onCommit={(id) => commitRosterImport(id).unwrap()}
          isCommitting={isCommittingRoster}
          onDiscard={(id) => discardRosterImport(id).unwrap()}
          isDiscarding={isDiscardingRoster}
          onSend={(id) => sendRosterInvitations(id).unwrap()}
          isSending={isSendingInvitations}
        />
        <ReferralCodesCard
          codes={referralCodes}
          isLoading={isLoadingReferralCodes}
          onRevoke={(id) => revokeReferralCode(id).unwrap()}
          isRevoking={isRevokingCode}
        />
      </div>

      {/* 5. INVITE STUDENT MODAL — issues a referral code to hand out */}
      <InviteStudentModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onIssueCode={(args) => issueReferralCode(args).unwrap()}
        isIssuing={isIssuingCode}
      />

      {/* 6. STUDENT DETAIL — audited open of a single visible student */}
      <StudentDetailModal
        candidateId={viewingStudentId}
        onClose={() => setViewingStudentId(null)}
      />

      {/* 7. ROSTER ROWS PREVIEW */}
      <RosterRowsModal
        importId={rowsPreview?.id ?? null}
        fileName={rowsPreview?.fileName}
        onClose={() => setRowsPreview(null)}
      />
    </div>
  );
}