import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  CORAL_LIGHT: "#FF9E7A",
  SOFT_GRAY: "#F8F9FA"
};

interface SimilarItemsProps {
  currentItemId: string;
  itemType: "trip" | "hotel" | "adventure" | "attraction" | "event";
  location?: string;
  country?: string;
}

export const SimilarItems = ({ currentItemId, itemType, location, country }: SimilarItemsProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSimilarItems();
  }, [currentItemId, itemType]);

  const fetchSimilarItems = async () => {
    try {
      let route = "";
      if (itemType === "trip") {
        route = "/trip";
        const { data, error } = await supabase
          .from("trips")
          .select("id, name, location, place, country, image_url, description, price")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .neq("id", currentItemId)
          .eq("country", country || "")
          .limit(6);
        if (error) throw error;
        setItems((data || []).map(item => ({ ...item, route })));
      } else if (itemType === "hotel") {
        route = "/hotel";
        const { data, error } = await supabase
          .from("hotels")
          .select("id, name, location, place, country, image_url, description")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .neq("id", currentItemId)
          .eq("country", country || "")
          .limit(6);
        if (error) throw error;
        setItems((data || []).map(item => ({ ...item, route, price: null })));
      } else if (itemType === "adventure") {
        route = "/adventure";
        const { data, error } = await supabase
          .from("adventure_places")
          .select("id, name, location, place, country, image_url, description, entry_fee")
          .eq("approval_status", "approved")
          .eq("is_hidden", false)
          .neq("id", currentItemId)
          .eq("country", country || "")
          .limit(6);
        if (error) throw error;
        setItems((data || []).map(item => ({ ...item, route, price: item.entry_fee })));
      }
    } catch (error) {
      console.error("Error fetching similar items:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || items.length === 0) return null;

  const getTitleByType = () => {
    switch(itemType) {
      case "adventure": return "Similar Experiences";
      case "hotel": return "Stay Somewhere Similar";
      case "trip": return "Other Recommended Trips";
      default: return "You Might Also Like";
    }
  };

  return (
    <div className="mt-16 mb-12">
      <div className="flex flex-col mb-8 px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">More to explore</p>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ color: COLORS.TEAL }}>
          {getTitleByType()}
        </h2>
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-6 -mx-4 px-4">
        <div className="flex gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex-shrink-0 w-72 bg-white rounded-[28px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => {
                navigate(`${item.route}/${item.id}`);
                window.scrollTo(0, 0);
              }}
            >
              {/* Image Container */}
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Floating Location Badge */}
                <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/30">
                  <MapPin className="h-3 w-3 text-white" />
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">
                    {item.location}
                  </span>
                </div>
              </div>

              {/* Content Container */}
              <div className="p-5">
                <h3 className="font-black text-lg uppercase tracking-tight text-slate-800 line-clamp-1 mb-3">
                  {item.name}
                </h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    {item.price ? (
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Starting from</span>
                        <span className="text-md font-black" style={{ color: COLORS.CORAL }}>
                          KSh {item.price}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest bg-[#008080]/10 px-3 py-1 rounded-full">
                        View Details
                      </span>
                    )}
                  </div>

                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1"
                    style={{ backgroundColor: `${COLORS.TEAL}10` }}
                  >
                    <ArrowRight className="h-5 w-5" style={{ color: COLORS.TEAL }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};