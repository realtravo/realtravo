import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Building, Plus, ArrowLeft, Hotel as HotelIcon, MapPin } from "lucide-react";
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

interface Hotel {
  id: string;
  name: string;
  location: string;
  approval_status: string;
  is_hidden?: boolean;
  created_at: string;
}

const CategoryHotels = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchHotels();
  }, [user, navigate]);

  const fetchHotels = async () => {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select("id, name, location, approval_status, is_hidden, created_at")
        .eq("created_by", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHotels(data || []);
    } catch (error) {
      console.error("Error fetching hotels:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isHidden?: boolean) => {
    if (isHidden) {
      return (
        <Badge className="bg-slate-400 text-white border-none uppercase text-[9px] font-black px-3 py-1">
          Hidden
        </Badge>
      );
    }
    
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: "Pending Review", color: COLORS.KHAKI_DARK },
      approved: { label: "Live", color: COLORS.TEAL },
      rejected: { label: "Needs Info", color: COLORS.RED },
    };

    const config = statusMap[status] || { label: status, color: "#64748b" };
    
    return (
      <Badge 
        className="border-none uppercase text-[9px] font-black px-3 py-1 shadow-sm"
        style={{ backgroundColor: config.color, color: 'white' }}
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
      <div className="bg-white border-b border-slate-100 px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Button 
            onClick={() => navigate("/become-host")}
            variant="ghost" 
            className="p-0 hover:bg-transparent text-slate-400 hover:text-[#FF7F50] transition-colors mb-6 group"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Dashboard</span>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.3em] mb-2">Management</p>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none" style={{ color: COLORS.TEAL }}>
                My Hotels
              </h1>
            </div>
            
            <Button 
              onClick={() => navigate("/create-hotel")}
              className="rounded-2xl h-auto py-4 px-8 text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 border-none w-full md:w-auto"
              style={{ 
                background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`,
                boxShadow: `0 10px 20px -5px ${COLORS.CORAL}66`
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Register New Property
            </Button>
          </div>
        </div>
      </div>

      <main className="container px-4 py-12 max-w-4xl mx-auto">
        {hotels.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm">
            <div className="bg-[#F0E68C]/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building className="h-10 w-10 text-[#857F3E]" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mb-2" style={{ color: COLORS.TEAL }}>No Properties Found</h2>
            <p className="text-slate-500 text-sm mb-8">Start your hosting journey by adding your first hotel listing.</p>
            <Button 
              onClick={() => navigate("/create-hotel")}
              variant="outline"
              className="rounded-xl border-2 border-[#F0E68C] text-[#857F3E] font-black uppercase text-xs px-8 py-6 hover:bg-[#F0E68C]/10"
            >
              Get Started
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hotels.map((hotel) => (
              <button
                key={hotel.id}
                onClick={() => navigate(`/edit-listing/hotel/${hotel.id}`)}
                className="w-full text-left group transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:border-[#008080]/20 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-[#008080]/10 transition-colors">
                      <HotelIcon className="h-6 w-6 text-slate-400 group-hover:text-[#008080]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 mb-1">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-[#FF7F50] transition-colors">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {hotel.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block">
                      {getStatusBadge(hotel.approval_status, hotel.is_hidden)}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-[#FF7F50] transition-colors">
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Support Section Styled like Utility Buttons */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-[#F0E68C]/10 rounded-[28px] border border-[#F0E68C]/30 flex items-center gap-4">
             <div className="bg-white p-3 rounded-2xl shadow-sm">
                <Building className="h-5 w-5 text-[#857F3E]" />
             </div>
             <div>
               <p className="text-[10px] font-black text-[#857F3E] uppercase tracking-widest">Growth</p>
               <p className="text-xs font-bold text-slate-600">Add up to 5 properties per account.</p>
             </div>
          </div>
          <div className="p-6 bg-[#008080]/5 rounded-[28px] border border-[#008080]/10 flex items-center gap-4">
             <div className="bg-white p-3 rounded-2xl shadow-sm">
                <Plus className="h-5 w-5 text-[#008080]" />
             </div>
             <div>
               <p className="text-[10px] font-black text-[#008080] uppercase tracking-widest">Support</p>
               <p className="text-xs font-bold text-slate-600">Contact host support for priority listing.</p>
             </div>
          </div>
        </div>
      </main>

      <MobileBottomBar />
    </div>
  );
};

export default CategoryHotels;