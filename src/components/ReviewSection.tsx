import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name?: string;
}

interface ReviewSectionProps {
  itemId: string;
  itemType: "trip" | "event" | "hotel" | "adventure_place" | "attraction";
}

export function ReviewSection({ itemId, itemType }: ReviewSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", itemId, itemType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("item_id", itemId)
        .eq("item_type", itemType)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]));

      return (data || []).map(review => ({
        ...review,
        user_name: profileMap.get(review.user_id) || "Anonymous"
      })) as Review[];
    },
  });

  const userReviews = reviews.filter(r => r.user_id === user?.id);
  const otherReviews = reviews.filter(r => r.user_id !== user?.id);
  const allReviewsSorted = [...userReviews, ...otherReviews];
  const displayedReviews = showAllReviews ? allReviewsSorted : allReviewsSorted.slice(0, 5);
  const hasMoreReviews = reviews.length > 5;

  // Set current user's rating if exists
  const userRating = userReviews.length > 0 ? userReviews[0].rating : 0;
  if (rating === 0 && userRating > 0) {
    setRating(userRating);
  }

  const submitRatingMutation = useMutation({
    mutationFn: async (newRating: number) => {
      if (!user) throw new Error("Must be logged in to submit a rating");
      if (newRating === 0) throw new Error("Please select a rating");

      // Check if user already has a rating
      const existingReview = userReviews[0];

      if (existingReview) {
        // Update existing rating
        const { error } = await supabase
          .from("reviews")
          .update({
            rating: newRating,
            comment: null,
          })
          .eq("id", existingReview.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase.from("reviews").insert({
          user_id: user.id,
          item_id: itemId,
          item_type: itemType,
          rating: newRating,
          comment: null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", itemId, itemType] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleStarClick = (star: number) => {
    setRating(star);
    submitRatingMutation.mutate(star);
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Reviews ({reviews.length})</h2>
        
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${star <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                />
              ))}
            </div>
            <span className="text-lg font-semibold">{averageRating.toFixed(1)} out of 5</span>
          </div>
        )}

        {user && (
          <div className="mb-6 space-y-4">
            <h3 className="text-lg font-semibold">Your Rating</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer transition-colors ${
                    star <= (hoveredStar || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleStarClick(star)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {displayedReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{review.user_name || "Anonymous"}</p>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
              </div>
              
            </Card>
          ))}

          {reviews.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No reviews yet. Be the first to review!</p>
          )}

          {hasMoreReviews && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAllReviews(!showAllReviews)}
            >
              {showAllReviews ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show More ({reviews.length - 5} more)
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
