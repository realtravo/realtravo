import { useState, useEffect, useMemo, memo } from "react";
import { Header } from "@/components/Header";
import { SearchBarWithSuggestions } from "@/components/SearchBarWithSuggestions";
import { ListingCard } from "@/components/ListingCard";
import { HomeCategoryFilter, CategoryType } from "@/components/HomeCategoryFilter";
import { HomeFilterBar, HomeFilterValues } from "@/components/HomeFilterBar";
import { MapPin, Loader2, Navigation } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import { ListingSkeleton } from "@/components/ui/listing-skeleton";
import { useSavedItems } from "@/hooks/useSavedItems";
import { useRatings } from "@/hooks/useRatings";

// Memoized to prevent unnecessary re-renders during filter changes
const MemoizedListingCard = memo(ListingCard);

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const { savedItems, handleSave } = useSavedItems();
  const [loading, setLoading] = useState(true);
  const { position, loading: locationLoading, permissionDenied, forceRequestLocation } = useGeolocation();
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [appliedFilters, setAppliedFilters] = useState<HomeFilterValues>({ location: "" });
  const [listingViewMode, setListingViewMode] = useState<'top_destinations' | 'my_location'>('top_destinations');

  /**
   * Fetches data from all relevant tables.
   * Explicitly maps 'public_events' to the 'EVENT' type so the 
   * ListingCard can identify it correctly.
   */
  const fetchAllData = async (query?: string) => {
    setLoading(true);
    const searchPattern = query ? `%${query}%` : null;
    
    const fetchTable = async (table: string, type: string) => {
      let q = supabase.from(table).select("*");
      if (searchPattern) {
        q = q.or(`name.ilike.${searchPattern},location.ilike.${searchPattern}`);
      }
      const { data } = await q.limit(40);
      
      return (data || []).map(item => ({ 
        ...item, 
        type, // This ensures the card receives 'EVENT', 'TRIP', etc.
        // Standardize image field if DB uses image_url vs imageUrl
        imageUrl: item.image_url || item.imageUrl 
      }));
    };

    try {
      const [trips, hotels, adventures, events] = await Promise.all([
        fetchTable("public_trips", "TRIP"),
        fetchTable("public_hotels", "HOTEL"),
        fetchTable("public_adventure_places", "ADVENTURE PLACE"),
        fetchTable("public_events", "EVENT") // Added Event Table
      ]);

      setListings([...trips, ...hotels, ...adventures, ...events]);
    } catch (error) {
      console.error("Error loading listings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const { ratings } = useRatings(listings.map(l => l.id));

  /**
   * Filter & Sort Logic
   */
  const filteredListings = useMemo(() => {
    let result = [...listings];
    
    // 1. Category Filtering
    if (activeCategory !== "all") {
      result = result.filter(item => {
        const type = item.type?.toUpperCase();
        if (activeCategory === "events") return type === "EVENT" || type === "SPORT";
        if (activeCategory === "campsite") return type === "ADVENTURE PLACE";
        if (activeCategory === "hotels") return type === "HOTEL" || type === "ACCOMMODATION";
        if (activeCategory === "trips") return type === "TRIP";
        return true;
      });
    }

    // 2. Location String Filter
    if (appliedFilters.location) {
      const loc = appliedFilters.location.toLowerCase();
      result = result.filter(i => i.location?.toLowerCase().includes(loc));
    }

    // 3. Proximity Sorting (My Location Mode)
    if (listingViewMode === 'my_location' && position) {
      result.sort((a, b) => {
        const distA = calculateDistance(position.latitude, position.longitude, a.latitude, a.longitude) || 0;
        const distB = calculateDistance(position.latitude, position.longitude, b.latitude, b.longitude) || 0;
        return distA - distB;
      });
    }

    return result;
  }, [listings, activeCategory, appliedFilters, listingViewMode, position]);

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Dynamic Theming */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --primary: 180 100% 25%; } 
        .text-primary { color: #008080 !important; }
        .bg-primary { background-color: #008080 !important; }
      `}} />

      <Header onSearchClick={() => {}} showSearchIcon={false} />
      
      {/* Category Icons */}
      <HomeCategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      
      {/* Advanced Filters */}
      <HomeFilterBar onApplyFilters={setAppliedFilters} onClear={() => setAppliedFilters({location: ""})} />
      
      {/* Search Input */}
      <div className="w-full px-4 py-3">
        <SearchBarWithSuggestions 
          value={searchQuery} 
          onChange={setSearchQuery} 
          onSubmit={() => fetchAllData(searchQuery)}
        />
      </div>

      <main className="w-full">
        {/* Toggle between Global and Local Discovery */}
        <section className="px-4 py-3 border-b border-border flex items-center justify-between">
          <button 
            onClick={() => setListingViewMode('top_destinations')} 
            className={`text-sm font-bold transition-all ${listingViewMode === 'top_destinations' ? 'text-primary underline underline-offset-8' : 'text-muted-foreground'}`}
          >
            Top Destinations
          </button>
          
          <button 
            onClick={() => permissionDenied ? setShowLocationDialog(true) : setListingViewMode('my_location')} 
            className={`flex items-center gap-1 text-sm font-bold transition-all ${listingViewMode === 'my_location' ? 'text-primary underline underline-offset-8' : 'text-muted-foreground'}`}
          >
            {locationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Nearby Me
          </button>
        </section>

        {/* Results Grid */}
        <div className="w-full px-4 py-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <ListingSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredListings.map((listing) => (
                <MemoizedListingCard
                  key={`${listing.type}-${listing.id}`}
                  {...listing}
                  isSaved={savedItems.has(listing.id)}
                  onSave={() => handleSave(listing.id, listing.type)}
                  avgRating={ratings.get(listing.id)?.avgRating}
                  distance={position ? calculateDistance(position.latitude, position.longitude, listing.latitude, listing.longitude) : undefined}
                />
              ))}
            </div>
          )}
          
          {!loading && filteredListings.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p>No listings found in this category.</p>
            </div>
          )}
        </div>
      </main>

      {/* Geolocation Request Dialog */}
      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <Navigation className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <AlertDialogTitle className="text-center">Enable Location</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              We need your location to show you trips, hotels, and events happening nearby.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-col gap-2">
            <AlertDialogAction 
              className="w-full bg-primary"
              onClick={() => { 
                setShowLocationDialog(false); 
                forceRequestLocation(); 
              }}
            >
              Enable Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;