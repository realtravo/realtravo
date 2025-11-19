import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Share2, Calendar, Mail } from "lucide-react";
import { BookEventDialog } from "@/components/booking/BookEventDialog";
import { SimilarItems } from "@/components/SimilarItems";
import { useToast } from "@/hooks/use-toast";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselPrevious, 
  CarouselNext 
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Event {
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
  price_vip: number;
  price_vvip: number;
  price_regular: number;
  price_child: number;
  date: string;
  available_tickets: number;
  phone_number: string;
  email: string;
  map_link: string;
}

const EventDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  // State for current slide index to implement custom dots
  const [current, setCurrent] = useState(0); 

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setEvent(data as any);
    } catch (error) {
      console.error("Error fetching event:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
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
          title: event?.name,
          text: event?.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Share failed:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard",
      });
    }
  };

  const openInMaps = () => {
    if (event?.map_link) {
      window.open(event.map_link, '_blank');
    } else {
      const query = encodeURIComponent(`${event?.name}, ${event?.location}, ${event?.country}`);
      // Corrected the Google Maps URL structure for the fallback
      window.open(`https://maps.google.com/?q=${query}`, '_blank');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background">Loading...</div>;
  }

  if (!event) {
    return <div className="min-h-screen bg-background">Event not found</div>;
  }

  const displayImages = event.gallery_images?.length > 0 
    ? event.gallery_images 
    : event.images?.length > 0 
    ? event.images 
    : [event.image_url];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 py-6 max-w-6xl mx-auto">
        {/* Image Gallery Carousel */}
        <div className="w-full mb-6">
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 3000 })]}
            className="w-full"
            setApi={(api) => {
                if (api) {
                  api.on("select", () => {
                      setCurrent(api.selectedScrollSnap());
                  });
                }
            }}
          >
            <CarouselContent>
              {displayImages.map((img, idx) => (
                <CarouselItem key={idx}>
                  <img
                    src={img}
                    alt={`${event.name} ${idx + 1}`}
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
                                index === current
                                    ? 'bg-white'
                                    : 'bg-white/40'
                            }`}
                        />
                    ))}
                </div>
            )}
          </Carousel>
        </div>

        {/* Title, Location on left, Map & Share buttons on right */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold">{event.name}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{event.location}, {event.country}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={openInMaps}
              className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600 text-xs md:text-sm"
            >
              <MapPin className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              View on Map
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Share2 className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6 p-4 md:p-6 border rounded-lg bg-card shadow-sm">
            {/* Date, Phone, and Email Group */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-xs md:text-base">{new Date(event.date).toLocaleDateString()}</span>
              </div>
              {event.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <a href={`tel:${event.phone_number}`} className="text-xs md:text-base">{event.phone_number}</a>
                </div>
              )}
              {event.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <a href={`mailto:${event.email}`} className="text-xs md:text-base">{event.email}</a>
                </div>
              )}
            </div>

            {/* About Section (Description) */}
            <div className="pt-4 border-t">
              <h2 className="text-lg md:text-xl font-semibold mb-2">About This Event</h2>
              <p className="text-xs md:text-base text-muted-foreground">{event.description}</p>
            </div>
          </div>

          {/* Ticket Prices and Booking (Sidebar) */}
          <div className="space-y-4">
            <div className="bg-card p-6 rounded-lg border space-y-3 shadow-sm">
              <h3 className="font-semibold text-base md:text-lg">Ticket Prices</h3>
              {/* Individual Price Tiers */}
              {event.price_vvip > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs md:text-sm">VVIP</span>
                  <span className="font-semibold text-xs md:text-base">${event.price_vvip}</span>
                </div>
              )}
              {event.price_vip > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs md:text-sm">VIP</span>
                  <span className="font-semibold text-xs md:text-base">${event.price_vip}</span>
                </div>
              )}
              {event.price_regular > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs md:text-sm">Regular</span>
                  <span className="font-semibold text-xs md:text-base">${event.price_regular}</span>
                </div>
              )}
              {event.price_child > 0 && (
                <div className="flex justify-between">
                  <span className="text-xs md:text-sm">Child</span>
                  <span className="font-semibold text-xs md:text-base">${event.price_child}</span>
                </div>
              )}
              {/* Available Tickets */}
              <div className="pt-2 border-t">
                <p className="text-xs md:text-sm text-muted-foreground">Available Tickets</p>
                <p className="text-base md:text-lg font-semibold">{event.available_tickets}</p>
              </div>
              {/* Book Button */}
              <Button 
                className="w-full text-xs md:text-sm" 
                onClick={() => setBookingOpen(true)}
                disabled={event.available_tickets === 0 || new Date(event.date) < new Date()}
              >
                {new Date(event.date) < new Date() 
                  ? 'Event Passed' 
                  : event.available_tickets === 0 
                  ? 'Sold Out' 
                  : 'Book Now'}
              </Button>
            </div>
          </div>
        </div>

        {event && <SimilarItems currentItemId={event.id} itemType="event" country={event.country} />}
      </main>

      <BookEventDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        event={event}
      />

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default EventDetail;