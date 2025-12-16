import { useState, useEffect } from "react";
import { Menu, Heart, Ticket, Shield, Home, FolderOpen, User, Search } from "lucide-react";
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
import { Link, useNavigate, useLocation } from "react-router-dom"; // <-- Import useLocation
import { ThemeToggle } from "./ThemeToggle"; 
import { NotificationBell } from "./NotificationBell"; 

interface HeaderProps {
  onSearchClick?: () => void;
  showSearchIcon?: boolean;
}

export const Header = ({ onSearchClick, showSearchIcon = true }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation(); // <-- Get current location
  const isIndexPage = location.pathname === '/'; // <-- Check if it's the index page

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // 1. New state for scroll background
  const [isScrolled, setIsScrolled] = useState(false);

  // 2. useEffect to track scroll position
  useEffect(() => {
    // Only apply scroll effect on the index page
    if (!isIndexPage) return; 

    const handleScroll = () => {
      // Threshold of 100px is common for triggering header changes
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    
    // Cleanup function
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isIndexPage]); // <-- Dependency on isIndexPage

  // --- (Existing user and role fetching logic remains here) ---
  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setUserRole(null);
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
    };

    checkRole();
  }, [user]);

  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.name) {
          setUserName(profile.name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const getUserInitials = () => {
    if (userName) {
      const names = userName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return userName.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const [showMobileAccountDialog, setShowMobileAccountDialog] = useState(false);

  const handleMobileAccountTap = () => {
    if (!user) {
      window.location.href = "/auth";
    } else {
      setShowMobileAccountDialog(!showMobileAccountDialog);
    }
  };
  // -----------------------------------------------------------


  // Conditional header classes
  const headerClass = isIndexPage && !isScrolled
    ? "bg-transparent border-b-transparent text-white" // Transparent background, white text for contrast
    : "bg-[#008080] border-b-border text-white"; // Solid background (default for other pages or scrolled

  // Background class for the icons when header is transparent
  const iconBgClass = isIndexPage && !isScrolled
    ? "bg-[rgba(0,0,0,0.4)] hover:bg-[rgba(0,0,0,0.6)]" // Darker RGBA background for visibility
    : "bg-white/10 hover:bg-white/20"; // Default (current solid background style

  // Icon color when transparent: white. When solid: white.
  const iconColorClass = "text-white group-hover:text-white"; 

  // Icon color on hover when header is solid (e.g. for Account button)
  const iconColorSolidHoverClass = isIndexPage && !isScrolled 
      ? 'group-hover:text-white' // Keep white on hover when transparent
      : 'group-hover:text-[#008080]'; // Teal on hover when solid (like previous implementation

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 h-16 ${headerClass}`}>
      <div className="container flex h-full items-center justify-between px-4">
        
        {/* Logo and Drawer Trigger (Left Side) */}
        <div className="flex items-center gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button 
                className={`inline-flex items-center justify-center h-10 w-10 rounded-full transition-colors ${iconBgClass}`} 
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-3">
            {/* Hiding logo and name/description on small screen when header is transparent */}
            <div className={`h-8 w-8 rounded-lg bg-white items-center justify-center text-[#0066cc] font-bold text-lg ${isIndexPage && !isScrolled ? 'hidden lg:flex' : 'flex'}`}>
              T
            </div>
            <div className={`${isIndexPage && !isScrolled ? 'hidden lg:block' : 'block'}`}>
              <span className="font-bold text-base md:text-lg text-white block">
                TripTrac
              </span>
              <p className="text-xs text-white/90 block">Your journey starts now.</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation (Centered) - No change needed for desktop */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-bold hover:text-muted-foreground transition-colors">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link to="/bookings" className="flex items-center gap-2 font-bold hover:text-muted-foreground transition-colors">
            <Ticket className="h-4 w-4" />
            <span>My Bookings</span>
          </Link>
          <Link to="/saved" className="flex items-center gap-2 font-bold hover:text-muted-foreground transition-colors">
            <Heart className="h-4 w-4" />
            <span>Wishlist</span>
          </Link>
          <button 
            onClick={() => user ? navigate('/become-host') : navigate('/auth')} 
            className="flex items-center gap-2 font-bold hover:text-muted-foreground transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            <span>Become a Host</span>
          </button>
        </nav>

        {/* Account Controls (Right Side) */}
        <div className="flex items-center gap-2">
          
          {/* Search Icon Button */}
          {showSearchIcon && (
            <button 
              onClick={() => {
                if (onSearchClick) {
                  onSearchClick();
                } else {
                  navigate('/');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`rounded-full h-10 w-10 flex items-center justify-center transition-colors group ${iconBgClass}`}
              aria-label="Search"
            >
              <Search className={`h-5 w-5 ${iconColorSolidHoverClass}`} />
            </button>
          )}
          
          {/* Notification Bell */}
          {/* Note: NotificationBell component needs to be updated to accept and use the iconBgClass/iconColorSolidHoverClass */}
          <NotificationBell className={iconBgClass} iconClassName={iconColorSolidHoverClass} />
          
          {/* Desktop Auth Actions (Right Side) - Theme, Account */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            
            {/* Account Button */}
            <button 
              onClick={() => user ? navigate('/account') : navigate('/auth')}
              className={`rounded-full h-10 w-10 flex items-center justify-center transition-colors group ${iconBgClass}`}
              aria-label="Account"
            >
              <User className={`h-5 w-5 ${iconColorSolidHoverClass}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};