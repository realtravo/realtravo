import { Tent, Hotel, Calendar, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryType = "all" | "campsite" | "hotels" | "trips" | "events";

interface HomeCategoryFilterProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

// Define specific colors for each category
const categories = [
  { id: "campsite", icon: Tent, label: "Adventure", color: "bg-orange-500", border: "border-orange-200" },
  { id: "hotels", icon: Hotel, label: "Hotels", color: "bg-blue-500", border: "border-blue-200" },
  { id: "trips", icon: Calendar, label: "Trips", color: "bg-emerald-500", border: "border-emerald-200" },
  { id: "events", icon: Compass, label: "Events", color: "bg-purple-500", border: "border-purple-200" },
] as const;

export const HomeCategoryFilter = ({
  activeCategory,
  onCategoryChange,
}: HomeCategoryFilterProps) => {
  const handleCategoryClick = (catId: CategoryType) => {
    if (activeCategory === catId) {
      onCategoryChange("all");
    } else {
      onCategoryChange(catId);
    }
  };

  return (
    <div className="w-full bg-background border-b border-border">
      <div className="flex justify-center overflow-x-auto scrollbar-hide gap-4 px-3 py-4">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                "group flex items-center gap-3 px-2 py-1.5 rounded-full transition-all duration-200",
                "hover:bg-muted/80", // Slight background hover for the whole button
                isActive ? "ring-2 ring-offset-2 ring-primary" : "ring-0"
              )}
            >
              {/* The Rounded Circle for the Icon */}
              <div
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full text-white transition-transform duration-200 shadow-sm",
                  cat.color,
                  isActive ? "scale-110 shadow-md" : "scale-100 opacity-80 group-hover:opacity-100"
                )}
              >
                <cat.icon className="h-5 w-5" />
              </div>

              {/* The Label (Outside the circle) */}
              <span
                className={cn(
                  "text-xs font-bold pr-2 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};