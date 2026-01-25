import { useState, useEffect, useRef, useMemo } from "react";
import { Search as SearchIcon, MapPin, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const COLORS = { TEAL: "#008080", CORAL: "#FF7F50" };

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: trips } = await supabase.from("public_trips").select("*");
      if (trips) setDbResults(trips.map(t => ({ ...t, type: 'trip' })));
      const { data: trend } = await supabase.rpc('get_trending_searches', { limit_count: 6 });
      if (trend) setTrending(trend);
    };
    fetchData();
  }, []);

  const filteredSuggestions = useMemo(() => {
    const term = value.trim().toLowerCase();
    if (!term) return dbResults;
    return dbResults.filter(item => 
      (item.name || "").toLowerCase().includes(term) || 
      (item.location || "").toLowerCase().includes(term)
    );
  }, [value, dbResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Closes suggestions on search
  const handleSearchSubmit = () => {
    setIsExpanded(false); 
    onSubmit();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto z-50">
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
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
          className="pl-14 pr-32 h-16 text-base rounded-full border-none shadow-2xl bg-white focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <Button
          onClick={handleSearchSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-12 px-8 text-sm font-bold text-white shadow-lg border-none hover:opacity-90 transition-opacity"
          style={{ backgroundColor: COLORS.CORAL }}
        >
          Search
        </Button>
      </div>

      {isExpanded && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center px-4 py-2 mb-2 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FF7F50]" />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Discover</span>
            </div>
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {filteredSuggestions.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.type}/${item.id}`)}
                className="w-full p-3 flex gap-4 hover:bg-slate-50 transition-all text-left rounded-2xl group"
              >
                <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100">
                  <img src={item.image_url || "/placeholder.svg"} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                  <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                    <MapPin className="h-3 w-3" /> {item.location}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};