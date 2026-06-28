// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { getSession } from "@/services/session";
import { useDriverStore } from "@/store/driverStore";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar"; // 🆕

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  const token   = useDriverStore((s) => s.token);
  const user    = useDriverStore((s) => s.user);
  const setUser  = useDriverStore((s) => s.setUser);
  const setToken = useDriverStore((s) => s.setToken);

  const isAuth = !!token && !!user;

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await getSession();
        if (session?.token && session?.user) {
          setToken(session.token);
          setUser(session.user);
        }
      } catch (e) {
        console.error("Bootstrap error:", e);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!isAuth && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuth && inAuthGroup) {
      router.replace("/(tabs)/home");
    }
  }, [loading, isAuth, segments]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" /> 
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B1220" }}>
          <ActivityIndicator size="large" color="#F4A623" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}