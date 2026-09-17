import { z } from "zod";

export const inviteStudentSchema = z.object({
  email: z
    .string()
    .email("Enter a valid email address"),

  name: z
    .string()
    .max(100)
    .optional(),
});

export type InviteStudentValues =
  z.infer<typeof inviteStudentSchema>;