import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, Mail, Phone, Calendar, User, Eye, Clock, 
  ArrowLeft, CheckCircle2, XCircle, 
  ShieldAlert, Zap, Info, Box
} from "lucide-react";
import { approvalStatusSchema } from "@/lib/validation";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

const AdminReviewDetail = () => {
  const { itemType: type, id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [item, setItem] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
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
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const hasAdminRole = roles?.some(r => r.role === "admin");
    if (!hasAdminRole) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
    setIsAdmin(true);
    fetchItemDetails();
  };

  const fetchItemDetails = async () => {
    try {
      let itemData: any = null;
      let tableName = "";

      if (type === "trip" || type === "event") {
        tableName = "trips";
        const { data } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
        itemData = data;
      } else if (type === "hotel") {
        tableName = "hotels";
        const { data } = await supabase.from("hotels").select("*").eq("id", id).maybeSingle();
        itemData = data;
      } else if (type === "adventure" || type === "adventure_place") {
        tableName = "adventure_places";
        const { data } = await supabase.from("adventure_places").select("*").eq("id", id).maybeSingle();
        itemData = data;
      }

      if (!itemData) {
        toast({ title: "Item not found", variant: "destructive" });
        navigate("/admin");
        return;
      }
      
      setItem({ ...itemData, type, tableName });

      if (itemData.created_by) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", itemData.created_by).maybeSingle();
        setCreator(profile);
      }
    } catch (error) {
      toast({ title: "Error loading item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateApprovalStatus = async (status: string) => {
    try {
      const validatedStatus = approvalStatusSchema.parse(status);
      const updateData = {
        approval_status: validatedStatus,
        approved_by: validatedStatus === "approved" ? user?.id : null,
        approved_at: validatedStatus === "approved" ? new Date().toISOString() : null,
        is_hidden: validatedStatus === "approved" ? false : item.is_hidden
      };

      const { error } = await supabase.from(item.tableName).update(updateData).eq("id", id);
      if (error) throw error;

      toast({ title: `Item ${status} successfully` });
      navigate("/admin");
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${item?.name || item?.location_name}, ${item?.location || item?.location_name}`);
    window.open(item?.map_link || item?.location_link || `https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  if (loading || !isAdmin) return <div className="min-h-screen bg-[#F8F9FA] animate-pulse" />;

  const displayImages = [
    item.image_url,
    ...(item.gallery_images || []),
    ...(item.images || []),
    ...(item.photo_urls || [])
  ].filter(Boolean);

  const isTripOrEvent = type === "trip" || type === "event";
  const isAdventurePlace = type === "adventure" || type === "adventure_place";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32">
      <Header className="hidden md:block" />

      {/* --- HERO IMAGE SECTION --- */}
      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0 hover:bg-black/50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Badge className="bg-[#FF7F50] text-white border-none px-4 py-1.5 h-auto uppercase font-black tracking-widest text-[10px] rounded-full shadow-lg">
              {type?.toUpperCase()}
            </Badge>
            <Badge className={`border-none px-4 py-1.5 h-auto uppercase font-black tracking-widest text-[10px] rounded-full shadow-lg ${
              item.approval_status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'
            }`}>
              {item.approval_status}
            </Badge>
          </div>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {displayImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <div className="relative h-full w-full">
                  <img src={img} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-6 left-6 z-40">
           <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
            {item.name || item.location_name}
          </h1>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-8 relative z-50">
        <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          <div className="space-y-6">
            {/* Description Card */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>Description Review</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{item.description || "No description provided."}</p>
            </div>

            {/* --- ADVENTURE PLACE SPECIFIC: SCHEDULE & HOURS --- */}
            {isAdventurePlace && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-5" style={{ color: COLORS.CORAL }}>Operating Schedule</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Clock className="h-5 w-5" style={{ color: COLORS.CORAL }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Hours</p>
                      <p className="text-xs font-black text-slate-800">
                        {item.opening_hours || item.opening_time || "Not Provided"} - {item.closing_hours || item.closing_time || ""}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Calendar className="h-5 w-5" style={{ color: COLORS.CORAL }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operating Days</p>
                      <p className="text-xs font-black text-slate-800">
                        {Array.isArray(item.days_opened) ? item.days_opened.join(", ") : (item.working_days || "Not Provided")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- ADVENTURE PLACE SPECIFIC: OFFERINGS --- */}
            {isAdventurePlace && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Offerings & Infrastructure</h2>
                
                <div className="space-y-6">
                  {/* Activities */}
                  {item.activities?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Activities</p>
                      <div className="flex flex-wrap gap-2">
                        {item.activities.map((act: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-[#6366f1]/10 px-3 py-2 rounded-xl border border-[#6366f1]/20">
                            <Zap className="h-3.5 w-3.5 text-[#6366f1]" />
                            <span className="text-[10px] font-black text-[#6366f1] uppercase">{typeof act === 'string' ? act : act.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Facilities */}
                  {item.facilities?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Facilities</p>
                      <div className="flex flex-wrap gap-2">
                        {item.facilities.map((fac: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-[#FF7F50]/10 px-3 py-2 rounded-xl border border-[#FF7F50]/20">
                            <Box className="h-3.5 w-3.5 text-[#FF7F50]" />
                            <span className="text-[10px] font-black text-[#FF7F50] uppercase">{typeof fac === 'string' ? fac : fac.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amenities */}
                  {item.amenities?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Amenities</p>
                      <div className="flex flex-wrap gap-2">
                        {item.amenities.map((amenity: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-teal-50 px-3 py-2 rounded-xl border border-teal-100">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                            <span className="text-[10px] font-black text-teal-700 uppercase">{typeof amenity === 'string' ? amenity : amenity.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trip/Event Contacts */}
            {isTripOrEvent && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.CORAL }}>Direct Listing Contacts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Mail className="h-5 w-5" style={{ color: COLORS.TEAL }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listing Email</p>
                      <p className="text-xs font-black text-slate-800">{item.email || "Not Provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                      <Phone className="h-5 w-5" style={{ color: COLORS.TEAL }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listing Phone</p>
                      <p className="text-xs font-black text-slate-800">{item.phone_number || item.phoneNumber || "Not Provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Creator Info */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-slate-100">
                        <User className="h-6 w-6 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Details</p>
                        <h3 className="text-sm font-black uppercase text-slate-800">{creator?.full_name || creator?.name || "Unknown Creator"}</h3>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 text-slate-600">
                        <Mail className="h-4 w-4 text-[#008080]" />
                        <span className="text-xs font-bold truncate">{creator?.email || "No Account Email"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                        <Phone className="h-4 w-4 text-[#008080]" />
                        <span className="text-xs font-bold">{creator?.phone_number || "No Account Phone"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                        <MapPin className="h-4 w-4 text-[#FF7F50]" />
                        <span className="text-xs font-bold">{creator?.country || item?.country || "No Country"}</span>
                    </div>
                </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              
              <div className="mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pricing / Fee</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black" style={{ color: COLORS.RED }}>
                    KSh {item.price || item.entry_fee || item.price_adult || 0}
                  </span>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">/ unit</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" style={{ color: COLORS.TEAL }} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">Location</span>
                  </div>
                  <span className="text-xs font-black uppercase text-slate-700">{item.location || item.location_name}</span>
                </div>

                {item.date && (
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" style={{ color: COLORS.CORAL }} />
                      <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">Scheduled</span>
                    </div>
                    <span className="text-xs font-black uppercase text-slate-700">
                      {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                <Button variant="ghost" onClick={openInMaps} className="flex-col h-auto py-3 bg-[#F0E68C]/10 text-[#857F3E] rounded-2xl border border-[#F0E68C]/20">
                  <MapPin className="h-4 w-4 mb-1" />
                  <span className="text-[9px] font-black uppercase">View Map</span>
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={() => window.open(`/${type}/${id}`, '_blank')}
                    className="flex-col h-auto py-3 bg-slate-100 text-slate-600 rounded-2xl border border-slate-200"
                >
                  <Eye className="h-4 w-4 mb-1" />
                  <span className="text-[9px] font-black uppercase">Live View</span>
                </Button>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => updateApprovalStatus("approved")}
                  disabled={item.approval_status === "approved"}
                  className="w-full py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none"
                  style={{ 
                    background: item.approval_status === 'approved' ? '#94a3b8' : `linear-gradient(135deg, #2dd4bf 0%, ${COLORS.TEAL} 100%)`,
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Entry
                </Button>

                {item.approval_status !== "approved" && (
                   <Button 
                    variant="ghost"
                    onClick={() => updateApprovalStatus("rejected")}
                    className="w-full py-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Submission
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Admin Badge for Mobile */}
      <div className="fixed bottom-24 left-4 right-4 md:hidden z-[100]">
        <div className="bg-black/90 backdrop-blur-xl p-4 rounded-3xl flex items-center justify-between border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-xl">
                    <ShieldAlert className="h-4 w-4 text-black" />
                </div>
                <div>
                    <p className="text-[8px] font-black text-white/50 uppercase">Admin Mode</p>
                    <p className="text-[10px] font-black text-white uppercase">{item.approval_status}</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" onClick={() => updateApprovalStatus("approved")} className="bg-teal-500 h-8 rounded-xl text-[10px] font-black">APPROVE</Button>
                <Button size="sm" variant="destructive" onClick={() => updateApprovalStatus("rejected")} className="h-8 rounded-xl text-[10px] font-black">REJECT</Button>
            </div>
        </div>
      </div>

      <MobileBottomBar />
    </div>
  );
};

export default AdminReviewDetail;