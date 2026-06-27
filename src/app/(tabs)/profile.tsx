import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDriverStore } from "@/store/driverStore";
import { useRouter } from "expo-router";
import { getDriverProfile } from "@/services/api"; 
import { removeSession } from "@/services/session";
import { socket } from "@/services/socket";

type MenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function Profile() {
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Fix 1: select both user and logout from the store
  const user = useDriverStore((s) => s.user);
  const logout = useDriverStore((s) => s.logout);

  // Fix 2: guard against null user before computing initials
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

 const handleLogout = () => {
  Alert.alert("Log out", "Are you sure you want to log out?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Log out",
      style: "destructive",
      onPress: async () => {
        await removeSession();   // clears SecureStore
        socket.disconnect();     // ends socket session
        logout();                // clears driverStore
        router.replace("/(auth)/login");
      },
    },
  ]);
};

  const accountItems: MenuItem[] = [
    {
      key: "info",
      icon: "person-outline",
      label: "Personal info",
      onPress: () => router.push("/(tabs)/profile/edit"),
    },
    {
      key: "phone",
      icon: "call-outline",
      label: user?.phone ?? "—",
      onPress: () => router.push("/(tabs)/profile/edit"),
    },
    {
      key: "notifications",
      icon: "notifications-outline",
      label: "Notifications",
      onPress: () => router.push("/(tabs)/profile/notifications"),
    },
    {
      key: "documents",
      icon: "documents-outline",
      label: "Documents",
       onPress: () => router.push(`/document/${user?.id}`),
      
    },
    {
      key: "vehicle",
      icon: "car-outline",
      label: "Vehicle",
       onPress: () => router.push(`/vehicleInfo`),
      
    },
  ];

  const supportItems: MenuItem[] = [
    {
      key: "help",
      icon: "help-circle-outline",
      label: "Help center",
      onPress: () => router.push("/(tabs)/profile/help"),
    },
    {
      key: "terms",
      icon: "document-text-outline",
      label: "Terms & privacy",
      onPress: () => router.push("/(tabs)/profile/terms"),
    },
  ];

  // Fix 3: getShipments is now imported; stats are wired to real data
  useEffect(() => {
    getDriverProfile()
      .then((shipments: Shipment[]) => {
        setStats({
          total: shipments.length,
          active: shipments.filter((s) =>
            ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(s.status)
          ).length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user?.name ?? "—"}</Text>
            <Text style={styles.userEmail}>{user?.email ?? "—"}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>Driver account</Text>
            </View>
          </View>
        </View>

        {/* Stats — Fix 4: wired to real stats state */}
        <View style={styles.statsRow}>
          <StatTile label="Shipments" value={String(stats.total)} />
          <View style={styles.statDivider} />
          <StatTile label="Active" value={String(stats.active)} />
          <View style={styles.statDivider} />
          <StatTile label="Rating" value="4.8" />
        </View>

        {/* Account section */}
        <MenuSection title="Account" items={accountItems} />

        {/* Support section */}
        <MenuSection title="Support" items={supportItems} />

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color={DANGER} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>LibCargo v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuSection({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuItem,
              index < items.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={19}
              color={MUTED}
              style={styles.menuIcon}
            />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={BORDER} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const NAVY   = "#0B1220";
const PANEL  = "#0F1929";
const FIELD  = "#1A2740";
const BORDER = "#2A3D5A";
const AMBER  = "#F4A623";
const WHITE  = "#F4F4F4";
const MUTED  = "#4A6080";
const SUBTLE = "#8A9BB5";
const DANGER = "#E24B4A";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    backgroundColor: PANEL,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  avatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: FIELD,
    borderWidth: 2,
    borderColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: AMBER, fontSize: 22, fontWeight: "500" },
  headerInfo: { flex: 1 },
  userName: { color: WHITE, fontSize: 18, fontWeight: "500", marginBottom: 2 },
  userEmail: { color: SUBTLE, fontSize: 13, marginBottom: 5 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1D9E75" },
  roleText: { color: SUBTLE, fontSize: 11, letterSpacing: 0.5 },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  statTile: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statValue: { color: AMBER, fontSize: 20, fontWeight: "500", marginBottom: 2 },
  statLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  statDivider: { width: 0.5, backgroundColor: "#1E2D45", marginVertical: 12 },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: "#1E2D45" },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, color: WHITE, fontSize: 14 },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#1A1015",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#3D1A1A",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutText: { color: DANGER, fontSize: 14, fontWeight: "500" },

  version: {
    color: BORDER,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
});