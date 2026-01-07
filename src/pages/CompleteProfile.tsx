import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { PasswordStrength } from "@/components/ui/password-strength";
import { PhoneInput } from "@/components/profile/PhoneInput";

export default function CompleteProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setCheckingProfile(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed, name')
        .eq('id', user.id)
        .single();

      if (profile?.profile_completed) {
        navigate('/');
        return;
      }
      // Pre-fill name from Google profile
      if (user.user_metadata?.full_name || user.user_metadata?.name) {
        setName(user.user_metadata?.full_name || user.user_metadata?.name || '');
      } else if (profile?.name) {
        setName(profile.name);
      }
      setCheckingProfile(false);
    };
    if (!authLoading) checkProfile();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const validatePassword = (pwd: string) => {
    if (!pwd) return { valid: true }; // Optional
    if (pwd.length < 8) return { valid: false, message: "Password must be at least 8 characters" };
    if (!/[A-Z]/.test(pwd)) return { valid: false, message: "Must contain uppercase letter" };
    if (!/[a-z]/.test(pwd)) return { valid: false, message: "Must contain lowercase letter" };
    if (!/[0-9]/.test(pwd)) return { valid: false, message: "Must contain a number" };
    return { valid: true };
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }

    // Validate password only if provided
    if (password) {
      const pv = validatePassword(password);
      if (!pv.valid) {
        setErrors({ password: pv.message! });
        return;
      }
      if (password !== confirmPassword) {
        setErrors({ confirmPassword: "Passwords don't match" });
        return;
      }
    }

    setLoading(true);
    try {
      // Update password only if provided
      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      // Update profile
      const updateData: Record<string, any> = {
        name: name.trim(),
        profile_completed: true,
      };
      if (phoneNumber.trim()) {
        updateData.phone_number = phoneNumber.trim();
      }

      await supabase.from('profiles').update(updateData).eq('id', user!.id);

      toast({ title: "Profile completed!", description: "Welcome to Realtravo!" });
      navigate('/');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Just mark as complete with whatever name we have
    const updateName = name.trim() || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User';
    await supabase.from('profiles').update({ 
      profile_completed: true,
      name: updateName 
    }).eq('id', user!.id);
    navigate('/');
  };

  if (authLoading || checkingProfile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/fulllogo.png" alt="Realtravo" className="h-12 mx-auto mb-4" />
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Just confirm your name to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className={errors.name ? "border-destructive" : ""} 
                placeholder="Enter your name"
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <PhoneInput 
              value={phoneNumber} 
              onChange={setPhoneNumber} 
              country="Kenya" 
              label="Phone Number (optional)" 
            />

            <div className="space-y-2">
              <Label>Set Password (optional - for email login)</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className={errors.password ? "border-destructive" : ""}
                  placeholder="Leave empty to use Google only"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && <PasswordStrength password={password} />}
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            {password && (
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className={errors.confirmPassword ? "border-destructive" : ""} 
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleSkip} className="flex-1">
                Skip for now
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Complete"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
