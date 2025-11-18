import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Share2, Calendar } from "lucide-react";
import { BookTripDialog } from "@/components/booking/BookTripDialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext 
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

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
  available_tickets: number;
  phone_number: string;
  email: string;
  map_link: string;
}

import { SimilarItems } from "@/components/SimilarItems";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0); 

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTrip(data as any);
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast({
        title: "Error",
        description: "Failed to load trip details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip?.name,
          text: trip?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Trip link copied to clipboard",
      });
    }
  };

  const openInMaps = () => {
    if (trip?.map_link) {
      window.open(trip.map_link, '_blank');
    } else {
      const query = encodeURIComponent(`${trip?.name}, ${trip?.location}, ${trip?.country}`);
      // NOTE: Corrected the Google Maps URL structure for the fallback
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    }
  };

  if (loading) {
    // MODIFICATION: Changed loading background
    return <div className="min-h-screen **bg-orange-50**">Loading...</div>;
  }

  if (!trip) {
    // MODIFICATION: Changed not found background
    return <div className="min-h-screen **bg-orange-50**">Trip not found</div>;
  }

  const displayImages = trip.gallery_images?.length > 0 
    ? trip.gallery_images 
    : trip.images?.length > 0 
    ? trip.images 
    : [trip.image_url];

  return (
    // MODIFICATION: Changed the main background class to bg-orange-50 (light orange)
    <div className="min-h-screen **bg-orange-50** pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 py-6 max-w-6xl mx-auto">
        {/* Desktop: Info left, carousel right. Mobile: carousel then info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          
          {/* LEFT COLUMN ON DESKTOP: Name, Map, Date (hidden on mobile) */}
          <div className="hidden md:block space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
              <p className="text-muted-foreground">{trip.location}, {trip.country}</p>
            </div>
            
            <Button
              variant="outline"
              onClick={openInMaps}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
            </Button>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{new Date(trip.date).toLocaleDateString()}</span>
              </div>
              {trip.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href={`tel:${trip.phone_number}`}>{trip.phone_number}</a>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN ON DESKTOP / TOP ON MOBILE: Image Gallery Carousel */}
          <div className="relative w-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white text-gray-800 rounded-full shadow-md"
            >
              <Share2 className="h-5 w-5" />
            </Button>

            <Carousel
              opts={{ loop: true }}
              plugins={[Autoplay({ delay: 4000 })]}
            >
              <CarouselContent>
                {displayImages.map((img, idx) => (
                  <CarouselItem key={idx}>
                    <img
                      src={img}
                      alt={`${trip.name} ${idx + 1}`}
                      className="w-full h-64 md:h-96 object-cover" 
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious 
                className="left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" 
              />
              <CarouselNext 
                className="right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" 
              />
              
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                  {displayImages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === current ? 'bg-white' : 'bg-white/40' 
                      }`}
                    />
                  ))}
                </div>
              )}
            </Carousel>
          </div>

          {/* MOBILE ONLY: Name, Map, Date below carousel */}
          <div className="md:hidden space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
              <p className="text-muted-foreground">{trip.location}, {trip.country}</p>
            </div>
            
            <Button
              variant="outline"
              onClick={openInMaps}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
            </Button>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{new Date(trip.date).toLocaleDateString()}</span>
              </div>
              {trip.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href={`tel:${trip.phone_number}`}>{trip.phone_number}</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BELOW CAROUSEL: Description and Booking sidebar */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4 p-4 md:p-6 border rounded-lg bg-card shadow-sm">
            <h2 className="text-xl font-semibold">About This Trip</h2>
            <p className="text-muted-foreground">{trip.description}</p>
          </div>

          {/* Pricing and Booking (Sidebar) */}
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-lg border space-y-4 shadow-sm">
              <h3 className="font-semibold text-lg">Trip Details & Booking</h3>
              <div className="pt-2 border-t space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Adult Price</p>
                  <p className="text-2xl font-bold">${trip.price}</p>
                </div>
                {trip.price_child > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Child Price</p>
                    <p className="text-xl font-semibold">${trip.price_child}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Available Tickets</p>
                  <p className="text-lg font-semibold">{trip.available_tickets}</p>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setBookingOpen(true)}
                disabled={trip.available_tickets === 0 || new Date(trip.date) < new Date()}
              >
                {new Date(trip.date) < new Date() 
                  ? 'Trip Passed' 
                  : trip.available_tickets === 0 
                  ? 'Sold Out' 
                  : 'Book Now'}
              </Button>
            </div>
          </div>
        </div>

        {trip && <SimilarItems currentItemId={trip.id} itemType="trip" country={trip.country} />}
      </main>

      <BookTripDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        trip={trip}
      />

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default TripDetail;