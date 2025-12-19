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
  Car, ShieldCheck, Waves, Dumbbell, Calendar, Circle
} from "lucide-react";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  RED: "#FF0000",
};

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
  const [isOpenNow, setIsOpenNow] = useState(false);
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

  // Real-time Status Calculation
  useEffect(() => {
    if (!hotel) return;
    const checkOpenStatus = () => {
      const now = new Date();
      const currentDay = now.toLocaleString('en-us', { weekday: 'long' });
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      const openTime = parseTime(hotel.opening_hours || "08:00 AM");
      const closeTime = parseTime(hotel.closing_hours || "11:00 PM");
      const days = Array.isArray(hotel.days_opened) ? hotel.days_opened : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      
      setIsOpenNow(days.includes(currentDay) && currentTime >= openTime && currentTime <= closeTime);
    };
    checkOpenStatus();
    const interval = setInterval(checkOpenStatus, 60000);
    return () => clearInterval(interval);
  }, [hotel]);

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

      {/* Hero / Carousel */}
      <div className="relative w-full h-[50vh] md:h-[65vh] bg-slate-900 overflow-hidden">
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <Button onClick={() => navigate(-1)} className="rounded-full bg-black/40 backdrop-blur-md text-white border-none w-10 h-10 p-0"><ArrowLeft className="h-5 w-5" /></Button>
          <Button onClick={() => id && handleSaveItem(id, "hotel")} className={`rounded-full backdrop-blur-md border-none w-10 h-10 p-0 shadow-lg ${isSaved ? "bg-red-500" : "bg-black/40"}`}><Heart className={`h-5 w-5 text-white ${isSaved ? "fill-white" : ""}`} /></Button>
        </div>

        <Carousel plugins={[Autoplay({ delay: 3500 })]} className="w-full h-full">
          <CarouselContent className="h-full ml-0">
            {allImages.map((img, idx) => (
              <CarouselItem key={idx} className="h-full pl-0 basis-full">
                <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-10 left-0 w-full p-5 z-20">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className="bg-amber-400 text-black border-none px-2 py-0.5 text-[10px] font-black uppercase rounded-full"><Star className="h-3 w-3 fill-current mr-1" />{liveRating.avg || hotel.star_rating || "New"}</Badge>
            <Badge className={`${isOpenNow ? "bg-emerald-500" : "bg-red-500"} text-white border-none px-2 py-0.5 text-[10px] font-black uppercase rounded-full flex items-center gap-1`}>
                <Circle className={`h-2 w-2 fill-current ${isOpenNow ? "animate-pulse" : ""}`} />
                {isOpenNow ? "Open Now" : "Closed"}
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">{hotel.name}</h1>
          <div className="flex items-center gap-1 text-white/90">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold uppercase truncate">{hotel.location}</span>
          </div>
        </div>
      </div>

      <main className="container px-4 -mt-6 relative z-30 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr,1fr] gap-4">
          
          <div className="space-y-4">
            {/* Price Card (Mobile) */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 lg:hidden">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nightly Rate</p>
                  <span className="text-3xl font-black text-red-600">KSh {hotel.price_per_night}</span>
                </div>
                {distance && <Badge className="bg-slate-100 text-slate-600 border-none font-black">{distance.toFixed(1)}KM AWAY</Badge>}
              </div>
              <Button onClick={() => setBookingOpen(true)} className="w-full py-7 rounded-2xl text-md font-black uppercase tracking-widest bg-gradient-to-r from-[#FF7F50] to-[#FF4E50] border-none">Reserve Room</Button>
            </div>

            {/* DESCRIPTION SECTION */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest mb-3 text-[#008080]">Description</h2>
              <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{hotel.description}</p>
            </section>

            {/* OPERATING HOURS SECTION */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-[#008080]">Schedule & Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Clock className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Hours</p>
                    <p className="text-xs font-bold text-slate-700">{hotel.opening_hours || "24 Hours"} - {hotel.closing_hours || "Check-out 11:00 AM"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Working Days</p>
                    <p className="text-xs font-bold text-slate-700">
                        {Array.isArray(hotel.days_opened) ? hotel.days_opened.join(", ") : "All Week"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities - SHOW ALL */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-[#008080]">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hotel.amenities?.map((amenity: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <ShieldCheck className="h-4 w-4 text-[#008080]" />
                    <span className="text-[10px] font-black uppercase text-slate-600 truncate">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Room Types - SHOW ALL */}
            {hotel.room_types && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-[#008080]">Available Rooms</h2>
                <div className="space-y-3">
                  {hotel.room_types.map((room: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-teal-50/30 rounded-2xl border border-teal-100">
                      <div className="flex items-center gap-3">
                        <BedDouble className="h-5 w-5 text-teal-600" />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-700">{room.name}</p>
                          <p className="text-[10px] text-slate-400">{room.capacity} Guests</p>
                        </div>
                      </div>
                      <Badge className="bg-white text-teal-600 font-black border-teal-100">KSh {room.price}</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar (Desktop Only) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-white rounded-[40px] p-8 shadow-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Nightly Price</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-red-600">KSh {hotel.price_per_night}</span>
                <span className="text-slate-400 text-xs font-bold">/ night</span>
              </div>
              <Button onClick={() => setBookingOpen(true)} className="w-full py-8 rounded-3xl text-lg font-black uppercase tracking-widest bg-gradient-to-r from-[#FF7F50] to-[#FF4E50] border-none shadow-lg">Reserve Now</Button>
            </div>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="mt-8">
          <ReviewSection itemId={hotel.id} itemType="hotel" />
        </div>

        {/* Similar Hotels */}
        <div className="mt-12">
          <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Similar Stays</h2>
          <SimilarItems currentItemId={hotel.id} itemType="hotel" country={hotel.country} />
        </div>
      </main>

      {/* Booking Dialog */}
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