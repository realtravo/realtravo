import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Icons will be Teal: #008080
import { MapPin, Share2, Heart, Calendar, Phone, Mail, ArrowLeft, Copy, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/supabaseClient"; // Assuming the path is correct
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SimilarItems } from "@/components/SimilarItems";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import Autoplay from "embla-carousel-autoplay"; 

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

// Define the custom colors
const TEAL_COLOR = "#008080";
const ORANGE_COLOR = "#FF9800";
const RED_COLOR = "#EF4444"; 

// --- Helper Component: Read-only Star Rating Display ---
interface StarRatingDisplayProps {
  rating: number | null;
  count: number | null;
  iconSize?: number; 
}

const StarRatingDisplay = ({ rating, count, iconSize = 5 }: StarRatingDisplayProps) => {
  if (rating === null || rating === 0) return null;

  const fullStars = Math.floor(rating);
  
  return (
    <div className="flex items-center gap-1">
      {/* Render 5 stars */}
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-${iconSize} w-${iconSize}`}
          style={{ color: ORANGE_COLOR }}
          fill={i < fullStars ? ORANGE_COLOR : "transparent"} 
          stroke={ORANGE_COLOR}
        />
      ))}
      <span className="text-base font-semibold ml-1" style={{ color: ORANGE_COLOR }}>
        {rating.toFixed(1)}
      </span>
      {count !== null && (
        <span className="text-sm text-muted-foreground">
          ({count} reviews)
        </span>
      )}
    </div>
  );
};


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
  const [averageRating, setAverageRating] = useState<number | null>(null); 
  const [reviewCount, setReviewCount] = useState<number | null>(null); 


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
      // Using a single select with the full ID first, then fallback to ilike prefix if the first fails and the ID looks like a prefix
      let { data, error } = await supabase.from("trips").select("*").eq("id", id).eq("type", "event").single();
      
      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase.from("trips").select("*").ilike("id", `${id}%`).eq("type", "event").single();
        if (!prefixError && prefixData) {
          data = prefixData;
          error = null;
        }
      }

      if (error) throw error;
      setEvent(data as any);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: "Event not found",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (id) {
      handleSaveItem(id, "event");
    }
  };

  // ... (handleCopyLink, handleShare, openInMaps functions remain the same)
  const handleCopyLink = async () => {
    if (!event) {
      toast({
        title: "Unable to Copy",
        description: "Event information not available",
        variant: "destructive"
      });
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
      toast({
        title: "Unable to Share",
        description: "Event information not available",
        variant: "destructive"
      });
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
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
    }
  };
  // ... 

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!event) return;
    setIsProcessing(true);
    try {
      const totalPeople = data.num_adults + data.num_children;
      // Calculate total amount including activity price * number of people
      const totalAmount = data.num_adults * event.price + data.num_children * event.price_child + data.selectedActivities.reduce((sum, a) => sum + a.price * (a.numberOfPeople || 1), 0);
      
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
      toast({
        title: "Booking Submitted",
        description: "Your booking has been saved. Check your email for confirmation."
      });
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking failed",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <div className="container px-4 py-6 max-w-6xl mx-auto">
        <div className="h-64 md:h-96 bg-muted animate-pulse rounded-lg" />
      </div>
      <MobileBottomBar />
    </div>;
  }

  if (!event) {
    return <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <p>Event not found</p>
      </div>
      <MobileBottomBar />
    </div>;
  }

  const allImages = [event.image_url, ...(event.images || [])].filter(Boolean);

  return <div className="min-h-screen bg-background pb-20 md:pb-0">
    <Header />

    <main className="container px-4 max-w-6xl mx-auto pt-4 sm:pt-0">
      {/* Main Grid: 2/3rds for Content (Left), 1/3rd for Details/Actions (Right) */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-6 sm:gap-4">
        
        {/* --- Right Column Content (Details/Booking) - ORDER 1 on Mobile, 2 on Desktop --- */}
        <div className="order-2 lg:order-2 space-y-4 sm:space-y-3">
          {/* Title and Location (Mobile Order: 1.1) */}
          <div className="lg:mt-0 mt-2 sm:mt-1">
            <h1 className="text-3xl sm:text-2xl font-bold mb-2">{event.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mb-4 sm:mb-2">
              <MapPin className="h-4 w-4" style={{ color: TEAL_COLOR }} />
              <span className="sm:text-sm">{event.location}, {event.country}</span>
              <Badge className="ml-auto bg-primary/20 text-primary font-semibold text-xs" variant="outline">
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Price and Booking Card (Mobile Order: 1.2) */}
          <div className="space-y-3 sm:space-y-2 p-4 sm:p-3 border bg-card rounded-lg" style={{ borderColor: TEAL_COLOR }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" style={{ color: TEAL_COLOR }} />
              <div>
                <p className="text-sm sm:text-xs text-muted-foreground">Event Date</p>
                <p className="font-semibold sm:text-sm">{new Date(event.date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className={`${event.phone_number || event.email ? 'border-t pt-3 sm:pt-2' : ''}`}>
              <p className="text-sm sm:text-xs text-muted-foreground mb-1">Entrance Fee</p>
              <p className="text-2xl sm:text-xl font-bold" style={{ color: TEAL_COLOR }}>
                KSh {event.price}
              </p>
              {event.price_child > 0 && <p className="text-sm sm:text-xs text-muted-foreground">Child: KSh {event.price_child}</p>}
              <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">Available Tickets: {event.available_tickets}</p>
            </div>
          </div>
          
          {/* Overall Star Rating Display (Mobile Order: 1.3) */}
          {averageRating !== null && (
              <div className="p-2 sm:p-0">
                  <StarRatingDisplay rating={averageRating} count={reviewCount} iconSize={6} />
              </div>
          )}

          {/* Book Now Button (Mobile Order: 1.4) */}
          <Button
            size="lg"
            className="w-full text-white h-10 sm:h-9 font-semibold"
            onClick={() => { setIsCompleted(false); setShowBooking(true); }}
            disabled={event.available_tickets <= 0}
            style={{ backgroundColor: TEAL_COLOR }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#005555'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = TEAL_COLOR}
          >
            {event.available_tickets <= 0 ? "Sold Out" : "Book Now"}
          </Button>
          

          {/* Action Buttons (Mobile Order: 1.5) */}
          <div className="flex gap-2">
            {/* Map Button: Border/Icon Teal */}
            <Button
              variant="outline"
              size="sm"
              onClick={openInMaps}
              className="flex-1 h-9 p-2 md:px-4" // Adjusted padding for better look
              style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
            >
              <MapPin className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Map</span>
            </Button>
            {/* Copy Link Button: Border/Icon Teal */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex-1 h-9 p-2 md:px-4"
              style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
            >
              <Copy className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Copy Link</span>
            </Button>
            {/* Share Button: Border/Icon Teal */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1 h-9 p-2 md:px-4"
              style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
            >
              <Share2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Share</span>
            </Button>
            {/* Save Button: Border/Icon Teal (and filled red if saved) */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              className={`h-9 w-9 ${isSaved ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
              style={{ borderColor: TEAL_COLOR, color: isSaved ? 'white' : TEAL_COLOR }}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            </Button>
          </div>

        </div> {/* End of Right Column (order-2 lg:order-2) */}

        {/* --- Left Column Content (Image, Description, Activities, Reviews) - ORDER 1 on Mobile and Desktop --- */}
        <div className="order-1 lg:order-1 w-full -mt-4 sm:mt-0 lg:mt-0"> 
          <div className="relative">
            {/* Back Button over carousel */}
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 z-20 h-10 w-10 p-0 rounded-full text-white shadow-lg" // Added shadow
              style={{ backgroundColor: TEAL_COLOR }}
              size="icon"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Carousel (Image is paramount on mobile, so it stays at the top) */}
            <Carousel
              opts={{ loop: true }}
              plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
              className="w-full overflow-hidden"
              setApi={(api) => {
                if (api) api.on("select", () => setCurrentImageIndex(api.selectedScrollSnap()));
              }}
            >
              <CarouselContent
                // Styling for carousel content/images
                className={`
                  rounded-b-lg 
                  lg:rounded-b-none 
                  lg:rounded-tl-lg // Top-left radius on large screens
                  lg:rounded-tr-none // No top-right radius on large screens
                  shadow-md // Added subtle shadow
                `}
                // Removed border on CarouselContent as it's better placed on the wrapper if needed
              >
                {allImages.map((img, idx) => <CarouselItem key={idx}>
                  <img 
                    src={img} 
                    alt={`${event.name} ${idx + 1}`} 
                    loading="lazy" 
                    decoding="async" 
                    className={`w-full h-64 md:h-96 object-cover ${idx === allImages.length - 1 ? 'lg:rounded-br-none' : ''}`} // Ensure rounded corners on all items
                  />
                </CarouselItem>)}
              </CarouselContent>
            </Carousel>

            {/* Dot indicators (Teal) */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {allImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === idx ? 'w-4' : 'bg-white/50'}`}
                    style={{ backgroundColor: currentImageIndex === idx ? TEAL_COLOR : 'rgba(255, 255, 255, 0.5)' }} // Teal active dot
                  />
                ))}
              </div>
            )}
          </div>

          {/* Description Section (Mobile Order: 2) */}
          {event.description && (
            <div className="bg-card border rounded-lg p-4 sm:p-3 mt-6 sm:mt-4">
              <h2 className="text-xl sm:text-lg font-semibold mb-2" style={{ color: TEAL_COLOR }}>About This Event</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
            </div>
          )}
          
          {/* --- Activities Section (ORANGE) (Mobile Order: 3) --- */}
          {event.activities && event.activities.length > 0 && (
            <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg" style={{ borderColor: ORANGE_COLOR }}>
              <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3" style={{ color: ORANGE_COLOR }}>Included Activities (Optional Add-ons)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-2">
                {event.activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 text-white rounded-lg text-sm flex flex-col items-center justify-center text-center min-h-[60px] shadow-sm"
                    style={{ backgroundColor: ORANGE_COLOR }}
                  >
                    <span className="font-medium">{activity.name}</span>
                    <span className="text-xs opacity-90 mt-1">{activity.price > 0 ? `KSh ${activity.price}` : 'Free'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information Section (Mobile Order: 4) */}
          {(event.phone_number || event.email) && (
            <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg" style={{ borderColor: TEAL_COLOR }}>
              <h2 className="text-xl sm:text-lg font-semibold mb-3" style={{ color: TEAL_COLOR }}>Contact Information</h2>
              <div className="space-y-2">
                {event.phone_number && (
                  <a
                    href={`tel:${event.phone_number}`}
                    className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                    style={{ borderColor: TEAL_COLOR }}
                  >
                    <Phone className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                    <span className="text-sm font-medium" style={{ color: TEAL_COLOR }}>{event.phone_number}</span>
                  </a>
                )}
                {event.email && (
                  <a
                    href={`mailto:${event.email}`}
                    className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                    style={{ borderColor: TEAL_COLOR }}
                  >
                    <Mail className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                    <span className="text-sm font-medium" style={{ color: TEAL_COLOR }}>{event.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* --- Review Section (Mobile Order: 5) --- */}
          <div className="mt-6 sm:mt-4 rounded-lg border bg-card p-4 sm:p-3">
            <ReviewSection 
              itemId={event.id} 
              itemType="event"
              onRatingsChange={({ averageRating, reviewCount }: { averageRating: number | null, reviewCount: number | null }) => {
                  setAverageRating(averageRating);
                  setReviewCount(reviewCount);
              }}
            />
          </div>
        </div> {/* End of Left/Full Width Column (order-1 lg:order-1) */}

      </div>

      {/* --- Similar Items Section (Full Width, lowest order) --- */}
      <div className="mt-6 sm:mt-4">
        <SimilarItems currentItemId={event.id} itemType="trip" location={event.location} country={event.country} />
      </div>
    </main>

    {/* Booking Dialog */}
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
          skipFacilities={true} // Events usually don't have facilities
          itemId={event.id}
          bookingType="event"
          hostId={event.created_by || ""}
          onPaymentSuccess={() => setIsCompleted(true)}
        />
      </DialogContent>
    </Dialog>

    <MobileBottomBar />
  </div>;
};

export default EventDetail;