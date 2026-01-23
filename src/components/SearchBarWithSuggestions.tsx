import { useState, useEffect, useRef } from "react";
import { Clock, TrendingUp, Search as SearchIcon, MapPin, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSessionId } from "@/lib/sessionManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50", // Matching the "Search" button in image
  CORAL_LIGHT: "#FF9E7A",
  SOFT_GRAY: "#F8F9FA",
  TEXT_LIGHT: "#94a3b8" // slate-400
};

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionSearch?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: "trip" | "hotel" | "adventure" | "attraction" | "event";
  location?: string;
  country?: string;
  date?: string;
  image_url?: string;
}

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit, onFocus, onBlur }: SearchBarProps) => {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [mostPopular, setMostPopular] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{query: string, search_count: number}[]>([]);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    // Simplified fetch logic for example
    const { data } = await supabase.from("trips").select("*").limit(3);
    if (data) setMostPopular(data.map(d => ({...d, type: 'trip'})));
  };

  const handleSuggestionClick = (result: SearchResult) => {
    setShowSuggestions(false);
    navigate(`/${result.type}/${result.id}`);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { trip: "Trip", hotel: "Stay", adventure: "Campsite", event: "Experience" };
    return labels[type]?.toUpperCase() || type.toUpperCase();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input Group */}
      <div className="relative group">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 z-10" />
        <Input
          type="text"
          placeholder="Where to next? Search countries, experiences, stays..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { setShowSuggestions(true); onFocus?.(); }}
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500 placeholder:text-slate-400"
        />
        <Button
          onClick={onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 border-none"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-4 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[999] p-4">
          
          {/* Recent & Most Popular Headers */}
          <div className="flex justify-between items-center px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-coral-500" style={{ color: COLORS.CORAL }} />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Top Matches</span>
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

          {/* Result List */}
          <div className="space-y-2 mt-2">
            {(value.trim() ? suggestions : mostPopular).map((item) => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all group text-left rounded-3xl"
              >
                <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                  <img src={item.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-teal-600/10 text-teal-700 text-[9px] font-black px-2 py-0 hover:bg-teal-600/10 border-none">
                      {getTypeLabel(item.type)}
                    </Badge>
                    {item.date && (
                      <span className="text-[9px] font-black text-coral-500 uppercase tracking-tight" style={{ color: COLORS.CORAL }}>
                        • {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm truncate leading-tight">{item.name}</h4>
                  <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.location || item.country}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Trending Section */}
          <div className="mt-6 px-4 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-coral-500" style={{ color: COLORS.CORAL }} />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Trending Destinations</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {trendingSearches.map((item, i) => (
                <button 
                  key={i} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-xs font-bold text-slate-700">{item.query}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{item.search_count} explores</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};