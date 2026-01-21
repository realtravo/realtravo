import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";

interface Bank {
  name: string;
  code: string;
}

interface WithdrawSectionProps {
  availableBalance: number;
  onWithdrawSuccess?: () => void;
}

export const WithdrawSection = ({ availableBalance, onWithdrawSuccess }: WithdrawSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [hasExistingRecipient, setHasExistingRecipient] = useState(false);
  const [amount, setAmount] = useState("");
  
  const [bankDetails, setBankDetails] = useState({
    account_name: "",
    account_number: "",
    bank_code: "",
    bank_name: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch banks
      const { data: banksData } = await supabase.functions.invoke("get-banks", {
        body: { country: "kenya" },
      });

      if (banksData?.banks) {
        setBanks(banksData.banks);
      }

      // Check for existing recipient
      const { data: recipient } = await supabase
        .from("transfer_recipients")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (recipient) {
        setHasExistingRecipient(true);
        setBankDetails({
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

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "Withdrawal amount exceeds available balance",
        variant: "destructive",
      });
      return;
    }

    if (!hasExistingRecipient && (!bankDetails.account_name || !bankDetails.account_number || !bankDetails.bank_code)) {
      toast({
        title: "Missing Bank Details",
        description: "Please fill in your bank details",
        variant: "destructive",
      });
      return;
    }

    setWithdrawing(true);

    try {
      const { data, error } = await supabase.functions.invoke("withdraw-referral", {
        body: {
          amount: withdrawAmount,
          ...(!hasExistingRecipient ? bankDetails : {}),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Withdrawal failed");
      }

      toast({
        title: "Withdrawal Initiated",
        description: `KSh ${withdrawAmount.toLocaleString()} is being transferred to your account`,
      });

      setAmount("");
      onWithdrawSuccess?.();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
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
        <div className="p-3 rounded-2xl bg-red-50">
          <Wallet className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Withdraw Earnings</h2>
          <p className="text-xs text-slate-500">Transfer your commissions to your bank account</p>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
        <p className="text-4xl font-black text-white">KSh {availableBalance.toLocaleString()}</p>
      </div>

      <div className="space-y-5">
        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-slate-500">
            Amount to Withdraw
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">KSh</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-14 rounded-xl pl-14 text-xl font-bold"
              max={availableBalance}
            />
          </div>
          <button
            type="button"
            onClick={() => setAmount(availableBalance.toString())}
            className="text-xs font-bold text-teal-600 hover:underline"
          >
            Withdraw All
          </button>
        </div>

        {/* Bank Details (only show if no existing recipient) */}
        {!hasExistingRecipient && (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase text-slate-500">Bank Details</p>
            
            <Select
              value={bankDetails.bank_code}
              onValueChange={(value) => {
                const bank = banks.find(b => b.code === value);
                setBankDetails({
                  ...bankDetails,
                  bank_code: value,
                  bank_name: bank?.name || "",
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

            <Input
              placeholder="Account Number"
              value={bankDetails.account_number}
              onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
              className="h-12 rounded-xl"
            />

            <Input
              placeholder="Account Name"
              value={bankDetails.account_name}
              onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
              className="h-12 rounded-xl"
            />
          </div>
        )}

        {hasExistingRecipient && (
          <div className="flex items-center gap-2 p-4 bg-green-50 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-800">Bank Account Verified</p>
              <p className="text-xs text-green-600">{bankDetails.bank_name} - ****{bankDetails.account_number.slice(-4)}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleWithdraw}
          disabled={withdrawing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > availableBalance}
          className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm bg-gradient-to-r from-red-500 to-red-600"
        >
          {withdrawing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Withdraw Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
