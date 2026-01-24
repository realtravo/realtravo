import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
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
    if (!item) return;
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
      <Loader2 className="h-10 w-10 animate-spin text-[#008080] mb-4" />
      <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Setting up your session...</p>
    </div>
  );

  if (!item) return null;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 1. STICKY HEADER */}
      <nav className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4">
        <div className="container max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="rounded-full bg-slate-50 hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-slate-900 leading-none">Complete Your Booking</h1>
              <p className="text-[10px] font-bold text-[#008080] uppercase tracking-widest mt-1">Safe & Secure Checkout</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-400">
             <ShieldCheck className="h-4 w-4" />
             <span className="text-[10px] font-black uppercase">Encrypted</span>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <div className="relative w-full h-[30vh] md:h-[40vh] bg-slate-900">
        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        <div className="absolute bottom-8 left-0 w-full px-4">
          <div className="container max-w-4xl mx-auto">
            <Badge className="bg-[#FF7F50] mb-3 uppercase text-[9px] font-black tracking-widest px-3 py-1">
              Confirming {type}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
              {item.name}
            </h2>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wide">{item.location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOOKING FLOW (FULL PAGE STYLE) */}
      <main className="container max-w-4xl mx-auto px-4 mt-8">
        <div className="grid lg:grid-cols-[1fr,350px] gap-12">
          
          {/* Left Column: The Interactive Form */}
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 rounded-full bg-[#008080] text-white flex items-center justify-center font-black text-sm">1</div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Reservation Details</h3>
              </div>
              
              <div className="bg-slate-50 rounded-[24px] p-1 border border-slate-100">
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
                  // Explicitly providing prices forces the guest count step
                  priceAdult={item.price || 0}
                  priceChild={item.price_child || 0}
                  skipFacilitiesAndActivities={type === "trip" || type === "event"}
                  fixedDate={item.date}
                  skipDateSelection={!item.is_custom_date && !item.is_flexible_date}
                  onPaymentSuccess={() => {
                    setIsCompleted(true);
                    setTimeout(() => navigate(-1), 2000);
                  }}
                />
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary (Sticky) */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-6">
              <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Booking Summary</h4>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Rate (Adult)</span>
                    <span className="text-sm font-black text-slate-800">KSh {item.price || 0}</span>
                  </div>
                  {item.price_child > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Rate (Child)</span>
                      <span className="text-sm font-black text-slate-800">KSh {item.price_child}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase">
                        {item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Flexible Date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Info className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase">Instant Confirmation</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-dashed border-slate-200 rounded-[24px]">
                 <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                    By proceeding, you agree to the host's cancellation policy and terms of service.
                 </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;