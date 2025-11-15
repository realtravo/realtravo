import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Edit, Save, X, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SecondaryLoginDialog } from "@/components/auth/SecondaryLoginDialog";

const MyContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [myContent, setMyContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [verifyingItem, setVerifyingItem] = useState<any>(null);
  const [verifiedItems, setVerifiedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;

      const { data: trips } = await supabase.from("trips").select("*, bookings(*)").eq("created_by", user.id);
      const { data: events } = await supabase.from("events").select("*, bookings(*)").eq("created_by", user.id);
      const { data: hotels } = await supabase.from("hotels").select("*, bookings(*)").eq("created_by", user.id);
      const { data: adventures } = await supabase.from("adventure_places").select("*, bookings(*)").eq("created_by", user.id);
      
      const { data: hotelsAsAdmin } = await supabase.from("hotels").select("*, bookings(*)").contains("allowed_admin_emails", userEmail ? [userEmail] : []);
      const { data: adventuresAsAdmin } = await supabase.from("adventure_places").select("*, bookings(*)").contains("allowed_admin_emails", userEmail ? [userEmail] : []);

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
        const { data } = await supabase.from("bookings").select("*").in("item_id", allIds).order("created_at", { ascending: false });
        setBookings(data || []);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user, navigate]);

  const handleEdit = (item: any) => {
    if ((item.type === "hotel" || item.type === "adventure") && !verifiedItems.has(item.id)) {
      setVerifyingItem(item);
      return;
    }

    setEditingId(item.id);
    setEditData({
      name: item.name,
      location: item.location,
      place: item.place,
      description: item.description,
      price: item.price,
      price_child: item.price_child,
      activities: item.activities || [],
      facilities: item.facilities || [],
      amenities: item.amenities || [],
      allowed_admin_emails: item.allowed_admin_emails?.join(", ") || ""
    });
  };

  const handleSecondaryLoginSuccess = () => {
    if (verifyingItem) {
      setVerifiedItems(prev => new Set(prev).add(verifyingItem.id));
      handleEdit(verifyingItem);
      setVerifyingItem(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleSave = async (item: any) => {
    const table = item.type === "trip" ? "trips" : item.type === "event" ? "events" : item.type === "hotel" ? "hotels" : "adventure_places";
    const updateData: any = { name: editData.name, location: editData.location, place: editData.place, description: editData.description };

    if (item.type !== "hotel") {
      updateData.price = parseFloat(editData.price);
      if (editData.price_child) updateData.price_child = parseFloat(editData.price_child);
    }

    if (item.type === "adventure" || item.type === "hotel") {
      if (editData.activities) updateData.activities = editData.activities;
      if (editData.facilities) updateData.facilities = editData.facilities;
      if (editData.amenities) updateData.amenities = editData.amenities;
      if (editData.allowed_admin_emails) {
        const emailsArray = editData.allowed_admin_emails.split(',').map((e: string) => e.trim()).filter((e: string) => e && e.includes('@'));
        updateData.allowed_admin_emails = emailsArray.length > 0 ? emailsArray : null;
      }
    }

    const { error } = await supabase.from(table).update(updateData).eq('id', item.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update listing", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Listing updated successfully" });
    setEditingId(null);
    setEditData({});
    window.location.reload();
  };

  const handleArrayChange = (field: string, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setEditData({ ...editData, [field]: items });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Content & Bookings</h1>
        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">My Listings</TabsTrigger>
            <TabsTrigger value="bookings">Received Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            {loading ? <p>Loading...</p> : myContent.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No content created yet</Card>
            ) : (
              myContent.map((item) => (
                <Card key={item.id} className="p-6">
                  {editingId === item.id ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                          <Badge className="capitalize">{item.type}</Badge>
                          {!item.isCreator && <Badge variant="outline">Admin Access</Badge>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(item)}><Save className="h-4 w-4 mr-1" />Save</Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}><X className="h-4 w-4 mr-1" />Cancel</Button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div><Label>Name</Label><Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></div>
                        <div><Label>Place</Label><Input value={editData.place} onChange={(e) => setEditData({ ...editData, place: e.target.value })} /></div>
                        <div><Label>Location</Label><Input value={editData.location} onChange={(e) => setEditData({ ...editData, location: e.target.value })} /></div>
                        {item.type !== "hotel" && <div><Label>Price</Label><Input type="number" value={editData.price} onChange={(e) => setEditData({ ...editData, price: e.target.value })} /></div>}
                        {item.type !== "hotel" && <div><Label>Child Price</Label><Input type="number" value={editData.price_child} onChange={(e) => setEditData({ ...editData, price_child: e.target.value })} /></div>}
                      </div>

                      <div><Label>Description</Label><Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={4} /></div>

                      {(item.type === "adventure" || item.type === "hotel") && (
                        <>
                          {item.type === "adventure" && <div><Label>Activities (comma-separated)</Label><Input value={editData.activities?.join(', ') || ''} onChange={(e) => handleArrayChange('activities', e.target.value)} placeholder="Hiking, Swimming, Camping" /></div>}
                          <div><Label>Facilities (comma-separated)</Label><Input value={editData.facilities?.join(', ') || ''} onChange={(e) => handleArrayChange('facilities', e.target.value)} placeholder="WiFi, Parking, Restaurant" /></div>
                          {item.type === "hotel" && <div><Label>Amenities (comma-separated)</Label><Input value={editData.amenities?.join(', ') || ''} onChange={(e) => handleArrayChange('amenities', e.target.value)} placeholder="Pool, Gym, Spa" /></div>}
                          <div><Label>Allowed Administrator Emails</Label><Input value={editData.allowed_admin_emails || ''} onChange={(e) => setEditData({ ...editData, allowed_admin_emails: e.target.value })} placeholder="admin1@example.com, admin2@example.com" /></div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <img src={item.image_url} alt={item.name} className="w-32 h-32 object-cover rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold">{item.name}</h3>
                            <Badge className="capitalize">{item.type}</Badge>
                            {!item.isCreator && <Badge variant="outline">Admin Access</Badge>}
                            <Badge variant={item.approval_status === "approved" ? "default" : item.approval_status === "pending" ? "secondary" : "destructive"}>{item.approval_status}</Badge>
                            {item.is_hidden && <Badge variant="destructive">Hidden</Badge>}
                          </div>
                          <Button size="sm" onClick={() => handleEdit(item)}>
                            {(item.type === "hotel" || item.type === "adventure") && !verifiedItems.has(item.id) ? <><Lock className="h-4 w-4 mr-1" />Unlock</> : <><Edit className="h-4 w-4 mr-1" />Edit</>}
                          </Button>
                        </div>
                        <p className="text-muted-foreground">{item.location}, {item.country}</p>
                        {item.email && <p className="text-sm">Email: {item.email}</p>}
                        {item.phone_number && <p className="text-sm">Phone: {item.phone_number}</p>}
                        {item.phone_numbers && item.phone_numbers.length > 0 && <p className="text-sm">Phone: {item.phone_numbers.join(', ')}</p>}
                        {item.price && <p className="text-sm font-semibold">Price: ${item.price}</p>}
                        {item.bookings && <p className="text-sm">Bookings: {item.bookings.length}</p>}
                        {item.activities && item.activities.length > 0 && <p className="text-sm">Activities: {item.activities.join(', ')}</p>}
                        {item.facilities && item.facilities.length > 0 && <p className="text-sm">Facilities: {item.facilities.join(', ')}</p>}
                        {item.admin_notes && <p className="text-sm text-destructive">Admin Notes: {item.admin_notes}</p>}
                        {item.establishment_type && <p className="text-sm capitalize">Type: {item.establishment_type}</p>}
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {loading ? <p>Loading...</p> : bookings.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">No bookings received yet</Card>
            ) : (
              bookings.map((booking) => (
                <Card key={booking.id} className="p-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">Booking #{booking.id.slice(0, 8)}</h3>
                      <Badge className="capitalize">{booking.booking_type}</Badge>
                      <Badge variant={booking.status === "confirmed" ? "default" : booking.status === "pending" ? "secondary" : "destructive"}>{booking.status}</Badge>
                    </div>
                    {booking.guest_name && <p className="text-sm">Guest: {booking.guest_name}</p>}
                    {booking.guest_email && <p className="text-sm">Email: {booking.guest_email}</p>}
                    {booking.guest_phone && <p className="text-sm">Phone: {booking.guest_phone}</p>}
                    <p className="text-sm font-semibold">Amount: ${booking.total_amount}</p>
                    <p className="text-sm">Slots: {booking.slots_booked || 1}</p>
                    <p className="text-sm text-muted-foreground">Booked: {new Date(booking.created_at).toLocaleDateString()}</p>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {verifyingItem && (
        <SecondaryLoginDialog
          open={!!verifyingItem}
          onOpenChange={() => setVerifyingItem(null)}
          onSuccess={handleSecondaryLoginSuccess}
          requiredPin={verifyingItem.access_pin || ""}
          requiredRegNumber={verifyingItem.registration_number || ""}
          itemName={verifyingItem.name}
        />
      )}

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default MyContent;