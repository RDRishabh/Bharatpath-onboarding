import { CardSkeletonGrid, Skeleton } from "@/components/common/loading";

export default function CollegeAnalyticsLoading() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4">
      <CardSkeletonGrid count={4} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton height={360} radius={16} />
        <Skeleton height={360} radius={16} />
      </div>
      <Skeleton height={280} radius={16} />
    </div>
  );
}
