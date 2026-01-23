import { Tent, Hotel, Calendar, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryType = "all" | "campsite" | "hotels" | "trips" | "events";

interface HomeCategoryFilterProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const categories: { id: CategoryType; icon: typeof Tent; label: string }[] = [
  { id: "all", icon: Compass, label: "All" },
  { id: "campsite", icon: Tent, label: "Adventure" },
  { id: "hotels", icon: Hotel, label: "Hotels" },
  { id: "trips", icon: Calendar, label: "Trips" },
  { id: "events", icon: Compass, label: "Events" },
];

export const HomeCategoryFilter = ({
  activeCategory,
  onCategoryChange,
}: HomeCategoryFilterProps) => {
  return (
    <div className="w-full bg-background border-b border-border">
      <div className="flex overflow-x-auto scrollbar-hide gap-1 px-3 py-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                "border border-transparent",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <cat.icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
