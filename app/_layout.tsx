import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { AlertCircle, Shield } from "lucide-react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeModules,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationBanner } from "@/components/NotificationBanner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { type InAppNotification, useNotificationListener } from "@/hooks/useNotificationListener";
import colorTokens from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      gcTime: 5 * 60 * 1000,
    },
  },
});

function LoadingScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

function BiometricUnlockScreen() {
  const { unlockWithBiometric, skipBiometric, biometricStatus } = useAuth();
  const insets = useSafeAreaInsets();
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const didAutoPrompt = useRef(false);

  async function handleUnlock() {
    setError(null);
    setIsAuthenticating(true);
    const success = await unlockWithBiometric();
    setIsAuthenticating(false);
    if (!success) {
      setError("Authentication failed. Try again or sign in with your password.");
    }
  }

  useEffect(() => {
    if (biometricStatus === "required" && !didAutoPrompt.current) {
      didAutoPrompt.current = true;
      void handleUnlock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricStatus]);

  return (
    <View style={[bioStyles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={bioStyles.iconWrapper}>
        <View style={bioStyles.iconBg}>
          <Shield size={48} color={colorTokens.light.primaryForeground} />
        </View>
      </View>
      <Text style={bioStyles.title}>LogiCopilot</Text>
      <Text style={bioStyles.subtitle}>Verify your identity to continue</Text>

      {isAuthenticating && (
        <ActivityIndicator size="large" color={colorTokens.light.primary} style={{ marginTop: 24 }} />
      )}

      {error && !isAuthenticating && (
        <View style={bioStyles.errorBox}>
          <AlertCircle size={16} color={colorTokens.light.destructive} />
          <Text style={bioStyles.errorText}>{error}</Text>
        </View>
      )}

      {!isAuthenticating && (
        <View style={bioStyles.actions}>
          <TouchableOpacity style={bioStyles.primaryBtn} onPress={handleUnlock} activeOpacity={0.8}>
            <Shield size={18} color={colorTokens.light.primaryForeground} />
            <Text style={bioStyles.primaryBtnText}>Use Biometrics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={bioStyles.secondaryBtn}
            onPress={() => {
              skipBiometric();
              router.replace("/(auth)/login");
            }}
            activeOpacity={0.7}
          >
            <Text style={bioStyles.secondaryBtnText}>Sign in with password instead</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const bioStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorTokens.light.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrapper: { marginBottom: 8 },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: colorTokens.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    color: colorTokens.light.primary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colorTokens.light.mutedForeground,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colorTokens.light.destructive + "18",
    borderColor: colorTokens.light.destructive + "40",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: "stretch",
  },
  errorText: {
    color: colorTokens.light.destructive,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  actions: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colorTokens.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colorTokens.light.primaryForeground,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: colorTokens.light.mutedForeground,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});

function RootLayoutNav() {
  const { token, isLoading, biometricStatus } = useAuth();
  const colors = useColors();
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [notifKey, setNotifKey] = useState(0);
  // Overlay starts visible and is hidden only after auth resolves + navigation fires.
  // The Stack is always mounted so router.replace() always works.
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNotification = useCallback((notification: InAppNotification) => {
    setActiveNotification(notification);
    setNotifKey((k) => k + 1);
  }, []);

  useNotificationListener(handleNotification);

  useEffect(() => {
    if (overlayTimer.current) clearTimeout(overlayTimer.current);

    const stillResolving =
      isLoading ||
      biometricStatus === "checking" ||
      (!!token && biometricStatus === "idle");

    if (stillResolving) {
      setOverlayVisible(true);
      return;
    }

    // Auth is resolved — navigate if needed, then reveal the correct screen.
    if (!token) {
      router.replace("/(auth)/login");
    }

    // Small delay so the navigation has one frame to render before we lift the overlay.
    overlayTimer.current = setTimeout(() => setOverlayVisible(false), 80);
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, [isLoading, token, biometricStatus]);

  if (token && biometricStatus === "required") {
    return <BiometricUnlockScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="knowledge/[categoryId]"
          options={{
            title: "Topics",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.primaryForeground,
            headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          }}
        />
        <Stack.Screen
          name="knowledge/topic/[id]"
          options={{
            title: "Topic",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.primaryForeground,
            headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          }}
        />
        <Stack.Screen
          name="forms/[id]"
          options={{
            title: "Form Details",
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.primaryForeground,
            headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
          }}
        />
      </Stack>

      {activeNotification && (
        <NotificationBanner
          key={notifKey}
          title={activeNotification.title}
          body={activeNotification.body}
          onDismiss={() => setActiveNotification(null)}
          onPress={() => {
            const data = activeNotification.data ?? {};
            const screen = typeof data.screen === "string" ? data.screen : null;
            setActiveNotification(null);
            if (screen === "knowledge") router.push("/(tabs)/knowledge");
            else if (screen === "forms") router.push("/(tabs)/forms");
            else if (screen === "translate") router.push("/(tabs)/translate");
            else router.push("/");
          }}
        />
      )}

      {overlayVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          <LoadingScreen />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [interLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const fontsReady = interLoaded;

  useEffect(() => {
    // Kill the Perf Monitor overlay if the user accidentally enabled it via the dev menu.
    // This is a no-op in production builds where the native module doesn't exist.
    try {
      NativeModules.PerfMonitor?.setIsShown(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
