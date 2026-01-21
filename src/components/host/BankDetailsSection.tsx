import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, CheckCircle2, AlertCircle } from "lucide-react";

interface Bank {
  name: string;
  code: string;
}

export const BankDetailsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [existingDetails, setExistingDetails] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    account_name: "",
    account_number: "",
    bank_code: "",
    bank_name: "",
  });

  useEffect(() => {
    if (user) {
      fetchBanksAndDetails();
    }
  }, [user]);

  const fetchBanksAndDetails = async () => {
    try {
      // Fetch banks from Paystack
      const { data: banksData, error: banksError } = await supabase.functions.invoke("get-banks", {
        body: { country: "kenya" },
      });

      if (!banksError && banksData?.banks) {
        setBanks(banksData.banks);
      }

      // Fetch existing bank details
      const { data: recipient } = await supabase
        .from("transfer_recipients")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (recipient) {
        setExistingDetails(recipient);
        setFormData({
          account_name: recipient.account_name || "",
          account_number: recipient.account_number || "",
          bank_code: recipient.bank_code || "",
          bank_name: recipient.bank_name || "",
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.account_number || !formData.bank_code) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const selectedBank = banks.find(b => b.code === formData.bank_code);
      
      const { data, error } = await supabase.functions.invoke("create-transfer-recipient", {
        body: {
          user_id: user?.id,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_code: formData.bank_code,
          bank_name: selectedBank?.name || formData.bank_name,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to save bank details");
      }

      toast({
        title: "Success",
        description: "Bank details saved and verified successfully",
      });

      // Refresh details
      fetchBanksAndDetails();
    } catch (error: any) {
      console.error("Error saving bank details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save bank details",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-2xl bg-teal-50">
          <Building2 className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Bank Details</h2>
          <p className="text-xs text-slate-500">For receiving payouts from your bookings</p>
        </div>
        {existingDetails?.is_verified && (
          <div className="ml-auto flex items-center gap-1 bg-green-50 text-green-600 px-3 py-1 rounded-full">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold">Verified</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bank_code" className="text-xs font-bold uppercase text-slate-500">
            Bank *
          </Label>
          <Select
            value={formData.bank_code}
            onValueChange={(value) => {
              const bank = banks.find(b => b.code === value);
              setFormData({ 
                ...formData, 
                bank_code: value,
                bank_name: bank?.name || ""
              });
            }}
          >
            <SelectTrigger className="h-12 rounded-xl">
              <SelectValue placeholder="Select your bank" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {banks.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_number" className="text-xs font-bold uppercase text-slate-500">
            Account Number *
          </Label>
          <Input
            id="account_number"
            type="text"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            placeholder="Enter your account number"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_name" className="text-xs font-bold uppercase text-slate-500">
            Account Name *
          </Label>
          <Input
            id="account_name"
            type="text"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            placeholder="Name as shown on bank account"
            className="h-12 rounded-xl"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Important</p>
            <p className="text-xs text-amber-700 mt-1">
              Ensure your bank details are correct. Payouts will be automatically transferred 48 hours before each booking date.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm bg-gradient-to-r from-teal-500 to-teal-600"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : existingDetails ? (
            "Update Bank Details"
          ) : (
            "Save Bank Details"
          )}
        </Button>
      </form>
    </div>
  );
};
