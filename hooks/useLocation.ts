import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

const LOCATION_STORAGE_KEY = "cachedLocation";
const LOCATION_NAME_STORAGE_KEY = "cachedLocationName";

export const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationName, setLocationName] = useState<string>(
    "Loading location..."
  );
  const [cityName, setCityName] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    try {
      setError(null);
      setCityName("Loading...");
      setLocationName("Loading location...");

      // Check current permission status without prompting
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

      if (existingStatus !== "granted") {
        setError("Location permission not granted");
        setCityName("Location required");
        setLocationName("Enable location in settings");
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation);

      // Cache location for background tasks
      await AsyncStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        })
      );
    } catch (err: any) {
      const errorMessage = err?.message ?? "Failed to get location";
      console.error("Location error:", errorMessage);
      setError(errorMessage);
    }
  }, []);

  // Fetches current location on mount
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Uses location data to get city and country name
  useEffect(() => {
    if (!location) return;

    (async () => {
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const { city, country } = reverseGeocode[0];
          const cityValue = city || "Unknown";
          const locationNameValue = `${city || "Unknown"}, ${country || "Unknown"}`;
          setCityName(cityValue);
          setLocationName(locationNameValue);

          // Cache location name for background tasks
          await AsyncStorage.setItem(LOCATION_NAME_STORAGE_KEY, locationNameValue);
        }
      } catch (err: any) {
        const errorMessage = err?.message ?? "Failed to get location name";
        console.error("Reverse geocode error:", errorMessage);
        setCityName("Unknown");
        setLocationName("Location unavailable");
      }
    })();
  }, [location]);

  const refreshLocation = useCallback(() => fetchLocation(), [fetchLocation]);

  return { location, locationName, cityName, error, refreshLocation };
};
