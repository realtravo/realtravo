import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Users, DollarSign, Wallet, TrendingUp, Award, Percent, ShieldX, ShieldCheck, Clock, Loader2, BanknoteIcon, AlertCircle } from "lucide-react";
import { useHostVerificationStatus } from "@/hooks/useHostVerificationStatus";
import { toast } from "sonner";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

export default function MyReferrals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isVerifiedHost, status: verificationStatus, loading: verificationLoading } = useHostVerificationStatus();
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [stats, setStats] = useState({
    totalReferred: 0,
    totalBookings: 0,
    totalCommission: 0,
    hostEarnings: 0,
    bookingEarnings: 0,
    grossBalance: 0,
    serviceFeeDeducted: 0,
    withdrawableBalance: 0,
    avgServiceFeeRate: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Don't fetch stats if not a verified host
    if (!verificationLoading && !isVerifiedHost) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Fetch all data in parallel
        const [referralsRes, commissionsRes, settingsRes, bankRes] = await Promise.all([
          supabase.from("referral_tracking").select("referred_user_id").eq("referrer_id", user.id),
          supabase.from("referral_commissions").select("commission_type,commission_amount,booking_amount,status,withdrawn_at").eq("referrer_id", user.id),
          supabase.from("referral_settings").select("platform_referral_commission_rate").single(),
          supabase.from("bank_details").select("id").eq("user_id", user.id).eq("verification_status", "verified").maybeSingle()
        ]);

        const referrals = referralsRes.data || [];
        const commissions = commissionsRes.data || [];
        const settings = settingsRes.data;

        setHasBankDetails(!!bankRes.data);

        const uniqueReferred = new Set(referrals.map((r) => r.referred_user_id).filter(Boolean));

        const hostEarnings = commissions.filter(c => c.commission_type === 'host')
          .reduce((sum, c) => sum + Number(c.commission_amount), 0);
        
        const bookingEarnings = commissions.filter(c => c.commission_type === 'booking')
          .reduce((sum, c) => sum + Number(c.commission_amount), 0);

        const totalCommission = hostEarnings + bookingEarnings;
        
        // Withdrawable = paid commissions that haven't been withdrawn
        const withdrawableBalance = commissions
          .filter(c => c.status === 'paid' && !c.withdrawn_at)
          .reduce((sum, c) => sum + Number(c.commission_amount), 0);

        const grossBalance = commissions.filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + Number(c.commission_amount), 0);

        const totalBookingAmount = commissions.filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + Number(c.booking_amount), 0);

        const avgServiceFeeRate = settings?.platform_referral_commission_rate || 5.0;
        const estimatedServiceFee = totalBookingAmount * (avgServiceFeeRate / 100) - grossBalance;

        setStats({
          totalReferred: uniqueReferred.size,
          totalBookings: commissions.length,
          totalCommission,
          hostEarnings,
          bookingEarnings,
          grossBalance,
          serviceFeeDeducted: Math.max(0, estimatedServiceFee),
          withdrawableBalance,
          avgServiceFeeRate,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching referral stats:", error);
        setLoading(false);
      }
    };

    if (isVerifiedHost) {
      fetchStats();
    }
  }, [user, navigate, isVerifiedHost, verificationLoading]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > stats.withdrawableBalance) {
      toast.error(`Maximum withdrawable amount is KES ${stats.withdrawableBalance.toLocaleString()}`);
      return;
    }

    if (!hasBankDetails) {
      toast.error("Please add and verify your bank details first");
      navigate("/account");
      return;
    }

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-payouts', {
        body: {
          action: 'withdraw',
          user_id: user?.id,
          amount: amount,
          payout_type: 'commission',
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Withdrawal failed');
      }

      toast.success("Withdrawal initiated! Funds will be sent to your bank account.");
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      
      // Refresh stats
      setStats(prev => ({
        ...prev,
        withdrawableBalance: prev.withdrawableBalance - amount,
      }));

    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading || verificationLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-20 w-3/4 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-[32px]" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Show eligibility error if not a verified host
  if (!isVerifiedHost) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-24">
        <Header />
        <main className="container px-4 max-w-4xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/account")}
            className="w-fit rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 px-6 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" style={{ color: COLORS.TEAL }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Back to Account</span>
          </Button>

          <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100">
            <div className="flex flex-col items-center text-center space-y-6">
              <div 
                className="p-6 rounded-full"
                style={{ 
                  backgroundColor: verificationStatus === 'pending' ? `${COLORS.CORAL}15` : '#FEE2E2'
                }}
              >
                {verificationStatus === 'pending' ? (
                  <Clock className="h-12 w-12" style={{ color: COLORS.CORAL }} />
                ) : verificationStatus === 'rejected' ? (
                  <ShieldX className="h-12 w-12 text-red-500" />
                ) : (
                  <ShieldCheck className="h-12 w-12 text-slate-400" />
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900">
                  {verificationStatus === 'pending' 
                    ? 'Verification Pending'
                    : verificationStatus === 'rejected'
                    ? 'Verification Required'
                    : 'Become a Verified Host'}
                </h1>
                <p className="text-slate-500 text-sm max-w-md">
                  {verificationStatus === 'pending'
                    ? 'Your host verification is being reviewed. The referral program will be unlocked once your verification is approved.'
                    : verificationStatus === 'rejected'
                    ? 'Your host verification was not approved. Please update your documents and resubmit to access the referral program.'
                    : 'The referral program is exclusively available to verified hosts. Complete your host verification to start earning commissions.'}
                </p>
              </div>

              <Button
                onClick={() => navigate(verificationStatus === 'none' ? '/host-verification' : '/verification-status')}
                className="rounded-2xl px-8 py-6 h-auto font-black uppercase tracking-widest text-xs"
                style={{ backgroundColor: COLORS.TEAL }}
              >
                {verificationStatus === 'none' ? 'Start Verification' : 'View Status'}
              </Button>
            </div>
          </div>
        </main>
        <MobileBottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />

      <main className="container px-4 max-w-6xl mx-auto py-8">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-6 mb-10">
          <Button
            variant="ghost"
            onClick={() => navigate("/account")}
            className="w-fit rounded-full bg-white shadow-sm border border-slate-100 hover:bg-slate-50 px-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" style={{ color: COLORS.TEAL }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Back to Account</span>
          </Button>

          <div className="space-y-2">
            <Badge variant="secondary" className="bg-[#FF7F50]/10 text-[#FF7F50] border-none px-4 py-1 uppercase font-black tracking-widest text-[10px] rounded-full">
              Rewards Program
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900">
              Referral <span style={{ color: COLORS.TEAL }}>Dashboard</span>
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Track your community impact and earnings</p>
          </div>
        </div>

        {/* Withdrawable Balance Card with Action */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-2xl"
                style={{ backgroundColor: `${COLORS.RED}15` }}
              >
                <Wallet className="h-8 w-8" style={{ color: COLORS.RED }} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Withdrawable Balance</p>
                <span className="text-4xl font-black" style={{ color: COLORS.RED }}>
                  KES {stats.withdrawableBalance.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {!hasBankDetails && (
                <Button
                  onClick={() => navigate("/account")}
                  variant="outline"
                  className="rounded-2xl px-6 py-6 h-auto font-black uppercase tracking-widest text-xs border-2"
                >
                  <BanknoteIcon className="h-4 w-4 mr-2" />
                  Add Bank Details
                </Button>
              )}
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                disabled={stats.withdrawableBalance <= 0 || !hasBankDetails}
                className="rounded-2xl px-8 py-6 h-auto font-black uppercase tracking-widest text-xs"
                style={{ backgroundColor: stats.withdrawableBalance > 0 && hasBankDetails ? COLORS.TEAL : '#94a3b8' }}
              >
                Withdraw Funds
              </Button>
            </div>
          </div>
          
          {!hasBankDetails && (
            <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs font-medium">Add and verify your bank details to enable withdrawals</p>
            </div>
          )}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {/* Booking Commissions */}
          <StatCard 
            icon={<TrendingUp className="h-6 w-6" />}
            label="From Bookings"
            value={`KES ${stats.bookingEarnings.toLocaleString()}`}
            subLabel="Booking Commission Earnings"
            color={COLORS.CORAL}
            isCash
          />

          {/* Service Fee Rate Info */}
          <StatCard 
            icon={<Percent className="h-6 w-6" />}
            label="Commission Rate"
            value={`${stats.avgServiceFeeRate}%`}
            subLabel="Of Service Fee Earned"
            color={COLORS.KHAKI_DARK}
          />

          {/* Total Referred */}
          <StatCard 
            icon={<Award className="h-6 w-6" />}
            label="Community Size"
            value={stats.totalReferred}
            subLabel="Unique Referrals"
            color={COLORS.TEAL}
          />

          {/* Total Bookings */}
          <StatCard 
            icon={<DollarSign className="h-6 w-6" />}
            label="Total Bookings"
            value={stats.totalBookings}
            subLabel="Converted Referrals"
            color={COLORS.CORAL}
          />

          {/* Total Commission Earned */}
          <StatCard 
            icon={<Wallet className="h-6 w-6" />}
            label="Total Earned"
            value={`KES ${stats.totalCommission.toLocaleString()}`}
            subLabel="Lifetime Earnings"
            color={COLORS.TEAL}
            isCash
          />
        </div>
      </main>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw. Funds will be sent to your verified bank account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Available Balance</p>
              <p className="text-2xl font-black" style={{ color: COLORS.RED }}>
                KES {stats.withdrawableBalance.toLocaleString()}
              </p>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                Withdrawal Amount (KES)
              </label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                className="rounded-xl h-12"
                max={stats.withdrawableBalance}
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setShowWithdrawDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
              className="rounded-xl"
              style={{ backgroundColor: COLORS.TEAL }}
            >
              {withdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
}

// Sub-component for individual stat cards
const StatCard = ({ icon, label, value, subLabel, color, isCash = false, large = false }: any) => (
  <div className={`bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all ${large ? 'lg:col-span-1' : ''}`}>
    <div className="flex justify-between items-start mb-6">
      <div 
        className="p-3 rounded-2xl shadow-inner"
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        {icon}
      </div>
      <div className="bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</span>
      </div>
    </div>
    
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`${large ? 'text-4xl' : 'text-3xl'} font-black tracking-tighter`} style={{ color: isCash ? COLORS.RED : "#1e293b" }}>
          {value}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {subLabel}
      </p>
    </div>
  </div>
);

// Reuse the Badge component
const Badge = ({ children, className, variant, style }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`} style={style}>
    {children}
  </span>
);
