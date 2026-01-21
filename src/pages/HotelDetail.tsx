import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Share2, ArrowLeft, Heart, Copy, Star, Zap, ShieldCheck, Coffee, Wifi
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { extractIdFromSlug } from "@/lib/slugUtils";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  RED: "#FF0000",
};

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) fetchHotel();
  }, [id]);

  const fetchHotel = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("hotels").select("*").eq("id", id).single();
      if (error) throw error;
      setHotel(data);
    } catch (error) {
      toast({ title: "Hotel not found", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!hotel) return null;

  const allImages = [hotel.image_url, ...(hotel.gallery_images || []), ...(hotel.images || [])].filter(Boolean);
  const amenitiesList = Array.isArray(hotel.amenities) ? hotel.amenities : hotel.amenities?.split(',').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 pt-6">
      
      {/* 1. SCROLL FIXED BAR */}
      <div 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-4 py-3 flex justify-between items-center bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 ${
          scrolled ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 bg-slate-100 text-slate-900 border-none shadow-sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 truncate max-w-[200px]">
            {hotel.name}
          </h2>
        </div>
        <Button 
          onClick={() => id && handleSaveItem(id, "hotel")} 
          className={`rounded-full w-10 h-10 p-0 border-none shadow-md ${isSaved ? "bg-red-500 text-white" : "bg-slate-100 text-slate-900"}`}
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>

      <main className="container px-4 max-w-6xl mx-auto">
        
        {/* 2. IMAGE GALLERY (Contained) */}
        <div className="relative w-full h-[45vh] md:h-[60vh] bg-slate-900 overflow-hidden rounded-[32px] shadow-xl mb-8">
          
          {/* STATIC BUTTONS (Top of Image) */}
          <div className={`absolute top-4 left-4 right-4 z-50 flex justify-between items-center transition-opacity duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
            <Button onClick={() => navigate(-1)} className="rounded-full w-10 h-10 p-0 border-none bg-black/40 text-white backdrop-blur-md">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => id && handleSaveItem(id, "hotel")} 
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

          {/* NAME OVERLAY WITH RGBA FADE */}
          <div className="absolute bottom-0 left-0 z-40 w-full p-6 pb-8">
            <div className="max-w-xl bg-gradient-to-r from-black/70 via-black/40 to-transparent rounded-2xl p-5 backdrop-blur-[2px]">
              <div className="flex gap-2 mb-2">
                <Badge className="bg-amber-400 text-black border-none px-2 py-0.5 text-[9px] font-black uppercase rounded-full">
                  <Star className="h-3 w-3 fill-current mr-1" /> Premium Stay
                </Badge>
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white leading-tight mb-1">
                {hotel.name}
              </h1>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/80" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wide">
                   {[hotel.location, hotel.city].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. CONTENT GRID */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1.7fr,1fr] gap-6">
          <div className="flex flex-col gap-6">
            {/* Description */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed lowercase">
                {hotel.description || "no description available."}
              </p>
            </section>

            {/* Amenities */}
            <section className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-black uppercase tracking-tight text-red-600">Amenities</h2>
              </div>
              {amenitiesList.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {amenitiesList.map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[11px] font-medium text-red-700 lowercase">{item.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-slate-400 text-sm italic">none</p>}
            </section>

            <div className="lg:hidden">
              <PriceCard hotel={hotel} navigate={navigate} />
            </div>

            <div className="bg-white rounded-[28px] p-7 shadow-sm border border-slate-100">
              <ReviewSection itemId={hotel.id} itemType="hotel" />
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-24 h-fit">
            <PriceCard hotel={hotel} navigate={navigate} />
          </div>
        </div>
      </main>
      <MobileBottomBar />
    </div>
  );
};

const PriceCard = ({ hotel, navigate }: any) => (
  <div className="bg-white rounded-[32px] p-8 shadow-2xl border border-slate-100">
    <div className="flex justify-between items-end mb-8">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price Per Night</p>
        <span className="text-4xl font-black text-red-600">KSh {hotel.price_per_night}</span>
      </div>
      <div className="text-right">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Rating</span>
        <div className="flex items-center justify-end gap-1 text-amber-500 font-black"><Star className="h-4 w-4 fill-current" /> 4.8</div>
      </div>
    </div>
    
    <Button 
      onClick={() => navigate(`/booking/hotel/${hotel.id}`)}
      className="w-full py-8 rounded-2xl text-md font-black uppercase tracking-widest text-white shadow-xl border-none transition-all active:scale-95 mb-6"
      style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
    >
      Reserve Room
    </Button>

    <div className="grid grid-cols-3 gap-3">
      <UtilityBtn icon={<MapPin className="h-5 w-5" />} label="Map" />
      <UtilityBtn icon={<Copy className="h-5 w-5" />} label="Copy" />
      <UtilityBtn icon={<Share2 className="h-5 w-5" />} label="Share" />
    </div>
  </div>
);

const UtilityBtn = ({ icon, label }: any) => (
  <Button variant="ghost" className="flex-col h-auto py-3 bg-[#F8F9FA] text-slate-500 rounded-2xl border border-slate-100 flex-1 hover:bg-slate-100 transition-colors">
    <div className="mb-1">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
  </Button>
);

export default HotelDetail;