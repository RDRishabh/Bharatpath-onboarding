import { RootState } from "@/store";

export const selectEmployerCreditBalance = (
  state: RootState,
) => state.employerBilling.creditBalance;

export const selectEmployerCreditPacks = (
  state: RootState,
) => state.employerBilling.creditPacks;

export const selectSelectedCreditPackId = (
  state: RootState,
) => state.employerBilling.selectedPackId;

export const selectSelectedCreditPack = (
  state: RootState,
) => {
  const packs = state.employerBilling.creditPacks;
  const selectedId =
    state.employerBilling.selectedPackId;

  return packs.find(
    (pack) => pack.id === selectedId,
  );
};