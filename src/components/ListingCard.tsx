import { useState, memo, useCallback, useMemo } from "react";
import { MapPin, Heart, Star, Calendar, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, optimizeSupabaseImage } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createDetailPath } from "@/lib/slugUtils";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  KHAKI: "#F0E68C",
  KHAKI_DARK: "#857F3E",
  RED: "#FF0000",
  SOFT_GRAY: "#F8F9FA"
} as const;

const ListingCardComponent = ({
  id, type, name, imageUrl, location, country, price, date,
  isOutdated = false, onSave, isSaved = false, activities, 
  hidePrice = false, availableTickets = 0, bookedTickets = 0, 
  priority = false, compact = false, avgRating, distance, place,
  isFlexibleDate = false
}: any) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();

  // Move the ref to the Card to ensure visibility is detected properly
  const { ref: cardRef, isIntersecting } = useIntersectionObserver({
    rootMargin: '400px', // Increased margin
    triggerOnce: true
  });

  const shouldLoadImage = priority || isIntersecting;
  
  const isEventOrSport = useMemo(() => type === "EVENT" || type === "SPORT", [type]);
  const isTrip = useMemo(() => type === "TRIP", [type]);
  const tracksAvailability = useMemo(() => isEventOrSport || isTrip, [isEventOrSport, isTrip]);
  const remainingTickets = useMemo(() => availableTickets - bookedTickets, [availableTickets, bookedTickets]);
  const isSoldOut = useMemo(() => tracksAvailability && availableTickets > 0 && remainingTickets <= 0, [tracksAvailability, availableTickets, remainingTickets]);
  const fewSlotsRemaining = useMemo(() => tracksAvailability && remainingTickets > 0 && remainingTickets <= 10, [tracksAvailability, remainingTickets]);
  const isUnavailable = useMemo(() => isOutdated || isSoldOut, [isOutdated, isSoldOut]);

  const optimizedImageUrl = useMemo(() => optimizeSupabaseImage(imageUrl, { width: 400, height: 300, quality: 80 }), [imageUrl]);
  const thumbnailUrl = useMemo(() => optimizeSupabaseImage(imageUrl, { width: 32, height: 24, quality: 30 }), [imageUrl]);
  
  const displayType = useMemo(() => isEventOrSport ? "Event & Sports" : type.replace('_', ' '), [isEventOrSport, type]);
  const locationString = useMemo(() => [place, location, country].filter(Boolean).join(', ').toLowerCase(), [place, location, country]);

  const handleCardClick = useCallback(() => {
    const typeMap: Record<string, string> = {
      "TRIP": "trip", "EVENT": "event", "SPORT": "event", "HOTEL": "hotel",
      "ADVENTURE PLACE": "adventure", "ACCOMMODATION": "accommodation", "ATTRACTION": "attraction"
    };
    navigate(createDetailPath(typeMap[type], id, name, location));
  }, [navigate, type, id, name, location]);

  return (
    <Card 
      ref={cardRef} // Ref on the main card
      onClick={handleCardClick} 
      className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-2xl cursor-pointer border-slate-200 flex flex-col",
        "rounded-xl bg-[rgba(0,0,0,0.04)]", 
        compact ? "h-auto" : "h-full",
        isUnavailable && "opacity-90"
      )}
    >
      <div className="relative overflow-hidden bg-slate-200 rounded-t-xl" style={{ paddingBottom: '70%' }}>
        {/* Placeholder Skeleton */}
        {(!imageLoaded || !shouldLoadImage) && !imageError && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        
        {/* Low-res Blur-up */}
        {shouldLoadImage && !imageLoaded && !imageError && (
          <img 
            src={thumbnailUrl} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
          />
        )}
        
        {/* Main Image */}
        {shouldLoadImage && (
          <img 
            src={optimizedImageUrl} 
            alt={name}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500", 
                imageLoaded ? "opacity-100" : "opacity-0",
                isUnavailable && "grayscale-[0.6]" 
            )} 
          />
        )}
        
        {/* Overlays (Badges/Save Button) */}
        {isUnavailable && (
          <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
            <Badge className="bg-white text-black font-black border-none px-4 py-1.5 text-[11px] uppercase">
                {isSoldOut ? 'Sold Out' : 'Not Available'}
            </Badge>
          </div>
        )}
        
        <Badge className="absolute top-3 left-3 z-10 px-1.5 py-0.5 border-none shadow-md text-[7.5px] font-black uppercase"
               style={{ background: isUnavailable ? '#64748b' : COLORS.TEAL, color: 'white' }}>
          {displayType}
        </Badge>

        {onSave && (
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(id, type); }}
            className={cn(
                "absolute top-3 right-3 z-20 h-8 w-8 flex items-center justify-center rounded-full backdrop-blur-md transition-all", 
                isSaved ? "bg-red-500" : "bg-black/20 hover:bg-black/40"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", isSaved ? "text-white fill-white" : "text-white")} />
          </button>
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-1"> 
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-sm md:text-lg leading-tight uppercase tracking-tighter line-clamp-2" 
              style={{ color: isUnavailable ? '#475569' : COLORS.TEAL }}>
            {name}
          </h3>
          {avgRating && (
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
              <Star className="h-3 w-3 fill-[#FF7F50] text-[#FF7F50]" />
              <span className="text-[11px] font-black" style={{ color: '#0d7377' }}>{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isUnavailable ? '#94a3b8' : COLORS.CORAL }} />
            <p className="text-[10px] md:text-xs font-medium text-slate-700 capitalize line-clamp-1">
                {locationString}
            </p>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-200/60 flex items-center justify-between">
            <div className="flex flex-col">
                {!hidePrice && price !== undefined && (
                  <>
                    <span className="text-[10px] font-normal text-slate-500 lowercase">starts at</span>
                    <span className={cn("text-base font-black", isUnavailable ? "text-slate-500 line-through" : "text-[#FF0000]")}>
                        KSh {price.toLocaleString()}
                    </span>
                  </>
                )}
            </div>

            <div className="flex flex-col items-end">
                {(date || isFlexibleDate) && (
                  <div className="flex items-center gap-1 text-slate-700">
                      <Calendar className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase">
                          {isFlexibleDate ? 'Flexible' : new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                  </div>
                )}
            </div>
        </div>
      </div>
    </Card>
  );
};

export const ListingCard = memo(ListingCardComponent);