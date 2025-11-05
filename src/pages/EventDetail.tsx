import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Share2, Calendar } from "lucide-react";
import { BookEventDialog } from "@/components/booking/BookEventDialog";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
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
      setEvent(data);
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
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
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
        <Button
          variant="ghost"
          onClick={handleShare}
          className="absolute top-20 left-4 z-10 bg-background/80 backdrop-blur-sm"
        >
          <Share2 className="h-5 w-5" />
        </Button>

        {/* Image Gallery Carousel */}
        <Carousel
          opts={{ loop: true }}
          plugins={[Autoplay({ delay: 3000 })]}
          className="w-full mb-6"
        >
          <CarouselContent>
            {displayImages.map((img, idx) => (
              <CarouselItem key={idx}>
                <img
                  src={img}
                  alt={`${event.name} ${idx + 1}`}
                  className="w-full h-64 md:h-96 object-cover rounded-lg"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
              <p className="text-muted-foreground">{event.location}, {event.country}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
              </div>
              {event.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href={`tel:${event.phone_number}`}>{event.phone_number}</a>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">About This Event</h2>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={openInMaps}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              View on Map
            </Button>

            <div className="bg-card p-6 rounded-lg border space-y-3">
              <h3 className="font-semibold">Ticket Prices</h3>
              {event.price_vvip > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">VVIP</span>
                  <span className="font-semibold">${event.price_vvip}</span>
                </div>
              )}
              {event.price_vip > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">VIP</span>
                  <span className="font-semibold">${event.price_vip}</span>
                </div>
              )}
              {event.price_regular > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Regular</span>
                  <span className="font-semibold">${event.price_regular}</span>
                </div>
              )}
              {event.price_child > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Child</span>
                  <span className="font-semibold">${event.price_child}</span>
                </div>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Available Tickets</p>
                <p className="text-lg font-semibold">{event.available_tickets}</p>
              </div>
              <Button 
                className="w-full" 
                onClick={() => setBookingOpen(true)}
                disabled={event.available_tickets === 0}
              >
                {event.available_tickets === 0 ? 'Sold Out' : 'Book Now'}
              </Button>
            </div>
          </div>
        </div>
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
