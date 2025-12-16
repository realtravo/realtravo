import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Calendar, Mail, ArrowLeft, Heart, Copy, Star } from "lucide-react"; 
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { SimilarItems } from "@/components/SimilarItems";
import { ReviewSection } from "@/components/ReviewSection";
import Autoplay from "embla-carousel-autoplay";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { extractIdFromSlug } from "@/lib/slugUtils";

// Define the specific colors
const TEAL_COLOR = "#008080"; // 0,128,128
const ORANGE_COLOR = "#FF9800"; // FF9800
const RED_COLOR = "#EF4444"; // Changed to a slightly softer red for better contrast/emphasis

interface Activity {
  name: string;
  price: number;
  numberOfPeople?: number; // Added for type safety in booking calculation
}

interface Trip {
  id: string;
  name: string;
  location: string;
  place: string;
  country: string;
  image_url: string;
  images: string[];
  gallery_images: string[];
  description: string;
  price: number;
  price_child: number;
  date: string;
  is_custom_date: boolean;
  available_tickets: number;
  phone_number: string;
  email: string;
  map_link: string;
  activities?: Activity[];
  created_by: string;
  latitude: number | null; // Added for completeness, often present on geo-items
  longitude: number | null; // Added for completeness, often present on geo-items
}

// --- Helper Component: Read-only Star Rating Display (Placeholder) ---
// Defined here for structural completeness, assuming this component exists elsewhere.
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


const TripDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null); // New State
  const [reviewCount, setReviewCount] = useState<number | null>(null); // New State
  
  const isSaved = savedItems.has(id || "");

  useEffect(() => {
    fetchTrip();
    
    // Track referral clicks
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get("ref");
    if (refId && id) {
      trackReferralClick(refId, id, "trip", "booking");
    }
  }, [id, user]);

  const handleSave = () => {
    if (id) {
      handleSaveItem(id, "trip");
    }
  };

  const fetchTrip = async () => {
    if (!id) return;
    try {
      // Try exact match first, then prefix match for slug-based IDs
      let { data, error } = await supabase.from("trips").select("*").eq("id", id).single();
      
      if (error && id.length === 8) {
        // Try prefix match for shortened IDs
        const { data: prefixData, error: prefixError } = await supabase
          .from("trips")
          .select("*")
          .ilike("id", `${id}%`)
          .single();
        if (!prefixError) {
          data = prefixData;
          error = null;
        }
      }
      
      if (error) throw error;
      setTrip(data as any);
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast({ title: "Error", description: "Failed to load trip details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!trip) {
      toast({ title: "Unable to Copy", description: "Trip information not available", variant: "destructive" });
      return;
    }

    const refLink = await generateReferralLink(trip.id, "trip", trip.id);

    try {
      await navigator.clipboard.writeText(refLink);
      toast({ 
        title: "Link Copied!", 
        description: user 
          ? "Share this link to earn commission on bookings!" 
          : "Share this trip with others!" 
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
    if (!trip) {
      toast({ title: "Unable to Share", description: "Trip information not available", variant: "destructive" });
      return;
    }

    const refLink = await generateReferralLink(trip.id, "trip", trip.id);

    if (navigator.share) {
      try {
        await navigator.share({ title: trip?.name, text: trip?.description, url: refLink });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else {
      await handleCopyLink();
    }
  };

  const openInMaps = () => {
    if (trip?.map_link) {
      window.open(trip.map_link, '_blank');
    } else {
      const query = encodeURIComponent(`${trip?.name}, ${trip?.location}, ${trip?.country}`);
      // Fixed the typo in the map URL construction
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!trip) return;
    
    setIsProcessing(true);
    
    try {
      // Calculate total amount including base price and activities
      const totalAmount = (data.num_adults * trip.price) + (data.num_children * trip.price_child) +
                         data.selectedActivities.reduce((sum, a) => sum + (a.price * a.numberOfPeople), 0);
      const totalPeople = data.num_adults + data.num_children;

      await submitBooking({
        itemId: trip.id,
        itemName: trip.name,
        bookingType: 'trip',
        totalAmount,
        slotsBooked: totalPeople,
        visitDate: trip.date,
        guestName: data.guest_name,
        guestEmail: data.guest_email,
        guestPhone: data.guest_phone,
        hostId: trip.created_by,
        bookingDetails: {
          trip_name: trip.name,
          date: trip.date,
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
        <Header />
        <div className="container px-4 py-6 max-w-6xl mx-auto">
          <div className="h-64 md:h-96 bg-muted animate-pulse rounded-lg" />
        </div>
        <MobileBottomBar />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Trip not found</p>
        </div>
        <MobileBottomBar />
      </div>
    );
  }

  const displayImages = [trip.image_url, ...(trip.gallery_images || []), ...(trip.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 max-w-6xl mx-auto">
        {/* Main Grid: 2/3rds for Content (Left), 1/3rd for Details/Actions (Right) */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6 sm:gap-4">
          
          {/* --- Image Carousel Section & Main Content (Left Column on large screens) --- */}
          <div className="order-1 lg:order-1 w-full"> 
            <div className="relative">
              {/* Back Button over carousel */}
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                className="absolute top-4 left-4 z-20 h-10 w-10 p-0 rounded-full text-white"
                style={{ backgroundColor: TEAL_COLOR }}
                size="icon"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Badge className="absolute top-4 right-4 sm:top-2 sm:right-2 bg-primary text-primary-foreground z-20 text-xs font-bold px-3 py-1">
                TRIP
              </Badge>

              <Carousel
                opts={{ loop: true }}
                plugins={[Autoplay({ delay: 3000 })]}
                className="w-full overflow-hidden"
                setApi={(api) => {
                  if (api) {
                    api.on("select", () => setCurrent(api.selectedScrollSnap()));
                  }
                }}
              >
                <CarouselContent
                  // Styling for Border Radius and Color
                  className={`
                    rounded-b-lg // Bottom radius for small screens
                    lg:rounded-b-none 
                    lg:rounded-br-lg // Bottom-right radius for large screens
                  `}
                  style={{ 
                    borderBottom: `2px solid ${TEAL_COLOR}`,
                    borderRight: `2px solid ${TEAL_COLOR}` // Right border for large screens
                  }}
                >
                  {displayImages.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <img 
                        src={img} 
                        alt={`${trip.name} ${idx + 1}`} 
                        loading="lazy" 
                        decoding="async" 
                        className="w-full h-64 md:h-96 object-cover" 
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              
              {/* Dot indicators */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                  {displayImages.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full transition-all ${current === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Description Section (Mobile Order 2, Desktop Order 2) */}
            {trip.description && (
              <div className="bg-card border rounded-lg p-4 sm:p-3 mt-4">
                <h2 className="text-lg sm:text-base font-semibold mb-2 sm:mb-1">About This Trip</h2>
                <p className="text-sm text-muted-foreground">{trip.description}</p>
              </div>
            )}
            
            {/* --- Included Activities Section (ORANGE) (Mobile Order 3, Desktop Order 3) --- */}
            {trip.activities && trip.activities.length > 0 && (
              <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Included Activities</h2>
                <div className="flex flex-wrap gap-2">
                  {trip.activities.map((activity, idx) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center"
                      style={{ backgroundColor: ORANGE_COLOR }}
                    >
                      <span className="font-medium">{activity.name}</span>
                      <span className="text-[10px] opacity-90">{activity.price === 0 ? 'Free' : `KSh ${activity.price}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* --- Review Section (Mobile Order 4, Desktop Order 4) --- */}
            <div className="mt-6 sm:mt-4">
              <ReviewSection 
                itemId={trip.id} 
                itemType="trip" 
                // Handler to capture the rating for the header display
                onRatingsChange={({ averageRating, reviewCount }: { averageRating: number | null, reviewCount: number | null }) => {
                    setAverageRating(averageRating);
                    setReviewCount(reviewCount);
                }}
              />
            </div>
            
          </div> {/* End of Left Column (order-1 lg:order-1) */}

          {/* --- Detail/Booking/Contact Section (Right Column on large screens, Stacked on small) --- */}
          <div className="order-2 lg:order-2 space-y-4 sm:space-y-3">
            <div>
              <h1 className="text-3xl sm:text-2xl font-bold mb-2">{trip.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-4 sm:mb-2">
                {/* Location Icon Teal */}
                <MapPin className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                <span className="sm:text-sm">{trip.location}, {trip.country}</span>
              </div>
            </div>

            {/* NEW: Overall Star Rating Display (Mobile Order: 5, Above Price Card) */}
            {averageRating !== null && (
                <div className="p-2 sm:p-0">
                    <StarRatingDisplay rating={averageRating} count={reviewCount} iconSize={6} />
                </div>
            )}

            {/* Price/Booking Card (Teal border) (Mobile Order 6, Desktop Order 2) */}
            <div className="space-y-3 p-4 sm:p-3 border bg-card rounded-lg" style={{ borderColor: TEAL_COLOR }}>
              <div className="flex items-center gap-2">
                {/* Calendar Icon Teal */}
                <Calendar className="h-5 w-5" style={{ color: TEAL_COLOR }} />
                <div>
                  <p className="text-sm sm:text-xs text-muted-foreground">Trip Date</p>
                  <p className="font-semibold sm:text-sm">{trip.is_custom_date ? "Flexible" : new Date(trip.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="border-t pt-3 sm:pt-2">
                <p className="text-sm sm:text-xs text-muted-foreground mb-1">Price (Per Adult)</p>
                {/* Price in Red */}
                <p className="text-2xl sm:text-xl font-bold" style={{ color: RED_COLOR }}>KSh {trip.price}</p>
                {trip.price_child > 0 && <p className="text-sm sm:text-xs text-muted-foreground">Child: KSh {trip.price_child}</p>}
                <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">Available Tickets: {trip.available_tickets}</p>
              </div>

              {/* Book Now Button Teal and dark hover */}
              <Button 
                size="lg" 
                className="w-full text-white h-10 sm:h-9" 
                onClick={() => { setIsCompleted(false); setBookingOpen(true); }}
                disabled={trip.available_tickets <= 0}
                style={{ backgroundColor: TEAL_COLOR }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005555')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL_COLOR)}
              >
                {trip.available_tickets <= 0 ? "Sold Out" : "Book Now"}
              </Button>
            </div>

            {/* Action Buttons (Mobile Order 7, Desktop Order 3) */}
            <div className="flex gap-2">
              {/* Map Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openInMaps} 
                className="flex-1 h-9"
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <MapPin className="h-4 w-4 md:mr-2" style={{ color: TEAL_COLOR }} />
                <span className="hidden md:inline">Map</span>
              </Button>
              {/* Copy Link Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyLink} 
                className="flex-1 h-9"
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <Copy className="h-4 w-4 md:mr-2" style={{ color: TEAL_COLOR }} />
                <span className="hidden md:inline">Copy Link</span>
              </Button>
              {/* Share Button: Border/Icon Teal */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare} 
                className="flex-1 h-9"
                style={{ borderColor: TEAL_COLOR, color: TEAL_COLOR }}
              >
                <Share2 className="h-4 w-4 md:mr-2" style={{ color: TEAL_COLOR }} />
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
            
            {/* --- Contact Information Section (Mobile Order 8, Desktop Order 4) --- */}
            {(trip.phone_number || trip.email) && (
              <div className="mt-4 p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-3">Contact Information</h2>
                <div className="space-y-2"> 
                  {trip.phone_number && (
                    <a 
                      href={`tel:${trip.phone_number}`}
                      className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                      style={{ borderColor: TEAL_COLOR }}
                    >
                      <Phone className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                      <span className="text-sm" style={{ color: TEAL_COLOR }}>{trip.phone_number}</span>
                    </a>
                  )}
                  {trip.email && (
                    <a 
                      href={`mailto:${trip.email}`}
                      className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
                      style={{ borderColor: TEAL_COLOR }}
                    >
                      <Mail className="h-4 w-4" style={{ color: TEAL_COLOR }} />
                      <span className="text-sm" style={{ color: TEAL_COLOR }}>{trip.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
            
          </div> {/* End of Right Column (order-2 lg:order-2) */}
        </div>

        {/* --- Similar Items Section (Full width below the main grid) --- */}
        {trip && <SimilarItems currentItemId={trip.id} itemType="trip" country={trip.country} />}
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <MultiStepBooking
            onSubmit={handleBookingSubmit}
            activities={trip.activities || []}
            priceAdult={trip.price}
            priceChild={trip.price_child}
            isProcessing={isProcessing}
            isCompleted={isCompleted}
            itemName={trip.name}
            // Trip-specific flags for MultiStepBooking
            skipDateSelection={!trip.is_custom_date} 
            fixedDate={trip.date}
            // Trips usually don't have facilities, only activities/slots
            skipFacilitiesAndActivities={false} 
            itemId={trip.id}
            bookingType="trip"
            hostId={trip.created_by || ""}
            onPaymentSuccess={() => setIsCompleted(true)}
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};

export default TripDetail;