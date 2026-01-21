import { fetchQiblaDirection, QiblaData } from "@/prayer-api/qiblaDirectionAPI";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

export const useQiblaDirection = (
  location: Location.LocationObject | null
) => {
  const [qiblaData, setQiblaData] = useState<QiblaData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const locationRef = useRef<Location.LocationObject | null>(null);

  const getQiblaDirection = useCallback(async (loc: Location.LocationObject) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchQiblaDirection(
        loc.coords.latitude,
        loc.coords.longitude
      );
      setQiblaData(data);
    } catch (err: any) {
      const errorMessage = err?.message ?? "Failed to get Qibla direction";
      console.error("Qibla direction error:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!location) return;
    locationRef.current = location;
    getQiblaDirection(location);
  }, [location, getQiblaDirection]);

  const refreshQibla = useCallback(async () => {
    if (locationRef.current) {
      await getQiblaDirection(locationRef.current);
    }
  }, [getQiblaDirection]);

  return { qiblaData, loading, error, refreshQibla };
};