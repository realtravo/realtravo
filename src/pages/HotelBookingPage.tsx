import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePaystackPayment } from "@/hooks/usePaystackPayment";
import { PaymentStatusDialog } from "@/components/booking/PaymentStatusDialog";
import { 
  ArrowLeft, Calendar, Users, MapPin, Star, Phone, CreditCard, 
  Loader2, CheckCircle2, Building2, Bed, AlertTriangle 
} from "lucide-react";

const HotelBookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  
  const [formData, setFormData] = useState({
    visit_date: "",
    checkout_date: "",
    num_adults: 1,
    num_children: 0,
    guest_name: "",
    guest_email: user?.email || "",
    guest_phone: "",
    mpesa_phone: "",
    selectedFacilities: [] as Array<{ name: string; price: number }>,
    selectedActivities: [] as Array<{ name: string; price: number; numberOfPeople: number }>,
  });

  const { 
    paymentStatus, 
    errorMessage, 
    authorizationUrl,
    initiateCardPayment, 
    initiateMpesaPayment,
    resetPayment,
    isPaymentInProgress 
  } = usePaystackPayment({
    onSuccess: () => {
      toast({ title: "Payment Successful!", description: "Your booking has been confirmed" });
      setTimeout(() => navigate("/bookings"), 2000);
    },
    onError: (error) => {
      toast({ title: "Payment Failed", description: error, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (id) fetchHotel();
    if (user) fetchUserProfile();
  }, [id, user]);

  const fetchHotel = async () => {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      setHotel(data);
    } catch (error) {
      toast({ title: "Hotel not found", variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, phone_number")
      .eq("id", user?.id)
      .single();
      
    if (profile) {
      setFormData(prev => ({
        ...prev,
        guest_name: profile.name || "",
        guest_email: profile.email || user?.email || "",
        guest_phone: profile.phone_number || "",
      }));
    }
  };

  const getStartingPrice = () => {
    if (!hotel) return 0;
    const prices: number[] = [];
    const extractPrices = (arr: any[]) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        const p = typeof item === 'object' ? item.price : null;
        if (p) prices.push(Number(p));
      });
    };
    extractPrices(hotel.facilities);
    extractPrices(hotel.activities);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const calculateTotal = () => {
    let total = 0;
    formData.selectedFacilities.forEach(f => {
      if (formData.visit_date && formData.checkout_date) {
        const start = new Date(formData.visit_date).getTime();
        const end = new Date(formData.checkout_date).getTime();
        if (end > start) {
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          total += f.price * Math.max(days, 1);
        }
      }
    });
    formData.selectedActivities.forEach(a => {
      total += a.price * a.numberOfPeople;
    });
    return total;
  };

  const toggleFacility = (facility: any) => {
    const exists = formData.selectedFacilities.find(f => f.name === facility.name);
    if (exists) {
      setFormData({
        ...formData,
        selectedFacilities: formData.selectedFacilities.filter(f => f.name !== facility.name),
      });
    } else {
      setFormData({
        ...formData,
        selectedFacilities: [...formData.selectedFacilities, { name: facility.name, price: facility.price }],
      });
    }
  };

  const toggleActivity = (activity: any) => {
    const exists = formData.selectedActivities.find(a => a.name === activity.name);
    if (exists) {
      setFormData({
        ...formData,
        selectedActivities: formData.selectedActivities.filter(a => a.name !== activity.name),
      });
    } else {
      setFormData({
        ...formData,
        selectedActivities: [...formData.selectedActivities, { name: activity.name, price: activity.price, numberOfPeople: 1 }],
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.visit_date || !formData.checkout_date) {
      toast({ title: "Please select dates", variant: "destructive" });
      return;
    }
    if (!formData.guest_name || !formData.guest_email) {
      toast({ title: "Please fill in your details", variant: "destructive" });
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount === 0) {
      toast({ title: "Please select at least one room", variant: "destructive" });
      return;
    }

    const bookingData = {
      item_id: hotel.id,
      booking_type: "hotel",
      total_amount: totalAmount,
      booking_details: {
        hotel_name: hotel.name,
        check_in: formData.visit_date,
        check_out: formData.checkout_date,
        adults: formData.num_adults,
        children: formData.num_children,
        selectedFacilities: formData.selectedFacilities,
        selectedActivities: formData.selectedActivities,
      },
      user_id: user?.id || null,
      is_guest_booking: !user,
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      visit_date: formData.visit_date,
      slots_booked: formData.num_adults + formData.num_children,
      payment_method: paymentMethod,
      payment_phone: formData.mpesa_phone,
      host_id: hotel.created_by,
      emailData: { itemName: hotel.name },
    };

    if (paymentMethod === 'card') {
      const result = await initiateCardPayment(
        formData.guest_email,
        totalAmount,
        bookingData,
        window.location.origin + '/bookings'
      );
      if (result.success && result.authorization_url) {
        window.open(result.authorization_url, '_blank');
      }
    } else {
      await initiateMpesaPayment(
        formData.mpesa_phone,
        formData.guest_email,
        totalAmount,
        bookingData
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!hotel) return null;

  const totalAmount = calculateTotal();
  const facilities = (hotel.facilities || []).filter((f: any) => f.price > 0);
  const activities = (hotel.activities || []).filter((a: any) => a.price > 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      <PaymentStatusDialog
        open={isPaymentInProgress}
        status={paymentStatus}
        errorMessage={errorMessage}
        onClose={resetPayment}
      />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase tracking-tight truncate">{hotel.name}</h1>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{hotel.location}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Image */}
        <div className="relative rounded-3xl overflow-hidden h-48 md:h-64">
          <img src={hotel.image_url} alt={hotel.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/90 text-slate-900 border-none font-bold">
                <Building2 className="h-3 w-3 mr-1" />
                {hotel.establishment_type || "Hotel"}
              </Badge>
              <Badge className="bg-amber-400 text-black border-none font-bold">
                <Star className="h-3 w-3 mr-1 fill-current" />
                {hotel.rating || "New"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Dates Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-teal-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-600">Select Dates</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Check-in</Label>
              <Input
                type="date"
                value={formData.visit_date}
                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Check-out</Label>
              <Input
                type="date"
                value={formData.checkout_date}
                onChange={(e) => setFormData({ ...formData, checkout_date: e.target.value })}
                min={formData.visit_date || new Date().toISOString().split("T")[0]}
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Guests Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-600">Guests</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Adults</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full p-0"
                  onClick={() => setFormData({ ...formData, num_adults: Math.max(1, formData.num_adults - 1) })}
                >
                  -
                </Button>
                <span className="text-xl font-bold w-8 text-center">{formData.num_adults}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full p-0"
                  onClick={() => setFormData({ ...formData, num_adults: formData.num_adults + 1 })}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Children</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full p-0"
                  onClick={() => setFormData({ ...formData, num_children: Math.max(0, formData.num_children - 1) })}
                >
                  -
                </Button>
                <span className="text-xl font-bold w-8 text-center">{formData.num_children}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 rounded-full p-0"
                  onClick={() => setFormData({ ...formData, num_children: formData.num_children + 1 })}
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Rooms/Facilities Section */}
        {facilities.length > 0 && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Bed className="h-5 w-5 text-teal-600" />
              <h2 className="text-sm font-black uppercase tracking-widest text-teal-600">Select Rooms</h2>
            </div>
            <div className="space-y-3">
              {facilities.map((facility: any, idx: number) => {
                const isSelected = formData.selectedFacilities.some(f => f.name === facility.name);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleFacility(facility)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? "border-teal-500 bg-teal-50" 
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={isSelected} />
                        <div>
                          <p className="font-bold text-slate-900">{facility.name}</p>
                          {facility.capacity && (
                            <p className="text-xs text-slate-500">Capacity: {facility.capacity} guests</p>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-teal-600">
                        KSh {Number(facility.price).toLocaleString()}/night
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Activities Section */}
        {activities.length > 0 && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-orange-500" />
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Add Activities</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {activities.map((activity: any, idx: number) => {
                const isSelected = formData.selectedActivities.some(a => a.name === activity.name);
                return (
                  <Badge
                    key={idx}
                    onClick={() => toggleActivity(activity)}
                    className={`px-4 py-2 cursor-pointer text-xs font-bold uppercase transition-all ${
                      isSelected
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100"
                    }`}
                  >
                    {activity.name} • KSh {Number(activity.price).toLocaleString()}
                  </Badge>
                );
              })}
            </div>
          </section>
        )}

        {/* Guest Details Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-600">Your Details</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Full Name *</Label>
              <Input
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                placeholder="Enter your full name"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Email *</Label>
              <Input
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                placeholder="your@email.com"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Phone Number</Label>
              <Input
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                placeholder="+254 700 000 000"
                className="h-12 rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* Payment Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-teal-600" />
            <h2 className="text-sm font-black uppercase tracking-widest text-teal-600">Payment Method</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('mpesa')}
              className={`p-4 rounded-2xl border-2 transition-all ${
                paymentMethod === 'mpesa'
                  ? "border-green-500 bg-green-50"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <Phone className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'mpesa' ? 'text-green-600' : 'text-slate-400'}`} />
              <p className="text-xs font-black uppercase">M-Pesa</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-2xl border-2 transition-all ${
                paymentMethod === 'card'
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <CreditCard className={`h-6 w-6 mx-auto mb-2 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-slate-400'}`} />
              <p className="text-xs font-black uppercase">Card</p>
            </button>
          </div>

          {paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">M-Pesa Phone Number *</Label>
              <Input
                type="tel"
                value={formData.mpesa_phone}
                onChange={(e) => setFormData({ ...formData, mpesa_phone: e.target.value })}
                placeholder="254 7XX XXX XXX"
                className="h-12 rounded-xl"
              />
            </div>
          )}
        </section>

        {/* Order Summary */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Order Summary</h2>
          
          {formData.selectedFacilities.length > 0 && (
            <div className="space-y-2 mb-4">
              {formData.selectedFacilities.map((f, idx) => {
                const days = formData.visit_date && formData.checkout_date
                  ? Math.max(1, Math.ceil((new Date(formData.checkout_date).getTime() - new Date(formData.visit_date).getTime()) / (1000 * 60 * 60 * 24)))
                  : 1;
                return (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-300">{f.name} x {days} night{days > 1 ? 's' : ''}</span>
                    <span className="font-bold">KSh {(f.price * days).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}

          {formData.selectedActivities.length > 0 && (
            <div className="space-y-2 mb-4 pt-4 border-t border-slate-700">
              {formData.selectedActivities.map((a, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-300">{a.name} x {a.numberOfPeople}</span>
                  <span className="font-bold">KSh {(a.price * a.numberOfPeople).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <span className="text-lg font-bold">Total</span>
            <span className="text-3xl font-black text-red-400">KSh {totalAmount.toLocaleString()}</span>
          </div>
        </section>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isPaymentInProgress || totalAmount === 0}
          className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-gradient-to-r from-[#FF7F50] to-[#FF4E50] shadow-xl"
        >
          {isPaymentInProgress ? (
            <>
              <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-6 w-6 mr-2" />
              Confirm & Pay KSh {totalAmount.toLocaleString()}
            </>
          )}
        </Button>
      </main>
    </div>
  );
};

export default HotelBookingPage;
