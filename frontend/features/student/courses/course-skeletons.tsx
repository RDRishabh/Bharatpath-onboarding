import { Spinner, Skeleton } from "@/components/common/loading";
import { StudentPage } from "@/features/student/shell";

export function CourseListSkeleton() {
  return (
    <StudentPage className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <div className="flex flex-1 flex-col gap-5" role="status" aria-busy="true">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#0A1931] sm:text-[28px]">
            Learn at your pace
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-[#5F6B80]">
            Explore courses, track lessons, and continue where you left off.
          </p>
        </div>

        <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 text-center">
          <Spinner size={32} tone="primary" />
          <p className="text-[15px] font-semibold text-[#0A1931]">
            Finding courses for you
          </p>
          <p className="text-[13px] text-[#5F6B80]">
            Checking the latest courses and your learning progress.
          </p>
        </div>
      </div>
    </StudentPage>
  );
}

export function CourseDetailSkeleton() {
  return <StudentPage><div role="status" aria-label="Loading course"><div className="mb-5 flex h-10 items-center gap-3"><Skeleton circle width={40} height={40} /><Skeleton width={160} height={20} radius={7} /></div><div className="rounded-[20px] border border-[#E7E0D4] bg-white p-5"><Skeleton width={88} height={23} radius={999} /><Skeleton className="mt-4" width="48%" height={26} /><Skeleton className="mt-3" width="70%" height={13} /><Skeleton className="mt-6" width="100%" height={6} /></div><div className="mt-5 space-y-3">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="rounded-[20px] border border-[#E7E0D4] bg-white p-5"><Skeleton width="35%" height={19} /><Skeleton className="mt-5" width="80%" height={14} /><Skeleton className="mt-4" width="65%" height={14} /></div>)}</div></div></StudentPage>;
}
