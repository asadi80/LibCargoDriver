import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY   = "#0B1220";
const PANEL  = "#0F1929";
const AMBER  = "#F4A623";
const MUTED  = "#4A6080";
const BORDER = "#1E2D45";

type IoniconName = keyof typeof Ionicons.glyphMap;

const SCREENS: {
  name: string;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
}[] = [
  {
    name: "home",
    label: "Home",
    icon: "home-outline",
    iconActive: "home",
  },
  {
    name: "shipments",
    label: "Shipments",
    icon: "cube-outline",
    iconActive: "cube",
  },
  {
    name: "profile",
    label: "Profile",
    icon: "person-outline",
    iconActive: "person",
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PANEL,
          borderTopWidth: 0.5,
          borderTopColor: BORDER,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 0,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            },
          }),
        },
        tabBarActiveTintColor: AMBER,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      {SCREENS.map(({ name, label, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? iconActive : icon}
                size={size ?? 22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}