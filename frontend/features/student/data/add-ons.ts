import type { AddOnCard } from "../types";

export const addOnCards: AddOnCard[] = [
  {
    id: "addon-attribute",
    key: "attribute",
    title: "Attribute check",
    subtitle: "24 questions · 6 min",
    priceLabel: "Free",
    isFree: true,
    tint: "#DDD6F2",
    border: "#CDC4EA",
  },
  {
    id: "addon-interview",
    key: "interview",
    title: "Mock interview",
    subtitle: "6 questions · 15 min",
    priceLabel: "₹299",
    isFree: false,
    tint: "#CFD8ED",
    border: "#BDC8E3",
  },
];