import { z } from "zod";

// Guest booking validation schema
export const guestBookingSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format (10-15 digits)")
    .optional()
    .or(z.literal("")),
});

// Payment phone validation schema
export const paymentPhoneSchema = z.string()
  .trim()
  .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format (10-15 digits)");

// Description validation schema (100 words max)
export const descriptionSchema = z.string()
  .trim()
  .refine(
    (val) => val.split(/\s+/).filter(Boolean).length <= 100,
    "Description must be 100 words or less"
  );

// Registration number validation schema
export const registrationNumberSchema = z.string()
  .trim()
  .min(3, "Registration number must be at least 3 characters")
  .max(50, "Registration number must be less than 50 characters")
  .regex(/^[A-Z0-9\s\-/]+$/i, "Registration number can only contain letters, numbers, spaces, hyphens, and slashes");

// Admin emails validation schema
export const adminEmailsSchema = z.string()
  .transform(str => 
    str.split(',')
      .map(e => e.trim())
      .filter(Boolean)
  )
  .pipe(
    z.array(z.string().email("Invalid email format"))
      .max(10, "Maximum 10 administrators allowed")
  );

// Approval status validation schema
export const approvalStatusSchema = z.enum(["pending", "approved", "rejected", "removed", "banned"]);
