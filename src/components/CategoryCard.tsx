import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
  bgImage?: string;
}

export const CategoryCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  className,
  bgImage,
}: CategoryCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      {/* Same layout for both mobile and desktop: Simple icon + title */}
      <div className="p-2 flex flex-col items-center text-center gap-1">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-bold text-xs text-foreground">{title}</h3>
        </div>
      </div>
    </Card>
  );
};