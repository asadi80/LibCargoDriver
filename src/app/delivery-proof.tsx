import { View, Text, Button, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";
import { useDriverStore } from "@/store/driverStore";
import { socket } from "@/services/socket";

export default function DeliveryProof() {
  const shipment = useDriverStore((s) => s.activeShipment);

  const [photo, setPhoto] = useState<string | null>(null);

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const submitProof = async () => {
    const location = await Location.getCurrentPositionAsync({});

    socket.emit("submit-proof", {
      shipmentId: shipment.id,
      photoUrl: photo,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18 }}>Proof of Delivery</Text>

      <Button title="Take Photo" onPress={takePhoto} />

      {photo && (
        <Image
          source={{ uri: photo }}
          style={{ width: 200, height: 200, marginTop: 10 }}
        />
      )}

      <Button
        title="Confirm Delivery"
        onPress={submitProof}
      />
    </View>
  );
}