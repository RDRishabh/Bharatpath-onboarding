import { CardSkeletonGrid, Skeleton } from "@/components/common/loading";

export default function CollegeAnalyticsLoading() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <CardSkeletonGrid count={4} />
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Skeleton height={360} radius={12} />
        <Skeleton height={360} radius={12} />
      </div>
      <Skeleton height={280} radius={12} />
    </div>
  );
}
