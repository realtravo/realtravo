import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { guestBookingSchema, paymentPhoneSchema } from "@/lib/validation";

interface Facility {
  name: string;
  price: number;
  capacity?: number;
}

interface Activity {
  name: string;
  price: number;
}

interface AdventurePlace {
  id: string;
  name: string;
  facilities: Facility[];
  activities: Activity[];
  entry_fee?: number;
  entry_fee_type?: string;
}

interface SelectedFacility extends Facility {
  startDate: string;
  endDate: string;
}

interface SelectedActivity {
  name: string;
  price: number;
  numberOfPeople: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: AdventurePlace;
}

export const BookAdventureDialog = ({ open, onOpenChange, place }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [visitDate, setVisitDate] = useState("");
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [selectedFacilities, setSelectedFacilities] = useState<SelectedFacility[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<SelectedActivity[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [tripNote, setTripNote] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Guest booking fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const toggleFacility = (facility: Facility, checked: boolean) => {
    if (checked) {
      setSelectedFacilities([...selectedFacilities, { ...facility, startDate: "", endDate: "" }]);
    } else {
      setSelectedFacilities(selectedFacilities.filter(f => f.name !== facility.name));
    }
  };

  const toggleActivity = (activity: Activity, checked: boolean) => {
    if (checked) {
      setSelectedActivities([...selectedActivities, { ...activity, numberOfPeople: 1 }]);
    } else {
      setSelectedActivities(selectedActivities.filter(a => a.name !== activity.name));
    }
  };

  const updateActivityPeople = (name: string, count: number) => {
    setSelectedActivities(selectedActivities.map(a => 
      a.name === name ? { ...a, numberOfPeople: Math.max(1, count) } : a
    ));
  };

  const updateFacilityDates = (name: string, field: 'startDate' | 'endDate', value: string) => {
    setSelectedFacilities(selectedFacilities.map(f => 
      f.name === name ? { ...f, [field]: value } : f
    ));
  };

  const calculateTotal = () => {
    let total = 0;
    
    // Entry fees
    if (place.entry_fee_type !== 'free' && place.entry_fee) {
      total += (adults * place.entry_fee) + (children * (place.entry_fee || 0));
    }
    
    // Facilities
    total += selectedFacilities.reduce((sum, facility) => {
      if (!facility.startDate || !facility.endDate) return sum;
      const days = Math.ceil((new Date(facility.endDate).getTime() - new Date(facility.startDate).getTime()) / (1000 * 60 * 60 * 24));
      return sum + (facility.price * Math.max(days, 1));
    }, 0);
    
    // Activities
    total += selectedActivities.reduce((sum, activity) => sum + (activity.price * activity.numberOfPeople), 0);
    
    return total;
  };

  const handleStepOne = () => {
    if (!visitDate) {
      toast({
        title: "Select date",
        description: "Please select a visit date",
        variant: "destructive",
      });
      return;
    }

    if (adults === 0 && children === 0) {
      toast({
        title: "Add guests",
        description: "Please add at least one guest",
        variant: "destructive",
      });
      return;
    }

    const incompleteFacilities = selectedFacilities.some(f => !f.startDate || !f.endDate);
    if (incompleteFacilities) {
      toast({
        title: "Missing dates",
        description: "Please enter dates for all selected facilities",
        variant: "destructive",
      });
      return;
    }

    setStep(2);
  };

  const handleBooking = async () => {
    // Validate guest fields if not logged in
    if (!user) {
      const validation = guestBookingSchema.safeParse({
        name: guestName,
        email: guestEmail,
        phone: guestPhone,
      });

      if (!validation.success) {
        toast({
          title: "Invalid input",
          description: validation.error.issues[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!paymentMethod) {
      toast({
        title: "Select payment method",
        description: "Please choose how you'd like to pay",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Initiate M-Pesa STK Push if M-Pesa is selected
      if (paymentMethod === "mpesa") {
        const { data: mpesaResponse, error: mpesaError } = await supabase.functions.invoke("mpesa-stk-push", {
          body: {
            phoneNumber: paymentPhone,
            amount: calculateTotal(),
            accountReference: `ADVENTURE-${place.id}`,
            transactionDesc: `Booking for ${place.name}`,
          },
        });

        if (mpesaError || !mpesaResponse?.success) {
          throw new Error(mpesaResponse?.error || "M-Pesa payment failed");
        }

        toast({
          title: "Payment initiated",
          description: "Please check your phone to complete the payment",
        });
      }

      const { data: bookingData, error } = await supabase.from("bookings").insert({
        user_id: user?.id || null,
        booking_type: "adventure_place",
        item_id: place.id,
        visit_date: visitDate,
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        payment_phone: paymentPhone || null,
        is_guest_booking: !user,
        guest_name: !user ? guestName : null,
        guest_email: !user ? guestEmail : null,
        guest_phone: !user ? guestPhone : null,
        booking_details: {
          place_name: place.name,
          adults,
          children,
          facilities: selectedFacilities,
          activities: selectedActivities,
          trip_note: tripNote,
        },
      } as any).select().single();

      if (error) throw error;

      // Send confirmation email
      const emailData = {
        bookingId: bookingData.id,
        email: user ? user.email : guestEmail,
        guestName: user ? user.user_metadata?.name || guestName : guestName,
        bookingType: "adventure_place",
        itemName: place.name,
        totalAmount: calculateTotal(),
        bookingDetails: {
          adults,
          children,
          selectedFacilities,
          selectedActivities,
          phone: user ? "" : guestPhone,
        },
        visitDate,
      };

      await supabase.functions.invoke("send-booking-confirmation", {
        body: emailData,
      });

      toast({
        title: "Booking successful!",
        description: "Your adventure has been booked. Check your email for confirmation.",
      });

      onOpenChange(false);
      navigate("/bookings");
    } catch (error) {
      console.error("Booking error:", error);
      toast({
        title: "Booking failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Book {place.name}</DrawerTitle>
        </DrawerHeader>
        <ScrollArea className="flex-1 px-4">

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="visitDate">Visit Date</Label>
              <Input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="adults">Adults</Label>
                <Input
                  id="adults"
                  type="number"
                  min="0"
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="children">Children</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
                  value={children}
                  onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {place.activities && place.activities.length > 0 && (
              <div>
                <Label>Select Activities (Optional)</Label>
                <div className="space-y-3 mt-2">
                  {place.activities.map((activity) => (
                    <div key={activity.name} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`activity-${activity.name}`}
                            checked={selectedActivities.some(a => a.name === activity.name)}
                            onCheckedChange={(checked) => toggleActivity(activity, checked as boolean)}
                          />
                          <label htmlFor={`activity-${activity.name}`} className="cursor-pointer">
                            {activity.name}
                          </label>
                        </div>
                        <span className="text-sm font-semibold">${activity.price}/person</span>
                      </div>
                      
                      {selectedActivities.some(a => a.name === activity.name) && (
                        <div className="mt-2 pl-6">
                          <Label className="text-xs">Number of People</Label>
                          <Input
                            type="number"
                            min="1"
                            value={selectedActivities.find(a => a.name === activity.name)?.numberOfPeople || 1}
                            onChange={(e) => updateActivityPeople(activity.name, parseInt(e.target.value) || 1)}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {place.facilities && place.facilities.length > 0 && (
              <div>
                <Label>Select Facilities (Optional)</Label>
                <div className="space-y-3 mt-2">
                  {place.facilities.map((facility) => (
                    <div key={facility.name} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          id={`facility-${facility.name}`}
                          checked={selectedFacilities.some(f => f.name === facility.name)}
                          onCheckedChange={(checked) => toggleFacility(facility, checked as boolean)}
                        />
                        <label htmlFor={`facility-${facility.name}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{facility.name}</div>
                          <div className="text-sm text-muted-foreground">${facility.price}/day</div>
                        </label>
                      </div>
                      
                      {selectedFacilities.some(f => f.name === facility.name) && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                          <div>
                            <Label className="text-xs">Start Date</Label>
                            <Input
                              type="date"
                              value={selectedFacilities.find(f => f.name === facility.name)?.startDate || ""}
                              onChange={(e) => updateFacilityDates(facility.name, 'startDate', e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">End Date</Label>
                            <Input
                              type="date"
                              value={selectedFacilities.find(f => f.name === facility.name)?.endDate || ""}
                              onChange={(e) => updateFacilityDates(facility.name, 'endDate', e.target.value)}
                              min={selectedFacilities.find(f => f.name === facility.name)?.startDate || new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-secondary p-4 rounded-lg">
              <div className="flex justify-between font-semibold">
                <span>Total Amount:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleStepOne} className="w-full">
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary p-4 rounded-lg">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total to Pay:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {!user && (
              <div className="space-y-3 border-b pb-4">
                <h3 className="font-semibold">Guest Information</h3>
                <div>
                  <Label htmlFor="guestName">Full Name *</Label>
                  <Input
                    id="guestName"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email Address *</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guestPhone">Phone Number *</Label>
                  <Input
                    id="guestPhone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={paymentMethod === "mpesa" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("mpesa")}
                >
                  M-Pesa
                </Button>
                <Button
                  variant={paymentMethod === "airtel" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("airtel")}
                >
                  Airtel
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                >
                  Card
                </Button>
              </div>
            </div>

            {(paymentMethod === "mpesa" || paymentMethod === "airtel") && (
              <div>
                <Label htmlFor="paymentPhone">Phone Number</Label>
                <Input
                  id="paymentPhone"
                  value={paymentPhone}
                  onChange={(e) => setPaymentPhone(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cardExpiry">Expiry Date</Label>
                    <Input
                      id="cardExpiry"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cardCvv">CVV</Label>
                    <Input
                      id="cardCvv"
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="tripNote">Trip Note (Optional)</Label>
              <Input
                id="tripNote"
                value={tripNote}
                onChange={(e) => setTripNote(e.target.value)}
                placeholder="Any special requests or notes"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleBooking} disabled={loading} className="flex-1">
                {loading ? "Processing..." : "Complete Booking"}
              </Button>
            </div>
          </div>
        )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
