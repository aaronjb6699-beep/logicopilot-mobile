import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

export function useOfflineCache<T>(key: string) {
  const [cached, setCached] = useState<T | undefined>(undefined);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && raw) {
          try {
            setCached(JSON.parse(raw) as T);
          } catch {}
        }
        if (!cancelled) setCacheLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setCacheLoaded(true);
      });
    return () => { cancelled = true; };
  }, [key]);

  function saveToCache(data: T) {
    savedRef.current = true;
    AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
  }

  return { cached, cacheLoaded, saveToCache };
}
