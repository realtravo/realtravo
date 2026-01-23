import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface HomeFilterValues {
  location: string;
  checkIn?: Date;
  checkOut?: Date;
}

interface HomeFilterBarProps {
  onApplyFilters: (filters: HomeFilterValues) => void;
  onClear: () => void;
}

interface LocationSuggestion {
  location: string;
  place?: string;
  country: string;
  type: string;
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

  // Fetch location suggestions based on input
  useEffect(() => {
    if (location.trim().length < 1) {
      setLocationSuggestions([]);
      return;
    }

    const fetchLocationSuggestions = async () => {
      const query = location.toLowerCase();
      
      const [hotelsData, adventuresData, tripsData] = await Promise.all([
        supabase
          .from("hotels")
          .select("location, place, country")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .limit(50),
        supabase
          .from("adventure_places")
          .select("location, place, country")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .limit(50),
        supabase
          .from("trips")
          .select("location, place, country")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .limit(50),
      ]);

      const allLocations: LocationSuggestion[] = [];
      const seen = new Set<string>();

      const processData = (data: any[], type: string) => {
        (data || []).forEach((item) => {
          // Check if location, place, or country matches the query
          const matchesLocation = item.location?.toLowerCase().startsWith(query);
          const matchesPlace = item.place?.toLowerCase().startsWith(query);
          const matchesCountry = item.country?.toLowerCase().startsWith(query);

          if (matchesLocation || matchesPlace || matchesCountry) {
            const key = `${item.location}-${item.place}-${item.country}`;
            if (!seen.has(key)) {
              seen.add(key);
              allLocations.push({
                location: item.location,
                place: item.place,
                country: item.country,
                type,
              });
            }
          }
        });
      };

      processData(hotelsData.data, "hotel");
      processData(adventuresData.data, "adventure");
      processData(tripsData.data, "trip");

      // Sort by relevance (prioritize matches that start with query)
      allLocations.sort((a, b) => {
        const aStarts = a.location?.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.location?.toLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts;
      });

      setLocationSuggestions(allLocations.slice(0, 8));
    };

    const debounce = setTimeout(fetchLocationSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [location]);

  // Close suggestions when clicking outside
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
    onApplyFilters({
      location: location.trim(),
      checkIn,
      checkOut,
    });
    setShowLocationSuggestions(false);
  };

  const handleClear = () => {
    setLocation("");
    setCheckIn(undefined);
    setCheckOut(undefined);
    setLocationSuggestions([]);
    onClear();
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const displayLocation = suggestion.place || suggestion.location;
    setLocation(displayLocation);
    setShowLocationSuggestions(false);
  };

  const hasFilters = location || checkIn || checkOut;

  return (
    <div className="w-full bg-background border-b border-border px-3 py-3">
      {/* Always single row layout with flex-wrap for small screens */}
      <div className="flex flex-row items-center gap-2 flex-wrap">
        {/* Location Input with Suggestions */}
        <div ref={locationRef} className="relative flex-1 min-w-[120px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Location..."
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setShowLocationSuggestions(true);
            }}
            onFocus={() => setShowLocationSuggestions(true)}
            className="pl-9 h-10 text-sm bg-muted/30 border-muted"
          />
          
          {/* Location Suggestions Dropdown */}
          {showLocationSuggestions && locationSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {locationSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.location}-${suggestion.country}-${index}`}
                  onClick={() => handleLocationSelect(suggestion)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {suggestion.place || suggestion.location}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {[suggestion.location, suggestion.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Date */}
        <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left text-sm bg-muted/30 border-muted min-w-[100px] flex-shrink-0"
            >
              <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
              {checkIn ? (
                format(checkIn, "MMM d")
              ) : (
                <span className="text-muted-foreground text-xs">Check-in</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkIn}
              onSelect={(date) => {
                setCheckIn(date);
                setCheckInOpen(false); // Close calendar on select
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Check-out Date */}
        <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 justify-start text-left text-sm bg-muted/30 border-muted min-w-[100px] flex-shrink-0"
            >
              <CalendarIcon className="mr-1 h-4 w-4 text-muted-foreground" />
              {checkOut ? (
                format(checkOut, "MMM d")
              ) : (
                <span className="text-muted-foreground text-xs">Check-out</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOut}
              onSelect={(date) => {
                setCheckOut(date);
                setCheckOutOpen(false); // Close calendar on select
              }}
              disabled={(date) => {
                const minDate = checkIn || new Date();
                return date <= minDate;
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Action Buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <Button
            onClick={handleApply}
            size="sm"
            className="h-10 px-3 bg-primary text-primary-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>
          {hasFilters && (
            <Button
              onClick={handleClear}
              size="sm"
              variant="ghost"
              className="h-10 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};