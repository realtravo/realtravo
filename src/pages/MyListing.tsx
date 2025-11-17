import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const MyListing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [myContent, setMyContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      const { data: trips } = await supabase.from("trips").select("*").eq("created_by", user.id);
      const { data: events } = await supabase.from("events").select("*").eq("created_by", user.id);
      const { data: hotels } = await supabase.from("hotels").select("id, name, location, place, country, image_url, description, email, phone_numbers, amenities, establishment_type, map_link, gallery_images, images, approval_status, admin_notes, created_at, created_by, approved_by, approved_at, is_hidden, registration_number, allowed_admin_emails, facilities").eq("created_by", user.id);
      const { data: adventures } = await supabase.from("adventure_places").select("id, name, location, place, country, image_url, description, email, phone_numbers, amenities, activities, facilities, entry_fee, entry_fee_type, map_link, gallery_images, images, approval_status, admin_notes, created_at, created_by, approved_by, approved_at, is_hidden, registration_number, allowed_admin_emails").eq("created_by", user.id);
      
      const { data: hotelsAsAdmin } = await supabase.from("hotels").select("id, name, location, place, country, image_url, description, email, phone_numbers, amenities, establishment_type, map_link, gallery_images, images, approval_status, admin_notes, created_at, created_by, approved_by, approved_at, is_hidden, registration_number, allowed_admin_emails, facilities").contains("allowed_admin_emails", userEmail ? [userEmail] : []);
      const { data: adventuresAsAdmin } = await supabase.from("adventure_places").select("id, name, location, place, country, image_url, description, email, phone_numbers, amenities, activities, facilities, entry_fee, entry_fee_type, map_link, gallery_images, images, approval_status, admin_notes, created_at, created_by, approved_by, approved_at, is_hidden, registration_number, allowed_admin_emails").contains("allowed_admin_emails", userEmail ? [userEmail] : []);

      const allContent = [
        ...(trips?.map(t => ({ ...t, type: "trip", isCreator: true })) || []),
        ...(events?.map(e => ({ ...e, type: "event", isCreator: true })) || []),
        ...(hotels?.map(h => ({ ...h, type: "hotel", isCreator: true })) || []),
        ...(adventures?.map(a => ({ ...a, type: "adventure", isCreator: true })) || []),
        ...(hotelsAsAdmin?.filter(h => h.created_by !== user.id).map(h => ({ ...h, type: "hotel", isCreator: false })) || []),
        ...(adventuresAsAdmin?.filter(a => a.created_by !== user.id).map(a => ({ ...a, type: "adventure", isCreator: false })) || [])
      ];

      setMyContent(allContent);

      const allIds = allContent.map(c => c.id);
      if (allIds.length > 0) {
        const { data } = await supabase
          .from("creator_booking_summary")
          .select("*")
          .in("item_id", allIds)
          .order("created_at", { ascending: false });
        setBookings(data || []);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user, navigate]);

  const getCategoryCount = (category: string) => {
    return myContent.filter(item => item.type === category).length;
  };

  const getBookingCount = (category: string) => {
    return bookings.filter(b => b.booking_type === category).length;
  };

  const renderListings = (category: string) => {
    const items = myContent.filter(item => item.type === category);
    
    if (items.length === 0) {
      return <p className="text-muted-foreground">No {category}s yet</p>;
    }

    return (
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4 hover:shadow-md transition-shadow border-0">
            <div className="flex gap-4">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.location}, {item.country}</p>
                    {item.date && <p className="text-sm text-muted-foreground">Date: {new Date(item.date).toLocaleDateString()}</p>}
                    {item.price && <p className="text-sm font-semibold mt-1">${item.price}</p>}
                  </div>
                  <Badge variant={item.approval_status === 'approved' ? 'default' : item.approval_status === 'pending' ? 'secondary' : 'destructive'}>
                    {item.approval_status}
                  </Badge>
                </div>
                <Button
                  onClick={() => navigate(`/edit-listing/${item.type}/${item.id}`)}
                  className="mt-3"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderBookings = (category: string) => {
    const items = bookings.filter(b => b.booking_type === category);
    
    if (items.length === 0) {
      return <p className="text-muted-foreground">No {category} bookings yet</p>;
    }

    return (
      <div className="grid gap-4">
        {items.map((booking) => (
          <Card key={booking.id} className="p-4 border-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">Booking #{booking.id.slice(0, 8)}</p>
                <p className="text-sm text-muted-foreground">Amount: ${booking.total_amount}</p>
                <p className="text-sm text-muted-foreground">Status: {booking.status}</p>
                <p className="text-sm text-muted-foreground">Date: {new Date(booking.created_at).toLocaleDateString()}</p>
              </div>
              <Badge>{booking.payment_status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Listing</h1>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="bookings">Received Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Trips</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getCategoryCount('trip')}</Badge>
              </div>
              {renderListings('trip')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Events</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getCategoryCount('event')}</Badge>
              </div>
              {renderListings('event')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Hotels</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getCategoryCount('hotel')}</Badge>
              </div>
              {renderListings('hotel')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Adventure Places</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getCategoryCount('adventure')}</Badge>
              </div>
              {renderListings('adventure')}
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Trip Bookings</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getBookingCount('trip')}</Badge>
              </div>
              {renderBookings('trip')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Event Bookings</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getBookingCount('event')}</Badge>
              </div>
              {renderBookings('event')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Hotel Bookings</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getBookingCount('hotel')}</Badge>
              </div>
              {renderBookings('hotel')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Adventure Place Bookings</h2>
                <Badge variant="outline" className="text-lg px-4 py-1">{getBookingCount('adventure_place')}</Badge>
              </div>
              {renderBookings('adventure_place')}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default MyListing;
