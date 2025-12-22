import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon, Loader2, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const manualBookingSchema = z.object({
  guestName: z.string().min(1, "Guest name is required").max(100),
  guestContact: z.string().min(1, "Contact is required").max(100),
  slotsBooked: z.number().min(1, "At least 1 slot required"),
  visitDate: z.date({ message: "Visit date is required" }),
});

interface ManualBookingFormProps {
  itemId: string;
  itemType: 'trip' | 'event' | 'hotel' | 'adventure' | 'adventure_place';
  itemName: string;
  totalCapacity: number;
  onBookingCreated: () => void;
}

export const ManualBookingForm = ({
  itemId,
  itemType,
  itemName,
  totalCapacity,
  onBookingCreated
}: ManualBookingFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [formData, setFormData] = useState({
    guestName: '',
    guestContact: '',
    slotsBooked: 1,
    visitDate: undefined as Date | undefined,
  });

  const checkAvailability = async (date: Date) => {
    setCheckingAvailability(true);
    setConflictError(null);
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check availability from public table
      const { data: availability } = await supabase
        .from('item_availability_by_date')
        .select('booked_slots')
        .eq('item_id', itemId)
        .eq('visit_date', dateStr)
        .maybeSingle();

      const bookedSlots = availability?.booked_slots || 0;
      const remaining = totalCapacity - bookedSlots;
      
      setAvailableSlots(remaining);
      
      if (remaining <= 0) {
        setConflictError(`This date is fully booked (${bookedSlots}/${totalCapacity} slots taken)`);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setFormData(prev => ({ ...prev, visitDate: date }));
    if (date) {
      checkAvailability(date);
    } else {
      setAvailableSlots(null);
      setConflictError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    // Validate form
    const validation = manualBookingSchema.safeParse(formData);
    if (!validation.success) {
      const issues = validation.error.issues;
      toast({
        title: "Validation Error",
        description: issues[0]?.message || "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if slots exceed available
    if (availableSlots !== null && formData.slotsBooked > availableSlots) {
      setConflictError(`Only ${availableSlots} slots available. Reduce the number of slots.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const dateStr = formData.visitDate ? format(formData.visitDate, 'yyyy-MM-dd') : null;
      
      // Re-check availability before insert (to catch race conditions)
      if (dateStr) {
        const { data: latestAvailability } = await supabase
          .from('item_availability_by_date')
          .select('booked_slots')
          .eq('item_id', itemId)
          .eq('visit_date', dateStr)
          .maybeSingle();

        const currentBooked = latestAvailability?.booked_slots || 0;
        const currentAvailable = totalCapacity - currentBooked;
        
        if (formData.slotsBooked > currentAvailable) {
          setConflictError(`Conflict Alert: Only ${currentAvailable} slots are now available. An online booking may have just taken some slots.`);
          setIsSubmitting(false);
          return;
        }
      }

      // Insert manual booking
      const { error } = await supabase.from('bookings').insert({
        item_id: itemId,
        booking_type: itemType === 'adventure_place' ? 'adventure' : itemType,
        guest_name: formData.guestName.trim(),
        guest_email: formData.guestContact.includes('@') ? formData.guestContact.trim() : null,
        guest_phone: !formData.guestContact.includes('@') ? formData.guestContact.trim() : null,
        slots_booked: formData.slotsBooked,
        visit_date: dateStr,
        total_amount: 0, // Manual booking - no payment through system
        status: 'confirmed',
        payment_status: 'paid', // Mark as paid (offline payment assumed)
        payment_method: 'manual_entry',
        is_guest_booking: true,
        booking_details: {
          source: 'manual_entry',
          entered_by: 'host',
          notes: 'Manually entered offline booking'
        }
      });

      if (error) {
        // Check for capacity validation error from trigger
        if (error.message.includes('Sold out') || error.message.includes('capacity')) {
          setConflictError('Conflict Alert: ' + error.message);
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Booking Added",
        description: `Manual booking for ${formData.guestName} has been recorded.`
      });

      // Reset form
      setFormData({
        guestName: '',
        guestContact: '',
        slotsBooked: 1,
        visitDate: undefined,
      });
      setAvailableSlots(null);
      onBookingCreated();
    } catch (error: any) {
      console.error('Error creating manual booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateBased = itemType === 'hotel' || itemType === 'adventure' || itemType === 'adventure_place';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Guest Name */}
        <div className="space-y-2">
          <Label htmlFor="guestName" className="text-xs font-black uppercase tracking-widest text-slate-500">
            Guest Name *
          </Label>
          <Input
            id="guestName"
            value={formData.guestName}
            onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
            placeholder="John Doe"
            className="rounded-xl border-slate-200"
            maxLength={100}
          />
        </div>

        {/* Contact (Phone/Email) */}
        <div className="space-y-2">
          <Label htmlFor="guestContact" className="text-xs font-black uppercase tracking-widest text-slate-500">
            Phone / Email *
          </Label>
          <Input
            id="guestContact"
            value={formData.guestContact}
            onChange={(e) => setFormData(prev => ({ ...prev, guestContact: e.target.value }))}
            placeholder="+254... or email@example.com"
            className="rounded-xl border-slate-200"
            maxLength={100}
          />
        </div>

        {/* Visit Date */}
        <div className="space-y-2">
          <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
            {isDateBased ? 'Visit Date *' : 'Event Date'}
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal rounded-xl border-slate-200",
                  !formData.visitDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.visitDate ? format(formData.visitDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.visitDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Slots/Guests */}
        <div className="space-y-2">
          <Label htmlFor="slotsBooked" className="text-xs font-black uppercase tracking-widest text-slate-500">
            {itemType === 'hotel' ? 'Rooms *' : 'Guests/Slots *'}
          </Label>
          <Input
            id="slotsBooked"
            type="number"
            min={1}
            max={totalCapacity}
            value={formData.slotsBooked}
            onChange={(e) => setFormData(prev => ({ ...prev, slotsBooked: Math.max(1, parseInt(e.target.value) || 1) }))}
            className="rounded-xl border-slate-200"
          />
        </div>
      </div>

      {/* Availability Status */}
      {formData.visitDate && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-xl text-sm font-bold",
          checkingAvailability ? "bg-slate-100 text-slate-500" :
          conflictError ? "bg-red-50 text-red-700 border border-red-200" :
          availableSlots !== null && availableSlots > 0 ? "bg-green-50 text-green-700 border border-green-200" :
          "bg-slate-100"
        )}>
          {checkingAvailability ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Checking availability...</>
          ) : conflictError ? (
            <><AlertTriangle className="h-4 w-4" /> {conflictError}</>
          ) : availableSlots !== null && availableSlots > 0 ? (
            <><CheckCircle2 className="h-4 w-4" /> {availableSlots} of {totalCapacity} slots available</>
          ) : null}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || checkingAvailability || (conflictError !== null && availableSlots === 0)}
        className="w-full rounded-xl py-6 font-black uppercase tracking-widest text-xs"
        style={{ background: '#008080' }}
      >
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Adding Booking...</>
        ) : (
          <><UserPlus className="h-4 w-4 mr-2" /> Add Manual Booking</>
        )}
      </Button>
    </form>
  );
};
