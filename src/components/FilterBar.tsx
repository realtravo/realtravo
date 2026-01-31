import React, { useState, useRef, useEffect } from "react";
import { Search, MapPin, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
};

interface LocationResult {
  id: string;
  name: string;
  location: string;
  country: string;
  type: string;
}

export const FilterBar = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  // Location States
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Logic mirroring SearchBarWithSuggestions
  useEffect(() => {
    const fetchLocations = async () => {
      if (locationQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const query = locationQuery.toLowerCase();

      try {
        // We query the trips table for unique locations/places
        const { data, error } = await supabase
          .from("trips")
          .select("id, name, location, place, country, type")
          .eq("approval_status", "approved")
          .or(`location.ilike.%${query}%,place.ilike.%${query}%,country.ilike.%${query}%`)
          .limit(8);

        if (!error && data) {
          setSuggestions(data as LocationResult[]);
        }
      } catch (err) {
        console.error("Location fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [locationQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-0" ref={containerRef}>
      <div className="relative flex flex-row items-center bg-white border border-slate-100 rounded-2xl shadow-xl h-14 md:h-16">
        
        {/* WHERE SECTION */}
        <div className="flex flex-col flex-1 px-4 md:px-6 py-1 min-w-[140px] relative">
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Where
          </label>
          <input 
            type="text" 
            placeholder="Destinations" 
            value={locationQuery}
            onChange={(e) => {
                setLocationQuery(e.target.value);
                setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="bg-transparent border-none p-0 text-sm md:text-base focus:ring-0 placeholder:text-slate-300 font-bold outline-none text-slate-700 w-full"
          />

          {/* SUGGESTIONS DROPDOWN */}
          {showSuggestions && (locationQuery.length > 0 || isSearching) && (
            <div className="absolute top-[115%] left-0 w-full md:w-[350px] bg-white rounded-[24px] shadow-2xl border border-slate-50 z-[100] py-3 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <p className="px-5 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {isSearching ? "Searching..." : "Popular Destinations"}
              </p>
              
              <div className="flex flex-col max-h-[300px] overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((dest) => (
                    <button
                      key={dest.id}
                      onClick={() => {
                        setLocationQuery(dest.location || dest.name);
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left group"
                    >
                      <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-teal-50 transition-colors">
                        <MapPin className="h-4 w-4 text-slate-500 group-hover:text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate leading-tight">
                            {dest.location || dest.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            {dest.country || "Kenya"}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-6 text-center">
                     <p className="text-xs font-bold text-slate-400">No locations found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-[1px] h-8 bg-slate-100 self-center" />

        {/* FROM SECTION (Logic remains same) */}
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

        {/* TO SECTION (Logic remains same) */}
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

        {/* APPLY BUTTON */}
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
};