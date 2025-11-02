import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
}

export const CategoryCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  className,
}: CategoryCardProps) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer overflow-hidden border-2 hover:border-primary transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      <div className="p-3 md:p-6 flex flex-col items-center text-center gap-2 md:gap-4">
        <div className="h-10 w-10 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-5 w-5 md:h-8 md:w-8" />
        </div>
        <div>
          <h3 className="font-bold text-xs md:text-lg mb-0 md:mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground hidden md:block">{description}</p>
        </div>
      </div>
    </Card>
  );
};
