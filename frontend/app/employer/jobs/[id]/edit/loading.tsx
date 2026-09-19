import { DetailSkeleton } from "@/components/common/loading";

export default function EmployerJobEditLoading() {
  return (
    <div className="mx-auto max-w-[860px] py-1">
      <DetailSkeleton sections={2} />
    </div>
  );
}
