import { useState, useEffect, useRef } from "react";
import { Clock, TrendingUp, Search as SearchIcon, MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  TEXT_LIGHT: "#94a3b8"
};

// ... types (SearchResult, SearchBarProps) remain the same ...

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: SearchBarProps) => {
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [mostPopular, setMostPopular] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{query: string, search_count: number}[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const history = localStorage.getItem("search_history");
    if (history) setSearchHistory(JSON.parse(history));
    fetchTrendingSearches();
    fetchMostPopular();
  }, []);

  const fetchTrendingSearches = async () => {
    const { data } = await supabase.rpc('get_trending_searches', { limit_count: 6 });
    if (data) setTrendingSearches(data);
  };

  const fetchMostPopular = async () => {
    const { data } = await supabase.from("trips").select("*").limit(3);
    if (data) setMostPopular(data.map(d => ({...d, type: 'trip'})));
  };

  const handleSuggestionClick = (result: SearchResult) => {
    navigate(`/${result.type}/${result.id}`);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { trip: "Trip", hotel: "Stay", adventure: "Campsite", event: "Experience" };
    return labels[type]?.toUpperCase() || type.toUpperCase();
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto gap-4">
      {/* 1. Permanent Search Input */}
      <div className="relative group">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 z-10" />
        <Input
          type="text"
          placeholder="Where to next? Search countries, experiences, stays..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          // Removed onFocus and onBlur toggles so it stays open
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500 placeholder:text-slate-400"
        />
        <Button
          onClick={onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg border-none"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {/* 2. Permanent Suggestions Container (Removed showSuggestions condition) */}
      <div className="w-full bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden p-4">
        
        {/* Header Section */}
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: COLORS.CORAL }} />
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
              {value.trim() ? "Search Results" : "Top Matches"}
            </span>
          </div>
          {searchHistory.length > 0 && (
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-teal-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recent</span>
               </div>
               <button className="text-[10px] font-bold text-coral-400 uppercase hover:underline">Clear</button>
            </div>
          )}
        </div>

        {/* Dynamic List: Shows search results OR popular items */}
        <div className="space-y-2 mt-2">
          {(value.trim() ? suggestions : mostPopular).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSuggestionClick(item)}
              className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all text-left rounded-3xl"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                <img src={item.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-teal-600/10 text-teal-700 text-[9px] font-black px-2 py-0 border-none">
                    {getTypeLabel(item.type)}
                  </Badge>
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm truncate">{item.name}</h4>
                <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase">{item.location || item.country}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Permanent Trending Section */}
        <div className="mt-6 px-4 pb-4 border-t border-slate-50 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4" style={{ color: COLORS.CORAL }} />
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Trending</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {trendingSearches.map((item, i) => (
              <button 
                key={i} 
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100"
              >
                <span className="text-xs font-bold text-slate-700">{item.query}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{item.search_count} explores</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};