import { RootState } from "@/store";

export const selectCollegeBilling = (
  state: RootState,
) => state.collegeBilling;

export const selectCollegePlans = (
  state: RootState,
) => state.collegeBilling.plans;

export const selectCollegeSubscription = (
  state: RootState,
) => state.collegeBilling.subscription;

export const selectSelectedPlanCode = (
  state: RootState,
) => state.collegeBilling.selectedPlanCode;

export const selectSelectedPlan = (
  state: RootState,
) => {
  const { plans, selectedPlanCode } = state.collegeBilling;

  return (
    plans.find((plan) => plan.code === selectedPlanCode) ??
    null
  );
};

export const selectActivePayment = (
  state: RootState,
) => state.collegeBilling.activePayment;

export const selectMandate = (
  state: RootState,
) => state.collegeBilling.mandate;

export const selectIsCheckingOut = (
  state: RootState,
) => state.collegeBilling.isCheckingOut;

export const selectIsCancelling = (
  state: RootState,
) => state.collegeBilling.isCancelling;

export const selectIsSettingMandate = (
  state: RootState,
) => state.collegeBilling.isSettingMandate;

export const selectCheckoutError = (
  state: RootState,
) => state.collegeBilling.checkoutError;

export const selectCancelError = (
  state: RootState,
) => state.collegeBilling.cancelError;

export const selectMandateError = (
  state: RootState,
) => state.collegeBilling.mandateError;