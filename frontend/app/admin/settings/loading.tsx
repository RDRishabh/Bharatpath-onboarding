import { FormSkeleton, Skeleton } from "@/components/common/loading";

export default function AdminSettingsLoading() {
  return (
    <div className="mx-auto max-w-[720px] py-4">
      <div className="mb-5 flex gap-2">
        <Skeleton width={96} height={34} radius={8} />
        <Skeleton width={96} height={34} radius={8} />
      </div>
      <FormSkeleton fields={5} />
    </div>
  );
}
