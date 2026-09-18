import { Skeleton, TableSkeleton } from "@/components/common/loading";

export default function AdminQueueLoading() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 py-4">
      <div className="flex items-center gap-2">
        <Skeleton width={110} height={34} radius={8} />
        <Skeleton width={110} height={34} radius={8} />
        <Skeleton width={110} height={34} radius={8} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e7e9ee] bg-white">
        <TableSkeleton columns={5} rows={8} />
      </div>
    </div>
  );
}
