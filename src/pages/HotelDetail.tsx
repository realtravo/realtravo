import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Phone, Share2, Mail, Clock, ArrowLeft, 
  Heart, Copy, Star, CheckCircle2, BedDouble, Zap, Calendar 
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  ORANGE: "#FF9800",
  SOFT_GRAY: "#F8F9FA"
};

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { position, requestLocation } = useGeolocation();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const distance = position && hotel?.latitude && hotel?.longitude
    ? calculateDistance(position.latitude, position.longitude, hotel.latitude, hotel.longitude)
    : undefined;

  useEffect(() => {
    if (id) fetchHotel();
    requestLocation();
  }, [id]);

  const fetchHotel = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("hotels").select("*").eq("id", id).single();
      if (error) throw error;
      setHotel(data);
    } catch (error) {
      toast({ title: "Hotel not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  // Logic to find the cheapest price across all options
  const getCheapestPrice = () => {
    if (!hotel) return 0;
    const allPrices = [
      ...(hotel.facilities || []).map((f: any) => f.price),
      ...(hotel.activities || []).map((a: any) => a.price)
    ].filter(p => p !== undefined && p !== null);
    
    return allPrices.length > 0 ? Math.min(...allPrices) : 0;
  };

  const handleSave = () => id && handleSaveItem(id, "hotel");

  const handleCopyLink = async () => {
    if (!hotel) return;
    const refLink = await generateReferralLink(hotel.id, "hotel", hotel.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const handleShare = async () => {
    if (!hotel) return;
    const refLink = await generateReferralLink(hotel.id, "hotel", hotel.id);
    if (navigator.share) {
      try { await navigator.share({ title: hotel.name, url: refLink }); } catch (e) {}
    } else { handleCopyLink(); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${hotel?.name}, ${hotel?.location}`);
    window.open(hotel?.map_link || `https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!hotel) return;
    setIsProcessing(true);
    try {
      await submitBooking({
        itemId: hotel.id, itemName: hotel.name, bookingType: 'hotel', totalAmount: 0, 
        slotsBooked: data.num_adults + data.num_children, visitDate: data.visit_date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: hotel.created_by, bookingDetails: { ...data, hotel_name: hotel.name }
      });
      setIsCompleted(true);
      setBookingOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 animate-pulse" />;
  if (!hotel) return null;

  const allImages = [hotel.image_url, ...(hotel.gallery_images || []), ...(hotel.images || [])].filter(Boolean);
  const minPrice = getCheapestPrice();

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Image Section */}
      <div className="relative w-full overflow-hidden h-[50vh] md:h-[60vh]">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0 hover:bg-black/50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={handleSave} className={`rounded-full backdrop-blur-md border-none w-10 h-10 p-0 shadow-lg transition-colors ${isSaved ? "bg-red-500" : "bg-black/30 hover:bg-black/50"}`}>
            <Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} />
          </Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <div className="relative h-full w-full">
                  <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-10 left-0 z-40 w-full md:w-3/4 lg:w-1/2 p-8 pointer-events-none">
          <div className="absolute inset-0 z-0 opacity-80" style={{ background: `radial-gradient(circle at 20% 50%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 85%)`, filter: 'blur(15px)', marginLeft: '-20px' }} />
          
          <div className="relative z-10 space-y-4 pointer-events-auto">
            <Button className="bg-[#FF7F50] hover:bg-[#FF7F50] border-none px-4 py-1.5 h-auto uppercase font-black tracking-[0.15em] text-[10px] rounded-full shadow-lg text-white">
              Premium Hotel
            </Button>
            
            <div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white drop-shadow-2xl mb-3">
                {hotel.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 cursor-pointer group w-fit" onClick={openInMaps}>
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl group-hover:bg-[#008080] transition-all duration-300">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#FF7F50] uppercase tracking-widest">Location</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider group-hover:text-[#008080] transition-colors">
                      {hotel.location}, {hotel.country}
                    </span>
                    {distance && (
                      <Badge className="bg-[#008080]/80 text-white text-[9px] px-2 py-0 h-4 font-black border-none">
                        {(distance).toFixed(1)}KM AWAY
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-10 relative z-50">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          {/* 1. DESCRIPTION (Top on Mobile) */}
          <div className="order-1 lg:order-none bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
            <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>Description</h2>
            <p className="text-slate-500 text-sm leading-relaxed">{hotel.description}</p>
          </div>

          {/* 2. PRICE CARD (Middle on Mobile, Right on Desktop) */}
          <div className="order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting Price</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: COLORS.RED }}>
                      KSh {minPrice}
                    </span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase">/ night</span>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: COLORS.TEAL }} />
                  <span className="text-xs font-black text-slate-600 uppercase">Available</span>
                </div>
              </div>

              {/* SCHEDULE SECTION */}
              <div className="space-y-4 mb-8 bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>Working Days</span>
                  </div>
                  <span className="text-slate-700">{hotel.working_days || 'Mon - Sun'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>Opens</span>
                  </div>
                  <span className="text-slate-700">{hotel.opening_hours || '12:00 PM'}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>Closes</span>
                  </div>
                  <span className="text-slate-700">{hotel.closing_hours || '10:00 AM'}</span>
                </div>
              </div>

              <Button 
                onClick={() => setBookingOpen(true)}
                className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl border-none mb-6 transition-transform active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`,
                boxShadow: `0 12px 24px -8px ${COLORS.TEAL}88` }}
              >
                Reserve Now
              </Button>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
                <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
                <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inquiries</h3>
                {hotel.phone_numbers?.map((phone: string, idx: number) => (
                  <a key={idx} href={`tel:${phone}`} className="flex items-center gap-3 text-slate-600 hover:text-[#008080] transition-colors">
                    <Phone className="h-4 w-4 text-[#008080]" />
                    <span className="text-xs font-bold uppercase tracking-tight">{phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* 3. DETAILS SECTION (Bottom on Mobile, Left on Desktop) */}
          <div className="order-3 lg:col-start-1 space-y-6">
            {hotel.facilities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-teal-50">
                    <BedDouble className="h-5 w-5 text-[#008080]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Accommodations</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Room Types</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hotel.facilities.map((f: any, i: number) => (
                    <div key={i} className="group p-5 rounded-[22px] bg-slate-50 border border-slate-100 hover:border-[#008080]/30 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-black uppercase tracking-tight text-slate-700">{f.name}</span>
                        <Badge className="bg-white text-[#008080] border-[#008080]/20 text-[10px] font-black">
                          {f.price === 0 ? "FREE" : `KSH ${f.price}`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                        <span>Capacity: <span className="text-slate-600">{f.capacity || 'N/A'} Guests</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hotel.activities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-orange-50">
                    <Zap className="h-5 w-5 text-[#FF9800]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.ORANGE }}>Experiences</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leisure & Fun</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {hotel.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">{act.name}</span>
                        <span className="text-[10px] font-bold text-[#FF9800]">{act.price === 0 ? "Complimentary" : `KSh ${act.price} / person`}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hotel.amenities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-red-50">
                    <CheckCircle2 className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.RED }}>Amenities</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comforts Provided</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotel.amenities.map((item: string, i: number) => (
                    <div key={i} className="group flex items-center gap-2 bg-red-50/50 px-4 py-2.5 rounded-2xl border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[11px] font-black text-red-700 uppercase tracking-wide">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* REVIEWS & SIMILAR ITEMS */}
        <div className="mt-12 bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Guest Reviews</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authentic Community Feedback</p>
              </div>
              <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                <Star className="h-4 w-4 fill-[#FF7F50] text-[#FF7F50]" />
                <span className="text-lg font-black" style={{ color: COLORS.TEAL }}>4.8</span>
              </div>
            </div>
            <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>

        <div className="mt-16">
            <SimilarItems currentItemId={hotel.id} itemType="hotel" country={hotel.country} />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} 
            facilities={hotel.facilities || []} 
            activities={hotel.activities || []} 
            isProcessing={isProcessing} 
            isCompleted={isCompleted} 
            itemName={hotel.name}
            itemId={hotel.id}
            bookingType="hotel"
            hostId={hotel.created_by || ""}
            onPaymentSuccess={() => setIsCompleted(true)}
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100 flex-1">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default HotelDetail;