import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy, Star } from "lucide-react"; 
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"; 
import Autoplay from "embla-carousel-autoplay";
import { ReviewSection } from "@/components/ReviewSection";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useAuth } from "@/contexts/AuthContext";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { generateReferralLink, trackReferralClick } from "@/lib/referralUtils";
import { useBookingSubmit } from "@/hooks/useBookingSubmit";
import { extractIdFromSlug } from "@/lib/slugUtils";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";

// Define the specific colors
const TEAL_COLOR = "#008080"; 
const RED_COLOR = "#FF0000"; // Used for Amenities, Entry Fee
const ORANGE_COLOR = "#FF9800"; // Used for Activities, Star Rating

interface Facility { name: string; price: number; capacity?: number; }
interface Activity { name: string; price: number; numberOfPeople: number; }

interface AdventurePlace {
  id: string;
  name: string;
  local_name: string | null;
  location: string;
  place: string;
  country: string;
  image_url: string;
  images: string[];
  gallery_images: string[];
  description: string;
  entry_fee: number;
  entry_fee_type: string;
  phone_numbers: string[];
  email: string;
  facilities: Facility[];
  activities: Activity[];
  amenities: string[];
  registration_number: string;
  map_link: string;
  opening_hours: string | null;
  closing_hours: string | null;
  days_opened: string[] | null;
  available_slots: number;
  created_by: string;
  latitude: number | null;
  longitude: number | null;
}

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


const AdventurePlaceDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { position, requestLocation } = useGeolocation();

  const [place, setPlace] = useState<AdventurePlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const isSaved = savedItems.has(id || "");

  const distance = position && place?.latitude && place?.longitude
    ? calculateDistance(position.latitude, position.longitude, place.latitude, place.longitude)
    : undefined;

  // Location Request Logic (Kept as-is)
  useEffect(() => {
    const handleInteraction = () => {
      requestLocation();
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [requestLocation]);

  // Fetch Place Logic (Kept as-is)
  useEffect(() => {
    fetchPlace();

    const urlParams = new URLSearchParams(window.location.search);
    const refSlug = urlParams.get("ref");
    if (refSlug && id) {
      trackReferralClick(refSlug, id, "adventure_place", "booking");
    }
  }, [id]);

  const fetchPlace = async () => {
    if (!id) return;
    try {
      let { data, error } = await supabase.from("adventure_places").select("*").eq("id", id).single();

      if (error && id.length === 8) {
        const { data: prefixData, error: prefixError } = await supabase
          .from("adventure_places")
          .select("*")
          .ilike("id", `${id}%`)
          .single();
        if (!prefixError) {
          data = prefixData;
          error = null;
        }
      }

      if (error) throw error;
      setPlace(data as any);
    } catch (error) {
      console.error("Error fetching adventure place:", error);
      toast({ title: "Error", description: "Failed to load place details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => { if (id) handleSaveItem(id, "adventure_place"); };
  const handleCopyLink = async () => { /* ... (Kept as-is) ... */ };
  const handleShare = async () => { /* ... (Kept as-is) ... */ };
  const openInMaps = () => { /* ... (Kept as-is) ... */ };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => { /* ... (Kept as-is) ... */ };

  if (loading || !place) return <div className="min-h-screen bg-background pb-20 md:pb-0"><Header /><div className="container px-4 py-6"><div className="h-96 bg-muted animate-pulse rounded-lg" /></div><MobileBottomBar /></div>;

  const displayImages = [place.image_url, ...(place.gallery_images || []), ...(place.images || [])].filter(Boolean);

  // --- Content Blocks for New Mobile Order ---

  const locationBlock = (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {/* Location Icon Teal */}
        <MapPin className="h-4 w-4" style={{ color: TEAL_COLOR }} />
        <span className="sm:text-sm">{place.location}, {place.country}</span>
        {distance !== undefined && (
          <span className="text-xs font-medium ml-auto" style={{ color: TEAL_COLOR }}>
            {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`}
          </span>
        )}
      </div>
      {place.place && (
        <p className="text-sm sm:text-xs text-muted-foreground mb-4 sm:mb-2">Place: {place.place}</p>
      )}
    </div>
  );

  const ratingBlock = averageRating !== null ? (
    <div className="p-2 sm:p-0">
      <StarRatingDisplay rating={averageRating} count={reviewCount} iconSize={6} />
    </div>
  ) : null;

  const hoursPriceBlock = (
    <div className="space-y-3 p-4 sm:p-3 border bg-card rounded-lg" style={{ borderColor: TEAL_COLOR }}>
      {/* Operating Hours */}
      {(place.opening_hours || place.closing_hours) && (
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" style={{ color: TEAL_COLOR }} />
          <div>
            <p className="text-sm sm:text-xs text-muted-foreground">Operating Hours</p>
            <p className="font-semibold sm:text-sm">
              {(place.opening_hours || place.closing_hours) 
              ? `${place.opening_hours || 'N/A'} - ${place.closing_hours || 'N/A'}`
              : 'Not specified'}
            </p>
            {place.days_opened && place.days_opened.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{place.days_opened.join(', ')}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Entry Fee */}
      <div className={`${place.opening_hours || place.closing_hours ? 'border-t pt-3 sm:pt-2' : ''}`}>
        <p className="text-sm sm:text-xs text-muted-foreground mb-1">Entry Fee</p>
        <p className="text-2xl sm:text-xl font-bold" style={{ color: RED_COLOR }}>
          {place.entry_fee_type === 'free' ? 'Free Entry' :
            place.entry_fee ? `KSh ${place.entry_fee}` : 'Contact for pricing'}
        </p>
        {place.available_slots !== null && place.available_slots !== undefined && (
          <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">Available Slots: {place.available_slots}</p>
        )}
      </div>
    </div>
  );

  const descriptionBlock = place.description && (
    <div className="bg-card border rounded-lg p-4 sm:p-3 mt-4">
      <h2 className="text-lg sm:text-base font-semibold mb-2 sm:mb-1">About This Place</h2>
      <p className="text-sm text-muted-foreground">{place.description}</p>
    </div>
  );

  const amenitiesBlock = place.amenities && place.amenities.length > 0 && (
    <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg">
      <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Amenities</h2>
      <div className="flex flex-wrap gap-2">
        {place.amenities.map((amenity: any, idx: number) => (
          <div
            key={idx}
            className="px-3 py-1.5 text-white rounded-full text-xs flex items-center justify-center text-center"
            style={{ backgroundColor: RED_COLOR }}
          >
            <span className="font-medium">{amenity}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const facilitiesBlock = place.facilities && place.facilities.length > 0 && (
    <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg">
      <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Facilities (Rentable Spaces)</h2>
      <div className="flex flex-wrap gap-2">
        {place.facilities.map((facility: Facility, idx: number) => (
          <div
            key={idx}
            className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center"
            style={{ backgroundColor: TEAL_COLOR }}
          >
            <span className="font-medium">{facility.name}</span>
            <span className="text-[10px] opacity-90">{facility.price === 0 ? 'Free' : `KSh ${facility.price}/day`}</span>
            {facility.capacity && <span className="text-[10px] opacity-90">Cap: {facility.capacity}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const activitiesBlock = place.activities && place.activities.length > 0 && (
    <div className="mt-6 sm:mt-4 p-4 sm:p-3 border bg-card rounded-lg">
      <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Activities (Bookable Experiences)</h2>
      <div className="flex flex-wrap gap-2">
        {place.activities.map((activity: Activity, idx: number) => (
          <div
            key={idx}
            className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center"
            style={{ backgroundColor: ORANGE_COLOR }}
          >
            <span className="font-medium">{activity.name}</span>
            <span className="text-[10px] opacity-90">{activity.price === 0 ? 'Free' : `KSh ${activity.price}/person`}</span>
          </div>
        ))}
      </div>
    </div>
  );
  
  const actionButtonsBlock = (
    <div className="flex gap-2 mt-4 sm:mt-3">
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
    </div>
  );

  const bookNowButton = (
    <Button
      size="lg"
      className="w-full text-white h-10 sm:h-9 mt-4 sm:mt-3"
      onClick={() => { setIsCompleted(false); setBookingOpen(true); }}
      style={{ backgroundColor: TEAL_COLOR }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005555')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL_COLOR)}
    >
      Book Now
    </Button>
  );

  const contactInfoBlock = (
    (place.phone_numbers || place.email) && (
      <div className="mt-4 p-4 sm:p-3 border bg-card rounded-lg">
        <h2 className="text-xl sm:text-lg font-semibold mb-3">Contact Information</h2>
        <div className="space-y-2">
          {place.phone_numbers?.map((phone, idx) => (
            <a
              key={idx}
              href={`tel:${phone}`}
              className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
              style={{ borderColor: TEAL_COLOR }}
            >
              <Phone className="h-4 w-4" style={{ color: TEAL_COLOR }} />
              <span className="text-sm" style={{ color: TEAL_COLOR }}>{phone}</span>
            </a>
          ))}
          {place.email && (
            <a
              href={`mailto:${place.email}`}
              className="flex items-center gap-2 px-4 py-3 border rounded-lg hover:bg-muted transition-colors"
              style={{ borderColor: TEAL_COLOR }}
            >
              <Mail className="h-4 w-4" style={{ color: TEAL_COLOR }} />
              <span className="text-sm" style={{ color: TEAL_COLOR }}>{place.email}</span>
            </a>
          )}
        </div>
      </div>
    )
  );

  const reviewSection = (
    <div className="mt-6 sm:mt-4">
      <ReviewSection 
        itemId={place.id} 
        itemType="adventure_place" 
        onRatingsChange={({ averageRating, reviewCount }: { averageRating: number | null, reviewCount: number | null }) => {
            setAverageRating(averageRating);
            setReviewCount(reviewCount);
        }}
      />
    </div>
  );

  // -------------------------------------------------------------
  // --- MAIN RENDER ---
  // -------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Hide Header on small screens */}
      <Header className="hidden md:block" /> 

      {/* The -mt-4 pulls the content up on mobile to touch the top of the screen (assuming a typical Header/Nav of h-16 or similar is present and hidden/no margin for mobile) */}
      <main className="container px-0 sm:px-4 max-w-6xl mx-auto -mt-4 sm:mt-0"> 
        {/* Main Grid: Mobile is stacked, Desktop is 2/3rds + 1/3rd */}
        <div className="grid lg:grid-cols-[2fr,1fr] gap-6 sm:gap-4">
          
          {/* --- Image Carousel Section & Main Content (Left Column on large screens) --- */}
          <div className="w-full">
            <div className="relative">
              
              {/* Back Button over carousel - Always show */}
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 z-20 h-10 w-10 p-0 rounded-full text-white"
                style={{ backgroundColor: TEAL_COLOR }}
                size="icon"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              {/* Save Button - Moved to top right of carousel for all screens */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleSave}
                className={`absolute top-4 right-4 z-20 h-10 w-10 p-0 rounded-full text-white ${isSaved ? "bg-red-500 hover:bg-red-600" : ""}`}
                style={{ backgroundColor: isSaved ? RED_COLOR : TEAL_COLOR, borderColor: TEAL_COLOR, color: 'white' }}
              >
                <Heart className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`} />
              </Button>

              <Carousel
                opts={{ loop: true }}
                plugins={[Autoplay({ delay: 3000 })]}
                className="w-full overflow-hidden"
                setApi={(api) => {
                  if (api) api.on("select", () => setCurrent(api.selectedScrollSnap()));
                }}
              >
                <CarouselContent 
                  // Full width on small screens, rounded corners on large screens
                  className={`
                    rounded-none // No border radius on small screen
                    lg:rounded-b-lg // Bottom radius for large screens
                    lg:rounded-tr-lg // Top right radius for large screens
                    ${place.local_name ? 'h-64 md:h-96' : 'h-64 md:h-96'} // Height fix
                  `}
                  style={{ 
                    // Custom border only for large screens
                    border: window.innerWidth >= 1024 ? `2px solid ${TEAL_COLOR}` : 'none',
                    // Ensure top left is rounded if on large screen
                    borderRadius: window.innerWidth >= 1024 ? '0 10px 10px 10px' : '0',
                  }}
                >
                  {displayImages.map((img, idx) => <CarouselItem key={idx}><img src={img} alt={`${place.name} ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" /></CarouselItem>)}
                </CarouselContent>
              </Carousel>

              {/* Place Name Overlay */}
              <div className="absolute bottom-0 left-0 p-4 z-10 w-full">
                <h1 
                  className="text-3xl sm:text-2xl font-bold text-white inline-block px-3 py-1 rounded"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                >
                  {place.name}
                </h1>
                {place.local_name && (
                  <p 
                    className="text-lg sm:text-base text-white inline-block px-3 py-1 rounded ml-2"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                  >
                    "{place.local_name}"
                  </p>
                )}
              </div>

              {/* Dot indicators */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-2 z-10">
                  {displayImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${current === idx ? 'bg-white w-4' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* --- Content Section (Mobile/Left Column) - New Order --- */}
            <div className="px-4 sm:px-0 mt-4 space-y-4">
              
              {/* 1. Location Detail */}
              {locationBlock}
              
              {/* 2. Opening Hours and Prices */}
              {hoursPriceBlock}

              {/* 3. Description */}
              {descriptionBlock}
              
              {/* 4. Amenities */}
              {amenitiesBlock}

              {/* 5. Facilities */}
              {facilitiesBlock}
              
              {/* 6. Activities */}
              {activitiesBlock}
              
              {/* 7. Map Link / Share / Copy Section (moved up) */}
              {actionButtonsBlock}
              
              {/* 8. Book Now Button (moved up) */}
              {bookNowButton}

              {/* 9. Contact Email/Phone Button (moved up) */}
              {contactInfoBlock}

              {/* 10. Rating/Review Section (Always at the bottom of main content) */}
              {ratingBlock}
              {reviewSection}
            </div>
          </div> {/* End of Left/Full Width Column */}


          {/* --- Right Column on Large Screens (Only Contact Info/Redundant Blocks) --- */}
          <div className="hidden lg:block space-y-4 pt-4">
            {/* Contact Information Section (Keep here for desktop visibility) */}
            {contactInfoBlock} 
          </div> 
        </div>


        {/* --- Similar Items Section (Full width below the main grid) --- */}
        {place && <SimilarItems currentItemId={place.id} itemType="adventure" country={place.country} />}
      </main>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <MultiStepBooking
            onSubmit={handleBookingSubmit}
            facilities={place.facilities || []}
            activities={place.activities || []}
            priceAdult={place.entry_fee_type === 'free' ? 0 : place.entry_fee}
            priceChild={place.entry_fee_type === 'free' ? 0 : place.entry_fee}
            entranceType={place.entry_fee_type}
            isProcessing={isProcessing}
            isCompleted={isCompleted}
            itemName={place.name}
            itemId={place.id}
            bookingType="adventure_place"
            hostId={place.created_by || ""}
            onPaymentSuccess={() => setIsCompleted(true)}
          />
        </DialogContent>
      </Dialog>

      <MobileBottomBar />
    </div>
  );
};
export default AdventurePlaceDetail;