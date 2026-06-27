//app/index
import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDriverStore } from "@/store/driverStore";
import { getSession } from "@/services/session";

export default function Index() {
  const router   = useRouter();
  const setUser  = useDriverStore((s) => s.setUser);
  const setToken = useDriverStore((s) => s.setToken);

  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotOpacity  = useRef(new Animated.Value(0)).current;
  const ring1Scale  = useRef(new Animated.Value(0.6)).current;
  const ring2Scale  = useRef(new Animated.Value(0.6)).current;
  const ring3Scale  = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Animations
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, damping: 12, stiffness: 120, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.timing(textOpacity, {
      toValue: 1, duration: 500, delay: 300,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();

    const ringDelay = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1, duration: 900, delay,
        easing: Easing.out(Easing.ease), useNativeDriver: true,
      });

    Animated.parallel([
      ringDelay(ring1Scale, 100),
      ringDelay(ring2Scale, 250),
      ringDelay(ring3Scale, 400),
    ]).start();

    Animated.timing(dotOpacity, {
      toValue: 1, duration: 400, delay: 600, useNativeDriver: true,
    }).start();

    // ── Restore driver session ──────────────────────────────────────────────
    const bootstrap = async () => {
      try {
        const session = await getSession();

        if (session?.token && session?.user) {
          setToken(session.token);
          setUser(session.user);
          setTimeout(() => router.replace("/(tabs)/home" as any), 1800);
        } else {
          setTimeout(() => router.replace("/(auth)/login" as any), 1800);
        }
      } catch {
        setTimeout(() => router.replace("/(auth)/login" as any), 1800);
      }
    };

    bootstrap();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: ring1Scale }] }]} />

      <Animated.View style={[
        styles.logoWrap,
        { opacity: logoOpacity, transform: [{ scale: logoScale }] },
      ]}>
        <View style={styles.logoBox}>
          <Ionicons name="cube-outline" size={40} color={NAVY} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.wordmark, { opacity: textOpacity }]}>
        <Text style={styles.appName}>LibCargo</Text>
        <Text style={styles.tagline}>FREIGHT · SIMPLIFIED</Text>
      </Animated.View>

      <Animated.View style={[styles.dotsRow, { opacity: dotOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
    pulse(dot1, 0).start();
    pulse(dot2, 200).start();
    pulse(dot3, 400).start();
  }, []);

  return (
    <>
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
      ))}
    </>
  );
}

const NAVY  = "#0B1220";
const AMBER = "#F4A623";
const WHITE = "#F4F4F4";
const MUTED = "#4A6080";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  ring1: { width: 200, height: 200, borderColor: "rgba(244,166,35,0.12)" },
  ring2: { width: 300, height: 300, borderColor: "rgba(244,166,35,0.08)" },
  ring3: { width: 420, height: 420, borderColor: "rgba(244,166,35,0.05)" },
  logoWrap: { marginBottom: 24 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: AMBER,
    alignItems: "center", justifyContent: "center",
    shadowColor: AMBER, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  wordmark:  { alignItems: "center", marginBottom: 60 },
  appName:   { color: WHITE, fontSize: 32, fontWeight: "600", letterSpacing: 1, marginBottom: 6 },
  tagline:   { color: MUTED, fontSize: 11, fontWeight: "600", letterSpacing: 3 },
  dotsRow:   { position: "absolute", bottom: 56, flexDirection: "row", gap: 8, alignItems: "center" },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER },
});