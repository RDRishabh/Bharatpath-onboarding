import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface CreditPack {
  id: string;
  credits: number;
  price: number;
  perUnit: number;
  popular?: boolean;
}

interface BillingState {
  creditBalance: number;
  creditPacks: CreditPack[];
  selectedPackId: string;
}

const initialState: BillingState = {
  creditBalance: 8,

  creditPacks: [
    {
      id: "p1",
      credits: 10,
      price: 999,
      perUnit: 99.9,
    },
    {
      id: "p2",
      credits: 50,
      price: 3999,
      perUnit: 80,
      popular: true,
    },
    {
      id: "p3",
      credits: 150,
      price: 9999,
      perUnit: 66.7,
    },
  ],

  selectedPackId: "p2",
};

const billingSlice = createSlice({
  name: "employerBilling",
  initialState,
  reducers: {
    selectCreditPack: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.selectedPackId = action.payload;
    },

    addCredits: (
      state,
      action: PayloadAction<number>,
    ) => {
      state.creditBalance += action.payload;
    },

    setCreditBalance: (
      state,
      action: PayloadAction<number>,
    ) => {
      state.creditBalance = action.payload;
    },
  },
});

export const {
  selectCreditPack,
  addCredits,
  setCreditBalance,
} = billingSlice.actions;

export default billingSlice.reducer;