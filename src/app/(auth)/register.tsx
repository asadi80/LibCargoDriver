import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { registerDriver } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

type Field = {
  key: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: "default" | "email-address" | "phone-pad";
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences";
  autoComplete?: "name" | "email" | "tel" | "new-password";
};

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim() || !email.includes("@")) return "Please enter a valid email address.";
    if (!phone.trim()) return "Please enter your phone number.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  };

  const handleRegister = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Required", error);
      return;
    }
    setLoading(true);
    try {
      await registerDriver({ name, email, phone, password, role:"DRIVER"});
      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Registration Failed", err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields: Field[] = [
    {
      key: "name",
      label: "Full Name",
      placeholder: "Jane Doe",
      value: name,
      onChangeText: setName,
      icon: "person-outline",
      autoCapitalize: "words",
      autoComplete: "name",
    },
    {
      key: "email",
      label: "Email Address",
      placeholder: "jane@company.com",
      value: email,
      onChangeText: setEmail,
      icon: "mail-outline",
      keyboardType: "email-address",
      autoCapitalize: "none",
      autoComplete: "email",
    },
    {
      key: "phone",
      label: "Phone Number",
      placeholder: "+1 (555) 000-0000",
      value: phone,
      onChangeText: setPhone,
      icon: "call-outline",
      keyboardType: "phone-pad",
      autoComplete: "tel",
    },
    {
      key: "password",
      label: "Password",
      placeholder: "Min. 8 characters",
      value: password,
      onChangeText: setPassword,
      icon: "lock-closed-outline",
      secureTextEntry: true,
      autoCapitalize: "none",
      autoComplete: "new-password",
    },
  ];

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
          <Text style={styles.eyebrow}>New Account</Text>
          <Text style={styles.title}>Ship with us</Text>
        </View>

        {/* Fields */}
        <View style={styles.form}>
          {fields.map(({ key, label, placeholder, value, onChangeText, icon, ...rest }) => {
            const isFocused = focused === key;
            return (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={[styles.inputWrap, isFocused && styles.inputWrapFocused]}>
                  <Ionicons
                    name={icon}
                    size={18}
                    color={isFocused ? AMBER : MUTED}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={placeholder}
                    placeholderTextColor={MUTED}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setFocused(key)}
                    onBlur={() => setFocused(null)}
                    style={styles.input}
                    {...rest}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={NAVY} />
            ) : (
              <Text style={styles.btnPrimaryText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSecondaryText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 32,
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

  // Actions
  actions: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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
    fontSize: 14,
  },
});