import React, { useState } from "react";
import { Search, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
};

export const FilterBar = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  return (
    /* max-w-4xl matches your SearchBarWithSuggestions */
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <div className="flex flex-row items-center bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden h-14 md:h-16">
        
        {/* WHERE SECTION */}
        <div className="flex flex-col flex-1 px-4 md:px-6 py-1 min-w-[100px]">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Where
          </label>
          <input 
            type="text" 
            placeholder="Destinations" 
            className="bg-transparent border-none p-0 text-sm md:text-base focus:ring-0 placeholder:text-slate-300 font-bold outline-none text-slate-700"
          />
        </div>

        <div className="w-[1px] h-8 bg-slate-100 self-center" />

        {/* FROM SECTION */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col px-4 md:px-6 py-1 cursor-pointer hover:bg-slate-50 transition-colors min-w-[80px] md:min-w-[120px]">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-2.5 w-2.5" /> From
              </span>
              <span className={cn("text-sm md:text-base font-bold", !dateFrom ? "text-slate-300" : "text-slate-700")}>
                {dateFrom ? format(dateFrom, "MMM dd") : "Add"}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl" align="center">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="w-[1px] h-8 bg-slate-100 self-center" />

        {/* TO SECTION */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col px-4 md:px-6 py-1 cursor-pointer hover:bg-slate-50 transition-colors min-w-[80px] md:min-w-[120px]">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-2.5 w-2.5" /> To
              </span>
              <span className={cn("text-sm md:text-base font-bold", !dateTo ? "text-slate-300" : "text-slate-700")}>
                {dateTo ? format(dateTo, "MMM dd") : "Add"}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl" align="center">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              disabled={(date) => (dateFrom ? date <= dateFrom : date < new Date())}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* SEARCH BUTTON - Rectangular and matching the bar height */}
        <div className="h-full">
          <button
            className="flex items-center justify-center gap-2 text-white h-full px-5 md:px-8 transition-all hover:brightness-110 active:scale-95 border-none"
            style={{ 
                background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` 
            }}
          >
            <Search className="w-5 h-5 stroke-[3px]" />
            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  TEAL: "#008080",
};

interface LocationSuggestion {
  id: string;
  name: string;
  place?: string;
  country?: string;
  type: string;
}

interface FilterBarProps {
  category: "trip" | "hotel" | "adventure" | "event";
  onApplyFilters: (filters: { location: string; from?: Date; to?: Date }) => void;
}

export const FilterBar = ({ category, onApplyFilters }: FilterBarProps) => {
  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocDropdown, setShowLocDropdown] = useState(false);

  // Fetch suggestions based on input and category
  useEffect(() => {
    const fetchLocations = async () => {
      if (locationInput.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const query = locationInput.toLowerCase();
      
      try {
        // Map category to specific table
        const tableMap = {
          trip: "trips",
          hotel: "hotels",
          adventure: "adventure_places",
          event: "trips" // Events are stored in trips table in your schema
        };

        let dbQuery = supabase
          .from(tableMap[category])
          .select("id, name, place, country")
          .eq("approval_status", "approved");

        // If category is event/trip, filter by type
        if (category === "trip" || category === "event") {
          dbQuery = dbQuery.eq("type", category);
        }

        const { data } = await dbQuery.or(`name.ilike.%${query}%,place.ilike.%${query}%,country.ilike.%${query}%`).limit(5);

        if (data) setSuggestions(data as LocationSuggestion[]);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchLocations, 300);
    return () => clearTimeout(timer);
  }, [locationInput, category]);

  const handleApply = () => {
    onApplyFilters({
      location: selectedLocation?.name || locationInput,
      from: dateFrom,
      to: dateTo,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
      <div className="flex flex-row items-center bg-white border border-slate-100 rounded-2xl shadow-xl h-14 md:h-16 relative">
        
        {/* WHERE SECTION with Autocomplete */}
        <div className="flex flex-col flex-1 px-4 md:px-6 py-1 min-w-[140px] relative">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Where
          </label>
          <input 
            type="text" 
            placeholder="Destinations" 
            value={locationInput}
            onChange={(e) => {
              setLocationInput(e.target.value);
              setShowLocDropdown(true);
            }}
            onFocus={() => setShowLocDropdown(true)}
            className="bg-transparent border-none p-0 text-sm md:text-base focus:ring-0 placeholder:text-slate-300 font-bold outline-none text-slate-700"
          />

          {/* Location Suggestions Dropdown */}
          {showLocDropdown && (locationInput || isSearching) && (
            <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] overflow-hidden">
              {isSearching ? (
                <div className="p-4 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-teal-600" /></div>
              ) : (
                suggestions.map((loc) => (
                  <button
                    key={loc.id}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex flex-col border-b border-slate-50 last:border-0"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setLocationInput(loc.name);
                      setShowLocDropdown(false);
                    }}
                  >
                    <span className="text-sm font-bold text-slate-800">{loc.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">
                      {loc.place}{loc.country ? `, ${loc.country}` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="w-[1px] h-8 bg-slate-100 self-center" />

        {/* FROM SECTION */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col px-4 md:px-6 py-1 cursor-pointer hover:bg-slate-50 transition-colors min-w-[85px] md:min-w-[120px]">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-2.5 w-2.5" /> From
              </span>
              <span className={cn("text-sm md:text-base font-bold", !dateFrom ? "text-slate-300" : "text-slate-700")}>
                {dateFrom ? format(dateFrom, "MMM dd") : "Add"}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl" align="center">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
          </PopoverContent>
        </Popover>

        <div className="w-[1px] h-8 bg-slate-100 self-center" />

        {/* TO SECTION */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex flex-col px-4 md:px-6 py-1 cursor-pointer hover:bg-slate-50 transition-colors min-w-[85px] md:min-w-[120px]">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <CalendarIcon className="h-2.5 w-2.5" /> To
              </span>
              <span className={cn("text-sm md:text-base font-bold", !dateTo ? "text-slate-300" : "text-slate-700")}>
                {dateTo ? format(dateTo, "MMM dd") : "Add"}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-3xl" align="center">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
          </PopoverContent>
        </Popover>

        {/* APPLY BUTTON */}
        <div className="h-full">
          <button
            onClick={handleApply}
            className="flex items-center justify-center gap-2 text-white h-full px-5 md:px-8 transition-all hover:brightness-110 active:scale-95 border-none rounded-r-2xl"
            style={{ background: `linear-gradient(135deg, ${COLORS.TEAL} 0%, #006666 100%)` }}
          >
            <Search className="w-5 h-5 stroke-[3px]" />
            <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};