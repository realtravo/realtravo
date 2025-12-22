import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const LARGE_SCREEN_BREAKPOINT = 1024;

interface ResponsiveLimits {
  cardLimit: number;
  isMobile: boolean;
  isLargeScreen: boolean;
}

export function useResponsiveLimit(): ResponsiveLimits {
  const [limits, setLimits] = useState<ResponsiveLimits>({
    cardLimit: 4, // Default to mobile
    isMobile: true,
    isLargeScreen: false
  });

  useEffect(() => {
    const updateLimits = () => {
      const width = window.innerWidth;
      const isMobile = width < MOBILE_BREAKPOINT;
      const isLargeScreen = width >= LARGE_SCREEN_BREAKPOINT;
      
      // Mobile/Tablet: 4 cards, Desktop: 16 cards
      const cardLimit = isLargeScreen ? 16 : 4;
      
      setLimits({
        cardLimit,
        isMobile,
        isLargeScreen
      });
    };

    // Initial check
    updateLimits();

    // Listen for resize events
    const mql = window.matchMedia(`(min-width: ${LARGE_SCREEN_BREAKPOINT}px)`);
    const onChange = () => updateLimits();
    
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return limits;
}
