import { useState, useEffect, useRef, useMemo } from "react";
import { Search as SearchIcon, MapPin, Sparkles, TrendingUp, Calendar, Map, Mountain, Hotel } from "lucide-react";
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

// Define the categories with their icons and mapping to database types
const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'event', label: 'Events & Sports', icon: Calendar },
  { id: 'trip', label: 'Trip & Tours', icon: Map },
  { id: 'adventure', label: 'Adventure Places', icon: Mountain },
  { id: 'hotel', label: 'Hotels', icon: Hotel },
];

interface SearchResult {
  id: string;
  name: string;
  type: string;
  location?: string;
  country?: string;
  image_url?: string;
}

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<{query: string, search_count: number}[]>([]);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all items from your database tables
      const { data: items } = await supabase.from("trips").select("*");
      if (items) setDbResults(items);
      
      const { data: trending } = await supabase.rpc('get_trending_searches', { limit_count: 6 });
      if (trending) setTrendingSearches(trending);
    };
    fetchData();
  }, []);

  // Filter Logic: Combines Text Search + Category Filter
  const filteredSuggestions = useMemo(() => {
    let results = dbResults;

    // Filter by Category first
    if (activeCategory !== 'all') {
      results = results.filter(item => item.type === activeCategory);
    }

    // Then filter by Search Text
    if (value.trim()) {
      const searchTerm = value.toLowerCase();
      results = results.filter(item => 
        item.name?.toLowerCase().includes(searchTerm) || 
        item.location?.toLowerCase().includes(searchTerm) ||
        item.country?.toLowerCase().includes(searchTerm)
      );
    }

    return results;
  }, [value, dbResults, activeCategory]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
      {/* Search Input */}
      <div className={cn("relative transition-all duration-300", isExpanded && "scale-[1.01]")}>
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-teal-600 z-10" />
        <Input
          type="text"
          placeholder="Search events, tours, or hotels..."
          value={value}
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => onChange(e.target.value)}
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button
          onClick={onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg border-none hover:opacity-90 transition-all active:scale-95"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {isExpanded && (
        <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.2)] overflow-hidden p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* 1. CATEGORY FILTER BAR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 no-scrollbar px-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all text-xs font-bold border",
                    isActive 
                      ? "bg-teal-600 text-white border-teal-600 shadow-md" 
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-teal-600")} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Results List */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1 mt-2">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/${item.type}/${item.id}`)}
                  className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all text-left rounded-2xl group"
                >
                  <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                    <img src={item.image_url || "/placeholder.svg"} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className="bg-teal-50 text-teal-700 text-[9px] font-black border-none px-1.5 py-0">
                        {item.type.toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[10px] font-semibold uppercase">{item.location || item.country}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-sm font-medium">No results found in this category.</p>
              </div>
            )}
          </div>

          {/* Trending Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 px-2 pb-2">
             <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trending Searches</span>
             </div>
             <div className="flex flex-wrap gap-2">
                {trendingSearches.map((t, i) => (
                  <button 
                    key={i} 
                    onClick={() => onChange(t.query)}
                    className="px-3 py-1.5 bg-slate-50 rounded-full text-[11px] font-bold text-slate-600 hover:bg-slate-100"
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