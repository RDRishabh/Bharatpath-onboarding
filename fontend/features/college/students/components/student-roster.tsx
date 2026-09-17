"use client";

import React, { useMemo, useState } from "react";
import { Armchair, Mail } from "lucide-react";
import { usePageHeader } from "@/components/layout/header-context";
import { Button } from "@/components/ui/button";
import { CollegeStudent, StudentStatus } from "../types";
import { StudentFilters } from "./student-filters";
import { StudentTable } from "./student-table";
import { BulkUploadCard } from "./bulk-upload-card";
import { LinkStatesSummary } from "./link-states-summary";
import { InviteStudentModal } from "./invite-student-modal";

export interface StudentRosterProps {
  students?: CollegeStudent[];
  total?: number;
}

export function StudentRoster({
  students = [],
}: StudentRosterProps) {
  const [studentList, setStudentList] = useState<CollegeStudent[]>(students);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "all">("all");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Compute counts for Link states summary
  const linkedCount = useMemo(
    () => studentList.filter((s) => s.status === "linked").length,
    [studentList],
  );
  const invitedCount = useMemo(
    () => studentList.filter((s) => s.status === "invited").length,
    [studentList],
  );
  const consentPendingCount = useMemo(
    () => studentList.filter((s) => s.status === "consent_pending").length,
    [studentList],
  );

  // Filter students based on search query and status filter
  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase().trim();

    return studentList.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.course.toLowerCase().includes(query);

      const matchesStatus = status === "all" || student.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [studentList, search, status]);

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

  // Set the portal header content with the exact design elements:
  // Title, Subtitle, Seats widget (248 of 300 seats used with progress), and the purple Invite students button!
  usePageHeader(
    "Students",
    "Roster, invites, bulk upload and consent...",
    {
      stat: {
        icon: Armchair,
        label: "248 of 300 seats used",
        progress: (248 / 300) * 100,
      },
      action: headerAction,
    },
  );

  const handleInviteStudent = (newStudent: Partial<CollegeStudent>) => {
    const student: CollegeStudent = {
      id: `stu-${Date.now()}`,
      name: newStudent.name || "New Student",
      email: newStudent.email || "student@example.edu",
      course: newStudent.course || "General Course",
      year: newStudent.year || "Final year",
      status: (newStudent.status as StudentStatus) || "invited",
      scoreBand: "not_scored",
      lastActive: "Just now",
    };
    setStudentList((prev) => [student, ...prev]);
  };

  const handleUploadSuccess = (fileName: string, rowCount: number) => {
    // Optionally notify or prepend imported students
    console.log(`Uploaded ${fileName} with ${rowCount} rows`);
  };

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
        totalCount={filteredStudents.length}
        pageSize={5}
        onResend={(student) => {
          // Pre-fill name & email then open invite modal
          setIsInviteModalOpen(true);
          console.log("Resending invite to", student.email);
        }}
        onRemove={(student) => {
          setStudentList((prev) =>
            prev.filter((s) => s.id !== student.id),
          );
        }}
      />

      {/* 3. BOTTOM CARDS: BULK UPLOAD & LINK STATES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <BulkUploadCard onUploadSuccess={handleUploadSuccess} />
        <LinkStatesSummary
          linkedCount={linkedCount}
          invitedCount={invitedCount}
          consentPendingCount={consentPendingCount}
        />
      </div>

      {/* 4. INVITE STUDENT MODAL */}
      <InviteStudentModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteStudent}
      />
    </div>
  );
}