import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Search } from "lucide-react";
import { format, startOfDay } from "date-fns"; // Added startOfDay
import { cn } from "@/lib/utils";

// 1. Define missing interfaces
interface LocationSuggestion {
  place?: string;
  location: string;
  country: string;
}

interface HomeFilterBarProps {
  onApplyFilters: (filters: { 
    location: string; 
    checkIn?: Date; 
    checkOut?: Date 
  }) => void;
  onClear: () => void;
}

export const HomeFilterBar = ({ onApplyFilters, onClear }: HomeFilterBarProps) => {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const handleApply = () => {
    onApplyFilters({ location: location.trim(), checkIn, checkOut });
    setShowLocationSuggestions(false);
  };

  const handleClear = () => {
    setLocation("");
    setCheckIn(undefined);
    setCheckOut(undefined);
    setLocationSuggestions([]);
    onClear();
  };

  const hasFilters = location || checkIn || checkOut;

  // Get today's date at 00:00:00 to ensure consistent disabling logic
  const today = startOfDay(new Date());

  return (
    <div className="w-full bg-background border-b border-border px-4 py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-stretch md:items-center bg-card border border-border shadow-sm rounded-2xl md:rounded-full p-2 gap-1 md:gap-0 transition-all hover:shadow-md">
          
          {/* Location Section */}
          <div ref={locationRef} className="relative flex-[1.5] group">
            <div className="flex flex-col px-4 py-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Where</label>
              <div className="flex items-center">
                <Input
                  placeholder="Search destinations"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  className="border-none shadow-none focus-visible:ring-0 h-7 p-1 text-sm bg-transparent placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+10px)] bg-popover border border-border rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setLocation(suggestion.place || suggestion.location);
                      setShowLocationSuggestions(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
                  >
                    <div className="bg-muted p-1.5 rounded-md">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{suggestion.place || suggestion.location}</span>
                      <span className="text-xs text-muted-foreground mt-1">{suggestion.country}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block w-px h-8 bg-border" />

          {/* Check-in Section */}
          <div className="flex-1 group">
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <button className="flex flex-col w-full px-4 py-1 text-left hover:bg-accent/50 rounded-xl md:rounded-none transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check in</span>
                  <span className={cn("text-sm mt-0.5 truncate", !checkIn && "text-muted-foreground/60")}>
                    {checkIn ? format(checkIn, "MMM dd, yyyy") : "Add date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(date) => { setCheckIn(date); setCheckInOpen(false); }}
                  // Fixed: Simpler disabled logic
                  disabled={(date) => date < today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="hidden md:block w-px h-8 bg-border" />

          {/* Check-out Section */}
          <div className="flex-1 group">
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <button className="flex flex-col w-full px-4 py-1 text-left hover:bg-accent/50 rounded-xl md:rounded-none transition-colors">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Check out</span>
                  <span className={cn("text-sm mt-0.5 truncate", !checkOut && "text-muted-foreground/60")}>
                    {checkOut ? format(checkOut, "MMM dd, yyyy") : "Add date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={(date) => { setCheckOut(date); setCheckOutOpen(false); }}
                  // Fixed: Ensure checkout is after check-in and not in the past
                  disabled={(date) => (checkIn ? date <= checkIn : date < today)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pl-2 pr-1 py-1">
            {hasFilters && (
              <Button
                onClick={handleClear}
                variant="ghost"
                className="h-10 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-full"
              >
                Clear
              </Button>
            )}
            <Button
              onClick={handleApply}
              className="h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all active:scale-95 flex gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};