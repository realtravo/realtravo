import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { MapPin, Share2, Heart, Calendar, Copy, CheckCircle2, ArrowLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SimilarItems } from "@/components/SimilarItems";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
};

const EventDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (id) fetchEvent();
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) trackReferralClick(refSlug, id, "event", "booking");
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("trips").select("*").eq("id", id).eq("type", "event").single();
      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase.from("trips").select("*").ilike("id", `${id}%`).eq("type", "event").single();
        if (!prefixError) { data = prefixData; error = null; }
      }
      if (error) throw error;
      setEvent(data);
    } catch (error) {
      toast({ title: "Event not found", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => id && handleSaveItem(id, "event");
  const handleCopyLink = async () => {
    if (!event) return;
    const refLink = await generateReferralLink(event.id, "event", event.id);
    await navigator.clipboard.writeText(refLink);
    toast({ title: "Link Copied!" });
  };

  const handleShare = async () => {
    if (!event) return;
    const refLink = await generateReferralLink(event.id, "event", event.id);
    if (navigator.share) {
      try { await navigator.share({ title: event.name, url: refLink }); } catch (e) {}
    } else { handleCopyLink(); }
  };

  const openInMaps = () => {
    const query = encodeURIComponent(`${event?.name}, ${event?.location}`);
    window.open(event?.map_link || `https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!event) return;
    setIsProcessing(true);
    try {
      const totalAmount = (data.num_adults * event.price) + (data.num_children * (event.price_child || 0));
      await submitBooking({
        itemId: event.id, itemName: event.name, bookingType: 'event', totalAmount,
        slotsBooked: data.num_adults + data.num_children, visitDate: event.date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: event.created_by, bookingDetails: { ...data, event_name: event.name }
      });
      setIsCompleted(true);
      setShowBooking(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 animate-pulse" />;
  if (!event) return null;

  const allImages = [event?.image_url, ...(event?.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Image Section */}
      <div className="relative w-full overflow-hidden h-[45vh] md:h-[55vh]">
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/30 backdrop-blur-md text-white border-none w-10 h-10 p-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={handleSave} className={`rounded-full backdrop-blur-md border-none w-10 h-10 p-0 shadow-lg ${isSaved ? "bg-red-500" : "bg-black/30"}`}>
            <Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} />
          </Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
          <CarouselContent className="h-full">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full">
                <div className="relative h-full w-full">
                  <img src={img} alt={event.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-8 left-6 right-6 text-white">
          <Badge className="bg-[#FF7F50] hover:bg-[#FF7F50] border-none px-3 py-1 mb-3 uppercase font-black tracking-widest text-[10px]">Upcoming Event</Badge>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none drop-shadow-xl mb-2">
            {event.name}
          </h1>
          <div className="flex items-center gap-2 opacity-90">
            <MapPin className="h-4 w-4 text-[#FF7F50]" />
            <span className="text-sm font-bold uppercase tracking-wider">{event.location}</span>
          </div>
        </div>
      </div>

      <main className="container px-4 max-w-6xl mx-auto -mt-6 relative z-40">
        <div className="grid lg:grid-cols-[1.7fr,1fr] gap-6">
          
          {/* Main Content Column */}
          <div className="space-y-6">
            {/* About Card */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4" style={{ color: COLORS.TEAL }}>About</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{event.description}</p>
            </div>

            {/* Highlights Card */}
            {event.activities?.length > 0 && (
              <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
                <h2 className="text-xl font-black uppercase tracking-tight mb-5" style={{ color: COLORS.TEAL }}>Highlights</h2>
                <div className="flex flex-wrap gap-2">
                  {event.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-[#F0E68C]/20 px-4 py-2.5 rounded-2xl border border-[#F0E68C]/50">
                      <CheckCircle2 className="h-4 w-4 text-[#857F3E]" />
                      <span className="text-[11px] font-black text-[#857F3E] uppercase tracking-wide">{act.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar Column */}
          <div className="space-y-4">
            <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100 lg:sticky lg:top-24">
              
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pricing Starts at</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: COLORS.TEAL }}>KSh {event.price}</span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">/ adult</span>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4" style={{ color: COLORS.CORAL }} />
                  <span className="text-xs font-black text-slate-600 uppercase">
                    {new Date(event.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-400">Child (Under 12)</span>
                  <span className="text-slate-700">KSh {event.price_child || 0}</span>
                </div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-400">Availability</span>
                  <span className={event.available_tickets > 0 ? "text-green-600" : "text-red-500"}>
                    {event.available_tickets > 0 ? `${event.available_tickets} slots left` : "Sold Out"}
                  </span>
                </div>
              </div>

              <Button 
                onClick={() => setShowBooking(true)}
                disabled={event.available_tickets <= 0}
                className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all active:scale-95 border-none"
                style={{ 
                    background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)`,
                    boxShadow: `0 12px 24px -8px ${COLORS.CORAL}88`
                }}
              >
                {event.available_tickets <= 0 ? "Fully Booked" : "Reserve Spot"}
              </Button>

              <div className="grid grid-cols-3 gap-3 mt-8">
                <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={openInMaps} />
                <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopyLink} />
                <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={handleShare} />
              </div>
            </div>
          </div>
            {/* STYLED REVIEW CARD */}
            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Guest Ratings</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Community Feedback</p>
                </div>
                {event.average_rating > 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <Star className="h-4 w-4 fill-[#FF7F50] text-[#FF7F50]" />
                    <span className="text-lg font-black" style={{ color: COLORS.TEAL }}>{event.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              <div className="min-h-[100px]">
                <ReviewSection itemId={event.id} itemType="event" />
              </div>
            </div>
        </div>

        <div className="mt-16">
           <SimilarItems currentItemId={event.id} itemType="trip" location={event.location} country={event.country} />
        </div>
      </main>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} activities={event.activities || []} 
            priceAdult={event.price} priceChild={event.price_child} 
            isProcessing={isProcessing} isCompleted={isCompleted} 
            itemName={event.name} skipDateSelection={true} fixedDate={event.date} 
            skipFacilitiesAndActivities={true} itemId={event.id} bookingType="event" 
            hostId={event.created_by || ""} onPaymentSuccess={() => setIsCompleted(true)} 
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};

const UtilityButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F0E68C]/10 text-[#857F3E] rounded-2xl hover:bg-[#F0E68C]/30 transition-colors border border-[#F0E68C]/20">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default EventDetail;