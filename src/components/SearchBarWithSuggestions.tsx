import { useState, useEffect, useRef } from "react";
import { Clock, TrendingUp, Sparkles, Search as SearchIcon, MapPin, Loader2 } from "lucide-react";
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

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit, onFocus, onBlur }: any) => {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mostPopular, setMostPopular] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
  const navigate = useNavigate();
  
  // Ref for detecting outside clicks
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- Click Outside Logic ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        onBlur?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onBlur]);

  useEffect(() => {
    const history = localStorage.getItem("search_history");
    if (history) setSearchHistory(JSON.parse(history));
    fetchTrendingSearches();
    fetchMostPopular();
  }, []);

  const fetchTrendingSearches = async () => {
    try {
      const { data } = await supabase.rpc('get_trending_searches', { limit_count: 5 });
      if (data) setTrendingSearches(data);
    } catch (e) { console.error(e); }
  };

  const fetchMostPopular = async () => {
    try {
      const { data: trips } = await supabase.from("trips").select("*").limit(3);
      if (trips) setMostPopular(trips.map(t => ({ ...t, type: 'trip' })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (showSuggestions && value.trim()) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        const { data: trips } = await supabase.from("trips").select("*").ilike('name', `%${value}%`).limit(10);
        setSuggestions(trips || []);
        setIsSearching(false);
        setHasSearched(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, showSuggestions]);

  const handleFinalSubmit = () => {
    if (value.trim()) {
      const updated = [value, ...searchHistory.filter(h => h !== value)].slice(0, 10);
      setSearchHistory(updated);
      localStorage.setItem("search_history", JSON.stringify(updated));
    }
    setShowSuggestions(false);
    onSubmit();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-4xl mx-auto">
      <div className="relative group">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10 group-focus-within:text-[#008080] transition-colors" />
        <Input
          type="text"
          placeholder="Search countries, experiences, stays..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { setShowSuggestions(true); onFocus?.(); }}
          onKeyDown={(e) => e.key === "Enter" && handleFinalSubmit()}
          className="pl-14 pr-32 h-14 md:h-16 text-sm md:text-base rounded-full border-none shadow-xl bg-white focus-visible:ring-2 focus-visible:ring-[#008080]"
        />
        <Button
          onClick={handleFinalSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 md:h-12 px-6 text-xs font-black uppercase text-white shadow-lg border-none transition-transform active:scale-95"
          style={{ background: `linear-gradient(135deg, ${COLORS.CORAL_LIGHT} 0%, ${COLORS.CORAL} 100%)` }}
        >
          Search
        </Button>
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-100 rounded-[32px] shadow-2xl max-h-[500px] overflow-y-auto z-[999] animate-in fade-in slide-in-from-top-2">
          {!value.trim() ? (
            <div className="p-2">
              {mostPopular.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Sparkles className="h-4 w-4 text-[#FF7F50]" /> Most Popular
                  </div>
                  {mostPopular.map((item: any) => (
                    <button key={item.id} onClick={() => { navigate(`/${item.type}/${item.id}`); setShowSuggestions(false); }} className="w-full p-3 flex gap-4 hover:bg-slate-50 rounded-[24px] text-left">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img src={item.image_url || "/placeholder.svg"} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center truncate">
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{item.name}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase truncate">{item.location}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {isSearching ? (
                <div className="p-10 flex flex-col items-center gap-3"><Loader2 className="h-6 w-6 animate-spin text-[#008080]" /><span className="text-slate-400 text-xs font-bold uppercase">Searching...</span></div>
              ) : suggestions.length > 0 ? (
                <>
                  <p className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Matches</p>
                  {suggestions.map((result: any) => (
                    <button key={result.id} onClick={() => { navigate(`/trip/${result.id}`); setShowSuggestions(false); }} className="w-full p-3 flex gap-4 hover:bg-slate-50 rounded-[24px] text-left group">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                        <img src={result.image_url || "/placeholder.svg"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <div className="flex flex-col justify-center truncate">
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{result.name}</h4>
                        <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase truncate"><MapPin className="h-3 w-3" /> {result.location}</div>
                      </div>
                    </button>
                  ))}
                </>
              ) : hasSearched && (
                <div className="p-10 text-center"><p className="text-slate-400 text-xs font-bold uppercase">No results found</p></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};