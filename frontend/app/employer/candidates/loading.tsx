import { ListSkeleton, Skeleton } from "@/components/common/loading";

export default function EmployerCandidatesLoading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#f7f8fa]">
      <div className="flex h-[54px] shrink-0 items-center justify-between px-4">
        <Skeleton width={150} height={12} radius={6} />
        <Skeleton width={110} height={10} radius={6} />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
        <ListSkeleton rows={7} trailing />
      </div>
    </div>
  );
}
