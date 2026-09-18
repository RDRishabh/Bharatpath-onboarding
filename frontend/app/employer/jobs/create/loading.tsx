import { FormSkeleton } from "@/components/common/loading";

export default function EmployerJobCreateLoading() {
  return (
    <div className="mx-auto max-w-[860px] py-1">
      <FormSkeleton fields={6} />
    </div>
  );
}
