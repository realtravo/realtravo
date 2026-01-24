import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, Loader2, CheckCircle2, Phone, CreditCard, AlertTriangle, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PaymentStatusDialog } from "./PaymentStatusDialog";
import { useMpesaPayment } from "@/hooks/useMpesaPayment";
import { usePaystackPayment } from "@/hooks/usePaystackPayment";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";
import { useFacilityRangeAvailability } from "@/hooks/useDateRangeAvailability";

interface Facility { name: string; price: number; }
interface Activity { name: string; price: number; }

interface MultiStepBookingProps {
    onSubmit: (BookingFormData) => Promise<void>;
    facilities?: Facility[];
    activities?: Activity[];
    priceAdult?: number;
    priceChild?: number;
    entranceType?: string;
    itemName: string;
    skipDateSelection?: boolean;
    fixedDate?: string;
    itemId?: string;
    bookingType?: string;
    hostId?: string;
    onPaymentSuccess?: () => void;
    primaryColor?: string;
    accentColor?: string;
}

export interface BookingFormData {
    visit_date: string;
    num_adults: number;
    num_children: number;
    selectedFacilities: Array<{ name: string; price: number; startDate?: string; endDate?: string }>;
    selectedActivities: Array<{ name: string; price: number; numberOfPeople: number }>;
    guest_name: string;
    guest_email: string;
    mpesa_phone: string;
}

export const MultiStepBooking = ({
    onSubmit,
    facilities = [],
    activities = [],
    priceAdult = 0,
    priceChild = 0,
    entranceType = "paid",
    itemName,
    skipDateSelection = false,
    fixedDate = "",
    itemId = "",
    bookingType = "",
    hostId = "",
    onPaymentSuccess,
    primaryColor = "#008080",
    accentColor = "#FF7F50",
}: MultiStepBookingProps) => {
    const { user } = useAuth();
    const { remainingSlots, isSoldOut } = useRealtimeItemAvailability(itemId);
    const { checkFacilityAvailability } = useFacilityRangeAvailability(itemId);
    const [formData, setFormData] = useState<BookingFormData>({
        visit_date: skipDateSelection ? fixedDate : "",
        num_adults: 1,
        num_children: 0,
        selectedFacilities: [],
        selectedActivities: [],
        guest_name: user?.name || "",
        guest_email: user?.email || "",
        mpesa_phone: "",
    });
    const [currentStep, setCurrentStep] = useState(skipDateSelection ? 2 : 1);
    const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
    const { initiatePayment, resetPayment, isPaymentInProgress } = useMpesaPayment({ onSuccess: onPaymentSuccess });
    const { initiateCardPayment } = usePaystackPayment({ onSuccess: onPaymentSuccess });

    useEffect(() => {
        if (user) {
            const fetchUserProfile = async () => {
                const { profile } = await supabase.from('profiles').select('name, email').eq('id', user.id).single();
                if (profile) setFormData(prev => ({ ...prev, guest_name: profile.name, guest_email: profile.email }));
            };
            fetchUserProfile();
        }
    }, [user]);

    const handleNext = () => setCurrentStep(currentStep + 1);
    const handlePrevious = () => setCurrentStep(currentStep - 1);
    
    const handleSubmit = async () => {
        const totalAmount = calculateTotal();
        if (totalAmount === 0) {
            await onSubmit(formData);
            return;
        }
        const paymentData = { ...formData, total_amount: totalAmount, payment_method: paymentMethod };
        if (paymentMethod === 'card') {
            await initiateCardPayment(paymentData);
        } else {
            await initiatePayment(paymentData);
        }
    };

    const calculateTotal = () => {
        let total = (formData.num_adults * priceAdult) + (formData.num_children * priceChild);
        formData.selectedFacilities.forEach(f => total += f.price);
        formData.selectedActivities.forEach(a => total += a.price * a.numberOfPeople);
        return total;
    };

    return (
        <div className="flex flex-col bg-gradient-to-br from-white to-slate-50 rounded-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b">
                <h2 className="text-xl font-black" style={{ color: primaryColor }}>Book Your Visit</h2>
                <p className="text-sm text-slate-500">{itemName}</p>
            </div>
            <div className="p-6 space-y-6">
                {currentStep === 1 && (
                    <div>
                        <Label htmlFor="visit_date">Visit Date</Label>
                        <Input id="visit_date" type="date" value={formData.visit_date} onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })} />
                    </div>
                )}
                {currentStep === 2 && (
                    <div>
                        <Label htmlFor="num_adults">Adults</Label>
                        <Input id="num_adults" type="number" value={formData.num_adults} onChange={(e) => setFormData({ ...formData, num_adults: +e.target.value })} />
                        <Label htmlFor="num_children">Children</Label>
                        <Input id="num_children" type="number" value={formData.num_children} onChange={(e) => setFormData({ ...formData, num_children: +e.target.value })} />
                    </div>
                )}
                {currentStep === 3 && (
                    <div>
                        {facilities.map(facility => (
                            <div key={facility.name}>
                                <Checkbox id={facility.name} onCheckedChange={() => toggleFacility(facility)} />
                                <Label htmlFor={facility.name}>{facility.name} - KES {facility.price}</Label>
                            </div>
                        ))}
                    </div>
                )}
                {currentStep === 4 && (
                    <div>
                        <h3>Payment Method</h3>
                        <Button onClick={() => setPaymentMethod('mpesa')}>M-Pesa</Button>
                        <Button onClick={() => setPaymentMethod('card')}>Card</Button>
                    </div>
                )}
            </div>
            <div className="p-6">
                {currentStep > 1 && <Button onClick={handlePrevious}>Back</Button>}
                {currentStep < 4 ? (
                    <Button onClick={handleNext}>Next</Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={isPaymentInProgress}>Submit</Button>
                )}
            </div>
            <PaymentStatusDialog open={false} onClose={resetPayment} />
        </div>
    );
};