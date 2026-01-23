import { useState, useCallback, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Star, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface ListingCardWithDescriptionProps {
  id: string;
  type: string;
  name: string;
  imageUrl: string;
  location: string;
  country: string;
  description?: string;
  price?: number;
  date?: string;
  isCustomDate?: boolean;
  isFlexibleDate?: boolean;
  isSaved?: boolean;
  onSave?: (id: string, type: string) => void;
  hidePrice?: boolean;
  activities?: any;
  distance?: number;
  avgRating?: number;
  reviewCount?: number;
  place?: string;
  availableTickets?: number;
  bookedTickets?: number;
}

const optimizeSupabaseImage = (url: string, width: number = 400): string => {
  if (!url || !url.includes("supabase")) return url;
  try {
    const imgUrl = new URL(url);
    imgUrl.searchParams.set("width", width.toString());
    imgUrl.searchParams.set("quality", "75");
    return imgUrl.toString();
  } catch {
    return url;
  }
};

const ListingCardWithDescriptionComponent = ({
  id,
  type,
  name,
  imageUrl,
  location,
  country,
  description,
  price = 0,
  date,
  isCustomDate,
  isFlexibleDate,
  isSaved = false,
  onSave,
  hidePrice = false,
  activities,
  distance,
  avgRating,
  reviewCount,
  place,
  availableTickets,
  bookedTickets = 0,
}: ListingCardWithDescriptionProps) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { ref: cardRef, isIntersecting: isVisible } = useIntersectionObserver({ threshold: 0.1 });

  const optimizedImageUrl = optimizeSupabaseImage(imageUrl, 400);

  const handleCardClick = useCallback(() => {
    const typeRoute = type.toLowerCase().replace(" ", "-");
    if (typeRoute === "hotel") {
      navigate(`/hotel/${id}`);
    } else if (typeRoute === "adventure-place" || typeRoute === "adventure place") {
      navigate(`/adventure/${id}`);
    } else if (typeRoute === "trip") {
      navigate(`/trip/${id}`);
    } else if (typeRoute === "event") {
      navigate(`/event/${id}`);
    }
  }, [id, type, navigate]);

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSave?.(id, type);
    },
    [id, type, onSave]
  );

  const getActivitiesText = () => {
    if (!activities) return null;
    if (Array.isArray(activities)) {
      return activities.slice(0, 2).join(", ");
    }
    return null;
  };

  const activitiesText = getActivitiesText();
  
  // Use description or activities as fallback
  const displayDescription = description || activitiesText || "";
  const shouldTruncate = displayDescription.length > 80;

  const isSoldOut =
    availableTickets !== undefined &&
    availableTickets !== null &&
    (availableTickets <= 0 || bookedTickets >= availableTickets);

  return (
    <Card
      ref={cardRef}
      onClick={handleCardClick}
      className={cn(
        "group cursor-pointer overflow-hidden border border-border transition-all duration-300 hover:shadow-lg bg-card",
        isSoldOut && "opacity-60"
      )}
    >
      <div className="flex flex-col">
        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {isVisible && (
            <img
              src={imageError ? "/placeholder.svg" : optimizedImageUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "h-full w-full object-cover transition-all duration-500 group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          )}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveClick}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-all hover:bg-background"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isSaved ? "fill-red-500 text-red-500" : "text-foreground"
              )}
            />
          </button>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isSoldOut && (
              <Badge variant="destructive" className="text-[10px]">
                Sold Out
              </Badge>
            )}
            {isFlexibleDate && (
              <Badge className="text-[10px] bg-green-600">Flexible Dates</Badge>
            )}
          </div>

          {/* Rating */}
          {avgRating !== undefined && avgRating > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full px-2 py-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold">{avgRating.toFixed(1)}</span>
              {reviewCount !== undefined && reviewCount > 0 && (
                <span className="text-[10px] text-muted-foreground">({reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 space-y-1.5">
          {/* Title */}
          <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs line-clamp-1">
              {place || location}, {country}
            </span>
            {distance !== undefined && (
              <span className="text-[10px] ml-auto whitespace-nowrap text-primary font-medium">
                {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
              </span>
            )}
          </div>

          {/* Description with Show More */}
          {displayDescription && (
            <div className="relative">
              <p
                className={cn(
                  "text-xs text-muted-foreground transition-all",
                  !showFullDescription && shouldTruncate ? "line-clamp-2" : ""
                )}
              >
                {displayDescription}
              </p>
              {shouldTruncate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullDescription(!showFullDescription);
                  }}
                  className="text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                >
                  {showFullDescription ? (
                    <>
                      Show Less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show More <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Price */}
          {!hidePrice && price > 0 && (
            <div className="pt-1">
              <span className="text-sm font-bold text-primary">
                KES {price.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const ListingCardWithDescription = memo(ListingCardWithDescriptionComponent);
