import { useState, useEffect, useRef } from "react";
import { Clock, X, TrendingUp, Sparkles, Search as SearchIcon, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSessionId } from "@/lib/sessionManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: "trip" | "hotel" | "adventure" | "attraction" | "event";
  location?: string;
  place?: string;
  country?: string;
  activities?: any;
  facilities?: any;
  date?: string;
  image_url?: string;
}

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_ITEMS = 10;

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit, onFocus, onBlur }: SearchBarProps) => {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [mostPopular, setMostPopular] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{ query: string; search_count: number }[]>([]);
  const navigate = useNavigate();
  
  // Ref to track the search bar container
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle Click Outside logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    // Bind both mouse and touch events for mobile compatibility
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (history) setSearchHistory(JSON.parse(history));
    fetchTrendingSearches();
    fetchMostPopular();
  }, []);

  const fetchTrendingSearches = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trending_searches', { limit_count: 10 });
      if (!error && data) setTrendingSearches(data);
    } catch (error) { console.error(error); }
  };

  const fetchMostPopular = async () => {
    try {
      const [tripsData, hotelsData, adventuresData] = await Promise.all([
        supabase.from("trips").select("id, name, location, place, country, date, image_url").eq("approval_status", "approved").limit(3),
        supabase.from("hotels").select("id, name, location, place, country, image_url").eq("approval_status", "approved").limit(3),
        supabase.from("adventure_places").select("id, name, location, place, country, image_url").eq("approval_status", "approved").limit(3)
      ]);
      const popular: SearchResult[] = [
        ...(tripsData.data || []).map((item: any) => ({ ...item, type: "trip" as const })),
        ...(hotelsData.data || []).map((item: any) => ({ ...item, type: "hotel" as const })),
        ...(adventuresData.data || []).map((item: any) => ({ ...item, type: "adventure" as const }))
      ];
      setMostPopular(popular.slice(0, 6));
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (showSuggestions && value.trim()) {
      setIsSearching(true);
      const debounceTimer = setTimeout(() => fetchSuggestions(), 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setSuggestions([]);
      setHasSearched(false);
    }
  }, [value, showSuggestions]);

  const fetchSuggestions = async () => {
    const queryValue = value.trim().toLowerCase();
    try {
      const [tripsData, hotelsData, adventuresData] = await Promise.all([
        supabase.from("trips").select("*").eq("approval_status", "approved").limit(20),
        supabase.from("hotels").select("*").eq("approval_status", "approved").limit(20),
        supabase.from("adventure_places").select("*").eq("approval_status", "approved").limit(20)
      ]);

      let combined: SearchResult[] = [
        ...(tripsData.data || []).map((item: any) => ({ ...item, type: item.type === 'event' ? "event" : "trip" })),
        ...(hotelsData.data || []).map((item: any) => ({ ...item, type: "hotel" })),
        ...(adventuresData.data || []).map((item: any) => ({ ...item, type: "adventure" }))
      ];

      combined = combined.filter(item => 
        item.name?.toLowerCase().includes(queryValue) ||
        item.location?.toLowerCase().includes(queryValue)
      ).sort((a, b) => a.name.localeCompare(b.name));

      setSuggestions(combined.slice(0, 15));
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const saveToHistory = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...searchHistory.filter(item => item !== trimmed)].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(updated);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    await supabase.from('search_queries').insert({ query: trimmed, user_id: user?.id || null, session_id: getSessionId() });
  };

  const handleFinalSubmit = () => {
    saveToHistory(value);
    setShowSuggestions(false);
    onSubmit();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-4xl mx-auto">
      {/* Input Group */}
      <div className="relative group">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10 group-focus-within:text-[#008080] transition-colors" />
        <Input
          type="text"
          placeholder="Where to next? Search countries, stays..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onKeyDown={(e) => e.key === "Enter" && handleFinalSubmit()}
          onFocus={() => { setShowSuggestions(true); onFocus?.(); }}
          className="pl-14 pr-32 h-14 md:h-16 text-sm md:text-base rounded-full border-none shadow-xl bg-white focus-visible:ring-2 focus-visible:ring-[#008080] placeholder:text-slate-400 transition-all"
        />
        <Button
          onClick={handleFinalSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 md:h-12 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg border-none active:scale-95 transition-transform"
          style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
        >
          Search
        </Button>
      </div>

      {/* Suggestions Panel */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl max-h-[500px] overflow-y-auto z-[999] animate-in fade-in slide-in-from-top-2">
          {!value.trim() ? (
            <div className="p-2">
              {/* Most Popular Section */}
              {mostPopular.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Sparkles className="h-4 w-4 text-[#FF7F50]" /> Most Popular
                  </div>
                  {mostPopular.map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => { navigate(`/${item.type}/${item.id}`); setShowSuggestions(false); }} 
                      className="w-full p-3 flex gap-4 hover:bg-slate-50 rounded-[24px] text-left transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                        <img src={item.image_url || "/placeholder.svg"} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{item.name}</h4>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase truncate">
                          <MapPin className="h-3 w-3" /> {item.location || item.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* History Section */}
              {searchHistory.length > 0 && (
                <div className="px-5 mb-4">
                  <div className="flex justify-between items-center mb-2 text-[10px] font-black text-slate-400 uppercase">
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Recent</div>
                    <button 
                      onClick={() => { setSearchHistory([]); localStorage.removeItem(SEARCH_HISTORY_KEY); }} 
                      className="text-[#FF7F50]"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((h, i) => (
                      <Badge 
                        key={i} 
                        onClick={() => { onChange(h); onSubmit(); setShowSuggestions(false); }} 
                        className="cursor-pointer bg-slate-50 hover:bg-[#008080]/10 text-slate-600 border-none py-2 px-4 rounded-xl text-xs font-bold transition-all"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {isSearching ? (
                <div className="p-10 flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#008080]" />
                  <span className="text-slate-400 text-xs font-bold uppercase">Searching...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <p className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Matches</p>
                  {suggestions.map((result) => (
                    <button 
                      key={result.id} 
                      onClick={() => { navigate(`/${result.type}/${result.id}`); setShowSuggestions(false); }} 
                      className="w-full p-3 flex gap-4 hover:bg-slate-50 rounded-[24px] text-left group transition-all"
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                        <img src={result.image_url || "/placeholder.svg"} className="w-full h-full object-cover" alt={result.name} />
                      </div>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <Badge className="w-fit text-[9px] font-black uppercase mb-1" style={{ background: COLORS.TEAL }}>{result.type}</Badge>
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{result.name}</h4>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase truncate">
                          <MapPin className="h-3 w-3" /> {result.location || result.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              ) : hasSearched && (
                <div className="p-10 text-center">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Not Available</p>
                  <p className="text-slate-300 text-[10px]">No results found for "{value}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};