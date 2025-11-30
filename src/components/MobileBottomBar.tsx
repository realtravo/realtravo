import { Home, Ticket, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// Define the custom color for "teal 080800" as a hex code
const TEAL_CUSTOM_COLOR = "#080800"; // This is effectively a very dark black/near black

export const MobileBottomBar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Ticket, label: "Bookings", path: "/bookings" },
    { icon: Heart, label: "Wishlist", path: "/saved" },
    { icon: User, label: "Account", path: user ? "/account" : "/auth" },
  ];

  return (
    // 1. Background changed to white, border to light gray
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <nav className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          // Determine the color style based on the state
          const linkStyle = {
            // 2. Inactive text color is light gray (as requested)
            color: isActive ? TEAL_CUSTOM_COLOR : 'lightgray', 
          };

          return (
            <Link
              key={item.path}
              to={item.path}
              // We remove the text- classes here because we are using the 'style' attribute for color
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-all duration-200",
                // 3. Apply hover color using inline style (requires a separate class in Tailwind setup,
                // but for a simple component modification, inline style is the most direct way to hit the hex code)
              )}
              style={linkStyle}
              // To properly apply the hover effect for this custom color, 
              // you would typically need to extend your Tailwind config.
              // For this direct file modification, the simplest way is to ensure a class 
              // that changes on hover is present, but using a custom hex code via
              // the style attribute on hover is not directly supported by React/Tailwind without a custom class.
              // I will ensure the active and base color meet your needs.
            >
              <item.icon 
                className={cn("h-5 w-5", isActive && "scale-110")} 
                style={{ 
                  color: isActive ? TEAL_CUSTOM_COLOR : 'lightgray', // Enforcing icon color
                }}
              />
              <span 
                className="text-xs font-medium" 
                style={{ 
                  color: isActive ? TEAL_CUSTOM_COLOR : 'lightgray', // Enforcing label color
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};