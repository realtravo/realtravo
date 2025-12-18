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
import { MapPin, Calendar, Edit3, EyeOff, LayoutDashboard, ReceiptText, Star } from "lucide-react";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  KHAKI_DARK: "#857F3E",
  SOFT_GRAY: "#F8F9FA",
  RED: "#FF0000"
};

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
      const userEmail = user?.email;

      const { data: trips } = await supabase.from("trips").select("*").eq("created_by", user.id);
      const { data: hotels } = await supabase.from("hotels").select("*").eq("created_by", user.id);
      const { data: adventures } = await supabase.from("adventure_places").select("*").eq("created_by", user.id);
      
      const { data: hotelsAsAdmin } = await supabase.from("hotels").select("*").contains("allowed_admin_emails", userEmail ? [userEmail] : []);
      const { data: adventuresAsAdmin } = await supabase.from("adventure_places").select("*").contains("allowed_admin_emails", userEmail ? [userEmail] : []);

      const allContent = [
        ...(trips?.map(t => ({ ...t, type: "trip", isCreator: true })) || []),
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

  const getCategoryCount = (category: string) => myContent.filter(item => item.type === category).length;
  const getBookingCount = (category: string) => bookings.filter(b => b.booking_type === category).length;

  const renderListings = (category: string) => {
    const items = myContent.filter(item => item.type === category);
    
    if (items.length === 0) {
      return <div className="p-8 text-center bg-white rounded-[28px] border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No {category}s found</div>;
    }

    return (
      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4 bg-white rounded-[28px] shadow-sm border border-slate-100 hover:shadow-md transition-all overflow-hidden">
            <div className="flex flex-col md:flex-row gap-5">
              <div className="relative w-full md:w-40 h-32 shrink-0">
                <img
                  src={item.image_url || item.photo_urls?.[0] || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80'}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
                {!item.isCreator && (
                  <Badge className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[8px] font-black uppercase">Staff</Badge>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 leading-tight">
                        {item.name || item.local_name || item.location_name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {item.location || item.location_name}, {item.country}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge 
                      className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest border-none"
                      style={{ 
                        backgroundColor: item.approval_status === 'approved' ? `${COLORS.TEAL}20` : item.approval_status === 'pending' ? '#F0E68C' : '#FFEBEB',
                        color: item.approval_status === 'approved' ? COLORS.TEAL : item.approval_status === 'pending' ? COLORS.KHAKI_DARK : COLORS.RED
                      }}
                    >
                      {item.approval_status}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Rate</span>
                      <span className="text-sm font-black text-[#FF0000]">KSh {item.price || item.price_adult || item.entry_fee || 0}</span>
                   </div>
                   
                   <div className="flex gap-2">
                    {item.is_hidden && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                            <EyeOff className="h-3 w-3 text-yellow-600" />
                            <span className="text-[8px] font-black text-yellow-700 uppercase">Hidden</span>
                        </div>
                    )}
                    <Button
                        onClick={() => navigate(`/edit-listing/${item.type}/${item.id}`)}
                        size="sm"
                        className="h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-white transition-transform active:scale-95 shadow-lg shadow-teal-900/10 border-none"
                        style={{ backgroundColor: COLORS.TEAL }}
                    >
                        <Edit3 className="h-3 w-3 mr-2" />
                        Edit
                    </Button>
                   </div>
                </div>
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
      return <div className="p-8 text-center bg-white rounded-[28px] border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No bookings yet</div>;
    }

    return (
      <div className="grid gap-3">
        {items.map((booking) => (
          <Card key={booking.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-[#FF7F50]/30 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-black text-xs uppercase tracking-tighter text-slate-800">Booking #{booking.id.slice(0, 8)}</p>
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200">{booking.status}</Badge>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1 text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span className="text-[10px] font-bold">{new Date(booking.created_at).toLocaleDateString()}</span>
                 </div>
                 <span className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest">KSh {booking.total_amount}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${booking.payment_status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                {booking.payment_status}
              </span>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2" style={{ borderColor: COLORS.TEAL }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#FF7F50] animate-pulse"></div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-white shadow-sm">
                    <LayoutDashboard className="h-5 w-5" style={{ color: COLORS.TEAL }} />
                </div>
                <p className="text-[10px] font-black text-[#FF7F50] uppercase tracking-[0.3em]">Management</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900">
                My <span style={{ color: COLORS.TEAL }}>Listings</span>
            </h1>
        </header>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 p-1.5 bg-slate-200/50 rounded-2xl mb-8">
            <TabsTrigger 
                value="listings" 
                className="rounded-xl font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#008080] data-[state=active]:shadow-sm transition-all"
            >
                <Star className="h-3.5 w-3.5 mr-2" />
                Live Content
            </TabsTrigger>
            <TabsTrigger 
                value="bookings" 
                className="rounded-xl font-black uppercase text-[11px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-[#FF7F50] data-[state=active]:shadow-sm transition-all"
            >
                <ReceiptText className="h-3.5 w-3.5 mr-2" />
                Sales Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Experiences</h2>
                <div className="bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {getCategoryCount('trip')} Total
                </div>
              </div>
              {renderListings('trip')}
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Hotels & Stays</h2>
                <div className="bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {getCategoryCount('hotel')} Total
                </div>
              </div>
              {renderListings('hotel')}
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>Campsites</h2>
                <div className="bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {getCategoryCount('adventure')} Total
                </div>
              </div>
              {renderListings('adventure')}
            </section>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.CORAL }}>Experience Bookings</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getBookingCount('trip')} Received</span>
                </div>
                {renderBookings('trip')}
            </section>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.CORAL }}>Stay Bookings</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getBookingCount('hotel')} Received</span>
                </div>
                {renderBookings('hotel')}
            </section>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: COLORS.CORAL }}>Campground Bookings</h2>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getBookingCount('adventure_place')} Received</span>
                </div>
                {renderBookings('adventure_place')}
            </section>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default MyListing;