// app/shipment/[id].tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import api from "@/services/api";
import { acceptShipment } from "@/services/api";
import { Animated } from "react-native";

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

const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? "";

type LatLng = { lat: number; lng: number };
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

type ShipmentDetail = {
  id: string;
  pickupAddr: string;
  deliveryAddr: string;
  price: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm?: number | null;
  description?: string | null;
  requiredVehicle?: VehicleType | null;
  specialInstructions?: string | null;
  status: string;

  proofPhotoUrl?: string | null;
  proofSignatureUrl?: string | null;
  deliveredAt?: string | null;

  requestedPickupTime?: string | null;
  requestedDropoffTime?: string | null;

  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  inTransitAt?: string | null;

  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;

  driverId?: string | null;
  driver?: {
    user: { name: string; phone: string };
    truckType?: string;
    currentLat?: number;
    currentLng?: number;
  } | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  AVAILABLE: {
    label: "Available",
    color: "#1D9E75",
    bg: "#0d2a1f",
    border: "#1D9E75",
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
  DELIVERED: { label: "Delivered", color: MUTED, bg: "#0f1f2a", border: MUTED },
  CANCELLED: { label: "Cancelled", color: RED, bg: "#1a0d0d", border: RED },
};

const ACCEPTABLE_STATUSES = ["AVAILABLE", "PENDING"];

const getStatusMessage = (status: string): string => {
  switch (status) {
    case "AVAILABLE":
      return "This shipment is available and waiting for a driver";
    case "PENDING":
      return "Waiting to be assigned to a driver";
    case "ASSIGNED":
      return "A driver has been assigned and is preparing for pickup";
    case "PICKED_UP":
      return "Your shipment has been picked up and is on the way";
    case "IN_TRANSIT":
      return "Your shipment is in transit to the delivery location";
    case "DELIVERED":
      return "Your shipment has been delivered successfully";
    case "CANCELLED":
      return "This shipment has been cancelled";
    default:
      return "Status information unavailable";
  }
};
const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  AVAILABLE: "checkmark-circle-outline",
  PENDING: "time-outline",
  ASSIGNED: "person-outline",
  PICKED_UP: "cube-outline",
  IN_TRANSIT: "car-outline",
  DELIVERED: "checkmark-circle-outline",
  CANCELLED: "close-circle-outline",
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

async function geocode(address: string): Promise<LatLng | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "LibCargoApp/1.0" },
    });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function ShipmentTrack() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const webViewRef = useRef<WebView>(null);
  const shipmentId = params.id as string;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [pickup, setPickup] = useState<LatLng | null>(null);
  const [delivery, setDelivery] = useState<LatLng | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    km: string;
    duration: string;
  } | null>(null);
  const [geocoding, setGeocoding] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);
  const cardHeight = useRef(new Animated.Value(0)).current;
  const liveLocation = useLiveTracking(shipmentId);

  const toggleCard = () => {
    const next = !cardExpanded;
    setCardExpanded(next);
    Animated.spring(cardHeight, {
      toValue: next ? 1 : 0,
      useNativeDriver: false, // height/maxHeight isn't supported by native driver
      bounciness: 4,
    }).start();
  };

  const animatedMaxHeight = cardHeight.interpolate({
    inputRange: [0, 1],
    outputRange: ["40%", "78%"], // collapsed vs expanded
  });

  // ── 1. Fetch shipment from API ──────────────────────────────────────────────
  const fetchShipment = () => {
    api
      .get(`/shipments/${shipmentId}/interests`)
      .then((res) => {
        if (res.data.success) setShipment(res.data.shipment);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchShipment();
  }, [shipmentId]);

  // ── 2. Geocode addresses once shipment is loaded ────────────────────────────
  useEffect(() => {
    if (!shipment) return;
    setGeocoding(true);

    const pickupCoords: LatLng | null =
      shipment.pickupLat && shipment.pickupLng
        ? { lat: shipment.pickupLat, lng: shipment.pickupLng }
        : null;

    const dropoffCoords: LatLng | null =
      shipment.dropoffLat && shipment.dropoffLng
        ? { lat: shipment.dropoffLat, lng: shipment.dropoffLng }
        : null;

    if (pickupCoords && dropoffCoords) {
      setPickup(pickupCoords);
      setDelivery(dropoffCoords);
      setGeocoding(false);
      return;
    }

    Promise.all([
      pickupCoords
        ? Promise.resolve(pickupCoords)
        : geocode(shipment.pickupAddr),
      dropoffCoords
        ? Promise.resolve(dropoffCoords)
        : geocode(shipment.deliveryAddr),
    ]).then(([p, d]) => {
      setPickup(p);
      setDelivery(d);
      setGeocoding(false);
    });
  }, [shipment]);

  // ── 3. Route info ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pickup || !delivery) return;

    const p = { lat: Number(pickup.lat), lng: Number(pickup.lng) };
    const d = { lat: Number(delivery.lat), lng: Number(delivery.lng) };

    if (!ORS_API_KEY) {
      const R = 6371;
      const dLat = ((d.lat - p.lat) * Math.PI) / 180;
      const dLng = ((d.lng - p.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((p.lat * Math.PI) / 180) *
          Math.cos((d.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const km = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(
        1,
      );
      setRouteInfo({ km, duration: "—" });
      return;
    }

    fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?start=${p.lng},${p.lat}&end=${d.lng},${d.lat}`,
      {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
      },
    )
      .then((r) => r.json())
      .then((data) => {
        const s = data.features[0].properties.summary;
        const km = (s.distance / 1000).toFixed(1);
        const mins = Math.round(s.duration / 60);
        setRouteInfo({
          km,
          duration:
            mins >= 60
              ? `${Math.floor(mins / 60)}h ${mins % 60}m`
              : `${mins} min`,
        });
      })
      .catch(() => setRouteInfo({ km: "—", duration: "—" }));
  }, [pickup, delivery]);

  // ── 4. User GPS ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    })();
  }, []);

  // ── 5. Inject live truck position ───────────────────────────────────────────
  useEffect(() => {
    if (!liveLocation || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      if (window.shipmentMarker) {
        window.shipmentMarker.setLatLng([${liveLocation.lat}, ${liveLocation.lng}]);
        window.map.panTo([${liveLocation.lat}, ${liveLocation.lng}]);
      }
      true;
    `);
  }, [liveLocation]);

  // ── Accept handler ───────────────────────────────────────────────────────────
  const handleAccept = () => {
    Alert.alert(
      "Accept Shipment",
      "Do you want to accept this shipment? You'll be assigned as the driver.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setAccepting(true);
            try {
              const res = await acceptShipment(shipmentId);
              if (res.success) {
                Alert.alert("Accepted", "You've accepted this shipment.");
                fetchShipment(); // refresh shipment to show ASSIGNED + driver info
              } else {
                Alert.alert(
                  "Error",
                  res.message ?? "Could not accept shipment.",
                );
              }
            } catch (err: any) {
              const msg =
                err?.response?.data?.message ?? "Could not accept shipment.";
              Alert.alert("Cannot Accept", msg);
            } finally {
              setAccepting(false);
            }
          },
        },
      ],
    );
  };

  const status = shipment?.status ?? "PENDING";
  const isPending = status === "PENDING";
  const isCancelled = status === "CANCELLED";
  const isDelivered = status === "DELIVERED";
  const badge = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const driverName = shipment?.driver?.user?.name ?? "";
  const driverPhone = shipment?.driver?.user?.phone ?? "";
  const driverType = shipment?.driver?.truckType ?? "Truck";

  const canAccept =
    !!shipment && ACCEPTABLE_STATUSES.includes(status) && !shipment.driverId;

  const hasExtraDetails = !!(
    shipment?.description ||
    shipment?.requiredVehicle ||
    shipment?.specialInstructions
  );

  const hasScheduleInfo = !!(
    shipment?.requestedPickupTime != null ||
    shipment?.requestedDropoffTime != null
  );

  const shipmentLocation =
    liveLocation ||
    (shipment?.driver?.currentLat && shipment?.driver?.currentLng
      ? { lat: shipment.driver.currentLat, lng: shipment.driver.currentLng }
      : null);

  const centerLat =
    pickup && delivery
      ? (pickup.lat + delivery.lat) / 2
      : (pickup?.lat ?? delivery?.lat ?? 37.78825);
  const centerLng =
    pickup && delivery
      ? (pickup.lng + delivery.lng) / 2
      : (pickup?.lng ?? delivery?.lng ?? -122.4324);

  const hasCoords = !!(pickup && delivery);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0   rgba(244,166,35,0.6); }
      70%  { box-shadow: 0 0 0 12px rgba(244,166,35,0); }
      100% { box-shadow: 0 0 0 0   rgba(244,166,35,0); }
    }
    .leaflet-control-attribution { font-size:9px; opacity:0.4; }
    .addr-label {
      background: rgba(255,255,255,0.96);
      border: 0.5px solid #ccc;
      border-radius: 8px;
      padding: 5px 10px;
      color: #1C1A16;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .addr-label.pickup   { border-left: 3px solid #1D9E75; }
    .addr-label.delivery { border-left: 3px solid #E24B4A; }
    .addr-label.pending  { border-left: 3px solid #F4A623; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  window.map = L.map('map', { zoomControl:false })
    .setView([${centerLat}, ${centerLng}], 11);

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { maxZoom:19, attribution:'© OpenStreetMap © CartoDB' }
  ).addTo(window.map);

  L.control.zoom({ position:'bottomright' }).addTo(window.map);

  ${
    pickup
      ? `
  L.marker([${pickup.lat}, ${pickup.lng}], {
    icon: L.divIcon({
      className: '',
      html: \`<div style="width:34px;height:34px;border-radius:50%;
        background:#1D9E75;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
        display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>\`,
      iconSize:[34,34], iconAnchor:[17,34],
    })
  }).addTo(window.map)
  .bindTooltip(
    '<div class="addr-label pickup">${(shipment?.pickupAddr ?? "").replace(/'/g, "\\'")}</div>',
    { permanent:true, direction:'top', offset:[0,-10], opacity:1, className:'' }
  ).openTooltip();
  `
      : ""
  }

  ${
    delivery
      ? `
  L.marker([${delivery.lat}, ${delivery.lng}], {
    icon: L.divIcon({
      className: '',
      html: \`<div style="width:34px;height:34px;border-radius:50%;
        background:${isPending ? "#F4A623" : "#E24B4A"};
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
        display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
        </svg>
      </div>\`,
      iconSize:[34,34], iconAnchor:[17,34],
    })
  }).addTo(window.map)
  .bindTooltip(
    '<div class="addr-label ${isPending ? "pending" : "delivery"}">${(shipment?.deliveryAddr ?? "").replace(/'/g, "\\'")}</div>',
    { permanent:true, direction:'top', offset:[0,-10], opacity:1, className:'' }
  ).openTooltip();
  `
      : ""
  }

  ${
    shipmentLocation && !isPending
      ? `
  window.shipmentMarker = L.marker(
    [${shipmentLocation.lat}, ${shipmentLocation.lng}],
    { icon: L.divIcon({
        className: '',
        html: \`<div style="width:40px;height:40px;border-radius:20px;
          background:#0F1929;border:2.5px solid #F4A623;
          display:flex;align-items:center;justify-content:center;
          animation:pulse 1.5s infinite;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#F4A623">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
          </svg>
        </div>\`,
        iconSize:[40,40], iconAnchor:[20,20],
    })
  }).addTo(window.map);
  `
      : `window.shipmentMarker = null;`
  }

  ${
    userLocation
      ? `
  L.marker([${userLocation.lat}, ${userLocation.lng}], {
    icon: L.divIcon({
      className: '',
      html: \`<div style="width:14px;height:14px;border-radius:50%;
        background:#378ADD;border:2px solid white;
        box-shadow:0 0 0 5px rgba(55,138,221,0.2);">
      </div>\`,
      iconSize:[14,14], iconAnchor:[7,7],
    })
  }).addTo(window.map).bindTooltip('You', { direction:'top' });
  `
      : ""
  }

  ${
    hasCoords
      ? ORS_API_KEY
        ? `
  fetch(
  'https://api.openrouteservice.org/v2/directions/driving-car' +
  '?start=${pickup!.lng},${pickup!.lat}' +
  '&end=${delivery!.lng},${delivery!.lat}',
  { headers: { Authorization: '${ORS_API_KEY}' } }
)
  .then(r => r.json())
  .then(data => {
    var coords  = data.features[0].geometry.coordinates;
    var latlngs = coords.map(function(c){ return [c[1], c[0]]; });

    L.polyline(latlngs, { color:'#000', weight:8, opacity:0.08 })
      .addTo(window.map).bringToBack();

    L.polyline(latlngs, {
      color: '#F4A623',
      weight: 4,
      opacity: ${isPending ? 0.65 : 0.92},
      dashArray: ${isPending ? '"10,8"' : "null"},
    }).addTo(window.map);

    window.map.fitBounds(
      L.polyline(latlngs).getBounds(),
      { paddingTopLeft:[20,108], paddingBottomRight:[20,280] }
    );
  })
  .catch(function() {
    var line = L.polyline(
      [[${pickup!.lat},${pickup!.lng}],[${delivery!.lat},${delivery!.lng}]],
      { color:'#F4A623', weight:3, opacity:0.55, dashArray:'10,8' }
    ).addTo(window.map);
    window.map.fitBounds(line.getBounds(), { paddingTopLeft:[20,108], paddingBottomRight:[20,280] });
  });
  `
        : `
  var line = L.polyline(
    [[${pickup!.lat},${pickup!.lng}],[${delivery!.lat},${delivery!.lng}]],
    { color:'#F4A623', weight:3, opacity:0.55, dashArray:'10,8' }
  ).addTo(window.map);
  window.map.fitBounds(line.getBounds(), { paddingTopLeft:[20,108], paddingBottomRight:[20,280] });
  `
      : ""
  }
</script>
</body>
</html>`;

  if (!shipment || geocoding) {
    return (
      <View style={styles.loadingRoot}>
        <View style={styles.loadingHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color={WHITE} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Shipment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={AMBER} size="large" />
          <Text style={styles.loadingText}>
            {!shipment ? "Loading shipment…" : "Locating addresses…"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        onError={(e) => console.error("Map error:", e.nativeEvent)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("../shipments")}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Track Shipment</Text>
          <Text style={styles.headerSub}>
            #{shipmentId.slice(-6).toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[styles.statusText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Distance pill */}
      {routeInfo && (
        <View style={styles.distancePill}>
          <Ionicons name="navigate-outline" size={13} color={AMBER} />
          <Text style={styles.distanceText}>
            {routeInfo.km} km · {routeInfo.duration}
            {isPending ? "  (estimated)" : ""}
          </Text>
        </View>
      )}

      {/* Bottom card */}
      <Animated.View style={[styles.card, { maxHeight: animatedMaxHeight }]}>
        <TouchableOpacity onPress={toggleCard} activeOpacity={0.7}>
          <View style={styles.handle} />
        </TouchableOpacity>
       

        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Ionicons
            name={STATUS_ICON[status] ?? "ellipse-outline"}
            size={18}
            color={badge.color}
          />
          <View style={styles.statusBannerText}>
            <Text style={[styles.statusBannerLabel, { color: badge.color }]}>
              {badge.label}
            </Text>
            <Text style={styles.statusBannerMsg}>
              {getStatusMessage(status)}
            </Text>
          </View>
        </View>

        {/* Cancellation info */}
        {isCancelled &&
          (shipment.cancellationReason || shipment.cancelledAt) && (
            <View style={styles.cancelBanner}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={RED}
              />
              <View style={{ flex: 1 }}>
                {shipment.cancellationReason && (
                  <Text style={styles.cancelText}>
                    {shipment.cancellationReason}
                  </Text>
                )}
                {shipment.cancelledAt && (
                  <Text style={styles.cancelMeta}>
                    Cancelled {fmtDateTime(shipment.cancelledAt)}
                  </Text>
                )}
              </View>
            </View>
          )}

        <View style={styles.divider} />

        {/* Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeDots}>
            <View style={[styles.dot, { backgroundColor: GREEN }]} />
            <View style={styles.dotLine} />
            <View
              style={[styles.dot, { backgroundColor: isPending ? AMBER : RED }]}
            />
          </View>
          <View style={styles.routeAddrs}>
            <View>
              <Text style={styles.addrLabel}>Pickup</Text>
              <Text style={styles.addrValue} numberOfLines={1}>
                {shipment.pickupAddr || "—"}
              </Text>
              {shipment.requestedPickupTime != null && (
                <Text style={styles.addrMeta}>
                  Requested {fmtDateTime(shipment.requestedPickupTime)}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.addrLabel}>Delivery</Text>
              <Text style={styles.addrValue} numberOfLines={1}>
                {shipment.deliveryAddr || "—"}
              </Text>
              {shipment.requestedDropoffTime != null && (
                <Text style={styles.addrMeta}>
                  Requested {fmtDateTime(shipment.requestedDropoffTime)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Driver or awaiting */}
        {driverName ? (
          <>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitial}>
                  {driverName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driverName}</Text>
                <Text style={styles.driverType}>{driverType}</Text>
              </View>
              {driverPhone ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => Linking.openURL(`tel:${driverPhone}`)}
                >
                  <Ionicons name="call-outline" size={17} color={SUBTLE} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="chatbubble-outline" size={17} color={SUBTLE} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
          </>
        ) : (
          <>
            <View style={styles.awaitingRow}>
              <Ionicons name="time-outline" size={16} color={MUTED} />
              <Text style={styles.awaitingText}>
                Awaiting driver assignment
              </Text>
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Shipment details toggle */}
        {(hasExtraDetails || hasScheduleInfo) && (
          <>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails((v) => !v)}
              activeOpacity={0.75}
            >
              <View style={styles.detailsToggleLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={SUBTLE}
                />
                <Text style={styles.detailsToggleText}>Shipment Details</Text>
              </View>
              <Ionicons
                name={showDetails ? "chevron-up" : "chevron-down"}
                size={15}
                color={MUTED}
              />
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsBody}>
                {shipment.description && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>
                      {shipment.description}
                    </Text>
                  </View>
                )}
                {shipment.requiredVehicle && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Required vehicle</Text>
                    <View style={styles.vehicleTag}>
                      <Ionicons name="car-outline" size={12} color={AMBER} />
                      <Text style={styles.vehicleTagText}>
                        {VEHICLE_LABELS[shipment.requiredVehicle] ??
                          shipment.requiredVehicle}
                      </Text>
                    </View>
                  </View>
                )}
                {shipment.specialInstructions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Special instructions</Text>
                    <Text style={styles.detailValue}>
                      {shipment.specialInstructions}
                    </Text>
                  </View>
                )}
                {shipment.requestedPickupTime != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      Requested pickup time
                    </Text>
                    <View style={styles.scheduleTag}>
                      <Ionicons name="time-outline" size={12} color={GREEN} />
                      <Text style={[styles.vehicleTagText, { color: GREEN }]}>
                        {fmtDateTime(shipment.requestedPickupTime)}
                      </Text>
                    </View>
                  </View>
                )}
                {shipment.requestedDropoffTime != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      Requested delivery time
                    </Text>
                    <View style={styles.scheduleTag}>
                      <Ionicons name="time-outline" size={12} color={RED} />
                      <Text style={[styles.vehicleTagText, { color: RED }]}>
                        {fmtDateTime(shipment.requestedDropoffTime)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            <View style={styles.divider} />
          </>
        )}

        {/* Proof of delivery */}
        {isDelivered &&
          (shipment.proofPhotoUrl || shipment.proofSignatureUrl) && (
            <>
              <Text style={styles.podLabel}>Proof of Delivery</Text>
              <View style={styles.podRow}>
                {shipment.proofPhotoUrl && (
                  <TouchableOpacity
                    style={styles.podThumb}
                    onPress={() => Linking.openURL(shipment.proofPhotoUrl!)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: shipment.proofPhotoUrl }}
                      style={styles.podImage}
                    />
                    <View style={styles.podOverlay}>
                      <Ionicons name="image-outline" size={12} color={WHITE} />
                      <Text style={styles.podOverlayText}>Photo</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {shipment.proofSignatureUrl && (
                  <TouchableOpacity
                    style={styles.podThumb}
                    onPress={() => Linking.openURL(shipment.proofSignatureUrl!)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: shipment.proofSignatureUrl }}
                      style={[styles.podImage, { backgroundColor: WHITE }]}
                      resizeMode="contain"
                    />
                    <View style={styles.podOverlay}>
                      <Ionicons name="create-outline" size={12} color={WHITE} />
                      <Text style={styles.podOverlayText}>Signature</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
              {shipment.deliveredAt && (
                <Text style={styles.podMeta}>
                  Delivered {fmtDateTime(shipment.deliveredAt)}
                </Text>
              )}
              <View style={styles.divider} />
            </>
          )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>
              {routeInfo ? `${routeInfo.km} km` : "—"}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={{ width: 8 }} />
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{routeInfo?.duration ?? "—"}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={{ width: 8 }} />
          <View style={styles.statTile}>
            <Text style={[styles.statValue, { color: badge.color }]}>
              {shipment.price != null ? `$${shipment.price.toFixed(2)}` : "—"}
            </Text>
            <Text style={styles.statLabel}>Price</Text>
          </View>
        </View>

        {/* Accept Shipment button */}
        {canAccept && (
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            {accepting ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={NAVY}
                />
                <Text style={styles.acceptBtnText}>Accept Shipment</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8e3dc" },
  loadingRoot: { flex: 1, backgroundColor: NAVY },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: SUBTLE, fontSize: 13 },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: "rgba(11,18,32,0.94)",
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PANEL,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { color: WHITE, fontSize: 15, fontWeight: "500" },
  headerSub: { color: SUBTLE, fontSize: 11, marginTop: 1 },
  statusBadge: {
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 72,
    alignItems: "center",
  },
  statusText: { fontSize: 11, fontWeight: "500" },

  distancePill: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(11,18,32,0.9)",
    borderWidth: 0.5,
    borderColor: "rgba(244,166,35,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  distanceText: { color: AMBER, fontSize: 12, fontWeight: "600" },

  card: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PANEL,
    borderTopWidth: 0.5,
    borderTopColor: "#1E2D45",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "78%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: BORDER,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  divider: { height: 0.5, backgroundColor: "#1E2D45", marginBottom: 14 },

  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  statusBannerText: { flex: 1 },
  statusBannerLabel: { fontSize: 12, fontWeight: "600", marginBottom: 3 },
  statusBannerMsg: { color: SUBTLE, fontSize: 11, lineHeight: 16 },

  cancelBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#1a0d0d",
    borderWidth: 0.5,
    borderColor: "#3D1A1A",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  cancelText: { color: "#F0997B", fontSize: 12, lineHeight: 16 },
  cancelMeta: { color: MUTED, fontSize: 10, marginTop: 3 },

  routeRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  routeDots: { alignItems: "center", paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: {
    width: 1,
    flex: 1,
    backgroundColor: BORDER,
    minHeight: 22,
    marginVertical: 2,
  },
  routeAddrs: { flex: 1, gap: 10 },
  addrLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  addrValue: { color: WHITE, fontSize: 13, fontWeight: "500" },
  addrMeta: { color: MUTED, fontSize: 10, marginTop: 2 },

  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInitial: { color: AMBER, fontSize: 15, fontWeight: "600" },
  driverInfo: { flex: 1 },
  driverName: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  driverType: { color: MUTED, fontSize: 11 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  awaitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  awaitingText: { color: MUTED, fontSize: 13 },

  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginBottom: 8,
  },
  detailsToggleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailsToggleText: { color: SUBTLE, fontSize: 12, fontWeight: "500" },
  detailsBody: {
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  detailRow: { gap: 4 },
  detailLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  detailValue: { color: WHITE, fontSize: 12, lineHeight: 17 },
  vehicleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#1a1206",
    borderWidth: 0.5,
    borderColor: AMBER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  vehicleTagText: { color: AMBER, fontSize: 11, fontWeight: "500" },
  scheduleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },

  podLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  podRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  podThumb: {
    width: 84,
    height: 84,
    borderRadius: 10,
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
    gap: 4,
    paddingVertical: 4,
  },
  podOverlayText: { color: WHITE, fontSize: 9, fontWeight: "500" },
  podMeta: { color: MUTED, fontSize: 10, marginBottom: 14 },

  statsRow: { flexDirection: "row", marginBottom: 14 },
  statTile: {
    flex: 1,
    alignItems: "center",
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    paddingVertical: 10,
  },
  statValue: { color: AMBER, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  statLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Accept button
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingVertical: 14,
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { color: NAVY, fontSize: 15, fontWeight: "600" },
});
