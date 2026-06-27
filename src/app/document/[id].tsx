// app/document/[id].tsx
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "@/services/api";
import axios from "axios";

// ── Cloudinary config ────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

type DocKey =
  | "licenseUrl"
  | "insuranceUrl"
  | "registrationUrl"
  | "profilePhotoUrl"
  | "vehiclePhotoUrl";

type DocFile = {
  uri: string;
  name: string;
  type: string;
} | null;

type DocState = Record<DocKey, DocFile>;
type UploadingState = Record<DocKey, boolean>;

const DOC_CONFIG: {
  key: DocKey;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "profilePhotoUrl",
    label: "Profile Photo",
    desc: "Clear headshot photo",
    icon: "person-circle-outline",
  },
  {
    key: "licenseUrl",
    label: "Driver's License",
    desc: "Front side of valid license",
    icon: "card-outline",
  },
  {
    key: "insuranceUrl",
    label: "Insurance Certificate",
    desc: "Current insurance document",
    icon: "shield-checkmark-outline",
  },
  {
    key: "registrationUrl",
    label: "Vehicle Registration",
    desc: "Valid registration document",
    icon: "document-text-outline",
  },
  {
    key: "vehiclePhotoUrl",
    label: "Vehicle Photo",
    desc: "Clear photo of your vehicle",
    icon: "car-outline",
  },
];

// ── Upload a single file to Cloudinary, return secure_url ───────────────────

async function uploadToCloudinary(file: DocFile): Promise<string> {
  if (!file) throw new Error("No file provided");

  const formData = new FormData();

  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", "libcargo/driver-docs");

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
  );

  return res.data.secure_url as string;
}

export default function UploadDocuments() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [docs, setDocs] = useState<DocState>({
    licenseUrl: null,
    insuranceUrl: null,
    registrationUrl: null,
    profilePhotoUrl: null,
    vehiclePhotoUrl: null,
  });

  const [uploading, setUploading] = useState<UploadingState>({
    licenseUrl: false,
    insuranceUrl: false,
    registrationUrl: false,
    profilePhotoUrl: false,
    vehiclePhotoUrl: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const totalSelected = Object.values(docs).filter(Boolean).length;
  const allSelected = totalSelected === DOC_CONFIG.length;

  // ── Pick image from library ────────────────────────────────────────────────
 const pickImage = async (key: DocKey) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Please allow access to your photo library.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: key === "profilePhotoUrl",
    aspect: key === "profilePhotoUrl" ? [1, 1] : undefined,
  });

  if (result.canceled || !result.assets[0]) return;

  const asset = result.assets[0];
  
  // ✅ Use the mimeType from the asset directly if available
  const mimeType = asset.mimeType ?? "image/jpeg";
  const ext = mimeType.split("/")[1] ?? "jpg";
  const name = `${key}_${Date.now()}.${ext}`;

  setDocs((prev) => ({
    ...prev,
    [key]: { uri: asset.uri, name, type: mimeType },
  }));
};

  // ── Submit: upload all to Cloudinary, then POST URLs to backend ────────────
  const handleSubmit = async () => {
    console.log("Cloud name:", CLOUDINARY_CLOUD_NAME);
  console.log("Upload preset:", CLOUDINARY_UPLOAD_PRESET);
    if (!allSelected) {
      Alert.alert(
        "Missing documents",
        "Please select all 5 documents before submitting.",
      );
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload each file to Cloudinary in parallel, show per-file uploading
      const keys = DOC_CONFIG.map((d) => d.key);
      setUploading(
        Object.fromEntries(keys.map((k) => [k, true])) as UploadingState,
      );

      const urlEntries = await Promise.all(
        keys.map(async (key) => {
          const url = await uploadToCloudinary(docs[key]);
          setUploading((prev) => ({ ...prev, [key]: false }));
          return [key, url] as [DocKey, string];
        }),
      );

      const urls = Object.fromEntries(urlEntries);

      // 2. Build multipart form with Cloudinary URLs as text fields
      //    Backend reads: files?.licenseUrl?.[0]?.path
      //    So we send them as file-like fields with the URL as the path value.
      //    Alternatively — if your multer is configured for URLs — send as JSON.
      //    Below sends as JSON body (simplest when URLs are already hosted).
      await api.post("/driver/upload-docs", urls);

      setDone(true);
    } catch (err: any) {
      Alert.alert(
        "Upload failed",
        err?.response?.data?.message ?? err?.message ?? "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
      setUploading(
        Object.fromEntries(
          DOC_CONFIG.map((d) => [d.key, false]),
        ) as UploadingState,
      );
    }
  };

  if (done) {
    return (
      <View style={[styles.root, styles.successRoot]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={GREEN} />
        </View>
        <Text style={styles.successTitle}>Documents submitted</Text>
        <Text style={styles.successSub}>
          Your documents are under review. We'll notify you once verified.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eyebrow}>Verification</Text>
          <Text style={styles.title}>Upload documents</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{totalSelected}/5</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(totalSelected / 5) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionNote}>
          All documents are encrypted and used only for driver verification.
        </Text>

        {DOC_CONFIG.map(({ key, label, desc, icon }) => {
          const file = docs[key];
          const isUploading = uploading[key];
          const hasFile = !!file;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.docCard, hasFile && styles.docCardSelected]}
              onPress={() => pickImage(key)}
              activeOpacity={0.75}
              disabled={submitting}
            >
              {/* Left: icon or thumbnail */}
              <View style={[styles.docIcon, hasFile && styles.docIconSelected]}>
                {hasFile ? (
                  <Image source={{ uri: file.uri }} style={styles.thumbnail} />
                ) : (
                  <Ionicons name={icon} size={22} color={MUTED} />
                )}
              </View>

              {/* Center: label + desc */}
              <View style={styles.docInfo}>
                <Text
                  style={[styles.docLabel, hasFile && styles.docLabelSelected]}
                >
                  {label}
                </Text>
                <Text style={styles.docDesc} numberOfLines={1}>
                  {hasFile ? file.name : desc}
                </Text>
              </View>

              {/* Right: status */}
              <View style={styles.docStatus}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={AMBER} />
                ) : hasFile ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={13} color={NAVY} />
                  </View>
                ) : (
                  <View style={styles.addCircle}>
                    <Ionicons name="add" size={16} color={MUTED} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={SUBTLE}
          />
          <Text style={styles.infoText}>
            Accepted formats: JPG, PNG, PDF. Max 10 MB per file. Documents must
            be clear and unobstructed.
          </Text>
        </View>
      </ScrollView>

      {/* Submit button — fixed at bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.btn,
            (!allSelected || submitting) && styles.btnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!allSelected || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.btnInner}>
              <ActivityIndicator color={NAVY} size="small" />
              <Text style={styles.btnText}>Uploading…</Text>
            </View>
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="cloud-upload-outline" size={18} color={NAVY} />
              <Text style={styles.btnText}>Submit documents</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: PANEL,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
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
    color: SUBTLE,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: { color: WHITE, fontSize: 22, fontWeight: "500" },
  progressBadge: {
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  progressText: { color: AMBER, fontSize: 13, fontWeight: "600" },

  // Progress bar
  progressBarTrack: {
    height: 2,
    backgroundColor: FIELD,
  },
  progressBarFill: {
    height: 2,
    backgroundColor: AMBER,
  },

  // Body
  body: { padding: 20, gap: 10 },
  sectionNote: {
    color: SUBTLE,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },

  // Doc card
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PANEL,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 14,
    gap: 14,
  },
  docCardSelected: {
    borderColor: AMBER,
    backgroundColor: "#111a28",
  },
  docIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  docIconSelected: {
    borderColor: AMBER,
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  docInfo: { flex: 1, gap: 3 },
  docLabel: { color: SUBTLE, fontSize: 13, fontWeight: "500" },
  docLabelSelected: { color: WHITE },
  docDesc: { color: MUTED, fontSize: 11 },
  docStatus: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AMBER,
    alignItems: "center",
    justifyContent: "center",
  },
  addCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Info box
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: PANEL,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    padding: 12,
    marginTop: 4,
  },
  infoText: { flex: 1, color: SUBTLE, fontSize: 11, lineHeight: 17 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
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

  // Success screen
  successRoot: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  successIcon: { marginBottom: 8 },
  successTitle: { color: WHITE, fontSize: 24, fontWeight: "500" },
  successSub: {
    color: SUBTLE,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
});
