// app/vehicle-info.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "@/services/api";

// ── Vehicle types — match your backend VehicleType enum ─────────────────────
const VEHICLE_TYPES = [
  { key: "SEDAN",       label: "Sedan",        icon: "car-outline" },
  { key: "SUV",         label: "SUV",           icon: "car-sport-outline" },
  { key: "TRUCK",       label: "Truck",         icon: "construct-outline" },
  { key: "VAN",         label: "Van",           icon: "bus-outline" },
  { key: "MOTORCYCLE",  label: "Motorcycle",    icon: "bicycle-outline" },
] as const;

type VehicleTypeKey = typeof VEHICLE_TYPES[number]["key"];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

export default function VehicleInfo() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [vehicleType, setVehicleType] = useState<VehicleTypeKey | null>(null);
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isValid =
    vehicleType && vehicleMake.trim() && vehicleModel.trim() && vehicleYear;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await api.put("/driver/vehicle", {
        vehicleType,
        vehicleMake:  vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear:  parseInt(vehicleYear, 10),
      });
      Alert.alert("Saved", "Vehicle information updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Failed",
        err?.response?.data?.message ?? "Could not save vehicle info."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: NAVY }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>Driver setup</Text>
            <Text style={styles.title}>Vehicle info</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Vehicle type */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Vehicle type</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPES.map((vt) => {
                const selected = vehicleType === vt.key;
                return (
                  <TouchableOpacity
                    key={vt.key}
                    style={[styles.typeCard, selected && styles.typeCardSelected]}
                    onPress={() => setVehicleType(vt.key)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={vt.icon as any}
                      size={22}
                      color={selected ? AMBER : MUTED}
                    />
                    <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>
                      {vt.label}
                    </Text>
                    {selected && (
                      <View style={styles.typeCheck}>
                        <Ionicons name="checkmark" size={10} color={NAVY} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Make */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Make</Text>
            <View style={[styles.inputWrap, focused === "make" && styles.inputWrapFocused]}>
              <Ionicons
                name="business-outline"
                size={17}
                color={focused === "make" ? AMBER : MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Toyota, Ford, BMW"
                placeholderTextColor={MUTED}
                value={vehicleMake}
                onChangeText={setVehicleMake}
                onFocus={() => setFocused("make")}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Model */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Model</Text>
            <View style={[styles.inputWrap, focused === "model" && styles.inputWrapFocused]}>
              <Ionicons
                name="car-outline"
                size={17}
                color={focused === "model" ? AMBER : MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. Camry, F-150, X5"
                placeholderTextColor={MUTED}
                value={vehicleModel}
                onChangeText={setVehicleModel}
                onFocus={() => setFocused("model")}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Year picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Year</Text>
            <TouchableOpacity
              style={[styles.inputWrap, showYearPicker && styles.inputWrapFocused]}
              onPress={() => setShowYearPicker((p) => !p)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="calendar-outline"
                size={17}
                color={showYearPicker ? AMBER : MUTED}
                style={styles.inputIcon}
              />
              <Text style={[styles.yearText, !vehicleYear && styles.yearPlaceholder]}>
                {vehicleYear || "Select year"}
              </Text>
              <Ionicons
                name={showYearPicker ? "chevron-up" : "chevron-down"}
                size={16}
                color={MUTED}
                style={{ marginRight: 14 }}
              />
            </TouchableOpacity>

            {showYearPicker && (
              <View style={styles.yearDropdown}>
                <ScrollView
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {YEARS.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.yearOption,
                        vehicleYear === y && styles.yearOptionSelected,
                      ]}
                      onPress={() => {
                        setVehicleYear(y);
                        setShowYearPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          vehicleYear === y && styles.yearOptionTextSelected,
                        ]}
                      >
                        {y}
                      </Text>
                      {vehicleYear === y && (
                        <Ionicons name="checkmark" size={14} color={AMBER} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Summary card */}
          {isValid && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Ionicons name="car-sport-outline" size={16} color={AMBER} />
                <Text style={styles.summaryText}>
                  {vehicleYear} {vehicleMake} {vehicleModel}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="pricetag-outline" size={14} color={MUTED} />
                <Text style={styles.summaryType}>
                  {VEHICLE_TYPES.find((v) => v.key === vehicleType)?.label}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={NAVY} size="small" />
            ) : (
              <View style={styles.btnInner}>
                <Ionicons name="checkmark-circle-outline" size={18} color={NAVY} />
                <Text style={styles.btnText}>Save vehicle info</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36,
    backgroundColor: FIELD,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  headerCenter: { flex: 1 },
  eyebrow: {
    color: SUBTLE, fontSize: 10, fontWeight: "600",
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 3,
  },
  title: { color: WHITE, fontSize: 22, fontWeight: "500" },

  body: { padding: 20, gap: 20 },

  fieldGroup: { gap: 8 },
  label: {
    color: MUTED, fontSize: 10, fontWeight: "600",
    letterSpacing: 1.2, textTransform: "uppercase",
  },

  // Vehicle type grid
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCard: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 8,
    position: "relative",
  },
  typeCardSelected: {
    borderColor: AMBER,
    backgroundColor: "#111a28",
  },
  typeLabel: { color: MUTED, fontSize: 12, fontWeight: "500" },
  typeLabelSelected: { color: WHITE },
  typeCheck: {
    position: "absolute",
    top: 6, right: 6,
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Inputs
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PANEL,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    minHeight: 50,
  },
  inputWrapFocused: { borderColor: AMBER },
  inputIcon: { marginLeft: 14, marginRight: 4 },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 14,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },

  // Year picker
  yearText: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 15, paddingHorizontal: 10 },
  yearPlaceholder: { color: MUTED },
  yearDropdown: {
    backgroundColor: PANEL,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    marginTop: 4,
    overflow: "hidden",
  },
  yearOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  yearOptionSelected: { backgroundColor: "#111a28" },
  yearOptionText: { color: SUBTLE, fontSize: 14 },
  yearOptionTextSelected: { color: AMBER, fontWeight: "500" },

  // Summary
  summaryCard: {
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 14,
    gap: 10,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryText: { color: WHITE, fontSize: 14, fontWeight: "500" },
  summaryDivider: { height: 0.5, backgroundColor: "#1E2D45" },
  summaryType: { color: SUBTLE, fontSize: 13 },

  // Footer
  footer: {
    backgroundColor: PANEL,
    borderTopWidth: 0.5,
    borderTopColor: "#1E2D45",
    padding: 16,
  },
  btn: {
    backgroundColor: AMBER,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { color: NAVY, fontSize: 15, fontWeight: "600" },
});