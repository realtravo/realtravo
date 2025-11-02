import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Vlog {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  created_at: string;
}

const Vlog = () => {
  const [vlogs, setVlogs] = useState<Vlog[]>([]);

  useEffect(() => {
    fetchVlogs();
  }, []);

  const fetchVlogs = async () => {
    const { data } = await supabase
      .from("vlogs")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setVlogs(data);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Travel Vlogs</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vlogs.map((vlog) => (
            <Card
              key={vlog.id}
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
            >
              <img
                src={vlog.image_url}
                alt={vlog.title}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h3 className="font-bold text-xl mb-3">{vlog.title}</h3>
                <p className="text-muted-foreground mb-4">{vlog.description}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(vlog.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {vlogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No vlogs available yet.</p>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default Vlog;