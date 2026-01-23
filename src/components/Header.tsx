import { useState, useEffect } from "react";
import { Menu, Heart, Ticket, Home, User, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavigationDrawer } from "./NavigationDrawer";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

const COLORS = {
  TEAL: "#008080",
  CORAL: "#FF7F50",
  SOFT_GRAY: "#F8F9FA",
  DARK_BG: "rgba(0, 0, 0, 0.5)"
};

export interface HeaderProps {
  onSearchClick?: () => void;
  showSearchIcon?: boolean;
  className?: string;
  hideIcons?: boolean;
}

export const Header = ({ onSearchClick, showSearchIcon = true, className, hideIcons = false }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isIndexPage = location.pathname === '/';
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').select('name').eq('id', session.user.id).single();
      }
    };
    fetchUserProfile();
  }, [user]);

  // Mobile: Always white background with clean header
  const mobileHeaderClasses = "sticky top-0 left-0 right-0 flex bg-background border-b border-border shadow-sm py-2";

  // Icon styles for clean header
  const headerIconStyles = `
    h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 
    active:scale-90 text-foreground hover:bg-muted
  `;

  return (
    <header 
      className={`z-[100] items-center ${mobileHeaderClasses} ${className || ''}`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-full">
        {/* Left: Menu Icon */}
        <div className="flex items-center gap-3">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button className={headerIconStyles} aria-label="Open Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen border-none">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          {/* Logo - hidden on mobile for cleaner look */}
          <Link to="/" className="hidden md:flex items-center gap-3 group">
            <img 
              src="/fulllogo.png" 
              alt="Realtravo Logo"
              loading="eager"
              fetchPriority="high"
              decoding="sync"
              width={40}
              height={40}
              className="h-10 w-10 rounded-full shadow-md object-contain bg-muted p-1 border border-border"
            />
            <div className="hidden sm:block">
              <span 
                className="font-bold text-2xl tracking-tight block italic leading-none"
                style={{
                  background: "linear-gradient(to right, #1a365d, #2b6cb0, #4fd1c5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                RealTravo
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Click.Pack.Go!.
              </span>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          {[
            { to: "/", icon: <Home className="h-4 w-4" />, label: "Home" },
            { to: "/bookings", icon: <Ticket className="h-4 w-4" />, label: "Bookings" },
            { to: "/saved", icon: <Heart className="h-4 w-4" />, label: "Wishlist" }
          ].map((item) => (
            <Link 
              key={item.label}
              to={item.to} 
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right: Notification Bell (and optional search icon) */}
        <div className="flex items-center gap-2">
          {showSearchIcon && (
            <button 
              onClick={() => onSearchClick ? onSearchClick() : navigate('/')}
              className={headerIconStyles}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          
          <NotificationBell />

          {/* Desktop only: Login/Profile button */}
          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={() => user ? navigate('/account') : navigate('/auth')}
              className="h-10 px-5 rounded-xl flex items-center gap-2 transition-all font-semibold text-xs text-primary-foreground hover:brightness-110 active:scale-95 bg-primary"
            >
              <User className="h-4 w-4" />
              {user ? "Profile" : "Login"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};