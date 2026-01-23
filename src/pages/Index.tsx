import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchBarWithSuggestions } from "@/components/SearchBarWithSuggestions";
import { ListingCardWithDescription } from "@/components/ListingCardWithDescription";
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
import { ListingSkeleton, ListingGridSkeleton } from "@/components/ui/listing-skeleton";
import { useSavedItems } from "@/hooks/useSavedItems";
import { getCachedHomePageData, setCachedHomePageData } from "@/hooks/useHomePageCache";
import { useRatings, sortByRating } from "@/hooks/useRatings";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useResponsiveLimit } from "@/hooks/useResponsiveLimit";

const MemoizedListingCard = memo(ListingCard);
const MemoizedListingCardWithDescription = memo(ListingCardWithDescription);

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
  
  // Responsive fetch limits
  const { cardLimit, isLargeScreen } = useResponsiveLimit();

  // Category and filter state
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [appliedFilters, setAppliedFilters] = useState<HomeFilterValues>({ location: "" });
  const [listingViewMode, setListingViewMode] = useState<'top_destinations' | 'my_location'>('top_destinations');

  // Request location on first user interaction
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
  }>({
    trips: [],
    hotels: [],
    attractions: [],
    campsites: [],
    events: []
  });
  const [nearbyPlacesHotels, setNearbyPlacesHotels] = useState<any[]>([]);
  const [loadingScrollable, setLoadingScrollable] = useState(true);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Collect all item IDs for ratings
  const allItemIds = useMemo(() => {
    const ids = new Set<string>();
    listings.forEach(item => ids.add(item.id));
    nearbyPlacesHotels.forEach(item => ids.add(item.id));
    scrollableRows.trips.forEach(item => ids.add(item.id));
    scrollableRows.hotels.forEach(item => ids.add(item.id));
    scrollableRows.campsites.forEach(item => ids.add(item.id));
    scrollableRows.events.forEach(item => ids.add(item.id));
    return Array.from(ids);
  }, [listings, nearbyPlacesHotels, scrollableRows]);

  // Collect trip and event IDs for real-time booking stats
  const tripEventIds = useMemo(() => {
    return [...scrollableRows.trips, ...scrollableRows.events].map(item => item.id);
  }, [scrollableRows.trips, scrollableRows.events]);

  // Real-time booking stats subscription
  const { bookingStats } = useRealtimeBookings(tripEventIds);
  const { ratings } = useRatings(allItemIds);

  // Sort items by rating with location prioritization
  const sortedListings = useMemo(() => {
    return sortByRating(listings, ratings, position, calculateDistance);
  }, [listings, ratings, position]);

  const sortedNearbyPlaces = useMemo(() => {
    return sortByRating(nearbyPlacesHotels, ratings, position, calculateDistance);
  }, [nearbyPlacesHotels, ratings, position]);

  const sortedEvents = useMemo(() => {
    return sortByRating(scrollableRows.events, ratings, position, calculateDistance);
  }, [scrollableRows.events, ratings, position]);

  const sortedCampsites = useMemo(() => {
    return sortByRating(scrollableRows.campsites, ratings, position, calculateDistance);
  }, [scrollableRows.campsites, ratings, position]);

  const sortedHotels = useMemo(() => {
    return sortByRating(scrollableRows.hotels, ratings, position, calculateDistance);
  }, [scrollableRows.hotels, ratings, position]);

  const sortedTrips = useMemo(() => {
    return sortByRating(scrollableRows.trips, ratings, position, calculateDistance);
  }, [scrollableRows.trips, ratings, position]);

  // Scroll refs
  const featuredRef = useRef<HTMLDivElement>(null);

  const scrollSection = useCallback((ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 300;
      const newScrollLeft = direction === 'left' ? ref.current.scrollLeft - scrollAmount : ref.current.scrollLeft + scrollAmount;
      ref.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  }, []);

  const fetchScrollableRows = useCallback(async (limit: number) => {
    setLoadingScrollable(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const [tripsData, hotelsData, campsitesData, eventsData] = await Promise.all([
        supabase
          .from("trips")
          .select("id,name,location,place,country,image_url,date,is_custom_date,is_flexible_date,available_tickets,activities,type,created_at,price,price_child,description")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .eq("type", "trip")
          .order("date", { ascending: true })
          .limit(limit),
        supabase
          .from("hotels")
          .select("id,name,location,place,country,image_url,activities,latitude,longitude,created_at,description")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("adventure_places")
          .select("id,name,location,place,country,image_url,entry_fee,activities,latitude,longitude,created_at,description")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(limit),
        supabase
          .from("trips")
          .select("id,name,location,place,country,image_url,date,is_custom_date,is_flexible_date,available_tickets,activities,type,created_at,price,price_child,description")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .eq("type", "event")
          .order("date", { ascending: true })
          .limit(limit),
      ]);
      
      setScrollableRows({
        trips: tripsData.data || [],
        hotels: hotelsData.data || [],
        attractions: [],
        campsites: campsitesData.data || [],
        events: eventsData.data || []
      });
    } catch (error) {
      console.error("Error fetching scrollable rows:", error);
    } finally {
      setLoadingScrollable(false);
    }
  }, []);

  const fetchNearbyPlacesAndHotels = async () => {
    setLoadingNearby(true);
    if (!position) return;
    
    const [placesData, hotelsData] = await Promise.all([
      supabase
        .from("adventure_places")
        .select("id,name,location,place,country,image_url,entry_fee,activities,latitude,longitude,created_at,description")
        .eq("approval_status", "approved")
        .eq("is_hidden", false)
        .limit(12),
      supabase
        .from("hotels")
        .select("id,name,location,place,country,image_url,activities,latitude,longitude,created_at,description")
        .eq("approval_status", "approved")
        .eq("is_hidden", false)
        .limit(12),
    ]);
    
    const combined = [
      ...(placesData.data || []).map(item => ({ ...item, type: "ADVENTURE PLACE", table: "adventure_places" })),
      ...(hotelsData.data || []).map(item => ({ ...item, type: "HOTEL", table: "hotels" }))
    ];

    const withDistance = combined.map(item => {
      let distance: number | undefined;
      const itemAny = item as any;
      if (itemAny.latitude && itemAny.longitude && position) {
        distance = calculateDistance(position.latitude, position.longitude, itemAny.latitude, itemAny.longitude);
      }
      return { ...item, distance };
    });

    const sorted = withDistance.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) return a.distance - b.distance;
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;
      return 0;
    });
    
    const nearby = sorted.slice(0, 12);
    setNearbyPlacesHotels(nearby);
    if (nearby.length > 0) setLoadingNearby(false);
  };

  const fetchAllData = async (query?: string, offset: number = 0, limit: number = 30) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const fetchEvents = async () => {
      let dbQuery = supabase
        .from("trips")
        .select("id,name,location,place,country,image_url,date,is_custom_date,is_flexible_date,available_tickets,activities,type,created_at,price,price_child,description")
        .eq("approval_status", "approved")
        .eq("is_hidden", false)
        .eq("type", "event")
        .or(`date.gte.${today},is_flexible_date.eq.true`);
        
      if (query) {
        const searchPattern = `%${query}%`;
        dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern},country.ilike.${searchPattern}`);
      }
      dbQuery = dbQuery.order('date', { ascending: true }).range(offset, offset + limit - 1);
      const { data } = await dbQuery;
      return (data || []).map((item: any) => ({ ...item, type: "EVENT" }));
    };

    const fetchTrips = async () => {
      let dbQuery = supabase
        .from("trips")
        .select("id,name,location,place,country,image_url,date,is_custom_date,is_flexible_date,available_tickets,activities,type,created_at,price,price_child,description")
        .eq("approval_status", "approved")
        .eq("is_hidden", false)
        .eq("type", "trip")
        .or(`date.gte.${today},is_flexible_date.eq.true`);
        
      if (query) {
        const searchPattern = `%${query}%`;
        dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern},country.ilike.${searchPattern}`);
      }
      dbQuery = dbQuery.order('date', { ascending: true }).range(offset, offset + limit - 1);
      const { data } = await dbQuery;
      return (data || []).map((item: any) => ({ ...item, type: "TRIP" }));
    };
    
    const fetchTable = async (table: "hotels" | "adventure_places", type: string) => {
      let dbQuery = supabase
        .from(table)
        .select(
          table === "hotels"
            ? "id,name,location,place,country,image_url,activities,latitude,longitude,created_at,description"
            : "id,name,location,place,country,image_url,entry_fee,activities,latitude,longitude,created_at,description"
        )
        .eq("approval_status", "approved")
        .eq("is_hidden", false);
        
      if (query) {
        const searchPattern = `%${query}%`;
        dbQuery = dbQuery.or(`name.ilike.${searchPattern},location.ilike.${searchPattern},country.ilike.${searchPattern}`);
      }
      dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      const { data } = await dbQuery;
      return (data || []).map((item: any) => ({ ...item, type }));
    };
    
    const [events, trips, hotels, adventures] = await Promise.all([
      fetchEvents(),
      fetchTrips(),
      fetchTable("hotels", "HOTEL"),
      fetchTable("adventure_places", "ADVENTURE PLACE")
    ]);

    let combined = [...events, ...trips, ...hotels, ...adventures];

    if (position) {
      combined = combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      combined = combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    if (offset === 0) {
      setListings(combined);
      setHasMoreSearchResults(true);
    } else {
      setListings(prev => [...prev, ...combined]);
    }

    if (combined.length < limit) setHasMoreSearchResults(false);
    setLoading(false);
    return combined;
  };

  // Infinite scroll
  useEffect(() => {
    if (!searchQuery || !hasMoreSearchResults) return;
    const handleScroll = () => {
      if (loading || !hasMoreSearchResults) return;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      if (scrollTop + clientHeight >= scrollHeight - 500) {
        loadMoreSearchResults();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, searchQuery, listings.length, hasMoreSearchResults]);

  const loadMoreSearchResults = async () => {
    if (loading || !searchQuery || !hasMoreSearchResults) return;
    const prevLength = listings.length;
    await fetchAllData(searchQuery, listings.length, 20);
    if (listings.length === prevLength) setHasMoreSearchResults(false);
  };

  useEffect(() => {
    const cachedData = getCachedHomePageData();
    if (cachedData) {
      setListings(cachedData.listings || []);
      setScrollableRows(cachedData.scrollableRows || { trips: [], hotels: [], attractions: [], campsites: [], events: [] });
      setNearbyPlacesHotels(cachedData.nearbyPlacesHotels || []);
      setLoading(false);
      setLoadingScrollable(false);
      setLoadingNearby(false);
    }

    fetchAllData();
    fetchScrollableRows(cardLimit);
    
    const initUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    initUserId();
  }, [cardLimit, fetchScrollableRows]);

  useEffect(() => {
    if (!loading && !loadingScrollable && listings.length > 0) {
      setCachedHomePageData({ scrollableRows, listings, nearbyPlacesHotels });
    }
  }, [loading, loadingScrollable, listings, scrollableRows, nearbyPlacesHotels]);

  useEffect(() => {
    if (position) fetchNearbyPlacesAndHotels();
  }, [position]);

  // Search bar visibility on scroll
  useEffect(() => {
    const controlSearchBar = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 200) {
        setIsSearchVisible(false);
        setShowSearchIcon(true);
      } else {
        setIsSearchVisible(true);
        setShowSearchIcon(false);
      }
    };
    window.addEventListener("scroll", controlSearchBar);
    return () => window.removeEventListener("scroll", controlSearchBar);
  }, []);

  const handleSearchIconClick = () => {
    setIsSearchVisible(true);
    setShowSearchIcon(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle My Location tap
  const handleMyLocationTap = useCallback(() => {
    if (permissionDenied) {
      setShowLocationDialog(true);
      return;
    }
    if (!position && !locationLoading) {
      forceRequestLocation();
    }
    setListingViewMode('my_location');
  }, [position, locationLoading, permissionDenied, forceRequestLocation]);

  useEffect(() => {
    if (permissionDenied && listingViewMode === 'my_location') {
      setShowLocationDialog(true);
    }
  }, [permissionDenied, listingViewMode]);

  // Filter listings based on category and filters
  const filteredListings = useMemo(() => {
    let result = [...listings];
    
    // Filter by category
    if (activeCategory !== "all") {
      result = result.filter(item => {
        const itemType = item.type?.toUpperCase();
        if (activeCategory === "campsite") return itemType === "ADVENTURE PLACE";
        if (activeCategory === "hotels") return itemType === "HOTEL";
        if (activeCategory === "trips") return itemType === "TRIP";
        if (activeCategory === "events") return itemType === "EVENT";
        return true;
      });
    }
    
    // Filter by location
    if (appliedFilters.location) {
      const locationQuery = appliedFilters.location.toLowerCase();
      result = result.filter(item => 
        item.location?.toLowerCase().includes(locationQuery) ||
        item.place?.toLowerCase().includes(locationQuery) ||
        item.country?.toLowerCase().includes(locationQuery)
      );
    }
    
    // Sort by distance if my_location mode
    if (listingViewMode === 'my_location' && position) {
      result = result.sort((a, b) => {
        const distA = a.latitude && a.longitude ? calculateDistance(position.latitude, position.longitude, a.latitude, a.longitude) : Infinity;
        const distB = b.latitude && b.longitude ? calculateDistance(position.latitude, position.longitude, b.latitude, b.longitude) : Infinity;
        return distA - distB;
      });
    }
    
    return result;
  }, [listings, activeCategory, appliedFilters, listingViewMode, position]);

  const handleApplyFilters = (filters: HomeFilterValues) => {
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setAppliedFilters({ location: "" });
  };

  return (
    <div className="min-h-screen bg-background pb-0 md:pb-0">
      {/* Header - White background, menu left, notification right */}
      <Header onSearchClick={handleSearchIconClick} showSearchIcon={showSearchIcon} />
      
      {/* Category Filter Bar - Horizontal scrollable at top */}
      <HomeCategoryFilter 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />
      
      {/* Filter Section - Location, Check-in, Check-out */}
      <HomeFilterBar 
        onApplyFilters={handleApplyFilters} 
        onClear={handleClearFilters} 
      />
      
      {/* Search Bar with Suggestions - Not sticky, disappears on scroll */}
      {isSearchVisible && !isSearchFocused && (
        <div ref={searchRef} className="w-full px-4 py-3 bg-background">
          <SearchBarWithSuggestions 
            value={searchQuery} 
            onChange={setSearchQuery} 
            onSubmit={() => {
              if (searchQuery.trim()) {
                fetchAllData(searchQuery);
                setIsSearchFocused(true);
              }
            }} 
            onSuggestionSearch={query => {
              setSearchQuery(query);
              fetchAllData(query);
              setIsSearchFocused(true);
            }} 
            onFocus={() => setIsSearchFocused(true)} 
            onBlur={() => {}}
            onBack={() => {
              setIsSearchFocused(false);
              setSearchQuery("");
              fetchAllData();
            }} 
            showBackButton={false} 
          />
        </div>
      )}

      {/* Focused Search View */}
      {isSearchFocused && (
        <div className="sticky top-0 z-[100] bg-background p-4 border-b shadow-md">
          <div className="container px-0 mx-auto">
            <SearchBarWithSuggestions 
              value={searchQuery} 
              onChange={setSearchQuery} 
              onSubmit={() => {
                if (searchQuery.trim()) fetchAllData(searchQuery);
              }} 
              onSuggestionSearch={query => {
                setSearchQuery(query);
                fetchAllData(query);
              }} 
              onFocus={() => setIsSearchFocused(true)} 
              onBlur={() => {}} 
              onBack={() => {
                setIsSearchFocused(false);
                setSearchQuery("");
                fetchAllData();
              }} 
              showBackButton={true} 
            />
          </div>
        </div>
      )}

      <main className="w-full">
        {/* Discovery Section - Top Destinations / My Location */}
        {!isSearchFocused && (
          <section className="px-4 py-3 bg-background border-b border-border">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setListingViewMode('top_destinations')}
                className={`text-sm font-semibold transition-all ${
                  listingViewMode === 'top_destinations'
                    ? 'text-primary underline underline-offset-4'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                Top Destinations
              </button>
              
              <button
                onClick={!locationLoading ? handleMyLocationTap : undefined}
                disabled={locationLoading}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-all ${
                  listingViewMode === 'my_location'
                    ? 'text-primary underline underline-offset-4'
                    : 'text-muted-foreground hover:text-primary'
                } ${locationLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span>{locationLoading ? 'Finding...' : 'My Location'}</span>
              </button>
            </div>
          </section>
        )}

        {/* Listing Grid */}
        <div className="w-full px-4 py-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <ListingSkeleton key={i} />)}
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredListings.map((listing, index) => {
                const itemDistance = position && listing.latitude && listing.longitude 
                  ? calculateDistance(position.latitude, position.longitude, listing.latitude, listing.longitude) 
                  : undefined;
                const ratingData = ratings.get(listing.id);
                
                return (
                  <MemoizedListingCardWithDescription
                    key={listing.id}
                    id={listing.id}
                    type={listing.type}
                    name={listing.name}
                    location={listing.location}
                    country={listing.country}
                    imageUrl={listing.image_url}
                    description={listing.description}
                    price={listing.price || listing.entry_fee || 0}
                    date={listing.date}
                    isCustomDate={listing.is_custom_date}
                    isFlexibleDate={listing.is_flexible_date}
                    isSaved={savedItems.has(listing.id)}
                    onSave={() => handleSave(listing.id, listing.type)}
                    hidePrice={listing.type === "HOTEL" || listing.type === "ADVENTURE PLACE"}
                    activities={listing.activities}
                    distance={itemDistance}
                    avgRating={ratingData?.avgRating}
                    reviewCount={ratingData?.reviewCount}
                    place={listing.place}
                    availableTickets={listing.type === "TRIP" || listing.type === "EVENT" ? listing.available_tickets : undefined}
                    bookedTickets={listing.type === "TRIP" || listing.type === "EVENT" ? bookingStats[listing.id] || 0 : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No listings found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search</p>
            </div>
          )}
        </div>
      </main>

      {/* Location Permission Dialog */}
      <AlertDialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Navigation className="h-8 w-8 text-primary" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Turn On Location</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              To see places near you, please enable location access in your device settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction 
              onClick={() => {
                setShowLocationDialog(false);
                forceRequestLocation();
              }}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Try Again
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={() => {
                setShowLocationDialog(false);
                setListingViewMode('top_destinations');
              }}
              className="w-full bg-muted text-muted-foreground hover:bg-muted/80"
            >
              Continue Without Location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
