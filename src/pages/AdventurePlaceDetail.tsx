import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Clock, ArrowLeft, Heart, Copy, Share2, Star, Tent, Zap, ShieldCheck 
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
  ORANGE: "#FF9800"
};

const AdventurePlaceDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestLocation } = useGeolocation();
  
  const [place, setPlace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [liveRating, setLiveRating] = useState({ avg: 0, count: 0 });

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      let { data, error } = await supabase.from("adventure_places").select("*").eq("id", id).single();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading adventure details...</p>
        </div>
      </div>
    );
  }
  
  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground mb-2">Adventure place not found</p>
          <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        </div>
      </div>
    );
  }

  const allImages = [place.image_url, ...(place.gallery_images || []), ...(place.images || [])].filter(Boolean);
  const amenitiesList = Array.isArray(place.amenities) ? place.amenities : place.amenities?.split(',').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      
      {/* 1. SCROLL FIXED BAR */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 bg-slate-100 text-slate-900 border-none">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 truncate max-w-[200px]">
            {place.name}
          </h2>
        </div>
        <Button 
          onClick={() => id && handleSaveItem(id, "adventure_place")} 
          className={`rounded-full w-10 h-10 p-0 border-none shadow-md ${isSaved ? "bg-red-500 text-white" : "bg-slate-100 text-slate-900"}`}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>

      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* 2. IMAGE GALLERY */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          
          {/* GALLERY BUTTONS (Visible only at top) */}
          <div className={`absolute top-4 left-4 right-4 z-50 flex justify-between items-center transition-opacity duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
            <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 border-none bg-black/40 text-white backdrop-blur-md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => id && handleSaveItem(id, "adventure_place")} 
              className={`rounded-full w-10 h-10 p-0 border-none shadow-lg backdrop-blur-md ${isSaved ? "bg-red-500 text-white" : "bg-black/40 text-white"}`}
            >
              <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

          <Carousel plugins={[Autoplay({ delay: 4000 })]} className="w-full h-full">
            <CarouselContent className="h-full ml-0">
              {allImages.map((img, idx) => (
                <CarouselItem key={idx} className="h-full pl-0 basis-full">
                  <div className="relative h-full w-full">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* NAME OVERLAY WITH RGBA GRADIENT FADE */}
          <div className="absolute bottom-0 left-0 z-40 w-full p-6 pb-8">
            <div className="max-w-xl bg-gradient-to-r from-black/70 via-black/40 to-transparent rounded-2xl p-5 backdrop-blur-[2px]">
              <div className="flex gap-2 mb-2">
                <Badge className="bg-amber-400 text-black border-none text-[9px] font-black uppercase rounded-full px-2 py-0.5">
                  <Star className="h-3 w-3 fill-current mr-1" /> {liveRating.avg || "New"}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight mb-1">
                {place.name}
              </h1>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/80" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                  {[place.location, place.country].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONTENT GRID */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">{place.description || "none"}</p>
            </section>
            
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-black uppercase tracking-tight text-red-600">Amenities</h2>
              </div>
              {amenitiesList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {amenitiesList.map((item: string, i: number) => (
                    <div key={i} className="bg-red-50/50 px-4 py-2 rounded-2xl border border-red-100">
                      <span className="text-[11px] font-medium text-red-700 lowercase">{item.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm italic">none</p>}
            </section>

            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <Tent className="h-5 w-5 text-[#008080]" />
                <h2 className="text-xl font-black uppercase tracking-tight text-[#008080]">Facilities</h2>
              </div>
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
          </div>

          <div className="lg:sticky lg:top-24 h-fit">
            <PriceCard place={place} liveRating={liveRating} navigate={navigate} />
          </div>
        </div>

        <div className="mt-12 bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
          <ReviewSection itemId={place.id} itemType="adventure_place" />
        </div>
        <div className="mt-16">
          <SimilarItems currentItemId={place.id} itemType="adventure" country={place.country} />
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const PriceCard = ({ place, liveRating, navigate }: any) => (
  <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
    <div className="flex justify-between items-end mb-8">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrance Fee</p>
        <span className="text-4xl font-black text-red-600">
          {place.entry_fee === 0 ? "FREE" : `KSh ${place.entry_fee}`}
        </span>
      </div>
      <div className="flex items-center gap-1 text-amber-500 font-black text-lg">
        <Star className="h-4 w-4 fill-current" />{liveRating.avg}
      </div>
    </div>
    <Button 
      onClick={() => navigate(`/booking/adventure_place/${place.id}`)}
      className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none mb-6 transition-all active:scale-95" 
      style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
    >
      Book Adventure
    </Button>
    <div className="grid grid-cols-3 gap-3">
      <UtilityBtn icon={<MapPin className="h-5 w-5" />} label="Map" />
      <UtilityBtn icon={<Copy className="h-5 w-5" />} label="Copy" />
      <UtilityBtn icon={<Share2 className="h-5 w-5" />} label="Share" />
    </div>
  </div>
);

const UtilityBtn = ({ icon, label }: any) => (
  <Button variant="ghost" className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default AdventurePlaceDetail;