import { Skeleton, TableSkeleton } from "@/components/common/loading";

export default function AdminDisputesLoading() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton width={260} height={38} radius={10} />
        <Skeleton width={120} height={36} radius={10} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e7e9ee] bg-white">
        <TableSkeleton columns={6} rows={8} />
      </div>
    </div>
  );
}
