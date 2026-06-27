import { View, Text, Button } from "react-native";
import { useDriverStore } from "@/store/driverStore";
import { socket } from "@/services/socket";

export default function ActiveJob() {
  const activeShipment = useDriverStore((s) => s.activeShipment);
  const driver = useDriverStore((s) => s.driver);

  if (!activeShipment) {
    return (
      <View style={{ padding: 20 }}>
        <Text>No active shipment</Text>
      </View>
    );
  }

  // 📦 STATUS UPDATE FUNCTION
  const updateStatus = (status: string) => {
    socket.emit("update-shipment-status", {
      shipmentId: activeShipment.id,
      driverId: driver.id,
      status,
    });
  };

  return (
    <View style={{ padding: 20 }}>

      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        Active Shipment
      </Text>

      <Text>Pickup: {activeShipment.pickupAddr}</Text>
      <Text>Dropoff: {activeShipment.deliveryAddr}</Text>
      <Text>Price: ${activeShipment.price}</Text>

      <View style={{ marginTop: 20, gap: 10 }}>

        <Button
          title="Mark Picked Up"
          onPress={() => updateStatus("PICKED_UP")}
        />

        <Button
          title="In Transit"
          onPress={() => updateStatus("IN_TRANSIT")}
        />

        <Button
          title="Delivered"
          onPress={() => updateStatus("DELIVERED")}
        />

      </View>
    </View>
  );
}