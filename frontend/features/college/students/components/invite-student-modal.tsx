"use client";

import React, { useState } from "react";
import { Mail, X, Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollegeStudent } from "../types";

export interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite?: (student: Partial<CollegeStudent>) => void;
}

export function InviteStudentModal({
  isOpen,
  onClose,
  onInvite,
}: InviteStudentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("Final year");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    onInvite?.({
      name: name || email.split("@")[0],
      email,
      course: course || "General Studies",
      year,
      status: "invited",
      scoreBand: "not_scored",
      lastActive: "Just now",
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setName("");
      setEmail("");
      setCourse("");
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#e7e9ee]"
        style={{ fontFamily: "'General Sans', sans-serif" }}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e7e9ee]">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf2fa] text-[#5b4fcf]">
              <Mail size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#151b2b]">
                Invite student
              </h3>
              <p className="text-[12px] text-[#777f90]">
                Send an invite to join your college cohort
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#777f90] hover:bg-[#f3f4f7] hover:text-[#151b2b] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#eaf5ef] text-[#23805d] mb-3">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <h4 className="text-[15px] font-bold text-[#151b2b]">
              Invitation sent!
            </h4>
            <p className="mt-1 text-[13px] text-[#777f90]">
              We have sent an invitation link to {email}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#303747] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Deshmukh"
                className="h-[40px] w-full rounded-xl border border-[#dfe2e8] px-3.5 text-[13px] text-[#151b2b] placeholder:text-[#8a91a0] outline-none focus:border-[#5b4fcf] focus:ring-1 focus:ring-[#5b4fcf]/20"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#303747] mb-1.5">
                Student Email <span className="text-[#e02424]">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@svit.edu.in"
                className="h-[40px] w-full rounded-xl border border-[#dfe2e8] px-3.5 text-[13px] text-[#151b2b] placeholder:text-[#8a91a0] outline-none focus:border-[#5b4fcf] focus:ring-1 focus:ring-[#5b4fcf]/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#303747] mb-1.5">
                  Course
                </label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. B.Tech Computer"
                  className="h-[40px] w-full rounded-xl border border-[#dfe2e8] px-3.5 text-[13px] text-[#151b2b] placeholder:text-[#8a91a0] outline-none focus:border-[#5b4fcf] focus:ring-1 focus:ring-[#5b4fcf]/20"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#303747] mb-1.5">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="h-[40px] w-full rounded-xl border border-[#dfe2e8] bg-white px-3 text-[13px] text-[#303747] outline-none focus:border-[#5b4fcf]"
                >
                  <option value="First year">First year</option>
                  <option value="Second year">Second year</option>
                  <option value="Third year">Third year</option>
                  <option value="Final year">Final year</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#e7e9ee]">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={<UserPlus size={15} />}
              >
                Send Invite
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
