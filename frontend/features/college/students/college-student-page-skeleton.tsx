import { Skeleton } from "@/components/common/loading";

const panel = "rounded-xl border border-[#e7e9ee] bg-white p-5";

function DetailPanelSkeleton() {
  return <div className={panel}><Skeleton width={112} height={15} /><div className="mt-5 grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="space-y-2"><Skeleton width={80} height={10} /><Skeleton width="74%" height={15} /></div>)}</div></div>;
}

export function CollegeStudentPageSkeleton() {
  return <div role="status" aria-label="Loading student profile" className="mx-auto max-w-7xl space-y-5 pb-6">
    <div><Skeleton width={100} height={12} /></div>
    <div className="flex items-center gap-3"><Skeleton width={48} height={48} radius={12} /><div className="space-y-2"><Skeleton width={188} height={22} /><Skeleton width={155} height={12} /></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={panel}><Skeleton width={92} height={11} /><Skeleton className="mt-4" width={68} height={25} /></div>)}</div>
    <div className="grid items-start gap-5 xl:grid-cols-2"><DetailPanelSkeleton /><DetailPanelSkeleton /><DetailPanelSkeleton /><DetailPanelSkeleton /></div>
    <DetailPanelSkeleton />
  </div>;
}
