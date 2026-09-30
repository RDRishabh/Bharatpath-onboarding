import { Skeleton } from "@/components/common/loading";
import { StudentPage } from "@/features/student/shell";

function HeaderSkeleton() {
  return <div className="mb-5 flex items-center gap-3"><Skeleton circle width={40} height={40} /><Skeleton width={130} height={22} /></div>;
}

export function CourseListSkeleton() {
  return <StudentPage><div role="status" aria-label="Loading courses"><HeaderSkeleton /><Skeleton width={225} height={28} /><Skeleton className="mt-2" width="65%" height={14} /><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 rounded-[20px] border border-[#E7E0D4] bg-white p-4"><Skeleton width={44} height={44} radius={14} /><Skeleton className="mt-4" width="72%" height={19} /><Skeleton className="mt-3" width="55%" height={13} /><Skeleton className="mt-6" width="100%" height={5} /></div>)}</div></div></StudentPage>;
}

export function CourseDetailSkeleton() {
  return <StudentPage><div role="status" aria-label="Loading course"><HeaderSkeleton /><div className="rounded-[20px] border border-[#E7E0D4] bg-white p-5"><Skeleton width={88} height={23} radius={999} /><Skeleton className="mt-4" width="48%" height={26} /><Skeleton className="mt-3" width="70%" height={13} /><Skeleton className="mt-6" width="100%" height={6} /></div><div className="mt-5 space-y-3">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="rounded-[20px] border border-[#E7E0D4] bg-white p-5"><Skeleton width="35%" height={19} /><Skeleton className="mt-5" width="80%" height={14} /><Skeleton className="mt-4" width="65%" height={14} /></div>)}</div></div></StudentPage>;
}
