import { kybItems, integrityItems, disputes, users } from "./data";
export const adminService = {
  getDashboard: async () => ({ kyb: kybItems.length, integrity: integrityItems.length, disputes: disputes.filter(d => d.status !== "Resolved" && d.status !== "Rejected").length, activeEmployers: 148 }),
  getQueue: async (tab: "kyb" | "integrity") => tab === "kyb" ? kybItems : integrityItems,
  getUsers: async (segment: keyof typeof users) => users[segment],
  getDisputes: async () => disputes,
};
