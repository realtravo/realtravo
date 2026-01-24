import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  SLATE: "#64748b"
};

const BookingPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const { submitBooking } = useBookingSubmit();

  useEffect(() => {
    if (id && type) fetchItem();
    window.scrollTo(0, 0);
  }, [id, type]);

  const fetchItem = async () => {
    if (!id || !type) return;
    try {
      const table = (type === "trip" || type === "event") ? "trips" : 
                    (type === "hotel") ? "hotels" : "adventure_places";

      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw error;
      setItem(data);
    } catch (error) {
      toast({ title: "Item not found", variant: "destructive" });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!item || !type) return;
    setIsProcessing(true);
    try {
      const totalAmount = (formData.num_adults * (item.price || 0)) + (formData.num_children * (item.price_child || 0));
      
      await submitBooking({
        itemId: item.id,
        itemName: item.name,
        bookingType: type as any,
        totalAmount,
        slotsBooked: formData.num_adults + formData.num_children,
        visitDate: formData.visit_date || item.date,
        guestName: formData.guest_name,
        guestEmail: formData.guest_email,
        guestPhone: formData.guest_phone,
        hostId: item.created_by,
        bookingDetails: { ...formData, item_name: item.name }
      });
      
      setIsCompleted(true);
      toast({ title: "Booking confirmed!" });
      setTimeout(() => navigate(-1), 2000);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-[#008080]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* 1. STICKY HEADER */}
      <nav className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-black uppercase tracking-tighter text-slate-900 leading-none">Checkout</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Secure Reservation</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-tight">SSL Encrypted</span>
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 md:px-6 pt-8">
        {/* 2. MAIN BOOKING WRAPPER (No internal scroll) */}
        <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Summary Sidebar (Desktop) / Top Banner (Mobile) */}
          <div className="w-full md:w-[380px] bg-slate-900 relative">
            <div className="relative h-64 md:h-full min-h-[300px]">
              <img src={item.image_url} alt={item.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <Badge className="bg-[#FF7F50] text-white border-none mb-3 px-3 py-1 uppercase text-[9px] font-black tracking-[0.15em]">
                  {type}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter leading-tight mb-3">
                  {item.name}
                </h2>
                
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3 text-white/70">
                    <MapPin className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">{item.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/70">
                    <Calendar className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {item.is_custom_date ? 'Flexible Schedule' : new Date(item.date).toDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form (Expands naturally with page) */}
          <div className="flex-1 p-6 md:p-12 lg:p-16">
            <div className="mb-10">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Reservation Details</h3>
              <p className="text-xs font-medium text-slate-400 mt-1">Please provide accurate information for your booking.</p>
            </div>

            <div className="h-auto"> {/* Removed overflow-hidden/auto */}
              <MultiStepBooking 
                onSubmit={handleBookingSubmit}
                isProcessing={isProcessing}
                isCompleted={isCompleted}
                itemName={item.name}
                itemId={item.id}
                hostId={item.created_by || ""}
                primaryColor={COLORS.TEAL}
                accentColor={COLORS.CORAL}
                bookingType={type as any}
                priceAdult={item.price || 0}
                priceChild={item.price_child || 0}
                totalCapacity={item.available_tickets || 50}
                // These ensure the input fields for quantity appear
                skipFacilitiesAndActivities={type === 'event' || type === 'trip'}
                skipDateSelection={!item.is_custom_date && !item.is_flexible_date}
                fixedDate={item.date}
              />
            </div>

            <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200" />)}
                 </div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Joined by 1.2k+ travelers</p>
               </div>
               <div className="flex items-center gap-1">
                 <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                 <span className="text-[10px] font-black uppercase text-slate-900">4.9/5 Rating</span>
               </div>
            </div>
          </div>

        </div>

        {/* 3. TRUST SIGNALS */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <TrustCard title="Instant Confirmation" desc="Receive your digital ticket immediately via email." />
          <TrustCard title="Verified Host" desc="All experiences are vetted for quality and safety." />
          <TrustCard title="Flexible Support" desc="24/7 assistance for any booking modifications." />
        </div>
      </main>
    </div>
  );
};

const TrustCard = ({ title, desc }: { title: string, desc: string }) => (
  <div className="bg-white/50 border border-slate-100 p-5 rounded-3xl">
    <h4 className="text-[11px] font-black uppercase tracking-tight text-slate-900 mb-1">{title}</h4>
    <p className="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">{desc}</p>
  </div>
);

export default BookingPage;