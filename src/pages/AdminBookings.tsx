import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Mail, Phone, User, ArrowLeft, Hash, CreditCard, Users, CheckCircle2 } from "lucide-react";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

const AdminBookings = () => {
  const { type, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasAdminRole = roles?.some(r => r.role === "admin");
    if (!hasAdminRole) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchBookings();
  };

  const fetchBookings = async () => {
    try {
      let itemData: any = null;

      if (type === "trip") {
        const { data } = await supabase.from("trips").select("id, name, image_url").eq("id", id).single();
        itemData = data;
      } else if (type === "hotel") {
        const { data } = await supabase.from("hotels").select("id, name, image_url").eq("id", id).single();
        itemData = data;
      } else if (type === "adventure") {
        const { data } = await supabase.from("adventure_places").select("id, name, image_url").eq("id", id).single();
        itemData = data;
      }

      setItem(itemData);

      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("item_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const statusMap: Record<string, { bg: string, text: string }> = {
      pending: { bg: "#F0E68C20", text: "#857F3E" },
      confirmed: { bg: "#00808015", text: "#008080" },
      cancelled: { bg: "#FF000010", text: "#FF0000" },
      completed: { bg: "#F8F9FA", text: "#64748b" }
    };
    return statusMap[status] || { bg: "#F8F9FA", text: "#64748b" };
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] animate-pulse flex flex-col">
        <Header />
        <div className="flex-1 container px-4 py-12 text-center font-black uppercase tracking-widest text-slate-400">
          Loading Data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header className="hidden md:block" />
      
      {/* Header Section */}
      <div className="bg-white border-b border-slate-100 pt-8 pb-12">
        <div className="container px-4 max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/admin/review/${type}/${id}`)} 
            className="mb-6 rounded-full bg-slate-50 hover:bg-slate-100 font-black uppercase text-[10px] tracking-[0.15em] px-6"
          >
            <ArrowLeft className="h-3 w-3 mr-2" /> Back to Review
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-[#FF7F50] hover:bg-[#FF7F50] border-none px-4 py-1 uppercase font-black tracking-[0.15em] text-[9px] rounded-full">
                  Admin Panel
                </Badge>
                <div className="flex items-center gap-1.5 bg-[#F0E68C]/30 px-3 py-1 rounded-full border border-[#F0E68C]/50">
                  <CheckCircle2 className="h-3 w-3 text-[#857F3E]" />
                  <span className="text-[9px] font-black text-[#857F3E] uppercase tracking-wider">{bookings.length} Total Bookings</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 drop-shadow-sm">
                Bookings: <span style={{ color: COLORS.TEAL }}>{item?.name}</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-6 pb-24">
        {bookings.length === 0 ? (
          <Card className="rounded-[28px] p-12 text-center border-none shadow-sm bg-white">
            <p className="text-slate-400 font-black uppercase tracking-widest">No guest records found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((booking) => {
              const status = getStatusStyle(booking.status);
              return (
                <Card key={booking.id} className="rounded-[28px] overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                  <div className="p-1 flex flex-col">
                    {/* Status Top Bar */}
                    <div className="flex justify-between items-center px-7 py-3 border-b border-slate-50">
                       <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-slate-300" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Ref: {booking.id.slice(0, 8)}
                          </span>
                       </div>
                       <div className="flex gap-2">
                          <span className="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: status.bg, color: status.text }}>
                            {booking.status}
                          </span>
                          <span className="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
                            Paid: {booking.payment_status || "Pending"}
                          </span>
                       </div>
                    </div>

                    <div className="p-7">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Guest Profile */}
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100">
                            <User className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Guest Identity</p>
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 leading-none">
                              {booking.guest_name || "Anonymous Guest"}
                            </h3>
                          </div>
                        </div>

                        {/* Booking Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex items-start gap-3">
                              <Calendar className="h-4 w-4 text-[#FF7F50] mt-1" />
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visit Date</p>
                                <p className="text-xs font-bold text-slate-700 uppercase">
                                  {new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                           </div>
                           <div className="flex items-start gap-3">
                              <Users className="h-4 w-4 text-[#FF7F50] mt-1" />
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacity</p>
                                <p className="text-xs font-bold text-slate-700 uppercase">{booking.slots_booked || 1} Person(s)</p>
                              </div>
                           </div>
                        </div>

                        {/* Financials */}
                        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col justify-center border border-slate-100">
                          <div className="flex justify-between items-center">
                            <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Revenue</p>
                               <p className="text-xl font-black text-[#FF0000]">KSh {booking.total_amount}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Method</p>
                               <div className="flex items-center gap-1.5 text-slate-600">
                                  <CreditCard className="h-3 w-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-tight">{booking.payment_method || "Stripe"}</span>
                               </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Contact & Technical Info */}
                      <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-6">
                        {booking.guest_email && (
                          <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2 group">
                            <div className="p-2 rounded-xl bg-[#008080]/10 group-hover:bg-[#008080] transition-colors">
                              <Mail className="h-3.5 w-3.5 text-[#008080] group-hover:text-white" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-[#008080]">{booking.guest_email}</span>
                          </a>
                        )}
                        {booking.guest_phone && (
                          <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2 group">
                            <div className="p-2 rounded-xl bg-[#008080]/10 group-hover:bg-[#008080] transition-colors">
                              <Phone className="h-3.5 w-3.5 text-[#008080] group-hover:text-white" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-[#008080]">{booking.guest_phone}</span>
                          </a>
                        )}
                      </div>

                      {/* JSON Details Toggle Area */}
                      {booking.booking_details && (
                        <div className="mt-6">
                          <details className="group">
                            <summary className="list-none cursor-pointer flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#FF7F50] transition-colors">
                              View Extended Metadata [+]
                            </summary>
                            <pre className="mt-4 text-[10px] bg-slate-900 text-slate-300 p-4 rounded-2xl overflow-auto border border-slate-800 shadow-inner max-h-48 leading-relaxed">
                              {JSON.stringify(booking.booking_details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminBookings;