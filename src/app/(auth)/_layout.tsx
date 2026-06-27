import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B1220" },
          animation: "fade",
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}