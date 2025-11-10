import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export const Footer = () => {
  return (
    // Changed background color class to bg-orange-500
    <footer className="bg-orange-500 border-t mt-12 text-white"> 
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-white" /> {/* Adjusted icon color to white for contrast */}
              <span className="font-bold text-lg">TripTrac</span>
            </div>
            <p className="text-sm text-orange-100"> {/* Adjusted text color for better contrast */}
              Discover amazing destinations and create unforgettable memories.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-orange-100 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/about" className="text-orange-100 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/contact" className="text-orange-100 hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/category/trips" className="text-orange-100 hover:text-white transition-colors">Trips</Link></li>
              <li><Link to="/category/events" className="text-orange-100 hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/category/hotels" className="text-orange-100 hover:text-white transition-colors">Hotels</Link></li>
              <li><Link to="/category/adventure" className="text-orange-100 hover:text-white transition-colors">Adventure</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-3">My Account</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/bookings" className="text-orange-100 hover:text-white transition-colors">My Bookings</Link></li>
              <li><Link to="/saved" className="text-orange-100 hover:text-white transition-colors">Saved</Link></li>
              <li><Link to="/vlog" className="text-orange-100 hover:text-white transition-colors">Vlog</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-orange-400 mt-8 pt-6 text-center text-sm text-orange-100">
          <p>© 2025 TripTrac. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};