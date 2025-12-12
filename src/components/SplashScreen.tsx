import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export const SplashScreen = ({ onComplete, minDuration = 1500 }: SplashScreenProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for animation to complete before calling onComplete
      setTimeout(onComplete, 500);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 transition-all duration-500",
        isExiting && "opacity-0 scale-105"
      )}
    >
      {/* Logo/Brand */}
      <div className={cn(
        "flex flex-col items-center gap-6 transition-all duration-700",
        isExiting ? "opacity-0 -translate-y-4" : "animate-fade-in"
      )}>
        {/* App Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-scale-in">
            <svg 
              viewBox="0 0 24 24" 
              className="w-14 h-14 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 rounded-2xl bg-white/30 blur-xl -z-10 animate-pulse" />
        </div>

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            TripTrac
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Explore Amazing Experiences
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-1.5 mt-4">
          <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};
