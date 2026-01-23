import { Tent, Hotel, Calendar, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryType = "all" | "campsite" | "hotels" | "trips" | "events";

interface HomeCategoryFilterProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

// Categories without "All" - defaults to showing all listings when none selected
const categories: { id: CategoryType; icon: typeof Tent; label: string }[] = [
  { id: "campsite", icon: Tent, label: "Adventure" },
  { id: "hotels", icon: Hotel, label: "Hotels" },
  { id: "trips", icon: Calendar, label: "Trips" },
  { id: "events", icon: Compass, label: "Events" },
];

export const HomeCategoryFilter = ({
  activeCategory,
  onCategoryChange,
}: HomeCategoryFilterProps) => {
  const handleCategoryClick = (catId: CategoryType) => {
    // Toggle: if already active, go back to "all" (show everything)
    if (activeCategory === catId) {
      onCategoryChange("all");
    } else {
      onCategoryChange(catId);
    }
  };

  return (
    <div className="w-full bg-background border-b border-border">
      {/* Centered container with rounded colored categories */}
      <div className="flex justify-center overflow-x-auto scrollbar-hide gap-2 px-3 py-3">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                "border-2 shadow-sm",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-muted/60 text-muted-foreground border-muted hover:bg-primary/10 hover:border-primary/50 hover:text-primary"
              )}
            >
              <cat.icon className="h-4 w-4" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
