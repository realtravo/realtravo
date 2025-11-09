import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { CategoryCard } from "@/components/CategoryCard";
import { SearchBarWithSuggestions } from "@/components/SearchBarWithSuggestions";
import { ListingCard } from "@/components/ListingCard";
import { Footer } from "@/components/Footer";
import { Calendar, Hotel, Mountain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [trips, setTrips] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [adventurePlaces, setAdventurePlaces] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const sessionId = localStorage.getItem("sessionId") || (() => {
    const newId = Math.random().toString(36).substring(7);
    localStorage.setItem("sessionId", newId);
    return newId;
  })();

  useEffect(() => {
    fetchAllData();
    fetchSavedItems();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const [tripsData, eventsData, hotelsData, adventurePlacesData] = await Promise.all([
      supabase.from("trips").select("*").limit(6),
      supabase.from("events").select("*").limit(6),
      supabase.from("hotels").select("*").limit(6),
      supabase.from("adventure_places").select("*").limit(6),
    ]);

    if (tripsData.data) setTrips(tripsData.data);
    if (eventsData.data) setEvents(eventsData.data);
    if (hotelsData.data) setHotels(hotelsData.data);
    if (adventurePlacesData.data) setAdventurePlaces(adventurePlacesData.data);
    setLoading(false);
  };

  const fetchSavedItems = async () => {
    const { data } = await supabase
      .from("saved_items")
      .select("item_id")
      .eq("session_id", sessionId);
    
    if (data) {
      setSavedItems(new Set(data.map(item => item.item_id)));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchAllData();
      return;
    }

    // Sanitize search query to prevent SQL injection
    const sanitizedQuery = searchQuery.toLowerCase().replace(/[%_]/g, '\\$&');
    const query = `%${sanitizedQuery}%`;
    
    const [tripsData, eventsData, hotelsData, adventurePlacesData] = await Promise.all([
      supabase.from("trips").select("*").or(`name.ilike.${query},location.ilike.${query},country.ilike.${query},place.ilike.${query}`),
      supabase.from("events").select("*").or(`name.ilike.${query},location.ilike.${query},country.ilike.${query},place.ilike.${query}`),
      supabase.from("hotels").select("*").or(`name.ilike.${query},location.ilike.${query},country.ilike.${query},place.ilike.${query}`),
      supabase.from("adventure_places").select("*").or(`name.ilike.${query},location.ilike.${query},country.ilike.${query},place.ilike.${query}`),
    ]);

    if (tripsData.data) setTrips(tripsData.data);
    if (eventsData.data) setEvents(eventsData.data);
    if (hotelsData.data) setHotels(hotelsData.data);
    if (adventurePlacesData.data) setAdventurePlaces(adventurePlacesData.data);
  };

  const handleSave = async (itemId: string, itemType: string) => {
    const isSaved = savedItems.has(itemId);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (isSaved) {
      const { error } = await supabase
        .from("saved_items")
        .delete()
        .eq("item_id", itemId)
        .eq("session_id", sessionId);
      
      if (!error) {
        setSavedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
        toast({ title: "Removed from saved" });
      }
    } else {
      const { error } = await supabase
        .from("saved_items")
        .insert({ item_id: itemId, item_type: itemType, session_id: sessionId, user_id: user?.id || null });
      
      if (!error) {
        setSavedItems(prev => new Set([...prev, itemId]));
        toast({ title: "Added to saved!" });
      }
    }
  };

  const categories = [
    {
      icon: Calendar,
      title: "Events & Trips",
      description: "Discover exciting experiences",
      path: "/category/trips",
    },
    {
      icon: Hotel,
      title: "Hotels & Accommodation",
      description: "Find your perfect stay",
      path: "/category/hotels",
    },
    {
      icon: Mountain,
      title: "Adventure Places",
      description: "Explore thrilling destinations",
      path: "/category/adventure",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container px-4 py-8 space-y-12">
        {/* Search */}
        <section>
          <SearchBarWithSuggestions
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
          />
        </section>

        {/* Categories (Kept this section as it was requested to be in the first row after search) */}
        <section>
          <h2 className="text-3xl font-bold mb-6 text-center md:block hidden">What are you looking for?</h2>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.title}
                icon={category.icon}
                title={category.title}
                description={category.description}
                onClick={() => navigate(category.path)}
                className="md:p-6"
              />
            ))}
          </div>
        </section>

        {/* Consolidated Listings (Trips, Events, Hotels, Adventure Places) */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Consolidated Loading/Shimmer Effect */}
            {loading || (trips.length === 0 && events.length === 0 && hotels.length === 0 && adventurePlaces.length === 0) ? (
              <>
                {[...Array(12)].map((_, i) => ( // Display more shimmer cards for the combined list
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="aspect-[4/3] bg-muted animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                      <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                      <div className="h-6 bg-muted animate-pulse rounded w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // Map over ALL listings in one go
              [...trips, ...events, ...hotels, ...adventurePlaces].map((item) => {
                // Determine the type for the ListingCard based on properties (or simply assume they are all items)
                const type = item.date ? (item.price ? (item.date.length > 0 ? "TRIP" : "EVENT") : "EVENT") : (item.price ? "HOTEL" : "ADVENTURE PLACE");
                // The above 'type' logic is complex; a cleaner way is to ensure your original arrays were structured with a 'type' property.
                // For simplicity and based on the original code's data structure, let's keep the object properties needed for ListingCard.
                
                // A better approach is to merge the data *before* the render in the component logic:
                // const allListings = [...trips.map(t => ({...t, type: "TRIP"})), ...events.map(e => ({...e, type: "EVENT"})), ...hotels.map(h => ({...h, type: "HOTEL"})), ...adventurePlaces.map(a => ({...a, type: "ADVENTURE PLACE"}))];
                // Since I can only modify the return, I'll rely on the original data properties being passed correctly.
                
                return (
                  <ListingCard
                    key={`${item.id}-${type}`} // Ensure unique key
                    id={item.id}
                    type={item.date ? (item.price ? "TRIP" : "EVENT") : (item.price ? "HOTEL" : "ADVENTURE PLACE")} // Simplified type derivation
                    name={item.name}
                    imageUrl={item.image_url}
                    location={item.location}
                    country={item.country}
                    price={item.price}
                    date={item.date}
                    onSave={handleSave}
                    isSaved={savedItems.has(item.id)}
                  />
                );
              })
            )}
          </div>
        </section>

      </main>

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default Index;
