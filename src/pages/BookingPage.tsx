import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin, Calendar, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
};

type BookingType = 'trip' | 'event' | 'hotel' | 'adventure_place' | 'attraction';

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
      let data = null;
      let error = null;
      
      const table = (type === "trip" || type === "event") ? "trips" : 
                    (type === "hotel") ? "hotels" : "adventure_places";

      const result = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      data = result.data;
      error = result.error;
      
      if (error) throw error;
      setItem(data);
    } catch (error) {
      toast({ title: "Item not found", variant: "destructive" });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const getBookingType = (): BookingType => {
    if (type === "trip") return "trip";
    if (type === "event") return "event";
    if (type === "hotel") return "hotel";
    return "adventure_place";
  };

  const handleBookingSubmit = async (formData: BookingFormData) => {
    if (!item || !type) return;
    setIsProcessing(true);
    
    try {
      let totalAmount = 0;
      const bookingType = getBookingType();
      
      if (type === "trip" || type === "event") {
        totalAmount = (formData.num_adults * (item.price || 0)) + (formData.num_children * (item.price_child || 0));
      } else {
        // Calculation logic for hotels/adventure places remains the same
        totalAmount = (formData.num_adults + formData.num_children) * (item.entry_fee || item.price || 0);
        formData.selectedActivities?.forEach(a => totalAmount += a.price * a.numberOfPeople);
      }
      
      await submitBooking({
        itemId: item.id,
        itemName: item.name,
        bookingType,
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#008080] mb-4" />
        <p className="text-sm font-black uppercase tracking-tighter animate-pulse">Initializing Checkout...</p>
      </div>
    );
  }

  if (!item) return null;

  const getMultiStepProps = () => {
    const baseProps = {
      onSubmit: handleBookingSubmit,
      isProcessing,
      isCompleted,
      itemName: item.name,
      itemId: item.id,
      hostId: item.created_by || "",
      onPaymentSuccess: () => {
        setIsCompleted(true);
        setTimeout(() => navigate(-1), 2000);
      },
      primaryColor: COLORS.TEAL,
      accentColor: COLORS.CORAL,
    };
    
    // For Events/Trips, we explicitly pass prices to trigger the "Number of Users" input
    if (type === "trip" || type === "event") {
      return {
        ...baseProps,
        bookingType: type,
        priceAdult: item.price || 0,
        priceChild: item.price_child || 0,
        activities: item.activities || [],
        skipFacilitiesAndActivities: true,
        skipDateSelection: !item.is_custom_date && !item.is_flexible_date,
        fixedDate: item.date,
        totalCapacity: item.available_tickets || 50,
        slotLimitType: item.slot_limit_type || 'inventory',
      };
    }
    
    return {
        ...baseProps,
        bookingType: getBookingType(),
        priceAdult: item.price || item.entry_fee || 0,
        priceChild: item.price_child || item.entry_fee || 0,
        facilities: item.facilities || [],
        activities: item.activities || [],
        totalCapacity: item.available_slots || item.available_rooms || 10,
    };
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight text-slate-900">
                Confirm Booking
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step 1 of 3: Details</p>
            </div>
          </div>
          <Badge variant="outline" className="border-teal-100 text-[#008080] bg-teal-50 uppercase text-[9px] font-black">
            Secure Checkout
          </Badge>
        </div>
      </div>

      <main className="container max-w-2xl mx-auto px-4 pt-8">
        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
          
          {/* Item Preview Section */}
          <div className="relative h-48 w-full">
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-6 right-6">
              <Badge className="bg-[#FF7F50] mb-2 uppercase text-[9px] font-black tracking-widest border-none">
                {type}
              </Badge>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">
                {item.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-white/80">
                <MapPin className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {item.location}, {item.country}
                </span>
              </div>
            </div>
          </div>

          {/* Booking Summary Mini-Info */}
          <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex gap-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="p-1.5 rounded-lg bg-teal-50"><Calendar className="h-3 w-3 text-[#008080]" /></div>
                <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Date</p>
                    <p className="text-[10px] font-bold text-slate-700 uppercase">
                        {item.date ? new Date(item.date).toLocaleDateString() : 'Flexible'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="p-1.5 rounded-lg bg-coral-50"><Info className="h-3 w-3 text-[#FF7F50]" /></div>
                <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Starting Price</p>
                    <p className="text-[10px] font-bold text-slate-700 uppercase">KSh {item.price || item.entry_fee || 0}</p>
                </div>
            </div>
          </div>

          {/* The Multi-Step Form */}
          <div className="p-2 md:p-4">
            <MultiStepBooking {...getMultiStepProps()} />
          </div>
        </div>

        {/* Support Footer */}
        <div className="mt-8 text-center space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Need help with your booking?</p>
            <div className="flex justify-center gap-4 text-xs font-black text-[#008080] uppercase tracking-tighter">
                <a href={`tel:${item.phone_number || ''}`}>Call Host</a>
                <span className="text-slate-200">|</span>
                <a href={`mailto:${item.email || ''}`}>Email Support</a>
            </div>
        </div>
      </main>
    </div>
  );
};

export default BookingPage;