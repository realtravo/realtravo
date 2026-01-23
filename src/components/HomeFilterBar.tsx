import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface LocationSuggestion {
  location: string;
  place?: string;
  country: string;
  type?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const today = startOfDay(new Date());

  const fetchLocations = useCallback(async (query: string = "") => {
    setIsLoading(true);
    try {
      const searchTerm = query.toLowerCase();
      
      const [hotels, adventures] = await Promise.all([
        supabase.from("hotels").select("location, place, country").eq("approval_status", "approved").limit(5),
        supabase.from("adventure_places").select("location, place, country").eq("approval_status", "approved").limit(5)
      ]);

      let allResults = [...(hotels.data || []), ...(adventures.data || [])];

      if (searchTerm) {
        allResults = allResults.filter(item => 
          item.location?.toLowerCase().includes(searchTerm) || 
          item.place?.toLowerCase().includes(searchTerm) ||
          item.country?.toLowerCase().includes(searchTerm)
        );
      }

      const seen = new Set();
      const uniqueResults = allResults.filter(item => {
        const key = `${item.location}-${item.place}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setLocationSuggestions(uniqueResults as LocationSuggestion[]);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.trim().length > 0) {
      const timer = setTimeout(() => fetchLocations(location), 300);
      return () => clearTimeout(timer);
    }
  }, [location, fetchLocations]);

  const handleInputFocus = () => {
    // Close date popovers when location is focused to prevent overlap
    setCheckInOpen(false);
    setCheckOutOpen(false);
    setShowLocationSuggestions(true);
    if (location.length === 0) {
      fetchLocations();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={handleInputFocus}
                  className="border-none shadow-none focus-visible:ring-0 h-7 p-1 text-sm bg-transparent placeholder:text-muted-foreground/60"
                />
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-2" />
                ) : location && (
                  <button onClick={() => setLocation("")} className="mr-2 hover:text-foreground text-muted-foreground/50">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions Dropdown - Fixed Z-index and Stacking */}
            {showLocationSuggestions && (locationSuggestions.length > 0 || isLoading) && (
              <div className="absolute left-0 right-0 top-[calc(100%+12px)] bg-popover border border-border rounded-2xl shadow-2xl z-[100] py-3 animate-in fade-in zoom-in-95 duration-200 min-w-[280px]">
                <p className="px-5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {location.length > 0 ? "Suggestions" : "Popular Destinations"}
                </p>
                <div className="max-h-[350px] overflow-y-auto">
                  {locationSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setLocation(suggestion.place || suggestion.location);
                        setShowLocationSuggestions(false);
                      }}
                      className="w-full px-5 py-3 text-left hover:bg-accent transition-colors flex items-center gap-4 group/item"
                    >
                      <div className="bg-muted group-hover/item:bg-primary/10 p-2 rounded-lg transition-colors">
                        <MapPin className="h-4 w-4 text-muted-foreground group-hover/item:text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {suggestion.place || suggestion.location}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {suggestion.country}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block w-px h-8 bg-border mx-1" />

          {/* Check-in Section */}
          <div className="flex-1">
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <button 
                  onClick={() => setShowLocationSuggestions(false)}
                  className="flex flex-col w-full px-4 py-1 text-left hover:bg-accent/50 rounded-xl md:rounded-none transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</span>
                  <span className={cn("text-sm mt-0.5 truncate font-medium", !checkIn && "text-muted-foreground/60")}>
                    {checkIn ? format(checkIn, "MMM dd, yyyy") : "Add date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border" align="start" sideOffset={10}>
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={(date) => { setCheckIn(date); setCheckInOpen(false); }}
                  disabled={(date) => date < today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="hidden md:block w-px h-8 bg-border mx-1" />

          {/* Check-out Section */}
          <div className="flex-1">
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <button 
                  onClick={() => setShowLocationSuggestions(false)}
                  className="flex flex-col w-full px-4 py-1 text-left hover:bg-accent/50 rounded-xl md:rounded-none transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</span>
                  <span className={cn("text-sm mt-0.5 truncate font-medium", !checkOut && "text-muted-foreground/60")}>
                    {checkOut ? format(checkOut, "MMM dd, yyyy") : "Add date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border" align="start" sideOffset={10}>
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={(date) => { setCheckOut(date); setCheckOutOpen(false); }}
                  disabled={(date) => (checkIn ? date <= checkIn : date < today)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-1 pl-2 pr-1 py-1">
            {hasFilters && (
              <Button onClick={handleClear} variant="ghost" className="h-10 px-4 text-xs font-bold text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive">
                Clear
              </Button>
            )}
            <Button onClick={handleApply} className="h-11 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex gap-2 shadow-sm">
              <Search className="h-4 w-4 stroke-[3px]" />
              <span>Search</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};