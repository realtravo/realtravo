import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge"; // Removed Badge import
// Icons will be Teal: #008080
import { MapPin, Share2, Heart, Calendar, Phone, Mail, ArrowLeft, Copy } from "lucide-react";
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

interface Activity {
  name: string;
  price: number;
}
interface Event {
  id: string;
  name: string;
  location: string;
  country: string;
  place: string;
  image_url: string;
  images: string[];
  description: string;
  price: number;
  price_child: number;
  date: string;
  is_custom_date: boolean;
  available_tickets: number;
  phone_number?: string;
  email?: string;
  map_link?: string;
  activities?: Activity[];
  type: string;
  created_by: string | null;
}

// Define the specific colors
const TEAL_COLOR = "#008080";
const ORANGE_COLOR = "#FF9800";
const RED_COLOR = "#FF0000"; // Used for saved heart fill

const EventDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }

    // Track referral clicks
    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) {
      trackReferralClick(refSlug, id, "event", "booking");
    }
  }, [id]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("trips").select("*").eq("id", id).eq("type", "event").single();
      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase.from("trips").select("*").ilike("id", `${id}%`).eq("type", "event").single();
        if (!prefixError) {
          data = prefixData;
          error = null;
        }
      }
      if (error) throw error;
      setEvent(data as any);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({ title: "Event not found", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (id) {
      handleSaveItem(id, "event");
    }
  };

  const handleCopyLink = async () => {
    if (!event) {
      toast({ title: "Unable to Copy", description: "Event information not available", variant: "destructive" });
      return;
    }
    const refLink = await generateReferralLink(event.id, "event", event.id);
    try {
      await navigator.clipboard.writeText(refLink);
      toast({
        title: "Link Copied!",
        description: user ? "Share this link to earn commission on bookings!" : "Share this event with others!"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    if (!event) {
      toast({ title: "Unable to Share", description: "Event information not available", variant: "destructive" });
      return;
    }
    const refLink = await generateReferralLink(event.id, "event", event.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.name,
          text: `Check out this event: ${event?.name}`,
          url: refLink
        });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else {
      await handleCopyLink();
    }
  };

  const openInMaps = () => {
    if (event?.map_link) {
      window.open(event.map_link, "_blank");
    } else {
      const query = encodeURIComponent(`${event?.name}, ${event?.location}, ${event?.country}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=$$${query}`, "_blank");
    }
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!event) return;
    setIsProcessing(true);
    try {
      const totalPeople = data.num_adults + data.num_children;
      const totalAmount = data.num_adults * event.price + 
                             data.num_children * event.price_child + 
                             data.selectedActivities.reduce((sum, a) => sum + a.price * a.numberOfPeople, 0);

      await submitBooking({
        itemId: event.id,
        itemName: event.name,
        bookingType: 'event',
        totalAmount,
        slotsBooked: totalPeople,
        visitDate: event.date,
        guestName: data.guest_name,
        guestEmail: data.guest_email,
        guestPhone: data.guest_phone,
        hostId: event.created_by,
        bookingDetails: {
          event_name: event.name,
          date: event.date,
          adults: data.num_adults,
          children: data.num_children,
          activities: data.selectedActivities
        }
      });

      setIsProcessing(false);
      setIsCompleted(true);
      toast({ title: "Booking Submitted", description: "Your booking has been saved. Check your email for confirmation." });
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({ title: "Booking failed", description: error.message || "Failed to create booking", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header className="hidden md:block" /> 
        <div className="h-64 md:h-96 bg-muted animate-pulse" />
        <MobileBottomBar />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header className="hidden md:block" />
        <div className="container mx-auto px-4 py-8">
          <p>Event not found</p>
          <MobileBottomBar />
        </div>
        <MobileBottomBar />
      </div>
    );
  }

  const allImages = [event.image_url, ...(event.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header hidden on small screen / PWA mode */}
      <Header className="hidden md:block" /> 
      
      {/* FULL-WIDTH SLIDESHOW SECTION */}
      <div className="relative w-full overflow-hidden md:max-w-6xl md:mx-auto">
        {/* Back Button: Top Left, Dark RGBA */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 z-30 h-10 w-10 p-0 rounded-full text-white md:left-8"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} 
          size="icon"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Save Button: Top Right, Dark RGBA/Red filled */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSave} 
          className={`absolute top-4 right-4 z-30 h-10 w-10 p-0 rounded-full text-white md:right-8 ${isSaved ? "bg-red-500 hover:bg-red-600" : ""}`}
          style={{ backgroundColor: isSaved ? RED_COLOR : 'rgba(0, 0, 0, 0.5)' }} 
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-white" : ""}`} />
        </Button>
        
        <Carousel 
          opts={{ loop: true }} 
          plugins={[Autoplay({ delay: 3000 })]}
          className="w-full overflow-hidden"
          style={{ 
            borderBottom: `2px solid ${TEAL_COLOR}`, 
            marginTop: 0, 
            width: '100%', 
            maxHeight: '600px'
          }}
          setApi={(api) => {
            if (api) api.on("select", () => setCurrentImageIndex(api.selectedScrollSnap()));
          }}
        >
          <CarouselContent>
            {allImages.map((img, idx) => (
              <CarouselItem key={idx}>
                <img 
                  src={img} 
                  alt={`${event.name} ${idx + 1}`} 
                  loading="lazy" 
                  decoding="async" 
                  className="w-full h-[42vh] md:h-96 lg:h-[500px] object-cover" // <-- HEIGHT MODIFIED HERE (from h-[60vh] to h-[42vh])
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Name Overlay: Fading RGBA - UPDATED with 'uppercase' */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-20 text-white bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <h1 className="text-3xl sm:text-2xl font-bold mb-0 uppercase"><strong>{event.name}</strong></h1> 
        </div>
        
        {/* Dot indicators - REMAINS on the right */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2 z-30 justify-end md:right-8">
            {allImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === idx ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
        
      </div>
      
      {/* Main Content starts here, contained by the max-width wrapper */}
      <main className="container px-4 max-w-6xl mx-auto mt-4 sm:mt-6">
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6 sm:gap-4">
          
          {/* --- 1. RIGHT COLUMN CONTENT (Booking Card + Action Buttons) --- */}
          <div className="space-y-4 sm:space-y-3 lg:order-2 lg:sticky lg:top-20">
            
            {/* Price and Booking Card */}
            <div className="space-y-3 sm:space-y-2 p-4 sm:p-3 border bg-card rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: TEAL_COLOR }} />
                <div>
                  <p className="text-sm sm:text-xs text-muted-foreground">Event Date</p>
                  <p className="font-semibold sm:text-sm">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="border-t pt-3 sm:pt-2">
                <p className="text-sm sm:text-xs text-muted-foreground mb-1">Entrance Fee (Adult)</p>
                <p className="text-2xl sm:text-xl font-bold" style={{ color: TEAL_COLOR }}>KSh {event.price}</p>
                {event.price_child > 0 && <p className="text-sm sm:text-xs text-muted-foreground mt-1">Child: KSh {event.price_child}</p>}
                <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">Available Tickets: {event.available_tickets}</p>
              </div>

              {/* Book Now Button Teal and dark hover */}
              <Button 
                size="lg" 
                className="w-full text-white h-10 sm:h-9" 
                onClick={() => { setIsCompleted(false); setShowBooking(true); }} 
                disabled={event.available_tickets <= 0} 
                style={{ backgroundColor: TEAL_COLOR }} 
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005555'} 
                onMouseLeave={e => e.currentTarget.style.backgroundColor = TEAL_COLOR}
              >
                {event.available_tickets <= 0 ? "Sold Out" : "Book Now"}
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Map Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openInMaps} 
                className="flex-1 h-9" 
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <MapPin className="h-4 w-4 mr-2" style={{ color: TEAL_COLOR }} />
                <span>Map</span>
              </Button>
              {/* Copy Link Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyLink} 
                className="flex-1 h-9" 
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <Copy className="h-4 w-4 mr-2" style={{ color: TEAL_COLOR }} />
                <span>Copy Link</span>
              </Button>
              {/* Share Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare} 
                className="flex-1 h-9" 
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <Share2 className="h-4 w-4 mr-2" style={{ color: TEAL_COLOR }} />
                <span>Share</span>
              </Button>
            </div>
          </div>
          
          {/* --- 2. LEFT COLUMN CONTENT (Details) --- */}
          <div className="w-full space-y-4 sm:space-y-3 lg:order-1">
            
            {/* Location/Map Link Section (Hides location name on small screen) */}
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-4 sm:mb-2">
                <MapPin className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                {/* Visible on medium/large screens */}
                <span className="sm:text-sm hidden md:inline">{event.location}, {event.country}</span>
                {/* Visible only on small screens, acts as a map link */}
                <span 
                    className="sm:text-sm md:hidden text-sm cursor-pointer"
                    style={{ color: TEAL_COLOR }}
                    onClick={openInMaps}
                >
                    View on Map
                </span>
              </div>
            </div>
            
            {/* Description Section (ABOUT SECTION) */}
            {event.description && (
              <div className="bg-card border rounded-lg p-4 sm:p-3">
                <h2 className="text-lg sm:text-base font-semibold mb-2">About This Event</h2>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            )}

            {/* --- Activities Section (ORANGE) --- */}
            {event.activities && event.activities.length > 0 && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Included Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {event.activities.map((activity, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center"
                      style={{ backgroundColor: ORANGE_COLOR }}
                    >
                      <span className="font-medium">{activity.name}</span>
                      <span className="text-[10px] opacity-90">{activity.price > 0 ? `KSh ${activity.price}` : 'Free'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- Contact Information Section --- */}
            {(event.phone_number || event.email) && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {event.phone_number && (
                    <a 
                      href={`tel:${event.phone_number}`}
                      className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                      style={{ borderColor: TEAL_COLOR }}
                    >
                      <Phone className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                      <span className="text-sm" style={{ color: TEAL_COLOR }}>{event.phone_number}</span>
                    </a>
                  )}
                  {event.email && (
                    <a 
                      href={`mailto:${event.email}`}
                      className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                      style={{ borderColor: TEAL_COLOR }}
                    >
                      <Mail className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                      <span className="text-sm" style={{ color: TEAL_COLOR }}>{event.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div> {/* END GRID */}

        {/* --- Review Section (Full Width, always last before Similar Items) --- */}
        <div className="mt-6 sm:mt-4 rounded-none my-[10px] sm:my-[5px]">
          <ReviewSection itemId={event.id} itemType="event" />
        </div>

        {/* --- Similar Items Section --- */}
        <SimilarItems currentItemId={event.id} itemType="trip" location={event.location} country={event.country} />
      </main>

      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <MultiStepBooking 
            onSubmit={handleBookingSubmit} 
            activities={event.activities || []} 
            priceAdult={event.price} 
            priceChild={event.price_child} 
            isProcessing={isProcessing} 
            isCompleted={isCompleted} 
            itemName={event.name} 
            skipDateSelection={true} 
            fixedDate={event.date} 
            skipFacilitiesAndActivities={true} 
            itemId={event.id} 
            bookingType="event" 
            hostId={event.created_by || ""} 
            onPaymentSuccess={() => setIsCompleted(true)} 
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};
export default EventDetail;