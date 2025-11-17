import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  image_url: string;
  type: "trip" | "event" | "hotel" | "adventure";
}

export const SearchBarWithSuggestions = ({ value, onChange, onSubmit }: SearchBarProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const navigate = useNavigate();

  // Effect to fetch suggestions when the value changes or the search bar is focused
  useEffect(() => {
    // Only fetch if value is 2+ chars OR if the suggestions panel is currently visible (onFocus/tap)
    if (value.trim().length >= 2 || (showSuggestions && value.trim().length === 0)) {
      fetchSuggestions();
    } else if (value.trim().length < 2) {
      // Clear suggestions if the search text is too short
      setSuggestions([]);
    }
  }, [value, showSuggestions]);

  const fetchSuggestions = async () => {
    const queryValue = value.trim();
    // Use '%%' to fetch a broad popular list when the search input is empty but focused
    const query = queryValue.length >= 2 ? `%${queryValue.toLowerCase()}%` : `%%`;
    const isFullQuery = queryValue.length >= 2;
    const results: SearchResult[] = [];

    // Prioritize name search for a popular/focused view to reduce database load
    const orCondition = isFullQuery ?
        `name.ilike.${query},location.ilike.${query},country.ilike.${query}` :
        `name.ilike.${query}`;

    try {
      // Fetch concurrently from all four tables
      const [trips, events, hotels, places] = await Promise.all([
        supabase
          .from("trips")
          .select("id, name, image_url")
          .eq("approval_status", "approved")
          .or(orCondition)
          .limit(isFullQuery ? 3 : 2), // Limit results
        supabase
          .from("events")
          .select("id, name, image_url")
          .eq("approval_status", "approved")
          .or(orCondition)
          .limit(isFullQuery ? 3 : 2),
        supabase
          .from("hotels")
          .select("id, name, image_url")
          .eq("approval_status", "approved")
          .or(orCondition)
          .limit(isFullQuery ? 3 : 2),
        supabase
          .from("adventure_places")
          .select("id, name, image_url")
          .eq("approval_status", "approved")
          .or(orCondition)
          .limit(isFullQuery ? 3 : 2),
      ]);

      // Consolidate results and assign type
      if (trips.data) {
        results.push(...trips.data.map((item) => ({ ...item, type: "trip" as const })));
      }
      if (events.data) {
        results.push(...events.data.map((item) => ({ ...item, type: "event" as const })));
      }
      if (hotels.data) {
        results.push(...hotels.data.map((item) => ({ ...item, type: "hotel" as const })));
      }
      if (places.data) {
        results.push(...places.data.map((item) => ({ ...item, type: "adventure" as const })));
      }

      setSuggestions(results.slice(0, 10)); // Max 10 combined suggestions
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      onSubmit();
    }
  };

  const handleSuggestionClick = (result: SearchResult) => {
    setShowSuggestions(false);
    // Navigates to the detail page using the item's type and ID, e.g., /trip/abc-123
    navigate(`/${result.type}/${result.id}`);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "trip":
        return "Trip";
      case "event":
        return "Event";
      case "hotel":
        return "Hotel";
      case "adventure":
        return "Adventure Place";
      default:
        return type;
    }
  };

  return (
    // MODIFICATION 1: Removed max-w-3xl so the search bar takes 100% of its parent container's width on big screens.
    <div className="relative w-full mx-auto">
      <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search for trips, events, hotels, places, or countries..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        // Show suggestions on focus
        onFocus={() => setShowSuggestions(true)}
        // Delay hiding suggestions to allow time for the user to click a suggestion
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        // MODIFICATION 2: Changed rounded-xl md:rounded-2xl to rounded-none for square corners.
        className="pl-10 md:pl-12 pr-3 md:pr-4 h-10 md:h-14 text-sm md:text-lg rounded-none border-2 focus-visible:border-primary shadow-md"
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="absolute z-50 w-full mt-2 bg-background border shadow-lg max-h-96 overflow-y-auto"
          // MODIFICATION 3: Removed rounded-xl for sharp corners on the suggestions box
        >
          {suggestions.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              type="button"
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors border-b last:border-b-0"
              onClick={() => handleSuggestionClick(result)}
            >
              {/* Using a placeholder or fetched image */}
              {result.image_url && (
                <img
                  src={result.image_url}
                  alt={result.name}
                  className="w-16 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm md:text-base line-clamp-1">{result.name}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{getTypeLabel(result.type)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};