import { z } from "zod";

export const displayNameSchema = z.string().trim().min(1, "Enter your name.").max(100, "Use at most 100 characters.");
export const emailSchema = z.string().trim().email("Enter a valid email address.");
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });
export const registerSchema = loginSchema.extend({
  displayName: displayNameSchema,
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match." });
