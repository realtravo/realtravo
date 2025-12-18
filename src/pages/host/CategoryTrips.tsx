import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plane, Plus, ArrowLeft, MapPin, Calendar, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

interface Trip {
  id: string;
  name: string;
  location: string;
  approval_status: string;
  is_hidden?: boolean;
  created_at: string;
}

const CategoryTrips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTrips();
  }, [user, navigate]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, location, approval_status, is_hidden, created_at")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isHidden?: boolean) => {
    if (isHidden) {
      return (
        <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest">
          Hidden
        </Badge>
      );
    }
    
    const statusMap: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: "Pending", bg: `${COLORS.KHAKI}40`, text: COLORS.KHAKI_DARK },
      approved: { label: "Approved", bg: `${COLORS.TEAL}20`, text: COLORS.TEAL },
      rejected: { label: "Rejected", bg: `${COLORS.RED}10`, text: COLORS.RED },
    };

    const config = statusMap[status] || { label: status, bg: "#eee", text: "#666" };
    
    return (
      <Badge 
        style={{ backgroundColor: config.bg, color: config.text }}
        className="border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest"
      >
        {config.label}
      </Badge>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F8F9FA] animate-pulse" />;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Header Section */}
      <div className="bg-white border-b border-slate-100 pt-8 pb-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/become-host")}
            className="mb-6 rounded-full hover:bg-slate-100 -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 bg-[#FF7F50] rounded-full" />
                <span className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.2em]">Partner Dashboard</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900">
                My Tours
              </h1>
            </div>

            <Button 
              onClick={() => navigate("/create-trip")}
              className="rounded-2xl h-auto py-4 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 border-none"
              style={{ 
                background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`,
                boxShadow: `0 8px 20px -6px ${COLORS.CORAL}88`
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Experience
            </Button>
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-4xl mx-auto -mt-8 relative z-10">
        {trips.length === 0 ? (
          <Card className="p-12 text-center rounded-[32px] border-none shadow-xl bg-white">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
               <Plane className="h-8 w-8 text-slate-300" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-2" style={{ color: COLORS.TEAL }}>No listings yet</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">Ready to share your passion with the world?</p>
            <Button 
              variant="outline"
              onClick={() => navigate("/create-trip")}
              className="rounded-xl border-2 border-slate-200 font-black uppercase text-[10px] tracking-widest"
            >
              Create your first tour
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => navigate(`/edit-listing/trip/${trip.id}`)}
                className="group w-full flex items-center justify-between p-6 bg-white rounded-[28px] shadow-sm border border-slate-100 hover:shadow-xl hover:border-[#008080]/20 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-[#F0E68C]/20 p-4 rounded-2xl group-hover:bg-[#008080] transition-colors duration-300">
                    <Plane className="h-6 w-6 text-[#857F3E] group-hover:text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 group-hover:text-[#008080] transition-colors">
                      {trip.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{trip.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {new Date(trip.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block">
                    {getStatusBadge(trip.approval_status, trip.is_hidden)}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#FF7F50] group-hover:text-white transition-all">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <MobileBottomBar />
    </div>
  );
};

export default CategoryTrips;