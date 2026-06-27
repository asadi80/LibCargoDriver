// app/shipment/delivered.tsx
import { router, useRouter } from "expo-router";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useCallback } from "react";
import { getDeliveredShipments } from "@/services/api";

const NAVY = "#0B1220";
const PANEL = "#0F1929";
const FIELD = "#1A2740";
const BORDER = "#2A3D5A";
const AMBER = "#F4A623";
const WHITE = "#F4F4F4";
const MUTED = "#4A6080";
const SUBTLE = "#8A9BB5";
const GREEN = "#1D9E75";

type VehicleType =
  | "MOTORCYCLE"
  | "SEDAN"
  | "SUV"
  | "VAN"
  | "PICKUP"
  | "BOX_TRUCK"
  | "SEMI_TRUCK";

const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: "Motorcycle",
  SEDAN: "Sedan",
  SUV: "SUV",
  VAN: "Van",
  PICKUP: "Pickup Truck",
  BOX_TRUCK: "Box Truck",
  SEMI_TRUCK: "Semi Truck",
};

type DeliveredShipment = {
  id: string;
  pickupAddr: string;
  deliveryAddr: string;
  price: number;
  distanceKm?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  description?: string | null;
  requiredVehicle?: VehicleType | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  proofPhotoUrl?: string | null;
  proofSignatureUrl?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
  } | null;
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const fmtDateTime = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};



// ── Card for a single delivered shipment ──────────────────────────────────────
function DeliveredCard({ item }: { item: DeliveredShipment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={NAVY} />
          </View>
          <View>
            <Text style={styles.cardId}>
              #{item.id.slice(-6).toUpperCase()}
            </Text>
            <Text style={styles.cardDate}>
              {fmtDate(item.deliveredAt ?? item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.routeBtn}
            onPress={() => router.push(`/shipment/${item.id}/`)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="map-outline" size={15} color={AMBER} />
          </TouchableOpacity>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={MUTED}
          />
        </View>
      </TouchableOpacity>

      {/* Route preview — always visible */}
      <View style={styles.routeRow}>
        <View style={styles.routeDots}>
          <View style={[styles.dot, { backgroundColor: GREEN }]} />
          <View style={styles.dotLine} />
          <View style={[styles.dot, { backgroundColor: MUTED }]} />
        </View>
        <View style={styles.routeAddrs}>
          <Text style={styles.addrValue} numberOfLines={1}>
            {item.pickupAddr}
          </Text>
          <Text style={styles.addrValue} numberOfLines={1}>
            {item.deliveryAddr}
          </Text>
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.expandedBody}>
          <View style={styles.divider} />

          {/* Customer */}
          {item.customer && (
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitial}>
                  {item.customer.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.customer.name}</Text>
                <Text style={styles.customerLabel}>Customer</Text>
              </View>
              {item.customer.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.customer!.phone}`)}
                >
                  <Ionicons name="call-outline" size={15} color={SUBTLE} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Meta grid */}
          <View style={styles.metaGrid}>
            
            {item.requiredVehicle && (
              <View style={styles.metaTile}>
                <Text style={styles.metaValue}>
                  {VEHICLE_LABELS[item.requiredVehicle] ?? item.requiredVehicle}
                </Text>
                <Text style={styles.metaLabel}>Vehicle</Text>
              </View>
            )}
          </View>

          {/* Timeline — picked up & delivered */}
          <View style={styles.timelineGrid}>
            <View style={styles.timelineTile}>
              <View style={styles.timelineHeader}>
                <Ionicons name="cube-outline" size={12} color={SUBTLE} />
                <Text style={styles.timelineLabel}>Picked Up</Text>
              </View>
              <Text style={styles.timelineValue}>
                {fmtDateTime(item.pickedUpAt)}
              </Text>
            </View>
            <View style={styles.timelineTile}>
              <View style={styles.timelineHeader}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={12}
                  color={GREEN}
                />
                <Text style={[styles.timelineLabel, { color: GREEN }]}>
                  Delivered
                </Text>
              </View>
              <Text style={styles.timelineValue}>
                {fmtDateTime(item.deliveredAt)}
              </Text>
            </View>
          </View>

          {item.description && (
            <View style={styles.descBox}>
              <Text style={styles.descLabel}>Description</Text>
              <Text style={styles.descValue}>{item.description}</Text>
            </View>
          )}

          {/* Proof of delivery */}
          {(item.proofPhotoUrl || item.proofSignatureUrl) && (
            <View>
              <Text style={styles.podLabel}>Proof of Delivery</Text>
              <View style={styles.podRow}>
                {item.proofPhotoUrl && (
                  <TouchableOpacity
                    style={styles.podThumb}
                    onPress={() => Linking.openURL(item.proofPhotoUrl!)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.proofPhotoUrl }}
                      style={styles.podImage}
                    />
                    <View style={styles.podOverlay}>
                      <Ionicons name="image-outline" size={11} color={WHITE} />
                      <Text style={styles.podOverlayText}>Photo</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {item.proofSignatureUrl && (
                  <TouchableOpacity
                    style={styles.podThumb}
                    onPress={() => Linking.openURL(item.proofSignatureUrl!)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.proofSignatureUrl }}
                      style={[styles.podImage, { backgroundColor: WHITE }]}
                      resizeMode="contain"
                    />
                    <View style={styles.podOverlay}>
                      <Ionicons name="create-outline" size={11} color={WHITE} />
                      <Text style={styles.podOverlayText}>Signature</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DeliveredShipments() {
  const router = useRouter();

  const [shipments, setShipments] = useState<DeliveredShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDelivered = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getDeliveredShipments();
      if (res.success) {
        setShipments(res.shipments ?? []);
      } else {
        setError(res.message ?? "Could not load delivered shipments.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Could not load delivered shipments.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDelivered();
  }, [fetchDelivered]);

  const totalEarnings = shipments.reduce((sum, s) => sum + (s.price ?? 0), 0);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Delivered Shipments</Text>
          <Text style={styles.headerSub}>{shipments.length} completed</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary tile */}
      {!loading && shipments.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{shipments.length}</Text>
            <Text style={styles.summaryLabel}>Deliveries</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTile}>
            <Text style={[styles.summaryValue, { color: AMBER }]}>
              ${totalEarnings.toFixed(2)}
            </Text>
            <Text style={styles.summaryLabel}>Total Earned</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AMBER} size="large" />
          <Text style={styles.loadingText}>Loading delivered shipments…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={36} color={MUTED} />
          <Text style={styles.loadingText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchDelivered()}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : shipments.length === 0 ? (
        <View style={styles.centerFill}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={44}
            color={MUTED}
          />
          <Text style={styles.loadingText}>No delivered shipments yet</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDelivered(true)}
              tintColor={AMBER}
            />
          }
        >
          {shipments.map((item) => (
            <DeliveredCard key={item.id} item={item} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: WHITE, fontSize: 16, fontWeight: "500" },
  headerSub: { color: SUBTLE, fontSize: 11, marginTop: 1 },

  summaryBar: {
    flexDirection: "row",
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
    paddingVertical: 14,
  },
  summaryTile: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 0.5, backgroundColor: "#1E2D45" },
  summaryValue: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  loadingText: { color: SUBTLE, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: { color: NAVY, fontSize: 13, fontWeight: "600" },

  list: { padding: 16, gap: 12 },

  card: {
    backgroundColor: PANEL,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  cardId: { color: MUTED, fontSize: 10, fontFamily: "monospace" },
  cardDate: { color: WHITE, fontSize: 13, fontWeight: "500", marginTop: 1 },
  cardPrice: { color: AMBER, fontSize: 15, fontWeight: "600" },

  routeRow: { flexDirection: "row", gap: 10 },
  routeDots: { alignItems: "center", paddingTop: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotLine: {
    width: 1,
    flex: 1,
    backgroundColor: BORDER,
    minHeight: 16,
    marginVertical: 2,
  },
  routeAddrs: { flex: 1, gap: 8 },
  addrValue: { color: SUBTLE, fontSize: 12 },

  divider: { height: 0.5, backgroundColor: "#1E2D45", marginVertical: 12 },
  expandedBody: { gap: 12 },

  customerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  customerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInitial: { color: AMBER, fontSize: 13, fontWeight: "600" },
  customerName: { color: WHITE, fontSize: 13, fontWeight: "500" },
  customerLabel: { color: MUTED, fontSize: 10, marginTop: 1 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  metaGrid: { flexDirection: "row", gap: 8 },
  metaTile: {
    flex: 1,
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    paddingVertical: 9,
    alignItems: "center",
  },
  metaValue: {
    color: WHITE,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "center",
  },
  metaLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  descBox: {
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 10,
  },
  descLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  descValue: { color: WHITE, fontSize: 12, lineHeight: 17 },

  podLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  podRow: { flexDirection: "row", gap: 8 },
  podThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  podImage: { width: "100%", height: "100%" },
  podOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11,18,32,0.85)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 3,
  },
  podOverlayText: { color: WHITE, fontSize: 8, fontWeight: "500" },
  timelineGrid: {
    flexDirection: "row",
    gap: 8,
  },
  timelineTile: {
    flex: 1,
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 10,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  timelineLabel: {
    color: SUBTLE,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  timelineValue: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "500",
  },
  routeBtn: {
  width: 40,
  height: 30,
  borderRadius: 8,
  backgroundColor: FIELD,
  borderWidth: 0.5,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
},
});
