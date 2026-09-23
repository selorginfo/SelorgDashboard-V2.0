import { z } from "zod";
import { ROLES } from "@/types/auth";

export const loginSchema = z.object({
  email: z.string().min(1, "Work email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(ROLES),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;
