import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Clock, ArrowLeft, Heart, Copy, Share2, Star, Tent, Zap, Calendar, Circle, ShieldCheck
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
  ORANGE: "#FF9800",
  SOFT_GRAY: "#F8F9FA"
};

const AdventurePlaceDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestLocation } = useGeolocation();
  
  const [place, setPlace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOpenNow, setIsOpenNow] = useState(false);
  const [liveRating, setLiveRating] = useState({ avg: 0, count: 0 });

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    if (id) {
      fetchPlace();
      fetchLiveRating();
    }
    requestLocation();
    window.scrollTo(0, 0);
  }, [id, slug]);

  const fetchPlace = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase
        .from("adventure_places")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setPlace(data);
    } catch (error) {
      toast({ title: "Place not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchLiveRating = async () => {
    if (!id) return;
    const { data } = await supabase.from("reviews").select("rating").eq("item_id", id);
    if (data && data.length > 0) {
      const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
      setLiveRating({ avg: parseFloat(avg.toFixed(1)), count: data.length });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!place) return null;

  const allImages = [place.image_url, ...(place.gallery_images || []), ...(place.images || [])].filter(Boolean);
  const amenitiesList = Array.isArray(place.amenities) ? place.amenities : place.amenities?.split(',').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* IMAGE GALLERY - Restricted to Content Width */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
            <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 bg-black/30 backdrop-blur-md hover:bg-black/50 border-none">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
            <Button onClick={() => id && handleSaveItem(id, "adventure_place")} className={`rounded-full w-10 h-10 p-0 border-none shadow-lg ${isSaved ? "bg-red-500" : "bg-black/30 backdrop-blur-md"}`}>
              <Heart className={`h-5 w-5 ${isSaved ? "fill-white text-white" : "text-white"}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="absolute bottom-6 left-6 z-40">
            <div className="flex gap-2 mb-2">
              <Badge className="bg-amber-400 text-black border-none text-[9px] font-black uppercase rounded-full px-2 py-0.5"><Star className="h-3 w-3 fill-current mr-1" /> {liveRating.avg || "New"}</Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">{place.name}</h1>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            {/* Description */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">{place.description}</p>
            </section>
            
            {/* Amenities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6"><ShieldCheck className="h-5 w-5 text-red-600" /><h2 className="text-xl font-black uppercase tracking-tight text-red-600">Amenities</h2></div>
              {amenitiesList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-red-50/50 px-4 py-2 rounded-2xl border border-red-100">
                      <span className="text-[11px] font-medium text-red-700 lowercase">{item.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm italic">none</p>}
            </section>

            {/* Facilities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6"><Tent className="h-5 w-5 text-[#008080]" /><h2 className="text-xl font-black uppercase tracking-tight text-[#008080]">Facilities</h2></div>
              {place.facilities?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {place.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-4 rounded-[22px] bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <span className="text-sm font-medium lowercase text-slate-700">{f.name}</span>
                      <Badge className="bg-white text-[#008080] text-[10px] font-black border border-slate-100">KSH {f.price}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm italic">none</p>}
            </section>

            {/* Activities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6"><Zap className="h-5 w-5 text-[#FF9800]" /><h2 className="text-xl font-black uppercase tracking-tight text-[#FF9800]">Activities</h2></div>
              {place.activities?.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {place.activities.map((act: any, i: number) => (
                    <div key={i} className="px-5 py-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center gap-3">
                      <span className="text-[11px] font-medium text-slate-700 lowercase">{act.name}</span>
                      <span className="text-[10px] font-bold text-[#FF9800]">KSh {act.price}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm italic">none</p>}
            </section>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:sticky lg:top-6 h-fit">
            <PriceCardComponent entryPrice={place.entry_fee || 0} liveRating={liveRating} place={place} navigate={navigate} />
          </div>
        </div>

        {/* Reviews & Similar */}
        <div className="mt-12 bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
          <ReviewSection itemId={place.id} itemType="adventure_place" />
        </div>
        <div className="mt-16">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 text-slate-800">Explore Similar Adventures</h2>
          <SimilarItems currentItemId={place.id} itemType="adventure" country={place.country} />
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const PriceCardComponent = ({ entryPrice, liveRating, place, navigate }: any) => (
  <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
    <div className="flex justify-between items-end mb-8">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrance Fee</p>
        <span className="text-4xl font-black text-red-600">{entryPrice === 0 ? "FREE" : `KSh ${entryPrice}`}</span>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end text-amber-500 font-black text-lg"><Star className="h-4 w-4 fill-current" />{liveRating.avg}</div>
      </div>
    </div>
    <Button onClick={() => navigate(`/booking/adventure_place/${place.id}`)} className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none mb-6" style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}>
      Book Adventure
    </Button>
    <div className="grid grid-cols-3 gap-3">
      <UtilityButton icon={<MapPin className="h-5 w-5" />} label="Map" onClick={() => {}} />
      <UtilityButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={() => {}} />
      <UtilityButton icon={<Share2 className="h-5 w-5" />} label="Share" onClick={() => {}} />
    </div>
  </div>
);

const UtilityButton = ({ icon, label, onClick }: any) => (
  <Button variant="ghost" onClick={onClick} className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default AdventurePlaceDetail;