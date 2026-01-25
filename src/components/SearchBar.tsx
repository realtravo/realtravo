import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, TrendingUp, Search as SearchIcon, MapPin, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
};

interface SearchResult {
  id: string;
  name: string;
  type: "trip" | "hotel" | "adventure" | "attraction" | "event";
  location?: string;
  country?: string;
  image_url?: string;
}

interface SearchBarWithSuggestionsProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: SearchBarWithSuggestionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{query: string, search_count: number}[]>([]);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: trips, error } = await supabase.from("trips").select("*");
      if (error) {
        console.error("Error fetching trips:", error);
      } else if (trips) {
        setDbResults(trips.map(t => ({ ...t, type: 'trip' })));
      }
      
      const { data: trending } = await supabase.rpc('get_trending_searches', { limit_count: 6 });
      if (trending) setTrendingSearches(trending);
    };
    fetchData();
  }, []);

  // CASE-INSENSITIVE SEARCH LOGIC (Fixes the "Not Found" issue)
  const filteredSuggestions = useMemo(() => {
    const searchTerm = value.trim().toLowerCase();
    
    if (!searchTerm) {
      return dbResults;
    }
    
    return dbResults.filter(item => {
      const name = (item.name || "").toLowerCase();
      const location = (item.location || "").toLowerCase();
      const country = (item.country || "").toLowerCase();
      
      return name.includes(searchTerm) || 
             location.includes(searchTerm) || 
             country.includes(searchTerm);
    });
  }, [value, dbResults]);

  // Ensure menu closes ONLY when clicking completely outside the container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Specific handler for the Search Button
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevents triggers that might close the dropdown
    setIsExpanded(true); // Forces visibility
    onSubmit();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      {/* Input Group */}
      <div className={cn("relative transition-all duration-300", isExpanded && "scale-[1.01]")}>
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 z-10" />
        <Input
          type="text"
          placeholder="Where to next?"
          value={value}
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isExpanded) setIsExpanded(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
              setIsExpanded(true);
            }
          }}
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button
          onClick={handleButtonClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg border-none hover:opacity-90 transition-opacity"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {/* Suggestions Panel */}
      {isExpanded && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden p-4 animate-in fade-in slide-in-from-top-2">
          
          <div className="flex justify-between items-center px-4 py-2 mb-2 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: COLORS.CORAL }} />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                {value.trim().length > 0 ? `Results for "${value}"` : "Discover All Destinations"}
              </span>
            </div>
            {value.length > 0 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }} 
                className="text-[10px] font-bold text-slate-400 hover:text-teal-600 uppercase"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/${item.type}/${item.id}`)}
                  className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all text-left rounded-2xl group"
                >
                  <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                    <img 
                      src={item.image_url || "/placeholder.svg"} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className="bg-teal-50 text-teal-700 text-[9px] font-bold border-none px-1.5 py-0">
                        {item.type.toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[10px] font-medium uppercase tracking-tight">
                        {item.location || item.country}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 text-center flex flex-col items-center gap-2">
                <SearchIcon className="h-8 w-8 text-slate-200" />
                <p className="text-slate-400 text-sm italic">No matches found for "{value}"</p>
              </div>
            )}
          </div>

          {/* Trending/Popular Searches */}
          <div className="mt-4 pt-4 border-t border-slate-100 px-2 pb-2">
             <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Popular Searches</span>
             </div>
             <div className="flex flex-wrap gap-2">
                {trendingSearches.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      onChange(t.query);
                      setIsExpanded(true);
                    }}
                    className="px-3 py-1.5 bg-slate-50 rounded-full text-[11px] font-bold text-slate-600 hover:bg-teal-600 hover:text-white transition-all"
                  >
                    {t.query}
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};