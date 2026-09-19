import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type {
  CheckoutResult,
  CollegePlan,
  CollegeSubscription,
  MandateResult,
  Payment,
} from "@/store/college/types";

export interface CollegeBillingState {
  plans: CollegePlan[];
  subscription: CollegeSubscription | null;
  selectedPlanCode: string | null;
  activePayment: Payment | null;
  mandate: MandateResult | null;
  isCheckingOut: boolean;
  isCancelling: boolean;
  isSettingMandate: boolean;
  checkoutError: string | null;
  cancelError: string | null;
  mandateError: string | null;
}

const initialState: CollegeBillingState = {
  plans: [],
  subscription: null,
  selectedPlanCode: null,
  activePayment: null,
  mandate: null,
  isCheckingOut: false,
  isCancelling: false,
  isSettingMandate: false,
  checkoutError: null,
  cancelError: null,
  mandateError: null,
};

const collegeBillingSlice = createSlice({
  name: "collegeBilling",
  initialState,

  reducers: {
    replacePlans: (
      state,
      action: PayloadAction<CollegePlan[]>,
    ) => {
      state.plans = action.payload;

      const current = state.selectedPlanCode;

      if (
        !current ||
        !action.payload.some((plan) => plan.code === current)
      ) {
        state.selectedPlanCode =
          action.payload[0]?.code ?? null;
      }
    },

    setSelectedPlanCode: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.selectedPlanCode = action.payload;
    },

    replaceSubscription: (
      state,
      action: PayloadAction<CollegeSubscription>,
    ) => {
      state.subscription = action.payload;
    },

    clearSubscription: (state) => {
      state.subscription = null;
    },

    setActivePayment: (
      state,
      action: PayloadAction<Payment | null>,
    ) => {
      state.activePayment = action.payload;
    },

    replaceMandate: (
      state,
      action: PayloadAction<MandateResult | null>,
    ) => {
      state.mandate = action.payload;
    },

    setCheckingOut: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isCheckingOut = action.payload;

      if (action.payload) {
        state.checkoutError = null;
      }
    },

    setCancelling: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isCancelling = action.payload;

      if (action.payload) {
        state.cancelError = null;
      }
    },

    setSettingMandate: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isSettingMandate = action.payload;

      if (action.payload) {
        state.mandateError = null;
      }
    },

    setCheckoutError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.checkoutError = action.payload;
    },

    setCancelError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.cancelError = action.payload;
    },

    setMandateError: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.mandateError = action.payload;
    },

    clearBillingErrors: (state) => {
      state.checkoutError = null;
      state.cancelError = null;
      state.mandateError = null;
    },

    resetCheckout: (state) => {
      state.activePayment = null;
      state.checkoutError = null;
      state.isCheckingOut = false;
    },
  },
});

export const {
  replacePlans,
  setSelectedPlanCode,
  replaceSubscription,
  clearSubscription,
  setActivePayment,
  replaceMandate,
  setCheckingOut,
  setCancelling,
  setSettingMandate,
  setCheckoutError,
  setCancelError,
  setMandateError,
  clearBillingErrors,
  resetCheckout,
} = collegeBillingSlice.actions;

export default collegeBillingSlice.reducer;