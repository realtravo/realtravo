import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Search, X } from "lucide-react";
import { format } from "date-fns";

export interface HomeFilterValues {
  location: string;
  checkIn?: Date;
  checkOut?: Date;
}

interface HomeFilterBarProps {
  onApplyFilters: (filters: HomeFilterValues) => void;
  onClear: () => void;
}

export const HomeFilterBar = ({ onApplyFilters, onClear }: HomeFilterBarProps) => {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();

  const handleApply = () => {
    onApplyFilters({
      location: location.trim(),
      checkIn,
      checkOut,
    });
  };

  const handleClear = () => {
    setLocation("");
    setCheckIn(undefined);
    setCheckOut(undefined);
    onClear();
  };

  const hasFilters = location || checkIn || checkOut;

  return (
    <div className="w-full bg-background border-b border-border px-3 py-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        {/* Location Input */}
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-9 h-10 text-sm bg-muted/30 border-muted"
          />
        </div>

        {/* Check-in Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left text-sm bg-muted/30 border-muted flex-1 md:flex-initial md:min-w-[140px]"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {checkIn ? (
                format(checkIn, "MMM d")
              ) : (
                <span className="text-muted-foreground">Check-in</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={setCheckIn}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Check-out Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left text-sm bg-muted/30 border-muted flex-1 md:flex-initial md:min-w-[140px]"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              {checkOut ? (
                format(checkOut, "MMM d")
              ) : (
                <span className="text-muted-foreground">Check-out</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={setCheckOut}
              disabled={(date) => {
                const minDate = checkIn || new Date();
                return date <= minDate;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            size="sm"
            className="h-10 px-4 bg-primary text-primary-foreground"
          >
            <Search className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Apply</span>
          </Button>
          {hasFilters && (
            <Button
              onClick={handleClear}
              size="sm"
              variant="ghost"
              className="h-10 px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
