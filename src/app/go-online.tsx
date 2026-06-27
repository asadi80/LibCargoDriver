//app/go-online
import { View, Text, Button } from "react-native";
import { useDriverStore } from "@/store/driverStore";
import { socket } from "@/services/socket";
import { startLocationTracking, stopLocationTracking } from "@/location/tracker";

export default function GoOnline() {
  const driver = useDriverStore((s) => s.user);
  const isOnline = useDriverStore((s) => s.isOnline);
  const setOnline = useDriverStore((s) => s.setOnline);

  // 🟢 GO ONLINE
  const goOnline = () => {
    socket.connect();

    socket.emit("driver-online", {
      driverId: driver?.id,
    });

    startLocationTracking(driver?.id);

    setOnline(true);
  };

  // 🔴 GO OFFLINE
  const goOffline = () => {
    socket.emit("driver-offline", {
      driverId: driver?.id,
    });

    stopLocationTracking();

    socket.disconnect();

    setOnline(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>
        Driver Status: {isOnline ? "ONLINE 🟢" : "OFFLINE 🔴"}
      </Text>

      {!isOnline ? (
        <Button title="Go Online" onPress={goOnline} />
      ) : (
        <Button title="Go Offline" onPress={goOffline} />
      )}
    </View>
  );
}