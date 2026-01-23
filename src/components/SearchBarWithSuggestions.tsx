import { useState, useEffect, useRef } from "react";
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
  date?: string;
  image_url?: string;
}

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [mostPopular, setMostPopular] = useState<SearchResult[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{query: string, search_count: number}[]>([]);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close the suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchTrendingSearches();
    fetchMostPopular();
  }, []);

  const fetchTrendingSearches = async () => {
    const { data } = await supabase.rpc('get_trending_searches', { limit_count: 6 });
    if (data) setTrendingSearches(data);
  };

  const fetchMostPopular = async () => {
    const { data } = await supabase.from("trips").select("*").limit(3);
    if (data) setMostPopular(data.map(d => ({ ...d, type: 'trip' })));
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      {/* Search Input Group */}
      <div className={cn(
        "relative transition-all duration-300 ease-in-out",
        isExpanded ? "scale-[1.02]" : "scale-100"
      )}>
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 z-10" />
        <Input
          type="text"
          placeholder="Where to next?"
          value={value}
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => onChange(e.target.value)}
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button
          onClick={onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg border-none"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {/* Suggestions Dropdown - Opens only when isExpanded is true */}
      {isExpanded && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden p-4 animate-in fade-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-center px-4 py-2 border-b border-slate-50 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: COLORS.CORAL }} />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                {value.length > 0 ? "Results" : "Suggestions"}
              </span>
            </div>
            <button onClick={() => setIsExpanded(false)}>
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>

          <div className="space-y-1">
            {(value.trim() ? suggestions : mostPopular).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.type}/${item.id}`)}
                className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all text-left rounded-2xl group"
              >
                <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                  <img src={item.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="text-[9px] mb-1">{item.type.toUpperCase()}</Badge>
                  <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                </div>
              </button>
            ))}
          </div>

          {/* Trending Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 px-2 pb-2">
             <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Trending Now</span>
             </div>
             <div className="flex flex-wrap gap-2">
                {trendingSearches.slice(0, 4).map((t, i) => (
                  <button key={i} className="px-3 py-1.5 bg-slate-50 rounded-full text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-teal-700 transition-colors">
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