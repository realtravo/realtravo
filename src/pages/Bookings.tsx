import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ChevronDown, ChevronUp, WifiOff, CheckCircle2, XCircle, History, Loader2, CalendarClock, Download } from "lucide-react";
import { RescheduleBookingDialog } from "@/components/booking/RescheduleBookingDialog";
import { BookingDownloadButton } from "@/components/booking/BookingDownloadButton";
import { toast } from "sonner";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useOfflineBookings } from "@/hooks/useOfflineBookings";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const bookingsCache = { data: null as any[] | null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

interface Booking {
  id: string;
  booking_type: string;
  total_amount: number;
  booking_details: any;
  payment_status: string;
  status: string;
  created_at: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  slots_booked: number | null;
  visit_date: string | null;
  item_id: string;
  isPending?: boolean;
  payment_phone?: string;
  pendingPaymentId?: string;
  result_code?: string | null;
}

interface ItemDetails { name: string; type: string; }

const Bookings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { cachedBookings, cacheBookings } = useOfflineBookings();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [itemDetails, setItemDetails] = useState<Record<string, ItemDetails>>({});
  const [loading, setLoading] = useState(true);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 20;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('profile_completed').eq('id', user.id).single();
      if (data && !data.profile_completed) navigate('/complete-profile');
    };
    if (user) checkProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      if (isOnline) {
        if (bookingsCache.data && Date.now() - bookingsCache.timestamp < CACHE_TTL && !hasFetched.current) {
          setBookings(bookingsCache.data);
          setLoading(false);
          hasFetched.current = true;
        } else {
          fetchBookings();
        }
        const channel = supabase.channel('payments-updates').on('postgres_changes', {
          event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}`
        }, () => fetchBookings()).subscribe();
        return () => { supabase.removeChannel(channel); };
      } else {
        setBookings(cachedBookings as Booking[]);
        setLoading(false);
      }
    }
  }, [user, isOnline]);

  const fetchBookings = async (fetchOffset: number = 0) => {
    try {
      const { data: confirmedBookings, error } = await supabase
        .from("bookings")
        .select("id,booking_type,total_amount,booking_details,payment_status,status,created_at,guest_name,guest_email,guest_phone,slots_booked,visit_date,item_id,payment_phone")
        .eq("user_id", user?.id)
        .in("payment_status", ["paid", "completed"])
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false })
        .range(fetchOffset, fetchOffset + ITEMS_PER_PAGE - 1);
      if (error) throw error;
      const newBookings = confirmedBookings || [];
      if (fetchOffset === 0) {
        setBookings(newBookings);
        bookingsCache.data = newBookings;
        bookingsCache.timestamp = Date.now();
      } else {
        setBookings(prev => [...prev, ...newBookings]);
      }
      setHasMore(newBookings.length >= ITEMS_PER_PAGE);
      setOffset(fetchOffset);
      hasFetched.current = true;
      if (newBookings.length > 0) {
        cacheBookings(newBookings.map(b => ({ ...b, item_name: itemDetails[b.item_id]?.name })));
        await fetchItemDetailsBatch(fetchOffset === 0 ? newBookings : [...bookings, ...newBookings]);
      }
    } catch (error) { console.error("Error fetching bookings:", error); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const loadMore = async () => { if (loadingMore || !hasMore) return; setLoadingMore(true); await fetchBookings(offset + ITEMS_PER_PAGE); };

  const fetchItemDetailsBatch = async (bookings: Booking[]) => {
    const details: Record<string, ItemDetails> = {};
    const tripIds = bookings.filter(b => b.booking_type === "trip" || b.booking_type === "event").map(b => b.item_id);
    const hotelIds = bookings.filter(b => b.booking_type === "hotel").map(b => b.item_id);
    const adventureIds = bookings.filter(b => b.booking_type === "adventure" || b.booking_type === "adventure_place").map(b => b.item_id);
    const [tripsData, hotelsData, adventuresData] = await Promise.all([
      tripIds.length > 0 ? supabase.from("trips").select("id,name").in("id", tripIds) : { data: [] },
      hotelIds.length > 0 ? supabase.from("hotels").select("id,name").in("id", hotelIds) : { data: [] },
      adventureIds.length > 0 ? supabase.from("adventure_places").select("id,name").in("id", adventureIds) : { data: [] }
    ]);
    (tripsData.data || []).forEach((t: any) => { details[t.id] = { name: t.name, type: "trip" }; });
    (hotelsData.data || []).forEach((h: any) => { details[h.id] = { name: h.name, type: "hotel" }; });
    (adventuresData.data || []).forEach((a: any) => { details[a.id] = { name: a.name, type: "adventure" }; });
    setItemDetails(details);
  };

  const groupedBookings = useMemo(() => {
    const groups: Record<string, Booking[]> = { Today: [], Yesterday: [], Earlier: [] };
    bookings.forEach(booking => {
      const d = parseISO(booking.created_at);
      if (isToday(d)) groups.Today.push(booking);
      else if (isYesterday(d)) groups.Yesterday.push(booking);
      else groups.Earlier.push(booking);
    });
    return groups;
  }, [bookings]);

  const canReschedule = (b: Booking) => ['paid', 'completed'].includes(b.payment_status) && b.status !== 'cancelled' && b.booking_type !== 'event';
  const canCancel = (b: Booking) => {
    if (!['paid', 'completed'].includes(b.payment_status) || b.status === 'cancelled') return false;
    if (b.visit_date) { const h = (new Date(b.visit_date).getTime() - Date.now()) / 3600000; if (h < 48) return false; }
    return true;
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      const { error } = await supabase.from('bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', bookingToCancel.id);
      if (error) throw error;
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setShowCancelDialog(false); setBookingToCancel(null); }
  };

  const toggleExpanded = (id: string) => setExpandedBookings(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const getItemName = (b: Booking) => itemDetails[b.item_id]?.name || b.booking_details?.trip_name || b.booking_details?.hotel_name || b.booking_details?.place_name || b.booking_details?.event_name || 'Booking';

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-6 animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-32" />
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-card rounded-xl border border-border" />)}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg font-black uppercase tracking-tight text-foreground">My Bookings</h1>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Verified Reservations</p>
        </div>

        {!isOnline && (
          <div className="mb-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center gap-2">
            <WifiOff className="h-3 w-3 text-yellow-600" />
            <span className="text-[9px] font-bold uppercase text-yellow-700">Offline Mode</span>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center border border-border">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-xs font-bold text-muted-foreground uppercase">No active bookings</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBookings).map(([groupName, groupBookings]) => {
              if (groupBookings.length === 0) return null;
              return (
                <div key={groupName} className="space-y-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{groupName}</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-1.5">
                    {groupBookings.map(booking => {
                      const isExpanded = expandedBookings.has(booking.id);
                      const details = booking.booking_details as Record<string, any> | null;
                      return (
                        <Collapsible key={booking.id} open={isExpanded} onOpenChange={() => toggleExpanded(booking.id)}>
                          <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-sm transition-shadow">
                            {/* Compact row */}
                            <div className="flex items-center gap-2 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 font-bold uppercase">{booking.booking_type}</Badge>
                                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-bold text-green-600 border-green-200 bg-green-50">Paid</Badge>
                                </div>
                                <p className="text-xs font-bold text-foreground truncate leading-tight">{getItemName(booking)}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {booking.visit_date && (
                                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                      <Calendar className="h-2.5 w-2.5" /> {format(new Date(booking.visit_date), 'dd MMM')}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5" /> {booking.slots_booked || 1}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-black text-destructive">KSh {booking.total_amount.toLocaleString()}</p>
                                <p className="text-[8px] text-muted-foreground">{format(parseISO(booking.created_at), 'MMM dd')}</p>
                              </div>
                              <CollapsibleTrigger asChild>
                                <button className="p-1 rounded-md hover:bg-muted">
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                  <div><span className="text-muted-foreground font-bold">Name:</span> <span className="font-medium">{booking.guest_name || 'N/A'}</span></div>
                                  <div><span className="text-muted-foreground font-bold">Email:</span> <span className="font-medium truncate">{booking.guest_email || 'N/A'}</span></div>
                                  <div><span className="text-muted-foreground font-bold">Adults:</span> <span className="font-medium">{details?.adults || 'N/A'}</span></div>
                                  {details?.children > 0 && <div><span className="text-muted-foreground font-bold">Children:</span> <span className="font-medium">{details.children}</span></div>}
                                  <div className="col-span-2"><span className="text-muted-foreground font-bold">ID:</span> <span className="font-mono text-[9px]">{booking.id.slice(0, 12)}</span></div>
                                </div>
                                {details?.selectedFacilities?.length > 0 && (
                                  <div>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Facilities</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {details.selectedFacilities.map((f: any, i: number) => (
                                        <span key={i} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{f.name}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {details?.selectedActivities?.length > 0 && (
                                  <div>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Activities</span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {details.selectedActivities.map((a: any, i: number) => (
                                        <span key={i} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{a.name}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-1.5 pt-1">
                                  <BookingDownloadButton booking={{
                                    bookingId: booking.id, guestName: booking.guest_name || 'Guest', guestEmail: booking.guest_email || '',
                                    itemName: getItemName(booking), bookingType: booking.booking_type, visitDate: booking.visit_date || booking.created_at,
                                    totalAmount: booking.total_amount, slotsBooked: booking.slots_booked || 1, adults: details?.adults, children: details?.children, paymentStatus: booking.payment_status,
                                  }} />
                                  {canReschedule(booking) && (
                                    <Button variant="outline" size="sm" onClick={() => setRescheduleBooking(booking)} className="h-7 text-[9px] font-bold rounded-lg px-2">
                                      <CalendarClock className="h-3 w-3 mr-1" /> Reschedule
                                    </Button>
                                  )}
                                  {canCancel(booking) && (
                                    <Button variant="ghost" size="sm" onClick={() => { setBookingToCancel(booking); setShowCancelDialog(true); }} className="h-7 text-[9px] font-bold rounded-lg px-2 text-destructive hover:text-destructive">
                                      <XCircle className="h-3 w-3 mr-1" /> Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && bookings.length > 0 && (
          <div className="flex justify-center mt-4">
            <Button onClick={loadMore} disabled={loadingMore} size="sm" className="rounded-lg text-[9px] font-bold uppercase h-8 px-6">
              {loadingMore ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Loading...</> : "Load More"}
            </Button>
          </div>
        )}
      </main>

      {rescheduleBooking && (
        <RescheduleBookingDialog booking={rescheduleBooking} open={!!rescheduleBooking} onOpenChange={open => !open && setRescheduleBooking(null)} onSuccess={fetchBookings} />
      )}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-2xl border-none p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase">Cancel Reservation?</AlertDialogTitle>
            <p className="text-xs text-muted-foreground">This action cannot be undone. Cancellations within 48 hours may not be eligible for refund.</p>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-lg text-xs font-bold">Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelBooking} className="rounded-lg bg-destructive hover:bg-destructive/90 text-xs font-bold px-6">Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Bookings;
