import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Shipment, ShipmentStatus } from "@/types/shipment";

export default function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const { id, pickupAddr, deliveryAddr, status, driver, price, createdAt, pickupCoord, deliveryCoord } = shipment;
  const badge = STATUS_MAP[status] ?? STATUS_MAP.PENDING;
  const driverName = driver?.user?.name ?? null;

  // Shorten long addresses for display
  const short = (addr: string) =>
    addr.length > 22 ? addr.substring(0, 22) + "…" : addr;

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const handlePress = () => {
    // Pass all route data to the tracking screen
    router.push({
      pathname: `../shipment/${id}`,
      params: {
        // Shipment basic info
        pickupAddr: shipment.pickupAddr,
        deliveryAddr: shipment.deliveryAddr,
        status: shipment.status,
        price: shipment.price,
        
        // Coordinates for routing (only if they exist)
        ...(pickupCoord && {
          pickupLat: pickupCoord.latitude,
          pickupLng: pickupCoord.longitude,
        }),
        ...(deliveryCoord && {
          deliveryLat: deliveryCoord.latitude,
          deliveryLng: deliveryCoord.longitude,
        }),
        
        // Driver info (only if exists)
        ...(driver && {
          driverId: driver.id,
          driverName: driver.user?.name,
          driverPhone: driver.phone,
          driverTruckType: driver.truckType,
        }),
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <Text style={styles.date}>{formattedDate}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <Text style={styles.routeLabel}>Pickup</Text>
          <Text style={[styles.routeCity, status === "DELIVERED" && styles.dimmed]}>
            {short(pickupAddr)}
          </Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={status === "DELIVERED" ? BORDER : AMBER}
        />
        <View style={[styles.routePoint, { alignItems: "flex-end" }]}>
          <Text style={styles.routeLabel}>Delivery</Text>
          <Text style={[styles.routeCity, status === "DELIVERED" && styles.dimmed]}>
            {short(deliveryAddr)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons
            name={driverName ? "car-outline" : "time-outline"}
            size={14}
            color={MUTED}
          />
          <Text style={styles.footerText}>
            {driverName ?? "Awaiting driver"}
          </Text>
        </View>
        <Text style={styles.price}>${price.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );
}

type BadgeConfig = { label: string; color: string; bg: string; border: string };

const STATUS_MAP: Record<ShipmentStatus, BadgeConfig> = {
  PENDING:    { label: "Pending",    color: "#F4A623", bg: "#1a1206", border: "#F4A623" },
  ASSIGNED:   { label: "Assigned",   color: "#378ADD", bg: "#0d1e2e", border: "#378ADD" },
  PICKED_UP:  { label: "Picked up",  color: "#9F77DD", bg: "#1a1530", border: "#9F77DD" },
  IN_TRANSIT: { label: "In transit", color: "#1D9E75", bg: "#0d2a1f", border: "#1D9E75" },
  DELIVERED:  { label: "Delivered",  color: "#4A6080", bg: "#0f1f2a", border: "#4A6080" },
  CANCELLED:  { label: "Cancelled",  color: "#E24B4A", bg: "#1a0d0d", border: "#E24B4A" },
};

const NAVY   = "#0B1220";
const PANEL  = "#0F1929";
const BORDER = "#2A3D5A";
const AMBER  = "#F4A623";
const WHITE  = "#F4F4F4";
const MUTED  = "#4A6080";
const SUBTLE = "#8A9BB5";

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  date: { color: MUTED, fontSize: 11 },
  badge: { borderWidth: 0.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "500" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  routePoint: { flex: 1 },
  routeLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  routeCity: { color: WHITE, fontSize: 13, fontWeight: "500" },
  dimmed: { color: SUBTLE },
  divider: { height: 0.5, backgroundColor: "#1E2D45", marginBottom: 12 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { color: SUBTLE, fontSize: 12 },
  price: { color: AMBER, fontSize: 13, fontWeight: "500" },
});