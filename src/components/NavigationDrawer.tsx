import { Home, Ticket, Heart, Phone, Info, Video, Plus, Edit, Package, LogIn, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
// Assuming you will need a sign-out function, I'm importing signout from AuthContext
import { useAuth } from "@/contexts/AuthContext"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface NavigationDrawerProps {
  onClose: () => void;
}

export const NavigationDrawer = ({ onClose }: NavigationDrawerProps) => {
  // Destructure signout function here
  const { user, signout } = useAuth(); 
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Ticket, label: "My Bookings", path: "/bookings" },
    { icon: Video, label: "Vlog", path: "/vlog" },
    // Conditional items for logged-in users
    ...(user ? [{ icon: Heart, label: "Saved", path: "/saved" }] : []),
    ...(user ? [{ icon: Package, label: "My Content", path: "/my-content" }] : []),
    // Static items
    { icon: Phone, label: "Contact", path: "/contact" },
    { icon: Info, label: "About", path: "/about" },
  ];

  const handleLogout = () => {
    if (signout) {
      signout(); // Call the signout function from context
    }
    onClose(); // Close the drawer after logging out
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      
      {/* Header (Deep Navy) */}
      <div className="p-6 border-b bg-blue-900"> 
        <div className="flex items-center gap-3">
          {/* Logo (White background, Navy text) */}
          <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-blue-900 font-bold text-xl">
            T
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">
              TripTrac
            </h2>
            <p className="text-xs text-blue-200">Explore the world</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">

          {/* 1. Create Dropdown (Visible to Logged-in Users) */}
          {user && (
            <li className="mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" className="w-full flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  
                  {/* Link to /createTripEvent */}
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/createTripEvent" 
                      onClick={onClose} 
                      className="cursor-pointer"
                    >
                      Trip & Event
                    </Link>
                  </DropdownMenuItem>

                  {/* Link to /CreateHotel */}
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/CreateHotel" 
                      onClick={onClose} 
                      className="cursor-pointer"
                    >
                      Hotel & Accommodation
                    </Link>
                  </DropdownMenuItem>

                  {/* Link to /CreateAdventure */}
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/CreateAdventure" 
                      onClick={onClose} 
                      className="cursor-pointer"
                    >
                      Place to Adventure
                    </Link>
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )}
          
          {/* 2. Edit Profile Link (Visible to Logged-in Users) */}
          {user && (
            <li>
              <Link
                to="/profile/edit"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-all duration-200 group"
              >
                <Edit className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium group-hover:text-primary transition-colors">
                  Edit Profile
                </span>
              </Link>
            </li>
          )}
          
          {/* 3. Main Navigation Items */}
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/10 transition-all duration-200 group"
              >
                <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}

          {/* 4. Login/Logout Buttons */}
          {user ? (
            // Logout Button for Logged-in Users
            <li className="mt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </li>
          ) : (
            // Login Button for Logged-out Users
            <li className="mt-4">
              <Link
                to="/auth"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
              >
                <LogIn className="h-5 w-5" />
                <span className="font-medium">Login</span>
              </Link>
            </li>
          )}

        </ul>
      </nav>
      
      {/* Footer (Deep Navy) */}
      <div className="p-6 border-t border-blue-600 bg-blue-900"> 
        <p className="text-xs text-blue-200 text-center"> 
          © 2025 TripTrac. All rights reserved.
        </p>
      </div>
    </div>
  );
};