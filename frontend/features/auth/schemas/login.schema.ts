import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(320, "Email must be 320 characters or less"),
  password: z
    .string()
    .min(1, "Password is required"),
  pool: z.enum(["CANDIDATE", "BUSINESS"]),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
