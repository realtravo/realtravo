import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Vlog {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
}

export const VlogSection = () => {
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    fetchVlogs();
  }, []);

  const fetchVlogs = async () => {
    const { data } = await supabase
      .from("vlogs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) setVlogs(data);
  };

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("vlog-scroll-container");
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === "left" 
        ? scrollPosition - scrollAmount 
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  if (vlogs.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Travel Vlogs</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div
        id="vlog-scroll-container"
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {vlogs.map((vlog) => (
          <Card
            key={vlog.id}
            className="min-w-[280px] md:min-w-[320px] cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
          >
            <img
              src={vlog.image_url}
              alt={vlog.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2 line-clamp-1">{vlog.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {vlog.description}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};