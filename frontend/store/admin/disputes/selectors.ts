import type { RootState } from "@/store";

export const selectAdminDisputes = (
  state: RootState,
) => state.admin.disputes;

export const selectAllDisputes = (
  state: RootState,
) =>
  state.admin.disputes.disputes;

export const selectOpenDisputes = (
  state: RootState,
) =>
  state.admin.disputes.disputes.filter(
    (item) =>
      !["Resolved", "Rejected"].includes(
        item.status,
      ),
  );

export const selectResolvedDisputes = (
  state: RootState,
) =>
  state.admin.disputes.disputes.filter(
    (item) =>
      ["Resolved", "Rejected"].includes(
        item.status,
      ),
  );

export const selectSelectedDispute = (
  state: RootState,
) => {
  const { disputes, openId } =
    state.admin.disputes;

  return (
    disputes.find(
      (item) => item.id === openId,
    ) ?? null
  );
};

export const selectAuditItems = (
  state: RootState,
) =>
  state.admin.disputes.auditItems;