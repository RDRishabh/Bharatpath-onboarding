import { CardSkeletonGrid, Skeleton } from "@/components/common/loading";

export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-4">
      <CardSkeletonGrid count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton height={340} radius={16} />
        <Skeleton height={340} radius={16} />
      </div>
    </div>
  );
}
