import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Share2, Mail, Clock, ArrowLeft, Heart, Copy } from "lucide-react";
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
const TEAL_COLOR = "#008080"; // Icons, Links, Book Button, Facilities, Carousel Border
const RED_COLOR = "#FF0000"; // Amenities, Entry Fee price
const ORANGE_COLOR = "#FF9800"; // Activities

interface Facility { name: string; price: number; capacity?: number; }
interface Activity { name: string; price: number; }

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

const AdventurePlaceDetail = () => {
  const { slug } = useParams();
  const id = slug ? extractIdFromSlug(slug) : null;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { position, requestLocation } = useGeolocation();
  
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
  const [place, setPlace] = useState<AdventurePlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const isSaved = savedItems.has(id || "");

  const distance = position && place?.latitude && place?.longitude
    ? calculateDistance(position.latitude, position.longitude, place.latitude, place.longitude)
    : undefined;

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

  const handleCopyLink = async () => {
    if (!place) {
      toast({ title: "Unable to Copy", description: "Place information not available", variant: "destructive" });
      return;
    }

    const refLink = await generateReferralLink(place.id, "adventure_place", place.id);

    try {
      await navigator.clipboard.writeText(refLink);
      toast({ 
        title: "Link Copied!", 
        description: user 
          ? "Share this link to earn commission on bookings!" 
          : "Share this place with others!" 
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
    if (!place) {
      toast({ title: "Unable to Share", description: "Place information not available", variant: "destructive" });
      return;
    }

    const refLink = await generateReferralLink(place.id, "adventure_place", place.id);

    if (navigator.share) {
      try { 
        await navigator.share({ title: place?.name, text: place?.description, url: refLink }); 
      } catch (error) { 
        console.log("Share failed:", error); 
      }
    } else {
      await handleCopyLink();
    }
  };

  const openInMaps = () => {
    if (place?.map_link) {
      window.open(place.map_link, '_blank');
    } else {
      const query = encodeURIComponent(`${place?.name}, ${place?.location}, ${place?.country}`);
      // Fixed the URL to be a standard Google Maps URL
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const { submitBooking } = useBookingSubmit();

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!place) return;
    setIsProcessing(true);

    try {
      // Calculate total amount including entry fee for adults/children and cost of selected facilities/activities
      const totalAmount = (data.num_adults * (place.entry_fee_type === 'free' ? 0 : place.entry_fee)) +
                         (data.num_children * (place.entry_fee_type === 'free' ? 0 : place.entry_fee)) +
                         data.selectedFacilities.reduce((sum, f) => { 
                           if (f.startDate && f.endDate) {
                             // Calculate number of full days booked (minimum 1 day)
                             const days = Math.ceil((new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / (1000 * 60 * 60 * 24));
                             return sum + (f.price * Math.max(days, 1));
                           }
                           return sum + f.price;
                         }, 0) +
                         data.selectedActivities.reduce((sum, a) => sum + (a.price * a.numberOfPeople), 0);
      const totalPeople = data.num_adults + data.num_children;

      await submitBooking({
        itemId: place.id,
        itemName: place.name,
        bookingType: 'adventure_place',
        totalAmount,
        slotsBooked: totalPeople,
        visitDate: data.visit_date,
        guestName: data.guest_name,
        guestEmail: data.guest_email,
        guestPhone: data.guest_phone,
        hostId: place.created_by,
        bookingDetails: {
          place_name: place.name,
          adults: data.num_adults,
          children: data.num_children,
          facilities: data.selectedFacilities,
          activities: data.selectedActivities
        }
      });
      
      setIsProcessing(false);
      setIsCompleted(true);
      toast({ title: "Booking Submitted", description: "Your booking has been saved. Check your email for confirmation." });
    } catch (error: any) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (loading || !place) return <div className="min-h-screen bg-background"><Header className="hidden md:block" /><div className="h-96 bg-muted animate-pulse" /><MobileBottomBar /></div>;

  const displayImages = [place.image_url, ...(place.gallery_images || []), ...(place.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header hidden on small screen / PWA mode */}
      <Header className="hidden md:block" /> 
      
      {/* FULL-WIDTH SLIDESHOW SECTION: Moved outside the main container to ensure full screen width on mobile */}
      <div className="relative w-full overflow-hidden md:max-w-6xl md:mx-auto">
        {/* Back Button: Top Left, Dark RGBA */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 z-30 h-10 w-10 p-0 rounded-full text-white md:left-8" // Increased Z-index and adjusted md:left
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} // Dark RGBA
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
          style={{ backgroundColor: isSaved ? RED_COLOR : 'rgba(0, 0, 0, 0.5)' }} // Dark RGBA or RED if saved
        >
          <Heart className={`h-5 w-5 ${isSaved ? "fill-white" : ""}`} />
        </Button>

        <Carousel 
          opts={{ loop: true }} 
          plugins={[Autoplay({ delay: 3000 })]} 
          className="w-full overflow-hidden"
          style={{ 
            borderBottom: `2px solid ${TEAL_COLOR}`, // Teal bottom border for small/big screen
            marginTop: 0, 
            width: '100%', 
            maxHeight: '600px' // Added max height for larger screens
          }}
          setApi={(api) => {
            if (api) api.on("select", () => setCurrent(api.selectedScrollSnap()));
          }}
        >
          <CarouselContent>
            {displayImages.map((img, idx) => (
              <CarouselItem key={idx}>
                <img 
                  src={img} 
                  alt={`${place.name} ${idx + 1}`} 
                  loading="lazy" 
                  decoding="async" 
                  className="w-full h-[60vh] md:h-96 lg:h-[500px] object-cover" // Ensure height consistency
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Name Overlay: Fading RGBA, concentrated at center bottom (Updated for Bold and Capital) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-20 text-white bg-gradient-to-t from-black/80 via-black/50 to-transparent">
          <h1 className="text-3xl sm:text-2xl font-bold mb-0"><strong>{place.name.toUpperCase()}</strong></h1>
          {place.local_name && (
            <p className="text-lg sm:text-base text-white/90 mb-0">"{place.local_name}"</p>
          )}
        </div>
        
        {/* Dot indicators - UPDATED for right alignment */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2 z-30 justify-end md:right-8">
            {displayImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${current === idx ? 'bg-white w-4' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Main Content starts here, contained by the max-width wrapper */}
      <main className="container px-4 max-w-6xl mx-auto mt-4 sm:mt-6">
        {/* Mobile: flex-col with explicit order. Desktop: grid with explicit order */}
        <div className="flex flex-col lg:grid lg:grid-cols-[2fr,1fr] gap-6 sm:gap-4">
          
          {/* Mobile Order 1: Booking Card (Working hours/Days, Price, Book Now Button) 
             On desktop (lg), this becomes the entire right column (order-3). */}
          <div className="space-y-4 sm:space-y-3 order-1 lg:order-3">
            
            {/* Booking Card (Operating Hours/Availability/Booking Button) */}
            <div className="space-y-3 p-4 sm:p-3 border bg-card rounded-lg">
              {(place.opening_hours || place.closing_hours) && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: TEAL_COLOR }} />
                  <div>
                    <p className="text-sm sm:text-xs text-muted-foreground">Working Hours & Days</p>
                    <p className="font-semibold sm:text-sm">
                      {place.opening_hours || 'N/A'} - {place.closing_hours || 'N/A'}
                    </p>
                    {place.days_opened && place.days_opened.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{place.days_opened.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className={`${place.opening_hours || place.closing_hours ? 'border-t pt-3 sm:pt-2' : ''}`}>
                <p className="text-sm sm:text-xs text-muted-foreground mb-1">Entry Fee</p>
                <p 
                  className="text-2xl sm:text-xl font-bold"
                  style={{ color: RED_COLOR }} 
                >
                  {place.entry_fee_type === 'free' ? 'Free Entry' : 
                    place.entry_fee ? `KSh ${place.entry_fee}` : 'Contact for pricing'}
                </p>
                {place.available_slots !== null && place.available_slots !== undefined && (
                    <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">Available Slots: {place.available_slots}</p>
                )}
              </div>

              {/* Book Now Button */}
              <Button 
                size="lg" 
                className="w-full text-white h-10 sm:h-9" 
                onClick={() => { setIsCompleted(false); setBookingOpen(true); }}
                style={{ backgroundColor: TEAL_COLOR }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#005555')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL_COLOR)}
              >
                Book Now
              </Button>
            </div>

            {/* Contact Information Section (In right column on desktop / below booking on mobile) */}
            {(place.phone_numbers || place.email) && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Contact Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
            )}
          </div>
          
          {/* Mobile Order 2: Location/Share/About/Amenities/Facilities/Activities 
             On desktop (lg), this becomes the entire left column (order-1). */}
          <div className="w-full space-y-4 order-2 lg:order-1">
            
            {/* Location/Distance/Details section (Location link) */}
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
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
            
            {/* Mobile Order 2.1: Action Buttons (Map, Copy, Share) */}
            <div className="flex gap-2">
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
            
            {/* Mobile Order 3: Description Section (About) */}
            {place.description && (
              <div className="bg-card border rounded-lg p-4 sm:p-3">
                <h2 className="text-lg sm:text-base font-semibold mb-2 sm:mb-1">About This Place</h2>
                <p className="text-sm text-muted-foreground">{place.description}</p>
              </div>
            )}

            {/* Mobile Order 4: Amenities Section (RED) - Rounded Buttons */}
            {place.amenities && place.amenities.length > 0 && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
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
            )}

            {/* Mobile Order 5: Facilities Section (TEAL) - Rounded Buttons */}
            {place.facilities && place.facilities.length > 0 && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Facilities (Rentable Spaces)</h2>
                <div className="flex flex-wrap gap-2">
                  {place.facilities.map((facility: Facility, idx: number) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center leading-tight"
                      style={{ backgroundColor: TEAL_COLOR }} 
                    >
                      <span className="font-medium">{facility.name}</span>
                      <span className="text-[10px] opacity-90">{facility.price === 0 ? 'Free' : `KSh ${facility.price}/day`}</span>
                      {facility.capacity && <span className="text-[10px] opacity-90">Cap: {facility.capacity}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Order 6: Activities Section (ORANGE) - Rounded Buttons */}
            {place.activities && place.activities.length > 0 && (
              <div className="p-4 sm:p-3 border bg-card rounded-lg">
                <h2 className="text-xl sm:text-lg font-semibold mb-4 sm:mb-3">Activities (Bookable Experiences)</h2>
                <div className="flex flex-wrap gap-2">
                  {place.activities.map((activity: Activity, idx: number) => (
                    <div 
                      key={idx} 
                      className="px-3 py-1.5 text-white rounded-full text-xs flex flex-col items-center justify-center text-center leading-tight"
                      style={{ backgroundColor: ORANGE_COLOR }}
                    >
                      <span className="font-medium">{activity.name}</span>
                      <span className="text-[10px] opacity-90">{activity.price === 0 ? 'Free' : `KSh ${activity.price}/person`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Mobile Order 7: Review Section (Rating) - Placed outside the grid for proper ordering flow */}
        <div className="mt-6 sm:mt-4">
          <ReviewSection itemId={place.id} itemType="adventure_place" />
        </div>

        {/* --- Similar Items Section --- */}
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