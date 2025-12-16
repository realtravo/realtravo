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
import { NotificationBell } from "./NotificationBell"; // <-- Component needs update to accept props

interface HeaderProps {
  onSearchClick?: () => void;
  showSearchIcon?: boolean;
}

export const Header = ({ onSearchClick, showSearchIcon = true }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to get current path
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // State for scroll position
  const [scrollPosition, setScrollPosition] = useState(0);

  // Check if current page is the index page ('/')
  const isIndexPage = location.pathname === "/";
  
  // Define the scroll handler
  const handleScroll = () => {
    setScrollPosition(window.pageYOffset);
  };
  
  // Attach and cleanup scroll listener, isolated to small screens on the index page
  useEffect(() => {
    // Only apply the dynamic header on the index page
    if (isIndexPage) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isIndexPage]);

  // Determine header and icon colors for the small screen
  const isScrolled = scrollPosition > 50; // Scroll threshold

  // **Small Screen Header Background Logic**
  const mobileHeaderBgClass = isIndexPage && !isScrolled
    ? "bg-transparent border-b-transparent" // Transparent when at top on index page
    : "bg-[#008080] border-b-border"; // Teal when scrolled
    
  // **Small Screen Icon Background Logic**
  // Use a darker RGBA background for visibility when the header is transparent
  const mobileIconBgClass = isIndexPage && !isScrolled
    ? "bg-black/30 hover:bg-black/40" // rgba darker color for visibility
    : "bg-white/10 hover:bg-white/20"; // Standard background when solid
    
    // The NotificationBell component needs to accept the dynamic class prop
    const notificationBellClassName = mobileIconBgClass;


  /* --- User Data Fetching (Kept for completeness) --- */
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
  /* ------------------------------------------------ */

  return (
    // The main header wrapper now uses conditional styling to hide/show parts.
    <header className="sticky top-0 z-50 w-full text-white h-16 dark:bg-[#008080] dark:text-white">
      
      {/* ============================================================
        1. SMALL SCREEN HEADER (Hidden on MD and up)
        ============================================================
      */}
      <div className={`md:hidden flex h-full items-center justify-between px-4 transition-colors duration-300 ${mobileHeaderBgClass}`}>
        
        {/* Left Side: Menu Icon */}
        <div className="flex items-center gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button 
                // Applies dynamic mobile background
                className={`inline-flex items-center justify-center h-10 w-10 rounded-md text-white transition-colors ${mobileIconBgClass}`} 
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          {/* Logo/Name: REMOVED from small screen as requested */}
          {/* A dummy flex-grow is not needed since the icons are justified. */}
        </div>

        {/* Right Side: Search and Notification */}
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
              // Applies dynamic mobile background
              className={`rounded-full h-10 w-10 flex items-center justify-center transition-colors group ${mobileIconBgClass}`}
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white group-hover:text-[#008080]" />
            </button>
          )}
          
          {/* Notification Bell */}
          <NotificationBell buttonClassName={notificationBellClassName} />
          
        </div>
      </div>


      {/* ============================================================
        2. BIG SCREEN HEADER (Hidden on small screens)
        This block remains completely UNCHANGED from the original code.
        ============================================================
      */}
      <div className="hidden md:flex h-full items-center justify-between px-4 bg-[#008080] dark:bg-[#008080]">
        
        {/* Logo and Drawer Trigger (Left Side) */}
        <div className="flex items-center gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button className="inline-flex items-center justify-center h-10 w-10 rounded-md text-white hover:bg-[#006666] transition-colors" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-[#0066cc] font-bold text-lg">
              T
            </div>
            <div>
              <span className="font-bold text-base md:text-lg text-white block">
                TripTrac
              </span>
              <p className="text-xs text-white/90 block">Your journey starts now.</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation (Centered) */}
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
              className="rounded-full h-10 w-10 flex items-center justify-center transition-colors bg-white/10 hover:bg-white group"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white group-hover:text-[#008080]" />
            </button>
          )}
          
          {/* Desktop Auth Actions (Right Side) - Notification, Theme, Account */}
          <div className="flex items-center gap-2">
            {/* Using default NotificationBell for desktop */}
            <NotificationBell /> 
            <ThemeToggle />
            
            {/* Account Button */}
            <button 
              onClick={() => user ? navigate('/account') : navigate('/auth')}
              className="rounded-full h-10 w-10 flex items-center justify-center transition-colors 
                                   bg-white/10 hover:bg-white group" 
              aria-label="Account"
            >
              <User className="h-5 w-5 text-white group-hover:text-[#008080]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};