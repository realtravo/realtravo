import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Users, DollarSign, Wallet, TrendingUp, Award, Percent, 
  Clock, CheckCircle, XCircle, AlertCircle, Receipt
} from "lucide-react";
import { useHostVerificationStatus } from "@/hooks/useHostVerificationStatus";
import { WithdrawalDialog } from "@/components/referral/WithdrawalDialog";
import { Badge } from "@/components/ui/badge";

export default function Payment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isVerifiedHost, status: verificationStatus, loading: verificationLoading } = useHostVerificationStatus();
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const [stats, setStats] = useState({
    totalReferred: 0, totalBookings: 0, totalCommission: 0,
    hostEarnings: 0, bookingEarnings: 0, grossBalance: 0,
    serviceFeeDeducted: 0, withdrawableBalance: 0, avgServiceFeeRate: 0,
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!verificationLoading) fetchData();
  }, [user, navigate, isVerifiedHost, verificationLoading]);

  const fetchData = async () => {
    try {
      // Fetch host earnings
      const { data: bookings } = await supabase.from("bookings")
        .select("total_amount, item_id, booking_type, payment_status").eq("payment_status", "completed");
      let hostBalance = 0;
      if (bookings) {
        const tableMap: Record<string, string> = { trip: "trips", hotel: "hotels", adventure: "adventure_places" };
        for (const b of bookings) {
          const t = tableMap[b.booking_type];
          if (t) {
            const { data: item } = await supabase.from(t as any).select("created_by").eq("id", b.item_id).single();
            if ((item as any)?.created_by === user?.id) hostBalance += Number(b.total_amount);
          }
        }
      }

      if (isVerifiedHost) {
        const [refRes, comRes, setRes] = await Promise.all([
          supabase.from("referral_tracking").select("referred_user_id").eq("referrer_id", user!.id),
          supabase.from("referral_commissions").select("commission_type,commission_amount,booking_amount,status,withdrawn_at").eq("referrer_id", user!.id),
          supabase.from("referral_settings").select("platform_referral_commission_rate").single(),
        ]);
        const refs = refRes.data || [], coms = comRes.data || [], settings = setRes.data;
        const unique = new Set(refs.map(r => r.referred_user_id).filter(Boolean));
        const hostE = coms.filter(c => c.commission_type === 'host').reduce((s, c) => s + Number(c.commission_amount), 0);
        const bookE = coms.filter(c => c.commission_type === 'booking').reduce((s, c) => s + Number(c.commission_amount), 0);
        const withdrawable = coms.filter(c => c.status === 'paid' && !c.withdrawn_at).reduce((s, c) => s + Number(c.commission_amount), 0);
        const gross = coms.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);
        const totalBA = coms.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.booking_amount), 0);
        const rate = settings?.platform_referral_commission_rate || 5.0;
        setStats({
          totalReferred: unique.size, totalBookings: coms.length, totalCommission: hostE + bookE,
          hostEarnings: hostE, bookingEarnings: bookE, grossBalance: gross,
          serviceFeeDeducted: Math.max(0, totalBA * (rate / 100) - gross),
          withdrawableBalance: withdrawable + hostBalance, avgServiceFeeRate: rate,
        });
      } else {
        setStats(prev => ({ ...prev, withdrawableBalance: hostBalance, grossBalance: hostBalance }));
      }
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };

  const handleWithdrawalSuccess = () => { setLoading(true); window.location.reload(); };

  if (loading || verificationLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2">
        {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-3 rounded-lg text-[9px] font-bold uppercase tracking-widest px-3 h-7">
          <ArrowLeft className="mr-1 h-3 w-3" /> Home
        </Button>

        <div className="mb-4">
          <h1 className="text-lg font-black uppercase tracking-tight text-foreground">Payment Dashboard</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Earnings, referrals & withdrawals</p>
        </div>

        {/* Balance Card */}
        <div className="bg-card rounded-xl p-4 border border-border mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Wallet className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Available Balance</p>
                <p className="text-2xl font-black text-destructive">KES {stats.withdrawableBalance.toLocaleString()}</p>
              </div>
            </div>
            <Button onClick={() => setShowWithdrawDialog(true)} disabled={stats.withdrawableBalance <= 0} size="sm"
              className="rounded-lg text-[9px] font-bold uppercase h-8 px-4">
              Withdraw
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/payment-history")} className="rounded-lg h-10 text-[9px] font-bold uppercase">
            <Receipt className="h-3.5 w-3.5 mr-1.5" /> Payment History
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/bookings")} className="rounded-lg h-10 text-[9px] font-bold uppercase">
            <DollarSign className="h-3.5 w-3.5 mr-1.5" /> My Bookings
          </Button>
        </div>

        {/* Referral Stats */}
        {isVerifiedHost && (
          <>
            <div className="mb-3">
              <h2 className="text-sm font-black uppercase tracking-tight text-foreground">Referral Earnings</h2>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Track your performance</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard icon={<TrendingUp className="h-4 w-4" />} label="From Bookings" value={`KES ${stats.bookingEarnings.toLocaleString()}`} />
              <StatCard icon={<Percent className="h-4 w-4" />} label="Rate" value={`${stats.avgServiceFeeRate}%`} />
              <StatCard icon={<Award className="h-4 w-4" />} label="Referrals" value={stats.totalReferred} />
              <StatCard icon={<DollarSign className="h-4 w-4" />} label="Conversions" value={stats.totalBookings} />
              <StatCard icon={<Wallet className="h-4 w-4" />} label="Total Earned" value={`KES ${stats.totalCommission.toLocaleString()}`} />
            </div>
          </>
        )}
      </main>

      <WithdrawalDialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}
        availableBalance={stats.withdrawableBalance} userId={user?.id || ""} onSuccess={handleWithdrawalSuccess} />
    </div>
  );
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="bg-card rounded-xl p-3 border border-border">
    <div className="flex items-center gap-2 mb-1">
      <div className="text-primary">{icon}</div>
      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-sm font-black text-foreground">{typeof value === 'string' && value.includes('KES') ? <span className="text-destructive">{value}</span> : value}</p>
  </div>
);
