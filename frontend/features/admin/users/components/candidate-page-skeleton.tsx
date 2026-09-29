import { Skeleton } from "@/components/common/loading";

const panel = "rounded-xl border border-[#e7e9ee] bg-white p-5";

function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className={panel}>
      <Skeleton width={108} height={14} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton width={86} height={10} />
            <Skeleton width="72%" height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CandidatePageSkeleton() {
  return (
    <div className="min-w-0 space-y-5 pb-6" role="status" aria-label="Loading student details">
      <div className="pt-2"><Skeleton width={100} height={12} /></div>
      <div className="flex items-center gap-4">
        <Skeleton width={48} height={48} radius={12} />
        <div className="space-y-2"><Skeleton width={200} height={22} /><Skeleton width={165} height={12} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className={panel}><Skeleton width={80} height={11} /><Skeleton className="mt-4" width={70} height={26} /></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <PanelSkeleton rows={4} /><PanelSkeleton rows={4} />
        <PanelSkeleton rows={3} /><PanelSkeleton rows={3} />
      </div>
    </div>
  );
}
