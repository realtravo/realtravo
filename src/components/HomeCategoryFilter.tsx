import { Tent, Hotel, Calendar, Compass, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryType = "all" | "campsite" | "hotels" | "trips" | "events";

interface HomeCategoryFilterProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const categories = [
  { id: "all", icon: LayoutGrid, label: "All", color: "bg-slate-600" }, // New "All" filter
  { id: "campsite", icon: Tent, label: "Adventure", color: "bg-orange-500" },
  { id: "hotels", icon: Hotel, label: "Hotels", color: "bg-blue-500" },
  { id: "trips", icon: Calendar, label: "Trips", color: "bg-emerald-500" },
  { id: "events", icon: Compass, label: "Events", color: "bg-purple-500" },
] as const;

export const HomeCategoryFilter = ({
  activeCategory,
  onCategoryChange,
}: HomeCategoryFilterProps) => {
  const handleCategoryClick = (catId: CategoryType) => {
    // If clicking "All" or clicking the currently active category, reset to "all"
    if (catId === "all" || activeCategory === catId) {
      onCategoryChange("all");
    } else {
      onCategoryChange(catId);
    }
  };

  return (
    <div className="w-full bg-background border-b border-border px-2 md:px-4">
      <div className="max-w-5xl mx-auto py-4">
        {/* Added overflow-x-auto to ensure it doesn't break on very small screens */}
        <div className="flex items-center justify-between md:justify-center gap-1 sm:gap-4 lg:gap-8 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  "group flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-1 rounded-2xl transition-all duration-200 flex-1 md:flex-none min-w-fit",
                  "hover:bg-muted/50",
                  isActive ? "bg-muted/30" : "bg-transparent"
                )}
              >
                {/* The Rounded Circle for the Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-full text-white transition-all duration-200 shadow-sm",
                    cat.color,
                    isActive ? "scale-105 shadow-md ring-2 ring-offset-2 ring-slate-200" : "opacity-80 group-hover:opacity-100"
                  )}
                >
                  <cat.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>

                {/* The Label */}
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-bold transition-colors md:pr-2 whitespace-nowrap",
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
    </div>
  );
};