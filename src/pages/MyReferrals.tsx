import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, ShoppingCart, DollarSign, Wallet, TrendingUp, Award } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferred: 0,
    totalBookings: 0,
    totalCommission: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchStats = async () => {
      try {
        const { data: referrals, error: referralsError } = await supabase
          .from("referral_tracking")
          .select("*")
          .eq("referrer_id", user.id);

        if (referralsError) throw referralsError;

        const uniqueReferred = new Set(
          referrals?.map((r) => r.referred_user_id).filter(Boolean) || []
        );

        const { data: commissions, error: commissionsError } = await supabase
          .from("referral_commissions")
          .select("*")
          .eq("referrer_id", user.id);

        if (commissionsError) throw commissionsError;

        const totalCommission = commissions?.reduce(
          (sum, c) => sum + Number(c.commission_amount),
          0
        ) || 0;

        setStats({
          totalReferred: uniqueReferred.size,
          totalBookings: commissions?.length || 0,
          totalCommission,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching referral stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <Header />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-20 w-3/4 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-[32px]" />
            ))}
          </div>
        </main>
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

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Total Referred */}
          <StatCard 
            icon={<Users className="h-6 w-6" />}
            label="Community Size"
            value={stats.totalReferred}
            subLabel="Unique Referrals"
            color={COLORS.TEAL}
          />

          {/* Total Bookings */}
          <StatCard 
            icon={<TrendingUp className="h-6 w-6" />}
            label="Successful Bookings"
            value={stats.totalBookings}
            subLabel="Converted Trips"
            color={COLORS.CORAL}
          />

          {/* Total Commission */}
          <StatCard 
            icon={<Wallet className="h-6 w-6" />}
            label="Total Earnings"
            value={`KSh ${stats.totalCommission.toLocaleString()}`}
            subLabel="Ready for Payout"
            color={COLORS.KHAKI_DARK}
            isCash
          />
        </div>

        {/* Promotional Banner */}
        <div 
          className="rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl mb-12"
          style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #004d4d 100%)` }}
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Share the Adventure</h2>
              <p className="text-teal-50/80 max-w-md text-sm font-medium leading-relaxed">
                Invite your friends to explore world-class experiences. You earn commission on every booking they make through your unique link.
              </p>
              <Button 
                className="bg-white text-[#008080] hover:bg-slate-100 rounded-2xl px-8 py-6 h-auto font-black uppercase tracking-widest text-xs"
                onClick={() => navigate("/account")} 
              >
                Generate Link
              </Button>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[32px] border border-white/20">
              <Award className="h-16 w-16 text-[#F0E68C]" />
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>
      </main>

      <MobileBottomBar />
    </div>
  );
}

// Sub-component for individual stat cards to match EventDetail UI
const StatCard = ({ icon, label, value, subLabel, color, isCash = false }: any) => (
  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
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
        <span className="text-4xl font-black tracking-tighter" style={{ color: isCash ? COLORS.RED : "#1e293b" }}>
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

// Reuse the Badge component if needed, or define a simple one
const Badge = ({ children, className, variant, style }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`} style={style}>
    {children}
  </span>
);