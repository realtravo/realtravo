import { useRef, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const loadingRef = useRef(false);

  const getCachedData = useCallback((): T | null => {
    const cached = globalCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [key]);

  const setCachedData = useCallback((data: T) => {
    globalCache.set(key, { data, timestamp: Date.now() });
  }, [key]);

  const invalidateCache = useCallback(() => {
    globalCache.delete(key);
  }, [key]);

  const fetchWithCache = useCallback(async (forceRefresh = false): Promise<T | null> => {
    if (loadingRef.current) return null;
    
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) return cached;
    }

    loadingRef.current = true;
    try {
      const data = await fetcher();
      setCachedData(data);
      return data;
    } finally {
      loadingRef.current = false;
    }
  }, [fetcher, getCachedData, setCachedData]);

  return { getCachedData, setCachedData, fetchWithCache, invalidateCache };
}

// Hook for scroll position restoration
export function useScrollRestoration(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const saveScrollPosition = useCallback(() => {
    scrollPositions.current.set(key, window.scrollY);
  }, [key]);

  const restoreScrollPosition = useCallback(() => {
    const position = scrollPositions.current.get(key);
    if (position !== undefined) {
      requestAnimationFrame(() => {
        window.scrollTo(0, position);
      });
    }
  }, [key]);

  useEffect(() => {
    return () => {
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

  return { saveScrollPosition, restoreScrollPosition };
}
