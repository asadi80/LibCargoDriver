import { View, Text, Button, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useDriverStore } from "@/store/driverStore";
import { uploadDriverDocs } from "@/services/api";

export default function UploadDocs() {
  const router = useRouter();
  const driver = useDriverStore((s) => s.driver);

  const [license, setLicense] = useState<string | null>(null);
  const [insurance, setInsurance] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<string | null>(null);

  const pickImage = async (setter: any) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const submit = async () => {
    await uploadDriverDocs({
      driverId: driver.id,
      license,
      insurance,
      vehicle,
    });

    router.replace("/(tabs)/home");
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18 }}>Upload Documents</Text>

      <Button title="Upload License" onPress={() => pickImage(setLicense)} />
      {license && <Image source={{ uri: license }} style={{ width: 100, height: 100 }} />}

      <Button title="Upload Insurance" onPress={() => pickImage(setInsurance)} />
      {insurance && <Image source={{ uri: insurance }} style={{ width: 100, height: 100 }} />}

      <Button title="Upload Vehicle Photo" onPress={() => pickImage(setVehicle)} />
      {vehicle && <Image source={{ uri: vehicle }} style={{ width: 100, height: 100 }} />}

      <Button title="Submit" onPress={submit} />
    </View>
  );
}