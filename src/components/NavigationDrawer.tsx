import { Home, Ticket, Heart, Phone, Info, LogIn, LogOut, User, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavigationDrawerProps {
  onClose: () => void;
}

// Component to render a thin separator line
const Separator = () => (
  <hr className="my-1.5 border-gray-200/50 dark:border-gray-700/30" />
);

export const NavigationDrawer = ({ onClose }: NavigationDrawerProps) => {
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (profile && profile.name) {
        setUserName(profile.name);
      }
    };

    fetchUserData();
  }, [user]);

  const handleProtectedNavigation = async (path: string) => {
    if (!user) {
      window.location.href = "/auth";
      onClose();
      return;
    }

    window.location.href = path;
    onClose();
  };

  const bottomNavItems = [
    { icon: Phone, label: "Contact", path: "/contact", protected: false },
    { icon: Info, label: "About", path: "/about", protected: false },
  ];

  const legalItems = [
    { icon: FileText, label: "Terms of Service", path: "/terms-of-service" },
    { icon: Shield, label: "Privacy Policy", path: "/privacy-policy" },
  ];

  const topContentItems = [
    { icon: Home, label: "Home", path: "/", protected: false },
    { icon: Ticket, label: "My Bookings", path: "/bookings", protected: true },
    { icon: Heart, label: "Wishlist", path: "/saved", protected: true },
  ];

  const handleLogout = () => {
    signOut();
    onClose();
  };

  const AuthDisplay = user ? (
    <li className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-800">
      <Link
        to="/profile"
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
      >
        <User className="h-4 w-4 text-black dark:text-white" />
        <span className="text-sm font-medium truncate text-black dark:text-white">
          {userName || "My Profile"}
        </span>
      </Link>
      <Separator /> 
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 group"
      >
        <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400">Logout</span>
      </button>
      <Separator /> 
    </li>
  ) : (
    <li className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-800">
      <Link
        to="/auth"
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-teal-600 dark:bg-teal-800 text-white hover:bg-teal-700 dark:hover:bg-teal-700 transition-all duration-200 group"
      >
        <LogIn className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">Login / Register</span>
      </Link>
      <Separator /> 
    </li>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-[#008080] text-white border-[#006666]">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-lg bg-[#006666] flex items-center justify-center font-bold text-lg text-white">
            T
          </div>
          <div>
            <span className="font-bold text-base block text-white">
              TripTrac
            </span>
            <p className="text-xs text-[#80c0c0]">Your journey starts now.</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 pt-6 overflow-y-auto bg-white dark:bg-gray-950 scrollbar-hide">
        <ul className="space-y-0.5">
          {/* 1. TOP SECTION */}
          <li>
            <ul className="space-y-0.5">
              {topContentItems.map((item) => (
                <li key={item.path}>
                  {item.label === "Home" ? (
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                    >
                      <item.icon className="h-4 w-4 text-black dark:text-white" />
                      <span className="text-sm font-medium text-black dark:text-white">
                        {item.label}
                      </span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleProtectedNavigation(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                    >
                      <item.icon className="h-4 w-4 text-black dark:text-white" />
                      <span className="text-sm font-medium text-black dark:text-white">
                        {item.label}
                      </span>
                    </button>
                  )}
                  <Separator />
                </li>
              ))}
            </ul>
          </li>

          {/* 2. COMPANY SECTION */}
          <li className="pt-2"> 
            <ul className="space-y-0.5">
              {bottomNavItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                  >
                    <item.icon className="h-4 w-4 text-black dark:text-white" />
                    <span className="text-sm font-medium text-black dark:text-white">
                      {item.label}
                    </span>
                  </Link>
                  <Separator />
                </li>
              ))}
            </ul>
          </li>

          {/* 3. LEGAL SECTION */}
          <li className="pt-2">
            <ul className="space-y-0.5">
              {legalItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 group"
                  >
                    <item.icon className="h-4 w-4 text-black dark:text-white" />
                    <span className="text-sm font-medium text-black dark:text-white">
                      {item.label}
                    </span>
                  </Link>
                  <Separator />
                </li>
              ))}
            </ul>
          </li>

          {AuthDisplay}
        </ul>
      </nav>
    </div>
  );
};