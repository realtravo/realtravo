import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Phone, Share2, Mail, Clock, ArrowLeft, 
  Heart, Copy, Star, CheckCircle2, BedDouble, Wind, Wifi, Coffee, Utensils,
  Car, ShieldCheck, Waves, Dumbbell, Calendar, Circle, Zap, Tent
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

const HotelDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { position, requestLocation } = useGeolocation();
  
  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [liveRating, setLiveRating] = useState({ avg: 0, count: 0 });
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");

  const distance = position && hotel?.latitude && hotel?.longitude
    ? calculateDistance(position.latitude, position.longitude, hotel.latitude, hotel.longitude)
    : undefined;

  useEffect(() => {
    if (id) {
      fetchHotel();
      fetchLiveRating();
    }
    requestLocation();
    window.scrollTo(0, 0);
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

  const fetchLiveRating = async () => {
    if (!id) return;
    const { data } = await supabase.from("reviews").select("rating").eq("item_id", id).eq("item_type", "hotel");
    if (data && data.length > 0) {
      const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
      setLiveRating({ avg: parseFloat(avg.toFixed(1)), count: data.length });
    }
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!hotel) return;
    setIsProcessing(true);
    try {
      await submitBooking({
        itemId: hotel.id, itemName: hotel.name, bookingType: 'hotel', 
        totalAmount: hotel.price_per_night, visitDate: data.visit_date,
        guestName: data.guest_name, guestEmail: data.guest_email, guestPhone: data.guest_phone,
        hostId: hotel.created_by, bookingDetails: { ...data, hotel_name: hotel.name }
      });
      setIsCompleted(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  if (loading) return <div className="min-h-screen bg-white animate-pulse" />;
  if (!hotel) return null;

  const allImages = [hotel.image_url, ...(hotel.gallery_images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      <Header className="hidden md:block" />

      {/* Hero Carousel */}
      <div className="relative w-full h-[45vh] md:h-[65vh] bg-slate-900 overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/40 backdrop-blur-md text-white border-none w-10 h-10 p-0"><ArrowLeft className="h-5 w-5" /></Button>
          <Button onClick={() => id && handleSaveItem(id, "hotel")} className={`rounded-full backdrop-blur-md border-none w-10 h-10 p-0 shadow-lg ${isSaved ? "bg-red-500" : "bg-black/40"}`}><Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} /></Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 3500 })]} className="w-full h-full">
          <CarouselContent className="h-full ml-0">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full pl-0 basis-full">
                <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-8 left-0 w-full p-5 z-20">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{hotel.name}</h1>
          <div className="flex items-center gap-1 text-white/90">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase truncate">{hotel.location}</span>
          </div>
        </div>
      </div>

      <main className="container px-4 -mt-4 relative z-30 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr,1fr] gap-4">
          
          <div className="space-y-4">
            {/* 1. DESCRIPTION (NOW TOP) */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 text-slate-400">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{hotel.description}</p>
            </section>

            {/* 2. PRICE CARD (INCLUDES HOURS & DAYS) */}
            <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nightly Price</p>
                  <span className="text-4xl font-black text-red-600">KSh {hotel.price_per_night}</span>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-black text-lg">
                        <Star className="h-4 w-4 fill-current" />
                        <span>{liveRating.avg || hotel.star_rating || "0"}</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{liveRating.count} reviews</p>
                </div>
              </div>

              {/* OPERATING INFO (Small letters for days) */}
              <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400"><Clock className="h-4 w-4 text-teal-600" /><span className="text-[10px] font-black uppercase tracking-tight">Working Hours</span></div>
                  <span className="text-[10px] font-black text-slate-600">{hotel.opening_hours || "08:00 AM"} - {hotel.closing_hours || "11:00 PM"}</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400"><Calendar className="h-4 w-4 text-teal-600" /><span className="text-[10px] font-black uppercase tracking-tight">Working Days</span></div>
                  <p className="text-[10px] font-normal leading-tight text-slate-500 lowercase italic">
                    {Array.isArray(hotel.days_opened) ? hotel.days_opened.join(", ") : "monday, tuesday, wednesday, thursday, friday, saturday, sunday"}
                  </p>
                </div>
              </div>

              <Button onClick={() => setBookingOpen(true)} className="w-full py-7 rounded-2xl text-md font-black uppercase tracking-widest bg-gradient-to-r from-[#FF7F50] to-[#FF4E50] border-none shadow-lg">Reserve Room</Button>
            </div>

            {/* 3. AMENITIES (RED) */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-red-600">Amenities</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {hotel.amenities?.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-red-50/50 rounded-xl border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black uppercase text-red-700 truncate">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. FACILITIES (TEAL #008080) */}
            {hotel.facilities?.length > 0 && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Tent className="h-5 w-5 text-[#008080]" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[#008080]">Facilities</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {hotel.facilities.map((f: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-teal-50/50 border border-teal-100 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-[#008080]">{f.name || f}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. ACTIVITIES (ORANGE) */}
            {hotel.activities?.length > 0 && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Activities</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotel.activities.map((act: any, i: number) => (
                    <Badge key={i} className="bg-orange-50 text-orange-600 border-orange-100 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase">
                      {act.name || act}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* 6. ROOM TYPES */}
            {hotel.room_types && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-slate-800">Available Rooms</h2>
                <div className="space-y-3">
                  {hotel.room_types.map((room: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <BedDouble className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-700">{room.name}</p>
                          <p className="text-[10px] text-slate-400">{room.capacity} Guests</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-red-600">KSh {room.price}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-[40px] p-8 shadow-2xl border border-slate-100 text-center">
               <p className="text-xs font-black uppercase text-slate-400 mb-2">Starting from</p>
               <h3 className="text-5xl font-black text-red-600 mb-6">KSh {hotel.price_per_night}</h3>
               <Button onClick={() => setBookingOpen(true)} className="w-full py-8 rounded-3xl text-lg font-black uppercase tracking-widest bg-gradient-to-r from-[#FF7F50] to-[#FF4E50] border-none">Reserve Now</Button>
            </div>
          </div>
        </div>

        {/* 7. REVIEW SECTION */}
        <div className="mt-8">
          <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>

        {/* 8. SIMILAR ITEMS */}
        <div className="mt-12">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Explore Similar Stays</h2>
          <SimilarItems currentItemId={hotel.id} itemType="hotel" country={hotel.country} />
        </div>
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[40px] border-none shadow-2xl">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} 
            itemName={hotel.name}
            itemId={hotel.id}
            bookingType="hotel"
            priceAdult={hotel.price_per_night}
            isProcessing={isProcessing} 
            isCompleted={isCompleted} 
            hostId={hotel.created_by}
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};

export default HotelDetail;