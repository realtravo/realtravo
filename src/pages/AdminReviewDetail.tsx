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
  ArrowLeft, CheckCircle2, XCircle, Zap, 
  Tag, Users, Info, Baby
} from "lucide-react";
import { approvalStatusSchema } from "@/lib/validation";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000"
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

  // Logic to determine if this is an adventure place
  const isAdventurePlace = type === "adventure" || type === "adventure_place";

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) { navigate("/auth"); return; }
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
    checkAdminStatus();
  }, [user, navigate, toast]);

  const fetchItemDetails = async () => {
    try {
      let tableName = isAdventurePlace ? "adventure_places" : (type === "hotel" ? "hotels" : "trips");
      const { data, error } = await supabase.from(tableName).select("*").eq("id", id).maybeSingle();
      if (error) throw error;

      if (!data) {
        toast({ title: "Item not found", variant: "destructive" });
        navigate("/admin");
        return;
      }
      
      setItem({ ...data, type, tableName });

      if (data.created_by) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.created_by).maybeSingle();
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
      const { error } = await supabase.from(item.tableName).update({
        approval_status: validatedStatus,
        approved_by: validatedStatus === "approved" ? user?.id : null,
        approved_at: validatedStatus === "approved" ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: `Item ${status} successfully` });
      navigate("/admin");
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  if (loading || !isAdmin || !item) return <div className="min-h-screen bg-[#F8F9FA] animate-pulse" />;

  const displayImages = [item.image_url, ...(item.gallery_images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32">
      <Header className="hidden md:block" />

      {/* --- HERO SECTION --- */}
      <div className="relative w-full h-[45vh] overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0 hover:bg-black/50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex gap-2">
            <Badge className="bg-[#FF7F50] text-white border-none px-4 py-1.5 h-auto uppercase font-black tracking-widest text-[10px] rounded-full shadow-lg">
              {type?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {displayImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-6 right-6 z-40">
           <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white drop-shadow-2xl">
            {item.name || item.location_name}
          </h1>
          <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-2">
            <MapPin className="inline h-3 w-3 mr-1" /> {item.place}, {item.country}
          </p>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-8 relative z-50">
        <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          <div className="space-y-6">
            {/* BUSINESS IDENTITY & CONTACT */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.TEAL }}>Identity & Contact</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Mail className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                    <p className="text-xs font-black">{item.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Phone className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">WhatsApp</p>
                    <p className="text-xs font-black">{item.phone_numbers?.[0] || item.phone_number || "N/A"}</p>
                  </div>
                </div>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
            </div>

            {/* ADVENTURE DETAILS: SCHEDULE & OFFERINGS */}
            {isAdventurePlace && (
              <>
                <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                  <h2 className="text-xl font-black uppercase tracking-tight mb-5" style={{ color: COLORS.TEAL }}>Operation Schedule</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Hours</p>
                        <p className="text-sm font-black uppercase">{item.opening_hours} — {item.closing_hours}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Open Days</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.days_opened?.map((day: string) => (
                            <Badge key={day} className="text-[8px] font-black bg-white border-slate-200 text-slate-600">{day}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                  <h2 className="text-xl font-black uppercase tracking-tight mb-6" style={{ color: COLORS.KHAKI_DARK }}>Detailed Offerings</h2>
                  
                  <div className="space-y-8">
                    {item.activities?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                          <Zap className="h-3 w-3" /> Activities
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.activities.map((act: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                              <span className="text-xs font-black uppercase text-indigo-900">{act.name}</span>
                              <Badge className="bg-indigo-600 text-white text-[9px]">{act.is_free ? "FREE" : `KSh ${act.price}`}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.facilities?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                          <Users className="h-3 w-3" /> Facilities
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {item.facilities.map((fac: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-black uppercase text-slate-800">{fac.name}</span>
                                <span className="text-[10px] font-black text-teal-600">{fac.is_free ? "FREE" : `KSh ${fac.price}`}</span>
                              </div>
                              {fac.capacity && <p className="text-[9px] font-bold text-slate-400 uppercase italic">Capacity: {fac.capacity} Pax</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.amenities?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" /> Ground Amenities
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {item.amenities.map((am: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 font-black uppercase text-[9px] py-1 px-3">
                              {typeof am === 'string' ? am : am.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              
              {/* ENTRANCE FEES - ONLY SHOW IF ADVENTURE PLACE */}
              {isAdventurePlace && (
                <div className="mb-8 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrance Fees</p>
                  
                  {item.entry_fee_type === 'free' ? (
                    <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                      <p className="text-sm font-black text-green-700 uppercase">Free Admission</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-teal-600" />
                          <span className="text-[10px] font-black uppercase text-slate-500">Adult</span>
                        </div>
                        <span className="text-lg font-black text-red-600">KSh {item.entry_fee || item.price_adult || 0}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Baby className="h-4 w-4 text-teal-600" />
                          <span className="text-[10px] font-black uppercase text-slate-500">Child</span>
                        </div>
                        <span className="text-lg font-black text-red-600">KSh {item.price_child || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 mb-8">
                 <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                   <div className="flex items-center gap-2">
                     <Tag className="h-4 w-4 text-teal-600" />
                     <span className="text-[10px] font-black uppercase text-slate-500">Reg. No</span>
                   </div>
                   <span className="text-xs font-black text-slate-800 tracking-tighter">{item.registration_number || "PENDING"}</span>
                 </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3">
                <Button 
                  onClick={() => updateApprovalStatus("approved")}
                  disabled={item.approval_status === "approved"}
                  className="w-full py-7 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl bg-teal-600 hover:bg-teal-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Listing
                </Button>

                <Button 
                  variant="ghost"
                  onClick={() => updateApprovalStatus("rejected")}
                  className="w-full py-4 text-xs font-black uppercase text-red-500 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject Listing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

export default AdminReviewDetail;