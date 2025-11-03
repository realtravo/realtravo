import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Building2, Mail, Phone, FileText, Lock, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const businessSignupSchema = z.object({
  businessType: z.string().min(1, "Please select a business type"),
  businessName: z.string().trim().min(2, "Business name must be at least 2 characters").max(100, "Business name must be less than 100 characters"),
  registrationNumber: z.string().trim().min(3, "Registration number is required").max(50, "Registration number must be less than 50 characters"),
  businessPhone: z.string().trim().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, "Please enter a valid phone number"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters")
    .refine((email) => !email.match(/^(info|sales|admin|support|contact|help|service|office|team|hello|mail|business)@/), {
      message: "Personal email required. Business emails (info@, sales@, etc.) are not allowed",
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type BusinessSignupFormData = z.infer<typeof businessSignupSchema>;

export const BusinessSignupForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BusinessSignupFormData>({
    resolver: zodResolver(businessSignupSchema),
  });

  const businessType = watch("businessType");

  const onSubmit = async (data: BusinessSignupFormData) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          account_type: "business",
          business_type: data.businessType,
        },
      },
    });

    if (error) {
      // Handle specific errors
      if (error.message.includes("already registered")) {
        toast({
          title: "Email already registered",
          description: "This email is already in use. Please try logging in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else if (authData.user) {
      // Create business account
      const { error: businessError } = await supabase
        .from("business_accounts")
        .insert({
          id: authData.user.id,
          business_type: data.businessType as any,
          business_name: data.businessName,
          business_registration_number: data.registrationNumber,
          business_phone_number: data.businessPhone,
        });

      if (businessError) {
        // Handle specific business account errors
        if (businessError.message.includes("unique_business_registration_number")) {
          toast({
            title: "Registration number already exists",
            description: "This business registration number is already registered.",
            variant: "destructive",
          });
        } else if (businessError.message.includes("unique_business_phone_number")) {
          toast({
            title: "Phone number already exists",
            description: "This phone number is already registered to another business.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Business account creation failed",
            description: businessError.message,
            variant: "destructive",
          });
        }
      } else {
        toast({ 
          title: "Success!", 
          description: "Business account created! Please check your email to verify." 
        });
        navigate("/");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Business Type Selection - Full Width */}
      <div className="space-y-2">
        <Label htmlFor="businessType" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Business Type <span className="text-destructive">*</span>
        </Label>
        <Select value={businessType} onValueChange={(value) => setValue("businessType", value)}>
          <SelectTrigger className={errors.businessType ? "border-destructive" : ""}>
            <SelectValue placeholder="Select your business type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hotel_accommodation">Hotel & Accommodation</SelectItem>
            <SelectItem value="trip_event">Trip and Event</SelectItem>
            <SelectItem value="place_destination">Place Destination</SelectItem>
          </SelectContent>
        </Select>
        {errors.businessType && (
          <p className="text-sm text-destructive">{errors.businessType.message}</p>
        )}
      </div>

      {/* Two Column Layout for Business Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="businessName"
            placeholder="Enter your business name"
            className={errors.businessName ? "border-destructive" : ""}
            {...register("businessName")}
          />
          {errors.businessName && (
            <p className="text-sm text-destructive">{errors.businessName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationNumber" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Registration Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="registrationNumber"
            placeholder="Enter registration number"
            className={errors.registrationNumber ? "border-destructive" : ""}
            {...register("registrationNumber")}
          />
          {errors.registrationNumber && (
            <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessPhone" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Business Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="businessPhone"
            type="tel"
            placeholder="+1234567890"
            className={errors.businessPhone ? "border-destructive" : ""}
            {...register("businessPhone")}
          />
          {errors.businessPhone && (
            <p className="text-sm text-destructive">{errors.businessPhone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            className={errors.email ? "border-destructive" : ""}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password (min. 6 characters)"
              className={errors.password ? "border-destructive" : ""}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter password"
              className={errors.confirmPassword ? "border-destructive" : ""}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create Business Account"}
      </Button>
    </form>
  );
};
