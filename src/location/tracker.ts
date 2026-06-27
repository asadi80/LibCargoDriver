import * as Location from "expo-location";
import { socket } from "@/services/socket";

let watchId: Location.LocationSubscription | null = null;

export const startLocationTracking = async (driverId: string) => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    console.log("Permission denied");
    return;
  }

  watchId = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    (location) => {
      const { latitude, longitude } = location.coords;

      socket.emit("driver-location", {
        driverId,
        latitude,
        longitude,
      });
    }
  );
};

export const stopLocationTracking = () => {
  watchId?.remove();
  watchId = null;
};