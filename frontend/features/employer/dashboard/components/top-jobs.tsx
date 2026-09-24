"use client";

import type { EmployerTopJob } from "../types";

interface TopJobsProps {
  jobs: EmployerTopJob[];
}

export function TopJobs({ jobs }: TopJobsProps) {
  const maxApplicants = Math.max(
    ...jobs.map((job) => job.applicants),
    1,
  );

  return (
    <section className="flex min-h-[220px] flex-col rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_2px_8px_rgba(19,26,38,0.025)]">
      <h2 className="mb-2 text-[13px] font-semibold leading-[17px] text-[#111827]">
        Top jobs by applicants
      </h2>

      {jobs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-8 text-center">
          <p className="text-[12px] leading-[18px] text-[#8a91a0]">
            No applicants yet. Your published jobs will appear here as
            candidates apply.
          </p>
        </div>
      ) : (
        <div>
          {jobs.map((job) => {
            const width = (job.applicants / maxApplicants) * 100;

            return (
              <div
                key={job.id}
                className="block w-full border-b border-[#eef1f4] py-3 text-left last:border-b-0"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="min-w-0 truncate text-[12px] font-medium text-[#24344d]">
                    {job.title}
                  </span>

                  <span className="shrink-0 text-[12px] font-semibold text-[#111827]">
                    {job.applicants}
                    <span className="ml-1 font-normal text-[#64748b]">
                      applicants
                    </span>
                  </span>
                </div>

                <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#eef2f6]">
                  <div
                    className="h-full rounded-full bg-[#3566b8]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}