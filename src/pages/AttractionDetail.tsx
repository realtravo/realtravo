import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, DollarSign, Phone, Mail, Share2, ArrowLeft, Heart } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { SimilarItems } from "@/components/SimilarItems";
import { ReviewSection } from "@/components/ReviewSection";
import Autoplay from "embla-carousel-autoplay";
import { useSavedItems } from "@/hooks/useSavedItems";
import { MultiStepBooking, BookingFormData } from "@/components/booking/MultiStepBooking";
import { getReferralTrackingId } from "@/lib/referralUtils";

interface Facility {
  name: string;
  price: number;
  capacity: number;
}

interface Attraction {
  id: string;
  location_name: string;
  local_name: string | null;
  country: string;
  description: string | null;
  email: string | null;
  phone_number: string | null;
  location_link: string | null;
  opening_hours: string | null;
  closing_hours: string | null;
  days_opened: string[];
  entrance_type: string;
  price_child: number;
  price_adult: number;
  photo_urls: string[];
  gallery_images: string[];
  facilities?: Facility[];
}

export default function AttractionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const { savedItems, handleSave: handleSaveItem } = useSavedItems();
  const isSaved = savedItems.has(id || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchAttraction();
  }, [id]);

  const fetchAttraction = async () => {
    try {
      const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .eq('id', id)
        .eq('approval_status', 'approved')
        .single();

      if (error) throw error;
      setAttraction(data as any);
    } catch (error: any) {
      console.error('Error fetching attraction:', error);
      toast({
        title: "Error",
        description: "Failed to load attraction details",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (id) {
      handleSaveItem(id, "attraction");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: attraction?.location_name,
        text: attraction?.description || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Attraction link copied to clipboard",
      });
    }
  };

  const handleBookingSubmit = async (data: BookingFormData) => {
    if (!attraction) return;

    setIsProcessing(true);

    try {
      const totalAmount = (data.num_adults * (attraction.entrance_type === 'free' ? 0 : attraction.price_adult)) +
                         (data.num_children * (attraction.entrance_type === 'free' ? 0 : attraction.price_child)) +
                         data.selectedFacilities.reduce((sum, f) => sum + f.price, 0);

      // Handle free bookings
      if (totalAmount === 0) {
        const { data: bookingResult, error } = await supabase.from('bookings').insert([{
          user_id: user?.id || null,
          item_id: id,
          booking_type: 'attraction',
          visit_date: data.visit_date,
          total_amount: 0,
          booking_details: {
            num_adults: data.num_adults,
            num_children: data.num_children,
            facilities: data.selectedFacilities,
          },
          is_guest_booking: !user,
          guest_name: !user ? data.guest_name : null,
          guest_email: !user ? data.guest_email : null,
          guest_phone: !user ? data.guest_phone : null,
          payment_method: 'free',
          status: 'pending',
          payment_status: 'paid',
        }]).select();

        if (error) throw error;

        const { data: attractionData } = await supabase.from('attractions').select('created_by').eq('id', id).single();

        if (attractionData?.created_by) {
          await supabase.from('notifications').insert({
            user_id: attractionData.created_by,
            type: 'booking',
            title: 'New Booking Received',
            message: `New free booking for ${attraction.local_name || 'attraction'}`,
            data: { booking_id: bookingResult[0].id, item_type: 'attraction' },
          });
        }

        if (user) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'booking',
            title: 'Booking Confirmed',
            message: `Your free booking for ${attraction.local_name || 'attraction'} has been confirmed`,
            data: { booking_id: bookingResult[0].id, item_type: 'attraction' },
          });
        }

        await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            bookingId: bookingResult[0].id,
            email: user ? user.email : data.guest_email,
            guestName: user ? user.user_metadata?.name || data.guest_name : data.guest_name,
            bookingType: 'attraction',
            itemName: attraction.local_name || 'attraction',
            totalAmount: 0,
            bookingDetails: { num_adults: data.num_adults, num_children: data.num_children, facilities: data.selectedFacilities, phone: !user ? data.guest_phone : "" },
            visitDate: data.visit_date,
          },
        });

        setIsProcessing(false);
        setIsCompleted(true);
        return;
      }

      // M-Pesa payment flow
      if (data.payment_method === "mpesa" && data.payment_phone) {
        const bookingPayload = {
          user_id: user?.id || null,
          item_id: id,
          booking_type: 'attraction',
          visit_date: data.visit_date,
          total_amount: totalAmount,
          booking_details: { num_adults: data.num_adults, num_children: data.num_children, facilities: data.selectedFacilities },
          is_guest_booking: !user,
          guest_name: !user ? data.guest_name : null,
          guest_email: !user ? data.guest_email : null,
          guest_phone: !user ? data.guest_phone : null,
          payment_method: data.payment_method,
          payment_phone: data.payment_phone,
          status: 'pending',
          payment_status: 'pending',
          referral_tracking_id: getReferralTrackingId(),
          emailData: {
            bookingId: '',
            email: user ? user.email : data.guest_email,
            guestName: user ? user.user_metadata?.name || data.guest_name : data.guest_name,
            bookingType: "attraction",
            itemName: attraction.local_name || 'attraction',
            totalAmount,
            bookingDetails: { num_adults: data.num_adults, num_children: data.num_children, facilities: data.selectedFacilities, phone: !user ? data.guest_phone : "" },
            visitDate: data.visit_date,
          },
        };

        const { data: mpesaResponse, error: mpesaError } = await supabase.functions.invoke("mpesa-stk-push", {
          body: {
            phoneNumber: data.payment_phone,
            amount: totalAmount,
            accountReference: `ATTRACTION-${id}`,
            transactionDesc: `Booking for ${attraction.local_name || 'attraction'}`,
            bookingData: bookingPayload,
          },
        });

        if (mpesaError || !mpesaResponse?.success) {
          throw new Error(mpesaResponse?.error || "M-Pesa payment failed");
        }

        const checkoutRequestId = mpesaResponse.checkoutRequestId;

        // Poll for payment status
        const startTime = Date.now();
        const timeout = 120000;

        while (Date.now() - startTime < timeout) {
          await new Promise(resolve => setTimeout(resolve, 2000));

          const { data: pendingPayment } = await supabase.from('pending_payments').select('payment_status').eq('checkout_request_id', checkoutRequestId).single();

          if (pendingPayment?.payment_status === 'completed') {
            setIsProcessing(false);
            setIsCompleted(true);
            return;
          } else if (pendingPayment?.payment_status === 'failed') {
            throw new Error('Payment failed');
          }
        }

        // Query M-Pesa directly as fallback
        const { data: queryResponse } = await supabase.functions.invoke('mpesa-stk-query', { body: { checkoutRequestId } });

        if (queryResponse?.resultCode === '0') {
          setIsProcessing(false);
          setIsCompleted(true);
          return;
        } else if (queryResponse?.resultCode === 'RATE_LIMIT') {
          throw new Error('Too many verification attempts. Please check your payment history.');
        } else {
          throw new Error('Payment confirmation timeout');
        }
      }

      // Other payment methods
      const { error } = await supabase.from('bookings').insert([{
        user_id: user?.id || null,
        item_id: id,
        booking_type: 'attraction',
        visit_date: data.visit_date,
        total_amount: totalAmount,
        booking_details: { num_adults: data.num_adults, num_children: data.num_children, facilities: data.selectedFacilities },
        is_guest_booking: !user,
        guest_name: !user ? data.guest_name : null,
        guest_email: !user ? data.guest_email : null,
        guest_phone: !user ? data.guest_phone : null,
        payment_method: data.payment_method,
        payment_phone: data.payment_method !== 'card' ? data.payment_phone : null,
        status: 'pending',
        payment_status: 'completed',
      }]);

      if (error) throw error;

      setIsProcessing(false);
      setIsCompleted(true);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking failed",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="space-y-6">
            <div className="w-full h-64 md:h-96 bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </main>
        <Footer />
        <MobileBottomBar />
      </div>
    );
  }

  if (!attraction) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Attraction not found</p>
        </div>
        <Footer />
        <MobileBottomBar />
      </div>
    );
  }

  const images = attraction.gallery_images?.length > 0 ? attraction.gallery_images : attraction.photo_urls;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Image Gallery */}
          <div className="w-full relative">
            <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground z-20 text-xs font-bold px-3 py-1">
              ATTRACTION
            </Badge>
            <Carousel
              opts={{ loop: true }}
              plugins={[Autoplay({ delay: 3000 })]}
              className="w-full rounded-2xl overflow-hidden"
              setApi={(api) => {
                if (api) {
                  api.on("select", () => {
                    setCurrent(api.selectedScrollSnap());
                  });
                }
              }}
            >
              <CarouselContent>
                {images?.map((url, index) => (
                  <CarouselItem key={index}>
                    <img src={url} alt={`${attraction.location_name} ${index + 1}`} className="w-full h-64 md:h-96 object-cover" />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {images && images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" />
                  <CarouselNext className="right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" />
                </>
              )}
              
              {images && images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                  {images.map((_, index) => (
                    <div key={index} className={`w-2 h-2 rounded-full transition-all duration-300 ${index === current ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              )}
            </Carousel>
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">{attraction.location_name}</h1>
              {attraction.local_name && <p className="text-xl text-muted-foreground">{attraction.local_name}</p>}
              <p className="text-sm md:text-base text-muted-foreground">{attraction.country}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => {
                if (attraction.location_link) {
                  window.open(attraction.location_link, '_blank');
                } else {
                  const query = encodeURIComponent(`${attraction.location_name}, ${attraction.country}`);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }
              }} className="gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleSave} className={isSaved ? "bg-red-500 text-white hover:bg-red-600" : ""}>
                <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Entrance Fee */}
        <div className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Entrance Fee
            </h2>
            {attraction.entrance_type === 'free' ? (
              <p className="text-lg font-semibold text-green-600">Free Entry</p>
            ) : (
              <div className="space-y-2">
                <p>Adults: KSh {attraction.price_adult}</p>
                <p>Children: KSh {attraction.price_child}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Description */}
        {attraction.description && (
          <div className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{attraction.description}</p>
            </Card>
          </div>
        )}

        {/* Operating Hours */}
        {(attraction.opening_hours || attraction.closing_hours || attraction.days_opened?.length > 0) && (
          <div className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </h2>
              <div className="space-y-2">
                {attraction.opening_hours && attraction.closing_hours && (
                  <p>Hours: {attraction.opening_hours} - {attraction.closing_hours}</p>
                )}
                {attraction.days_opened?.length > 0 && (
                  <p>Open: {attraction.days_opened.join(', ')}</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Facilities */}
        {attraction.facilities && Array.isArray(attraction.facilities) && attraction.facilities.length > 0 && (
          <div className="mt-6">
            <div className="p-6 border bg-card">
              <h2 className="text-xl font-semibold mb-4">Available Facilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attraction.facilities.map((facility: any, idx: number) => (
                  <div key={idx} className="p-4 bg-background border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{facility.name}</span>
                        <p className="text-sm text-muted-foreground">Capacity: {facility.capacity} people</p>
                      </div>
                      <span className="font-bold">KSh {facility.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Book Now Button */}
        <div className="mt-6">
          <Button size="lg" className="w-full" onClick={() => {
            if (!user) {
              toast({ title: "Login Required", description: "Please login to book this attraction", variant: "destructive" });
              navigate('/auth');
              return;
            }
            setBookingOpen(true);
          }}>
            Book Now
          </Button>
        </div>

        {/* Contact */}
        {(attraction.email || attraction.phone_number) && (
          <div className="mt-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
              <div className="space-y-2">
                {attraction.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${attraction.email}`} className="text-primary hover:underline">{attraction.email}</a>
                  </p>
                )}
                {attraction.phone_number && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${attraction.phone_number}`} className="text-primary hover:underline">{attraction.phone_number}</a>
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className="mt-6">
          <ReviewSection itemId={attraction.id} itemType="attraction" />
        </div>

        {attraction && <SimilarItems currentItemId={attraction.id} itemType="attraction" country={attraction.country} />}
      </main>

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <MultiStepBooking
            onSubmit={handleBookingSubmit}
            facilities={attraction.facilities || []}
            priceAdult={attraction.entrance_type === 'free' ? 0 : attraction.price_adult}
            priceChild={attraction.entrance_type === 'free' ? 0 : attraction.price_child}
            entranceType={attraction.entrance_type}
            isProcessing={isProcessing}
            isCompleted={isCompleted}
            itemName={attraction.local_name || attraction.location_name}
          />
        </DialogContent>
      </Dialog>
      
      <Footer />
      <MobileBottomBar />
    </div>
  );
}
