// app/(tabs)/home.tsx
"use no memo";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDriverStore } from "@/store/driverStore";
import { getDriverProfile, updateDriverStatus, updateDriverLocation } from "@/services/api";
import { getToken, removeSession } from "@/services/session";
import * as Location from "expo-location";
import { socket, connectSocket, disconnectSocket } from "@/services/socket";

export default function DriverHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useDriverStore();
  const isOnline = store?.isOnline ?? false;
  const setOnline = store?.setOnline;
  const user = store?.user;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs for location tracking
  const locationInterval = useRef<NodeJS.Timeout | null>(null);
  const isTrackingLocation = useRef(false);
  const driverIdRef = useRef<string | null>(null);

  // Socket event listeners
  useEffect(() => {
    if (!driverIdRef.current) return;

    const handleConnect = () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      // If socket disconnects unexpectedly, set driver offline
      if (isOnline && setOnline) {
        setOnline(false);
        // Also update backend
        updateDriverStatus(false).catch(console.error);
      }
    };

    const handleDriverStatusChange = (data: { driverId: string; isOnline: boolean }) => {
      if (data.driverId === driverIdRef.current) {
        console.log('📡 Driver status changed via socket:', data.isOnline);
        if (setOnline) {
          setOnline(data.isOnline);
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('driver-status-changed', handleDriverStatusChange);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('driver-status-changed', handleDriverStatusChange);
    };
  }, [isOnline, setOnline]);

  // Monitor app state (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isOnline) {
        // App went to background, optionally set offline
        console.log('App in background, consider going offline');
      } else if (nextAppState === 'active' && isOnline) {
        // App came to foreground, ensure socket is connected
        if (driverIdRef.current && !socket.connected) {
          connectSocket(driverIdRef.current);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline]);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const secureToken = await getToken();
        if (!secureToken && isMounted) {
          router.replace("/(auth)/login");
          return;
        }

        const res = await getDriverProfile();
        if (isMounted && res.success) {
          setProfile(res.driver);
          driverIdRef.current = res.driver.id;
        } else if (isMounted && res.status === 401) {
          await removeSession();
          router.replace("/(auth)/login");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Start/stop location tracking and socket connection based on online status
  useEffect(() => {
    if (isOnline && driverIdRef.current) {
      // Connect to socket when going online
      connectSocket(driverIdRef.current);
      startLocationTracking();
    } else {
      // Disconnect socket when going offline
      disconnectSocket();
      stopLocationTracking();
    }
    
    return () => {
      stopLocationTracking();
    };
  }, [isOnline, driverIdRef.current]);

  const startLocationTracking = async () => {
    if (isTrackingLocation.current) return;
    
    console.log('📍 Starting location tracking...');
    
    // Request permissions first
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission denied');
      return;
    }
    
    isTrackingLocation.current = true;
    
    // Initial location update
    await updateLocation();
    
    // Set interval for periodic updates (every 3 seconds)
    locationInterval.current = setInterval(async () => {
      await updateLocation();
    }, 3000);
  };

  const stopLocationTracking = () => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
    isTrackingLocation.current = false;
    console.log('📍 Stopped location tracking');
  };

  const updateLocation = async () => {
    try {
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      
      // Update local state
      setDriverLocation({ lat: latitude, lng: longitude });
      
      // Send to backend
      await updateDriverLocation(latitude, longitude);
      
      // Emit location via socket for real-time updates
      if (socket.connected) {
        socket.emit('driver-location', {
          driverId: driverIdRef.current,
          latitude,
          longitude,
        });
      }
      
      console.log(`📍 Location updated: ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('❌ Failed to update location:', error);
    }
  };

  const name = profile?.user?.name ?? "—";
  const email = profile?.user?.email ?? "—";
  const phone = profile?.user?.phone ?? "—";
  const vehicleType = profile?.vehicleType ?? null;
  const vehicleMake = profile?.vehicleMake ?? null;
  const vehicleModel = profile?.vehicleModel ?? null;
  const vehicleYear = profile?.vehicleYear ?? null;

  const vehicleSummary =
    vehicleMake && vehicleModel && vehicleYear
      ? `${vehicleYear} ${vehicleMake} ${vehicleModel}`
      : null;

  const initials =
    name !== "—" && name
      ? name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "D";

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      
      // Optimistically update UI first
      if (setOnline && typeof setOnline === 'function') {
        setOnline(newStatus);
      }
      
      // Update backend
      const result = await updateDriverStatus(newStatus);
      
      if (!result.success) {
        // Revert if backend update failed
        if (setOnline && typeof setOnline === 'function') {
          setOnline(isOnline);
        }
        console.error('Failed to update status:', result.message);
      } else {
        console.log('Status updated successfully:', result.isOnline);
        
        // Emit status change via socket
        if (socket.connected && driverIdRef.current) {
          socket.emit('driver-status-change', {
            driverId: driverIdRef.current,
            isOnline: newStatus,
          });
        }
        
        // If turning online, immediately update location
        if (newStatus) {
          await updateLocation();
        }
      }
    } catch (error) {
      console.error('Failed to update online status:', error);
      // Revert on error
      if (setOnline && typeof setOnline === 'function') {
        setOnline(isOnline);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F4A623" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Driver Portal</Text>
            <Text style={styles.welcomeLine}>Welcome back,</Text>
            <Text style={styles.driverName}>{name}</Text>
            {vehicleSummary && (
              <View style={styles.truckBadge}>
                <Ionicons name="car-outline" size={11} color="#8A9BB5" />
                <Text style={styles.truckText}>{vehicleSummary}</Text>
              </View>
            )}
            {/* Show socket connection status */}
            {isOnline && (
              <View style={[styles.locationBadge, isConnected && styles.socketConnected]}>
                <Ionicons 
                  name={isConnected ? "wifi" : "wifi-outline"} 
                  size={11} 
                  color={isConnected ? "#1D9E75" : "#E24B4A"} 
                />
                <Text style={[styles.locationText, { color: isConnected ? "#1D9E75" : "#E24B4A" }]}>
                  {isConnected ? "Connected" : "Reconnecting..."}
                </Text>
              </View>
            )}
            {/* Show location tracking indicator when online */}
            {isOnline && driverLocation && (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={11} color="#1D9E75" />
                <Text style={styles.locationText}>Live tracking active</Text>
              </View>
            )}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {/* ── Online toggle ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.onlineCard,
              isOnline ? styles.onlineCardActive : styles.onlineCardInactive,
            ]}
            onPress={handleToggleOnline}
            activeOpacity={0.85}
          >
            <View style={styles.onlineLeft}>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: isOnline ? "#1D9E75" : "#E24B4A" },
                ]}
              />
              <View>
                <Text style={styles.onlineTitle}>
                  {isOnline ? "You are Online" : "You are Offline"}
                </Text>
                <Text style={styles.onlineSub}>
                  {isOnline
                    ? "Accepting new shipments"
                    : "Not visible to customers"}
                </Text>
              </View>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: "#2A3D5A", true: "#1D9E75" }}
              thumbColor="#F4F4F4"
            />
          </TouchableOpacity>
        </View>

        {/* ── My Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Details</Text>
          <View style={styles.detailsCard}>
            <DetailRow icon="person-outline" label="Name" value={name} />
            <View style={styles.detailDivider} />
            <DetailRow icon="mail-outline" label="Email" value={email} />
            <View style={styles.detailDivider} />
            <DetailRow icon="call-outline" label="Phone" value={phone} />
          </View>
        </View>

         {/* ── Assigned Shipments ── */}
       <View style={styles.section}>
  <Text style={styles.sectionTitle}>Assigned Shipments</Text>
  <View style={styles.detailsCard}>
    <TouchableOpacity 
      style={styles.detailRow}
      onPress={() => router.push("../shipment/assigned")}
      activeOpacity={0.7}
    >
      <Ionicons name="cube-outline" size={16} color="#4A6080" style={{ marginRight: 12 }} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>Assigned Shipments</Text>
        <Text style={styles.detailValue}>View your shipments</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4A6080" />
    </TouchableOpacity>

    
    <View style={styles.detailDivider} />
     <TouchableOpacity 
      style={styles.detailRow}
      onPress={() => router.push("../shipment/delivered")}
      activeOpacity={0.7}
    >
      <Ionicons name="cube-outline" size={16} color="#4A6080" style={{ marginRight: 12 }} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>Delivered Shipments</Text>
        <Text style={styles.detailValue}>View delivered shipments</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4A6080" />
    </TouchableOpacity>
    <View style={styles.detailDivider} />
    <DetailRow icon="call-outline" label="Phone" value={phone} />
  </View>
</View>

        {/* ── Vehicle Info ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle Info</Text>
          </View>

          {vehicleSummary ? (
            <View style={styles.detailsCard}>
              <DetailRow
                icon="car-sport-outline"
                label="Vehicle"
                value={vehicleSummary}
              />
              {vehicleType && (
                <>
                  <View style={styles.detailDivider} />
                  <DetailRow
                    icon="pricetag-outline"
                    label="Type"
                    value={vehicleType}
                  />
                </>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={24} color="#4A6080" />
              <Text style={styles.emptyTitle}>No vehicle info</Text>
              <Text style={styles.emptySub}>
                Add your vehicle details to start accepting shipments
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push("/vehicle-info" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnText}>Add Vehicle Info</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Reusable detail row ──────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons
        name={icon}
        size={16}
        color="#4A6080"
        style={{ marginRight: 12 }}
      />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B1220" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    backgroundColor: "#0F1929",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: "#8A9BB5",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  welcomeLine: { color: "#F4F4F4", fontSize: 22, fontWeight: "300" },
  driverName: { color: "#F4A623", fontSize: 22, fontWeight: "500" },
  truckBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#1A2740",
    borderWidth: 0.5,
    borderColor: "#2A3D5A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  truckText: { color: "#8A9BB5", fontSize: 11 },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#0d2a1f",
    borderWidth: 0.5,
    borderColor: "#1D9E75",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  socketConnected: {
    borderColor: "#1D9E75",
  },
  locationText: {
    color: "#1D9E75",
    fontSize: 11,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1A2740",
    borderWidth: 2,
    borderColor: "#F4A623",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#F4A623", fontSize: 20, fontWeight: "500" },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#4A6080",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionEdit: { color: "#F4A623", fontSize: 12 },

  // Online toggle
  onlineCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 14,
  },
  onlineCardActive: { backgroundColor: "#0d2a1f", borderColor: "#1D9E75" },
  onlineCardInactive: { backgroundColor: "#1A2740", borderColor: "#2A3D5A" },
  onlineLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineTitle: {
    color: "#F4F4F4",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  onlineSub: { color: "#4A6080", fontSize: 11 },

  // Details card
  detailsCard: {
    backgroundColor: "#0F1929",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  detailDivider: {
    height: 0.5,
    backgroundColor: "#1E2D45",
    marginHorizontal: 16,
  },
  detailText: { flex: 1 },
  detailLabel: {
    color: "#4A6080",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  detailValue: { color: "#F4F4F4", fontSize: 13 },

  // Empty state
  emptyCard: {
    backgroundColor: "#0F1929",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#1E2D45",
    padding: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: "#8A9BB5",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  emptySub: { color: "#4A6080", fontSize: 12, textAlign: "center" },
  actionBtn: {
    marginTop: 8,
    backgroundColor: "#F4A623",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionBtnText: { color: "#0B1220", fontSize: 13, fontWeight: "600" },
});