import { useState, useEffect } from "react";
import { Menu, Heart, Ticket, Shield, Home, FolderOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavigationDrawer } from "./NavigationDrawer";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setUserRole(null);
        setUserName("");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        const roles = data.map(r => r.role);
        if (roles.includes("admin")) setUserRole("admin");
        else setUserRole("user");
      }

      // Fetch profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (profile && profile.name) {
        // Extract first name (text before first space)
        const firstName = profile.name.split(" ")[0];
        setUserName(firstName);
      }
    };

    checkRole();
  }, [user]);

  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      
      if (window.innerWidth < 768) {
        // Mobile: hide header on scroll down
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlHeader);
    return () => window.removeEventListener("scroll", controlHeader);
  }, [lastScrollY]);

  // Function to get the display name for the icon
  const getDisplayName = () => {
    if (userName) return userName;
    // If userName is empty, fall back to email's local part
    return user?.email?.split("@")[0] || "Account";
  };

  // Determine the correct link for the account icon
  const accountLink = user ? "/profile/edit" : "/auth";

  return (
    <header className={`sticky top-0 z-50 w-full border-b bg-blue-950 text-white h-16 transition-transform duration-300 ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}>
      <div className="container flex h-full items-center justify-between px-4">
        
        {/* Logo and Drawer Trigger (Left Side) */}
        <div className="flex items-center gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-blue-900 font-bold text-lg">
              T
            </div>
            <div>
              <span className="font-bold text-base md:text-lg text-white block">
                TripTrac
              </span>
              {/* The description is now visible on small screens (removed 'hidden lg:block') */}
              <p className="text-xs text-blue-200 block">Explore the world</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation (Centered) */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold hover:text-blue-200 transition-colors">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link to="/bookings" className="flex items-center gap-2 font-bold hover:text-blue-200 transition-colors">
            <Ticket className="h-4 w-4" />
            <span>My Bookings</span>
          </Link>
          <Link to="/saved" className="flex items-center gap-2 font-bold hover:text-blue-200 transition-colors">
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
          </Link>
                    <Link to="/my-listing" className="flex items-center gap-2 font-bold hover:text-blue-200 transition-colors">
            <FolderOpen className="h-4 w-4" />
            <span>Become a Host</span>
          </Link>
        </nav>

        {/* Account Controls (Right Side) */}
        <div className="flex items-center gap-2">
            
            {/* Mobile Account Icon with Name (Visible on small screens) */}
            <Link 
              to={accountLink} 
              className="lg:hidden flex flex-col items-center justify-center text-white p-2 rounded-md hover:bg-blue-800 transition-colors"
            >
              <User className="h-5 w-5" />
              {user && (
                <span className="text-[10px] font-medium mt-0.5 truncate max-w-[50px] leading-none">
                  {getDisplayName()}
                </span>
              )}
              {!user && (
                <span className="text-[10px] font-medium mt-0.5 leading-none">
                  Login
                </span>
              )}
            </Link>

        {/* Desktop Auth Actions (Right Side) */}
        <div className="hidden lg:flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-blue-800">
                  <User className="h-6 w-6" /> {/* Account Icon */}
                  <span className="text-sm font-bold">
                    {getDisplayName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile/edit" className="cursor-pointer">
                    Profile Edit
                  </Link>
                </DropdownMenuItem>
                {userRole === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/dashboard" className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" className="text-white hover:bg-blue-800">
                Login / Sign Up
              </Button>
            </Link>
          )}
        </div>
        </div>

      </div>
    </header>
  );
};