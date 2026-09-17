import { StudentStatus } from "../types";
import { LinkStateBadge } from "@/components/ui/link-state-badge";

export function StudentStatusBadge({
  status,
  className = "",
}: {
  status: StudentStatus;
  className?: string;
}) {
  return <LinkStateBadge state={status} className={className} />;
}