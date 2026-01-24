import { useState, useEffect } from "react";
import { Menu, Heart, Ticket, Home, User, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavigationDrawer } from "./NavigationDrawer";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { useTheme } from "next-themes";

export interface HeaderProps {
  onSearchClick?: () => void;
  showSearchIcon?: boolean;
  className?: string;
  hideIcons?: boolean;
}

export const Header = ({ onSearchClick, showSearchIcon = true, className }: HeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 1. Fix: Ensure theme/icons only render after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Fix: Simplified Profile Fetch (preventing potential single() errors)
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid throwing if profile doesn't exist yet
        
      if (error) console.error("Error fetching profile:", error.message);
    };
    fetchUserProfile();
  }, [user]);

  const mobileHeaderClasses = "sticky top-0 left-0 right-0 flex bg-background border-b border-border shadow-sm py-2";

  const headerIconStyles = `
    h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 
    active:scale-90 text-foreground hover:bg-muted
  `;

  return (
    <header className={`z-[100] items-center ${mobileHeaderClasses} ${className || ''}`}>
      <div className="container mx-auto px-4 flex items-center justify-between h-full">
        
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-2">
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <button className={`${headerIconStyles} lg:hidden`} aria-label="Open Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 h-screen border-none">
              <NavigationDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/fulllogo.png" 
              alt="Logo"
              className="h-8 w-8 rounded-full shadow-sm object-contain bg-muted p-1 border border-border"
            />
            <div className="flex flex-col justify-center">
              <span 
                className="font-bold text-lg tracking-tight italic leading-none"
                style={{
                  background: "linear-gradient(to right, #1a365d, #2b6cb0, #4fd1c5)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                RealTravo
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Nav */}
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

        {/* Right: Theme, Search, Notifications */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Toggle - Logic corrected for mounted state */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={headerIconStyles}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}

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

          <button 
            onClick={() => user ? navigate('/account') : navigate('/auth')}
            className="hidden sm:flex h-10 px-4 rounded-xl items-center gap-2 transition-all font-semibold text-xs text-primary-foreground bg-primary hover:brightness-110"
          >
            <User className="h-4 w-4" />
            <span>{user ? "Profile" : "Login"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};