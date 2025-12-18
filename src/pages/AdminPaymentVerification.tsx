import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle, Clock, ShieldCheck, Mail, User, Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

interface BankDetail {
  id: string;
  user_id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  verification_status: string;
  rejection_reason: string | null;
  created_at: string;
  last_updated: string;
  user_email?: string;
  user_name?: string;
}

export default function AdminPaymentVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkAdminAndFetchData();
  }, [user, navigate]);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user?.id);
      if (!roles?.some(r => r.role === "admin")) {
        navigate("/");
        return;
      }
      await fetchBankDetails();
    } catch (error) {
      navigate("/");
    }
  };

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase.from("bank_details").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const detailsWithUserInfo = await Promise.all(
        (data || []).map(async (detail) => {
          const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", detail.user_id).maybeSingle();
          return {
            ...detail,
            user_email: profile?.email || "Unknown",
            user_name: profile?.name || "Unknown",
          };
        })
      );
      setBankDetails(detailsWithUserInfo);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    setProcessing(id);
    try {
      const { error } = await supabase.from("bank_details").update({
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: user?.id,
        rejection_reason: null,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: "VERIFIED", description: "Details approved successfully" });
      await fetchBankDetails();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast({ title: "Reason Required", variant: "destructive" });
      return;
    }
    setProcessing(id);
    try {
      const { error } = await supabase.from("bank_details").update({
        verification_status: "rejected",
        rejection_reason: rejectionReason,
        verified_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: "REJECTED", description: "Notification sent to user" });
      setRejectionReason("");
      setSelectedItem(null);
      await fetchBankDetails();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      verified: { color: COLORS.TEAL, icon: CheckCircle2, text: "Verified" },
      pending: { color: COLORS.CORAL, icon: Clock, text: "Pending" },
      rejected: { color: COLORS.RED, icon: XCircle, text: "Rejected" },
    };
    const config = configs[status as keyof typeof configs];
    return (
      <Badge className="border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: config.color }}>
        <config.icon className="h-3 w-3 mr-1" /> {config.text}
      </Badge>
    );
  };

  const renderBankDetailCard = (detail: BankDetail) => (
    <Card key={detail.id} className="mb-6 rounded-[28px] border border-slate-100 shadow-sm overflow-hidden bg-white">
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100">
              <Landmark className="h-6 w-6" style={{ color: COLORS.TEAL }} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>{detail.bank_name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Verification Request</p>
            </div>
          </div>
          {getStatusBadge(detail.verification_status)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#F0E68C]/20"><User className="h-4 w-4 text-[#857F3E]" /></div>
              <div>
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Holder</Label>
                <p className="text-sm font-black uppercase text-slate-700">{detail.account_holder_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#F0E68C]/20"><ShieldCheck className="h-4 w-4 text-[#857F3E]" /></div>
              <div>
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Number</Label>
                <p className="text-sm font-black text-slate-700">{detail.account_number}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-50"><Mail className="h-4 w-4 text-slate-400" /></div>
              <div>
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User Contact</Label>
                <p className="text-xs font-bold text-slate-600">{detail.user_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-50"><Clock className="h-4 w-4 text-slate-400" /></div>
              <div>
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submission Date</Label>
                <p className="text-xs font-bold text-slate-600">{new Date(detail.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {detail.rejection_reason && (
          <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100">
            <Label className="text-[9px] font-black text-red-400 uppercase tracking-widest">Rejection Reason</Label>
            <p className="text-sm font-bold text-red-700">{detail.rejection_reason}</p>
          </div>
        )}

        {detail.verification_status === "pending" && (
          <div className="space-y-4 pt-6 border-t border-slate-50">
            {selectedItem === detail.id ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State the reason for rejection (e.g., Invalid account number)..."
                  className="rounded-2xl border-slate-200 focus:ring-[#FF7F50] text-sm"
                />
                <div className="flex gap-3">
                  <Button 
                    onClick={() => handleReject(detail.id)} 
                    disabled={processing === detail.id} 
                    className="flex-1 rounded-xl font-black uppercase text-[11px] tracking-widest h-12 bg-red-500 hover:bg-red-600"
                  >
                    Confirm Rejection
                  </Button>
                  <Button onClick={() => setSelectedItem(null)} variant="outline" className="rounded-xl font-black uppercase text-[11px] tracking-widest h-12">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => handleVerify(detail.id)} 
                  disabled={processing === detail.id} 
                  className="flex-1 rounded-xl font-black uppercase text-[11px] tracking-[0.15em] h-14 shadow-lg border-none"
                  style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` }}
                >
                  {processing === detail.id ? "Processing..." : "Approve Details"}
                </Button>
                <Button 
                  onClick={() => setSelectedItem(detail.id)} 
                  variant="ghost"
                  className="rounded-xl font-black uppercase text-[11px] tracking-widest h-14 text-red-500 hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header />
      
      {/* Hero Header */}
      <div className="bg-[#008080] pt-12 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/account")} 
            className="text-white/80 hover:text-white hover:bg-white/10 mb-6 rounded-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> <span className="text-[10px] font-black uppercase tracking-widest">Back to Admin</span>
          </Button>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2">
            Payment Control
          </h1>
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em]">Verification Gateway</p>
        </div>
      </div>

      <main className="container mx-auto px-4 -mt-10 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-white/20 backdrop-blur-md rounded-[20px] mb-8 border border-white/30 h-14">
              <TabsTrigger value="pending" className="rounded-[16px] font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#008080]">
                Pending ({bankDetails.filter(d => d.verification_status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="verified" className="rounded-[16px] font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#008080]">
                Verified
              </TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-[16px] font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#008080]">
                Rejected
              </TabsTrigger>
            </TabsList>

            {["pending", "verified", "rejected"].map((status) => (
              <TabsContent key={status} value={status} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                {loading ? (
                  <div className="space-y-6">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-[28px]" />)}
                  </div>
                ) : bankDetails.filter(d => d.verification_status === status).length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[28px] border border-dashed border-slate-200">
                    <ShieldCheck className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No records found for this status</p>
                  </div>
                ) : (
                  bankDetails.filter(d => d.verification_status === status).map(renderBankDetailCard)
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
}