import { Header } from "@/components/Header";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Footer } from "@/components/Footer";

const Bookings = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Bookings</h1>
        
        <div className="text-center py-16">
          <p className="text-xl text-muted-foreground">No bookings yet</p>
          <p className="text-muted-foreground mt-2">Your upcoming trips and reservations will appear here</p>
        </div>
      </main>

      <Footer />
      <MobileBottomBar />
    </div>
  );
};

export default Bookings;
