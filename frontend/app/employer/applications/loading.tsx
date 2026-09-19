import { Skeleton, TableSkeleton } from "@/components/common/loading";

export default function EmployerApplicationsLoading() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 bg-[#f7f8fa] p-4">
      <div className="flex items-center gap-3">
        <Skeleton width={220} height={38} radius={10} />
        <Skeleton width={140} height={38} radius={10} />
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#e7e9ee] bg-white">
        <TableSkeleton columns={6} rows={9} />
      </div>
    </div>
  );
}
