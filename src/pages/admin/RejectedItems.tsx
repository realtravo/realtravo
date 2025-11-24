import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Plane, Building, Tent, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ListingItem {
  id: string;
  name: string;
  type: string;
  location: string;
  created_at: string;
}

const RejectedItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRejectedItems();
  }, [user, navigate]);

  const fetchRejectedItems = async () => {
    try {
      const [tripsRes, hotelsRes, adventuresRes, attractionsRes] = await Promise.all([
        supabase.from("trips").select("id, name, location, created_at").eq("approval_status", "rejected"),
        supabase.from("hotels").select("id, name, location, created_at").eq("approval_status", "rejected"),
        supabase.from("adventure_places").select("id, name, location, created_at").eq("approval_status", "rejected"),
        supabase.from("attractions").select("id, location_name, local_name, created_at").eq("approval_status", "rejected"),
      ]);

      const allItems: ListingItem[] = [
        ...(tripsRes.data?.map(t => ({ ...t, type: "trip" })) || []),
        ...(hotelsRes.data?.map(h => ({ ...h, type: "hotel" })) || []),
        ...(adventuresRes.data?.map(a => ({ ...a, type: "adventure" })) || []),
        ...(attractionsRes.data?.map(a => ({ 
          id: a.id, 
          name: a.local_name || a.location_name, 
          location: a.location_name,
          type: "attraction",
          created_at: a.created_at
        })) || []),
      ];

      setItems(allItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error("Error fetching rejected items:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "trip": return Plane;
      case "hotel": return Building;
      case "adventure": return Tent;
      case "attraction": return MapPin;
      default: return MapPin;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container px-4 py-8">
          <p className="text-center">Loading...</p>
        </main>
        <Footer />
        <MobileBottomBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto mb-20 md:mb-0">
        <h1 className="text-3xl font-bold mb-8">Rejected Items</h1>

        {items.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No rejected items</p>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {items.map((item) => {
                const Icon = getIcon(item.type);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/admin/review/${item.type}/${item.id}`)}
                    className="w-full flex items-center justify-between p-6 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Rejected</Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </main>
      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default RejectedItems;
