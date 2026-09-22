"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/ui/dropdown";
import { ErrorState } from "@/components/ui";
import { usePageHeader } from "@/components/layout/header-context";

import { JobsTable } from "./jobs-table";
import {
    useGetEmployerJobsQuery,
    selectJobsSearch,
    selectJobsStatusFilter,
    selectJobsCurrentPage,
    setJobsSearch,
    setJobsStatusFilter,
    setJobsCurrentPage,
} from "@/store/employer/jobs";
import type { JobsStatusFilter } from "@/store/employer/jobs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { EmployerJob } from "../types";

const DEFAULT_PAGE_SIZE = 10;

export function JobsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    /*
     * IMPORTANT:
     * The global PortalHeader is responsible for rendering:
     *
     * Jobs
     * Manage job postings and track how each one is performing
     *
     * Therefore there must NOT be another Jobs header inside this page.
     */
    usePageHeader(
        "Jobs",
        "Manage job postings and track how each one is performing"
    );

    const {
        data: employerJobs = [],
        isLoading,
        isError,
        error,
    } = useGetEmployerJobsQuery();

    const search = useAppSelector(selectJobsSearch);
    const statusFilter = useAppSelector(
        selectJobsStatusFilter
    );
    const currentPage = useAppSelector(
        selectJobsCurrentPage
    );
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

    const statusOptions = [
        {
            value: "all",
            label: "All statuses",
        },
        {
            value: "live",
            label: "Live",
        },
        {
            value: "draft",
            label: "Draft",
        },
        {
            value: "paused",
            label: "Paused",
        },
        {
            value: "closed",
            label: "Closed",
        },
    ] satisfies {
        value: JobsStatusFilter;
        label: string;
    }[];

    const liveJobsCount = useMemo(() => {
        return employerJobs.filter(
            (job) => job.status === "live"
        ).length;
    }, [employerJobs]);

    const filteredJobs = useMemo(() => {
        const query = search.trim().toLowerCase();

        return employerJobs.filter((job) => {
            const matchesSearch =
                query.length === 0 ||
                job.title.toLowerCase().includes(query) ||
                job.location.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === "all" ||
                job.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [employerJobs, search, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredJobs.length / pageSize)
    );

    const paginatedJobs = useMemo(() => {
        const start =
            (currentPage - 1) * pageSize;

        return filteredJobs.slice(
            start,
            start + pageSize
        );
    }, [filteredJobs, currentPage, pageSize]);

    function handleSearch(value: string) {
        dispatch(setJobsSearch(value));
    }

    function handleStatusChange(
        value: JobsStatusFilter
    ) {
        dispatch(setJobsStatusFilter(value));
    }

    function handlePageChange(page: number) {
        dispatch(
            setJobsCurrentPage(
                Math.min(
                    Math.max(page, 1),
                    totalPages
                )
            )
        );
    }

    function handleViewApplicants(job: EmployerJob) {
        router.push(
            `/employer/applications?jobId=${job.id}`
        );
    }

    function handleEditJob(job: EmployerJob) {
        router.push(
            `/employer/jobs/${job.id}/edit`
        );
    }

    return (
        <main className="min-h-full bg-[#f7f8fa]">
            <section
                className="
          overflow-hidden
          rounded-[12px]
          border
          border-[#e5e8ed]
          bg-white
          shadow-[0_2px_8px_rgba(19,26,38,0.02)]
        "
            >
                {/* Jobs toolbar */}
                <div
                    className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-[#edf0f3]
            px-5
            py-3
          "
                >
                    {/* Summary */}
                    <div className="flex items-center gap-2 text-[12px]">
                        <span className="font-medium text-[#3566b8]">
                            {filteredJobs.length} jobs
                        </span>

                        <span className="text-[#b0b5bd]">
                            |
                        </span>

                        <span className="font-medium text-[#1f7a4d]">
                            {liveJobsCount} live
                        </span>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search
                                size={15}
                                strokeWidth={1.8}
                                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-[#777f90]
                "
                            />

                            <input
                                value={search}
                                onChange={(event) =>
                                    handleSearch(event.target.value)
                                }
                                placeholder="Search jobs"
                                className="
                  h-9
                  w-[207px]
                  rounded-[9px]
                  border
                  border-[#e3e6eb]
                  bg-white
                  pl-9
                  pr-3
                  text-[12px]
                  text-[#151b2b]
                  outline-none
                  placeholder:text-[#8a919d]
                  focus:border-[#b7b1ee]
                  focus:ring-2
                  focus:ring-[#5b4fcf]/10
                "
                            />
                        </div>

                        {/* Status */}
                        <Dropdown
                            value={statusFilter}
                            options={statusOptions}
                            onChange={handleStatusChange}
                            width="w-[130px]"
                        />
                    </div>
                </div>

                {isError ? (
                    <div className="px-5 py-14">
                        <ErrorState
                            variant="block"
                            error={error}
                            title="Couldn't load jobs"
                            fallback="Something went wrong while fetching your job postings."
                        />
                    </div>
                ) : (
                    <JobsTable
                        jobs={paginatedJobs}
                        currentPage={currentPage}
                        pageSize={pageSize}
                        totalCount={filteredJobs.length}
                        isLoading={isLoading}
                        onPageChange={handlePageChange}
                        onPageSizeChange={setPageSize}
                        onViewApplicants={handleViewApplicants}
                        onEditJob={handleEditJob}
                    />
                )}
            </section>
        </main>
    );
}