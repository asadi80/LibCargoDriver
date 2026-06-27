import { useRouter } from "expo-router";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  PanResponder,
  Animated,
  ScrollView,
} from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { getNearbyShipments } from "@/services/api";
import type { Shipment, ShipmentStatus } from "@/types/shipment";

// Radius slider config
const MIN_RADIUS = 5;
const MAX_RADIUS = 100;
const SLIDER_WIDTH = 280; // approximate track width

const FILTERS: { label: string; value: ShipmentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "AVAILABLE", value: "AVAILABLE" },
  { label: "Pending", value: "PENDING" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In transit", value: "IN_TRANSIT" },
];

export default function NearbyShipments() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [data, setData] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShipmentStatus | "ALL">("ALL");
  const [radius, setRadius] = useState(5);
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ── Fetch nearby shipments ──────────────────────────────────────────────────
  const load = useCallback(
    async (
      loc: { lat: number; lng: number } | null = driverLocation,
      r: number = radius,
      isRefresh = false,
    ) => {
      if (!loc) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await getNearbyShipments(loc.lat, loc.lng, r);
        // API returns { success, shipments, count }
        setData(res.shipments ?? []);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load nearby shipments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [driverLocation, radius],
  );

  // ── Get GPS then fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission is required to find nearby shipments.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      console.log("loc", loc);

      const driverLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      console.log("friver locationc", driverLoc);
      setDriverLocation(driverLoc);
      load(driverLoc, radius);
    })();
  }, []);

  // ── Re-fetch when radius changes (debounced via slider release) ─────────────
  const onRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    load(driverLocation, newRadius);
  };

  const filtered =
    filter === "ALL" ? data : data.filter((s) => s.status === filter);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Driver</Text>
          <Text style={styles.title}>Nearby Shipments</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{data.length} found</Text>
        </View>
      </View>

      {/* ── Radius slider ── */}
      <View style={styles.radiusRow}>
        <View style={styles.radiusLabelRow}>
          <View style={styles.radiusLabelLeft}>
            <Ionicons name="locate-outline" size={14} color={MUTED} />
            <Text style={styles.radiusLabel}>Search Radius</Text>
          </View>
          <View style={styles.radiusBadge}>
            <Text style={styles.radiusBadgeText}>{radius} km</Text>
          </View>
        </View>
        <RadiusSlider
          value={radius}
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          onChange={onRadiusChange}
        />
        <View style={styles.radiusRange}>
          <Text style={styles.radiusRangeText}>{MIN_RADIUS} km</Text>
          <Text style={styles.radiusRangeText}>{MAX_RADIUS} km</Text>
        </View>
      </View>

      {/* ── Filter pills ── */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.pill, filter === f.value && styles.pillActive]}
              onPress={() => setFilter(f.value)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.pillText,
                  filter === f.value && styles.pillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ── */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={AMBER} size="large" />
          <Text style={styles.loadingText}>Finding shipments nearby…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={MUTED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            filtered.length === 0 && styles.listEmpty, // ✅ only grow when empty
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(driverLocation, radius, true)}
              tintColor={AMBER}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={32} color={MUTED} />
              <Text style={styles.emptyTitle}>No shipments found</Text>
              <Text style={styles.emptyText}>
                Try increasing the search radius
              </Text>
            </View>
          }
          renderItem={({ item }) => <NearbyShipmentCard shipment={item} />}
        />
      )}
    </View>
  );
}

// ── Radius Slider ─────────────────────────────────────────────────────────────
function RadiusSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(SLIDER_WIDTH);
  const thumbX = useRef(
    new Animated.Value(((value - min) / (max - min)) * SLIDER_WIDTH),
  ).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const raw = Math.max(0, Math.min(trackWidth, gs.moveX - 20)); // 20 = left padding approx
        const ratio = raw / trackWidth;
        const newVal = Math.round(min + ratio * (max - min));
        thumbX.setValue(raw);
        onChange(newVal);
      },
    }),
  ).current;

  const fillWidth = thumbX.interpolate({
    inputRange: [0, trackWidth],
    outputRange: [0, trackWidth],
    extrapolate: "clamp",
  });

  return (
    <View
      ref={trackRef}
      style={styles.sliderTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.sliderFill, { width: fillWidth }]} />
      <Animated.View
        style={[styles.sliderThumb, { transform: [{ translateX: thumbX }] }]}
      />
    </View>
  );
}

// ── Nearby Shipment Card ──────────────────────────────────────────────────────
function NearbyShipmentCard({ shipment }: { shipment: Shipment }) {
  const router = useRouter();
  const { id, pickupAddr, deliveryAddr, status, price, distanceKm } =
    shipment as any;

  const STATUS_MAP: Record<
    string,
    { label: string; color: string; bg: string; border: string }
  > = {
    AVAILABLE: {
      label: "Available",
      color: AMBER,
      bg: "#1a1206",
      border: AMBER,
    },

    PENDING: { label: "Pending", color: AMBER, bg: "#1a1206", border: AMBER },
    ASSIGNED: {
      label: "Assigned",
      color: "#378ADD",
      bg: "#0d1e2e",
      border: "#378ADD",
    },
    PICKED_UP: {
      label: "Picked up",
      color: "#9F77DD",
      bg: "#1a1530",
      border: "#9F77DD",
    },
    IN_TRANSIT: {
      label: "In transit",
      color: GREEN,
      bg: "#0d2a1f",
      border: GREEN,
    },
    DELIVERED: {
      label: "Delivered",
      color: MUTED,
      bg: "#0f1f2a",
      border: MUTED,
    },
  };

  const badge = STATUS_MAP[status] ?? STATUS_MAP.PENDING;

  const short = (addr: string) =>
    addr?.length > 28 ? addr.substring(0, 28) + "…" : (addr ?? "—");

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        router.push({
          pathname: "../shipment/[id]",
          params: { id },
        })
      }
    >
      {/* Top row */}
      <View style={styles.cardTopRow}>
        <Text style={styles.cardId}>#{id.slice(-6).toUpperCase()}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={[styles.dot, { backgroundColor: GREEN }]} />
          <View style={styles.dotLine} />
          <View style={[styles.dot, { backgroundColor: RED }]} />
        </View>
        <View style={styles.routeAddrs}>
          <View>
            <Text style={styles.addrLabel}>Pickup</Text>
            <Text style={styles.addrValue}>{short(pickupAddr)}</Text>
          </View>
          <View>
            <Text style={styles.addrLabel}>Delivery</Text>
            <Text style={styles.addrValue}>{short(deliveryAddr)}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        {distanceKm != null ? (
          <View style={styles.distanceBadge}>
            <Ionicons name="locate-outline" size={12} color={MUTED} />
            <Text style={styles.distanceText}>
              {distanceKm.toFixed(1)} km away
            </Text>
          </View>
        ) : (
          <View />
        )}
        {price != null && (
          <Text style={styles.priceText}>${price.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const NAVY = "#0B1220";
const PANEL = "#0F1929";
const FIELD = "#1A2740";
const BORDER = "#2A3D5A";
const AMBER = "#F4A623";
const WHITE = "#F4F4F4";
const MUTED = "#4A6080";
const SUBTLE = "#8A9BB5";
const GREEN = "#1D9E75";
const RED = "#E24B4A";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    backgroundColor: PANEL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  eyebrow: {
    color: SUBTLE,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { color: WHITE, fontSize: 22, fontWeight: "500" },
  countBadge: {
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: { color: SUBTLE, fontSize: 12 },

  // Radius
  radiusRow: {
    backgroundColor: PANEL,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  radiusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  radiusLabelLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  radiusLabel: {
    color: SUBTLE,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  radiusBadge: {
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: AMBER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  filterContainer: {
  height: 56,  // ✅ fixed height prevents expansion
  backgroundColor: NAVY,
  borderBottomWidth: 0.5,
  borderBottomColor: "#1E2D45",
},
  radiusBadgeText: { color: AMBER, fontSize: 12, fontWeight: "600" },
  sliderTrack: {
    height: 4,
    backgroundColor: FIELD,
    borderRadius: 2,
    position: "relative",
    justifyContent: "center",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 4,
    backgroundColor: AMBER,
    borderRadius: 2,
  },
  listEmpty: {
    flexGrow: 0,
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AMBER,
    borderWidth: 2.5,
    borderColor: PANEL,
    marginLeft: -9,
    shadowColor: AMBER,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  radiusRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  radiusRangeText: { color: BORDER, fontSize: 10 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },

  // Filters
  filterRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  pill: {
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: AMBER, borderColor: AMBER },
  pillText: { color: SUBTLE, fontSize: 12 },
  pillTextActive: { color: NAVY, fontWeight: "600" },

  list: { padding: 16 },

  // States
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  loadingText: { color: SUBTLE, fontSize: 13 },
  errorText: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: { color: SUBTLE, fontSize: 13 },
  emptyTitle: { color: SUBTLE, fontSize: 14, fontWeight: "500" },
  emptyText: { color: MUTED, fontSize: 12 },

  // Card
  card: {
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardId: { color: MUTED, fontSize: 11, fontFamily: "monospace" },
  badge: {
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "500" },

  routeRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  routeDots: { alignItems: "center", paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: {
    width: 1,
    flex: 1,
    backgroundColor: BORDER,
    minHeight: 16,
    marginVertical: 2,
  },
  routeAddrs: { flex: 1, gap: 8 },
  addrLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  addrValue: { color: WHITE, fontSize: 13, fontWeight: "500" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: { color: SUBTLE, fontSize: 11 },
  priceText: { color: AMBER, fontSize: 14, fontWeight: "600" },
});
