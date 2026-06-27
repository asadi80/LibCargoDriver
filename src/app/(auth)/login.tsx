//app/(auth)/login
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";
import { useDriverStore } from "@/store/driverStore";
import { connectSocket } from "@/hooks/useAuth";
import { saveSession } from '@/services/session';

export default function Login() {
  const router = useRouter();
  const setUser = useDriverStore((s) => s.setUser);
  const setToken = useDriverStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim() || !email.includes("@")) return "Please enter a valid email address.";
    if (!password) return "Please enter your password.";
    return null;
  };



const handleLogin = async () => {
  const error = validate();
  if (error) { 
    Alert.alert("Required", error); 
    return; 
  }

  setLoading(true);
  try {
    // Pass 'driver' as the role
    const res = await api.post("/auth/login", { 
      email, 
      password, 
      role: "DRIVER" 
    });
    
    const { user, token } = res.data;

    await saveSession(token, user);
    setToken(token);
    setUser(user);
    connectSocket(user.id);
    
  } catch (err: any) {
    const errorMessage = err?.response?.data?.message;
    const actualRole = err?.response?.data?.actualRole;
    
    // Customize error message based on the response
    if (errorMessage?.includes("not registered as a driver")) {
      Alert.alert(
        "Access Denied", 
        "This app is only for drivers. Please use the correct app for your account.",
        [
          {
            text: "OK",
            onPress: () => {
              setEmail("");
              setPassword("");
            }
          }
        ]
      );
    } else {
      Alert.alert("Login Failed", errorMessage ?? "Invalid credentials.");
    }
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Ionicons name="cube-outline" size={20} color={NAVY} />
            </View>
            <Text style={styles.logoText}>LibCargo</Text>
          </View>
          <Text style={styles.eyebrow}>Customer Portal</Text>
          <Text style={styles.title}>Welcome back</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputWrap, focused === "email" && styles.inputWrapFocused]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={focused === "email" ? AMBER : MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="you@company.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrap, focused === "password" && styles.inputWrapFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={focused === "password" ? AMBER : MUTED}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Your password"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.7} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.btnPrimaryText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText}>
              New here?{" "}
              <Text style={styles.btnSecondaryAccent}>Create an account</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.securityBadge}>
            <View style={styles.securityDot} />
            <Text style={styles.securityText}>Secure · End-to-end encrypted</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY  = "#0B1220";
const PANEL = "#0F1929";
const FIELD = "#1A2740";
const BORDER = "#2A3D5A";
const AMBER = "#F4A623";
const WHITE = "#F4F4F4";
const MUTED = "#4A6080";
const SUBTLE = "#8A9BB5";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scroll: {
    flexGrow: 1,
  },

  // Header
  header: {
    backgroundColor: PANEL,
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 28,
    borderBottomWidth: 0.5,
    borderBottomColor: "#1E2D45",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 36,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: AMBER,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  eyebrow: {
    color: SUBTLE,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "500",
  },

  // Form
  form: {
    paddingHorizontal: 28,
    paddingTop: 28,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    color: SUBTLE,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD,
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: AMBER,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: WHITE,
    fontSize: 15,
    paddingVertical: 14,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -6,
    marginBottom: 4,
  },
  forgotText: {
    color: AMBER,
    fontSize: 12,
  },

  // Actions
  actions: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  btnSecondary: {
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: SUBTLE,
    fontSize: 13,
  },
  btnSecondaryAccent: {
    color: AMBER,
    fontWeight: "500",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  securityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: AMBER,
  },
  securityText: {
    color: MUTED,
    fontSize: 11,
  },
});