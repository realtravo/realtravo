import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBarWithSuggestions } from "@/components/SearchBarWithSuggestions";
import { ListingCard } from "@/components/ListingCard";
import { HomeCategoryFilter, CategoryType } from "@/components/HomeCategoryFilter";
import { HomeFilterBar, HomeFilterValues } from "@/components/HomeFilterBar";
import { MapPin, Loader2, Navigation, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/sessionManager";
import { useGeolocation, calculateDistance } from "@/hooks/useGeolocation";
import { ListingSkeleton } from "@/components/ui/listing-skeleton";
import { useSavedItems } from "@/hooks/useSavedItems";
import { getCachedHomePageData, setCachedHomePageData } from "@/hooks/useHomePageCache";
import { useRatings, sortByRating } from "@/hooks/useRatings";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useResponsiveLimit } from "@/hooks/useResponsiveLimit";

const MemoizedListingCard = memo(ListingCard);

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const { savedItems, handleSave } = useSavedItems();
  const [loading, setLoading] = useState(true);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const {
    position,
    loading: locationLoading,
    permissionDenied,
    requestLocation,
    forceRequestLocation
  } = useGeolocation();
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  
  const { cardLimit } = useResponsiveLimit();

  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [appliedFilters, setAppliedFilters] = useState<HomeFilterValues>({ location: "" });
  const [listingViewMode, setListingViewMode] = useState<'top_destinations' | 'my_location'>('top_destinations');

  useEffect(() => {
    const handleInteraction = () => {
      requestLocation();
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('click', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [requestLocation]);

  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const [showSearchIcon, setShowSearchIcon] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [scrollableRows, setScrollableRows] = useState<{
    trips: any[];
    hotels: any[];
    attractions: any[];
    campsites: any[];
    events: any[];
  }>({ trips: [], hotels: [], attractions: [], campsites: [], events: [] });
  const [nearbyPlacesHotels, setNearbyPlacesHotels] = useState<any[]>([]);
  const [loadingScrollable, setLoadingScrollable] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const allItemIds = useMemo(() => {
    const ids = new Set<string>();
    [...listings, ...nearbyPlacesHotels, ...scrollableRows.trips, ...scrollableRows.hotels, ...scrollableRows.campsites, ...scrollableRows.events]
      .forEach(item => ids.add(item.id));
    return Array.from(ids);
  }, [listings, nearbyPlacesHotels, scrollableRows]);

  const tripEventIds = useMemo(() => {
    return [...scrollableRows.trips, ...scrollableRows.events].map(item => item.id);
  }, [scrollableRows.trips, scrollableRows.events]);

  const { bookingStats } = useRealtimeBookings(tripEventIds);
  const { ratings } = useRatings(allItemIds);

  const fetchScrollableRows = useCallback(async (limit: number) => {
    setLoadingScrollable(true);
    try {
      // Use public views to avoid exposing contact details
      const [tripsData, hotelsData, campsitesData, eventsData] = await Promise.all([
        supabase.from("public_trips").select("*").eq("type", "trip").limit(limit),
        supabase.from("public_hotels").select("*").limit(limit),
        supabase.from("public_adventure_places").select("*").limit(limit),
        supabase.from("public_trips").select("*").eq("type", "event").limit(limit),
      ]);
      setScrollableRows({
        trips: tripsData.data || [],
        hotels: hotelsData.data || [],
        attractions: [],
        campsites: campsitesData.data || [],
        events: eventsData.data || []
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingScrollable(false);
    }
  }, []);

  const fetchAllData = async (query?: string, offset: number = 0, limit: number = 30) => {
    setLoading(true);
    const searchPattern = query ? `%${query}%` : null;
    
    // Use public views to avoid exposing contact details
    const fetchTrips = async (tripType: string, type: string) => {
      let dbQuery = supabase.from("public_trips").select("*").eq("type", tripType);
      if (searchPattern) dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern}`);
      const { data } = await dbQuery.range(offset, offset + limit - 1);
      return (data || []).map((item: any) => ({ ...item, type }));
    };

    const fetchHotels = async () => {
      let dbQuery = supabase.from("public_hotels").select("*");
      if (searchPattern) dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern}`);
      const { data } = await dbQuery.range(offset, offset + limit - 1);
      return (data || []).map((item: any) => ({ ...item, type: "HOTEL" }));
    };

    const fetchAdventures = async () => {
      let dbQuery = supabase.from("public_adventure_places").select("*");
      if (searchPattern) dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern}`);
      const { data } = await dbQuery.range(offset, offset + limit - 1);
      return (data || []).map((item: any) => ({ ...item, type: "ADVENTURE PLACE" }));
    };

    const [events, trips, hotels, adventures] = await Promise.all([
      fetchTrips("event", "EVENT"),
      fetchTrips("trip", "TRIP"),
      fetchHotels(),
      fetchAdventures()
    ]);

    const combined = [...events, ...trips, ...hotels, ...adventures].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (offset === 0) setListings(combined);
    else setListings(prev => [...prev, ...combined]);
    
    setHasMoreSearchResults(combined.length === limit);
    setLoading(false);
  };

  useEffect(() => {
    const cachedData = getCachedHomePageData();
    if (cachedData) {
      setListings(cachedData.listings || []);
      setScrollableRows(cachedData.scrollableRows);
      setLoading(false);
    }
    fetchAllData();
    fetchScrollableRows(cardLimit);
  }, [cardLimit, fetchScrollableRows]);

  const filteredListings = useMemo(() => {
    let result = [...listings];
    if (activeCategory !== "all") {
      result = result.filter(item => {
        const type = item.type?.toUpperCase();
        if (activeCategory === "campsite") return type === "ADVENTURE PLACE";
        if (activeCategory === "hotels") return type === "HOTEL";
        if (activeCategory === "trips") return type === "TRIP";
        if (activeCategory === "events") return type === "EVENT";
        return true;
      });
    }
    if (appliedFilters.location) {
      const loc = appliedFilters.location.toLowerCase();
      result = result.filter(i => i.location?.toLowerCase().includes(loc) || i.place?.toLowerCase().includes(loc));
    }
    if (listingViewMode === 'my_location' && position) {
      result.sort((a, b) => {
        const distA = calculateDistance(position.latitude, position.longitude, a.latitude, a.longitude);
        const distB = calculateDistance(position.latitude, position.longitude, b.latitude, b.longitude);
        return (distA || Infinity) - (distB || Infinity);
      });
    }
    return result;
  }, [listings, activeCategory, appliedFilters, listingViewMode, position]);

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Dynamic Theme Color Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --primary: 180 100% 25%; } 
        .text-primary { color: #008080 !important; }
        .bg-primary { background-color: #008080 !important; }
        .border-primary { border-color: #008080 !important; }
        .hover\\:text-primary:hover { color: #008080 !important; }
      `}} />

      <Header onSearchClick={() => { setIsSearchVisible(true); window.scrollTo(0,0); }} showSearchIcon={showSearchIcon} />
      
      <HomeCategoryFilter activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      
      <HomeFilterBar onApplyFilters={setAppliedFilters} onClear={() => setAppliedFilters({location: ""})} />
      
      {isSearchVisible && !isSearchFocused && (
        <div className="w-full px-4 py-3">
          <SearchBarWithSuggestions 
            value={searchQuery} 
            onChange={setSearchQuery} 
            onSubmit={() => { if(searchQuery.trim()) fetchAllData(searchQuery); setIsSearchFocused(true); }}
            onFocus={() => setIsSearchFocused(true)}
            showBackButton={false} 
          />
        </div>
      )}

      <main className="w-full">
        {!isSearchFocused && (
          <section className="px-4 py-3 border-b border-border flex items-center justify-between">
            <button onClick={() => setListingViewMode('top_destinations')} className={`text-sm font-bold ${listingViewMode === 'top_destinations' ? 'text-primary underline underline-offset-8' : 'text-muted-foreground'}`}>
              Top Destinations
            </button>
            <button onClick={() => !locationLoading && (permissionDenied ? setShowLocationDialog(true) : setListingViewMode('my_location'))} className={`flex items-center gap-1 text-sm font-bold ${listingViewMode === 'my_location' ? 'text-primary underline underline-offset-8' : 'text-muted-foreground'}`}>
              {locationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              My Location
            </button>
          </section>
        )}

        <div className="w-full px-4 py-4">
          {loading ? (
            /* Skeleton also updated to 2 columns */
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {[...Array(6)].map((_, i) => <ListingSkeleton key={i} />)}
            </div>
          ) : filteredListings.length > 0 ? (
            /* THE FIX: grid-cols-2 for mobile */
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {filteredListings.map((listing) => (
                <MemoizedListingCard
                  key={listing.id}
                  id={listing.id}
                  type={listing.type}
                  name={listing.name}
                  location={listing.location}
                  country={listing.country || ""}
                  imageUrl={listing.image_url}
                  price={listing.price || listing.entry_fee || 0}
                  isSaved={savedItems.has(listing.id)}
                  onSave={() => handleSave(listing.id, listing.type)}
                  avgRating={ratings.get(listing.id)?.avgRating}
                  distance={position && listing.latitude ? calculateDistance(position.latitude, position.longitude, listing.latitude, listing.longitude) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">No listings found.</div>
          )}
        </div>
      </main>

      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogContent className="max-w-[90vw] rounded-xl">
          <AlertDialogHeader>
            <div className="flex justify-center mb-2"><Navigation className="h-10 w-10 text-primary" /></div>
            <AlertDialogTitle className="text-center">Enable Location</AlertDialogTitle>
            <AlertDialogDescription className="text-center">See amazing spots right where you are.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2">
            <AlertDialogAction onClick={() => { setShowLocationDialog(false); forceRequestLocation(); }} className="w-full">Try Again</AlertDialogAction>
            <Button variant="ghost" onClick={() => setShowLocationDialog(false)}>Maybe Later</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;