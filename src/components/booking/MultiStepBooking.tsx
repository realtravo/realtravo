// src/components/MultiStepBooking.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentStatusDialog } from "./PaymentStatusDialog";
import { useRealtimeItemAvailability } from "@/hooks/useRealtimeBookings";
// Note: Ensure these hooks exist or are used; they were imported but unused in the original snippet.

interface Facility {
    name: string;
    price: number;
}

interface Activity {
    name: string;
    price: number;
}

export interface BookingFormData {
    visit_date: string;
    num_adults: number;
    num_children: number;
    selectedFacilities: Array<{ name: string; price: number; startDate?: string; endDate?: string }>;
    selectedActivities: Array<{ name: string; price: number; numberOfPeople: number }>;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    mpesa_phone: string;
}

interface MultiStepBookingProps {
    onSubmit: (data: BookingFormData) => Promise<void>; // Fixed type definition
    facilities?: Facility[];
    activities?: Activity[];
    priceAdult?: number;
    priceChild?: number;
    entranceType?: string;
    isProcessing?: boolean;
    itemName: string;
    skipDateSelection?: boolean;
    fixedDate?: string;
    itemId?: string;
    bookingType?: string;
    hostId?: string;
    onPaymentSuccess?: () => void;
    primaryColor?: string;
    accentColor?: string;
    totalCapacity?: number;
    slotLimitType?: 'inventory' | 'per_booking';
    isFlexibleDate?: boolean;
}

export const MultiStepBooking = ({
    onSubmit,
    facilities = [],
    activities = [],
    isProcessing = false,
    itemName,
    skipDateSelection = false,
    fixedDate = "",
    itemId = "",
    totalCapacity = 0,
    slotLimitType = 'inventory',
    primaryColor = "#008080",
}: MultiStepBookingProps) => {
    const { user } = useAuth();
    
    // Step configuration based on available data
    const steps = [
        ...(!skipDateSelection ? ['date'] : []),
        'guests',
        ...(facilities.length > 0 ? ['facilities'] : []),
        ...(activities.length > 0 ? ['activities'] : []),
        'details' // Added a final step for contact info
    ];

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = steps[currentStepIndex];

    const [formData, setFormData] = useState<BookingFormData>({
        visit_date: skipDateSelection ? fixedDate : "",
        num_adults: 1,
        num_children: 0,
        selectedFacilities: [],
        selectedActivities: [],
        guest_name: "",
        guest_email: user?.email || "",
        guest_phone: "",
        mpesa_phone: "",
    });

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
    };

    const handleSubmit = async () => {
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Booking failed:", error);
        }
    };

    return (
        <div className="flex flex-col bg-white rounded-2xl max-w-3xl mx-auto p-6 shadow-lg border border-slate-100">
            <div className="mb-6">
                <h2 className="text-xl font-black text-center" style={{ color: primaryColor }}>Book Your Visit</h2>
                <p className="text-center text-gray-600">{itemName}</p>
                <div className="w-full bg-gray-100 h-1 mt-4 rounded-full overflow-hidden">
                    <div 
                        className="h-full transition-all duration-300" 
                        style={{ 
                            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                            backgroundColor: primaryColor 
                        }} 
                    />
                </div>
            </div>

            <div className="min-h-[300px] space-y-6">
                {/* Step: Visit Date */}
                {currentStep === 'date' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Select Visit Date</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="visit_date">Visit Date</Label>
                            <Input
                                id="visit_date"
                                type="date"
                                value={formData.visit_date}
                                min={new Date().toISOString().split('T')[0]} 
                                onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* Step: Guests */}
                {currentStep === 'guests' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Number of Guests</h3>
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adults">Adults</Label>
                                <Input
                                    id="adults"
                                    type="number"
                                    value={formData.num_adults}
                                    min="1"
                                    onChange={(e) => setFormData({ ...formData, num_adults: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="children">Children</Label>
                                <Input
                                    id="children"
                                    type="number"
                                    value={formData.num_children}
                                    min="0"
                                    onChange={(e) => setFormData({ ...formData, num_children: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step: Facilities */}
                {currentStep === 'facilities' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Select Facilities</h3>
                        {facilities.map((facility) => (
                            <div key={facility.name} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <Checkbox
                                    id={`facility-${facility.name}`}
                                    checked={formData.selectedFacilities.some(f => f.name === facility.name)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setFormData({
                                                ...formData,
                                                selectedFacilities: [...formData.selectedFacilities, { ...facility }]
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                selectedFacilities: formData.selectedFacilities.filter(f => f.name !== facility.name)
                                            });
                                        }
                                    }}
                                />
                                <Label htmlFor={`facility-${facility.name}`} className="flex-1 cursor-pointer">
                                    {facility.name} - <span className="font-bold">KES {facility.price}</span>
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step: Activities */}
                {currentStep === 'activities' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Select Activities</h3>
                        {activities.map((activity) => (
                            <div key={activity.name} className="flex items-center space-x-3 p-3 border rounded-lg">
                                <Checkbox
                                    id={`activity-${activity.name}`}
                                    checked={formData.selectedActivities.some(a => a.name === activity.name)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setFormData({
                                                ...formData,
                                                selectedActivities: [...formData.selectedActivities, { ...activity, numberOfPeople: 1 }]
                                            });
                                        } else {
                                            setFormData({
                                                ...formData,
                                                selectedActivities: formData.selectedActivities.filter(a => a.name !== activity.name)
                                            });
                                        }
                                    }}
                                />
                                <Label htmlFor={`activity-${activity.name}`} className="flex-1 cursor-pointer">
                                    {activity.name} - <span className="font-bold">KES {activity.price}</span>
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step: Details */}
                {currentStep === 'details' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">Contact Details</h3>
                        <div className="space-y-3">
                            <Label>Full Name</Label>
                            <Input 
                                placeholder="John Doe" 
                                value={formData.guest_name}
                                onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                            />
                            <Label>M-Pesa Number</Label>
                            <Input 
                                placeholder="0712345678" 
                                value={formData.mpesa_phone}
                                onChange={(e) => setFormData({...formData, mpesa_phone: e.target.value})}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t">
                <Button 
                    onClick={handlePrevious} 
                    disabled={currentStepIndex === 0 || isProcessing} 
                    variant="outline"
                >
                    Back
                </Button>
                <Button 
                    onClick={handleNext} 
                    disabled={isProcessing}
                    className="min-w-[120px]"
                    style={{ backgroundColor: primaryColor }}
                >
                    {isProcessing ? "Processing..." : (currentStepIndex === steps.length - 1 ? "Complete Booking" : "Next")}
                </Button>
            </div>

            <PaymentStatusDialog open={false} />
        </div>
    );
};