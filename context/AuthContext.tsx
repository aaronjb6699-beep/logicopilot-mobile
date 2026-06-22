import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "logicopilot_auth_token";
const USERNAME_KEY = "logicopilot_auth_username";

type BiometricStatus = "idle" | "checking" | "required" | "unlocked" | "unavailable";

interface AuthContextType {
  token: string | null;
  username: string | null;
  isLoading: boolean;
  biometricStatus: BiometricStatus;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  skipBiometric: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

async function getStoredPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Constants = (await import("expo-constants")).default;
    if (Constants.appOwnership === "expo") return null;
    const Device = await import("expo-device");
    if (!Device.isDevice) return null;
    const Notifications = await import("expo-notifications");
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

async function unregisterPushToken(authToken: string) {
  if (Platform.OS === "web") return;
  try {
    const pushToken = await getStoredPushToken();
    if (!pushToken) return;
    const baseUrl = getBaseUrl();
    await fetch(`${baseUrl}/api/devices/unregister`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken }),
    });
  } catch {
  }
}

async function registerPushToken(authToken: string) {
  if (Platform.OS === "web") return;
  try {
    // Push token APIs crash in Expo Go SDK 53+ — detect and skip silently.
    const Constants = (await import("expo-constants")).default;
    if (Constants.appOwnership === "expo") return;

    const Device = await import("expo-device");
    const Notifications = await import("expo-notifications");

    if (!Device.isDevice) {
      return;
    }

    type NotifPerm = { granted: boolean; canAskAgain: boolean };
    const existingPerm = (await Notifications.getPermissionsAsync()) as unknown as NotifPerm;
    let granted = existingPerm.granted;
    if (!granted && existingPerm.canAskAgain) {
      const reqPerm = (await Notifications.requestPermissionsAsync()) as unknown as NotifPerm;
      granted = reqPerm.granted;
    }
    if (!granted) {
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;

    const baseUrl = getBaseUrl();
    await fetch(`${baseUrl}/api/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "LogiCopilot Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B00",
      });
    }
  } catch {
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>("idle");
  const tokenRef = useRef<string | null>(null);
  const biometricChecked = useRef(false);
  const pushRegistered = useRef(false);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    loadStoredToken();
    return () => { setAuthTokenGetter(null); };
  }, []);

  useEffect(() => {
    tokenRef.current = token;
    if (token && !biometricChecked.current) {
      biometricChecked.current = true;
      checkBiometricRequirement();
    }
    if (token && !pushRegistered.current) {
      pushRegistered.current = true;
      void registerPushToken(token);
    }
  }, [token]);

  async function checkBiometricRequirement() {
    if (Platform.OS === "web") {
      setBiometricStatus("unavailable");
      return;
    }
    setBiometricStatus("checking");
    try {
      const LocalAuthentication = await import("expo-local-authentication");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setBiometricStatus("required");
      } else {
        setBiometricStatus("unavailable");
      }
    } catch {
      setBiometricStatus("unavailable");
    }
  }

  async function loadStoredToken() {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USERNAME_KEY);
      if (storedToken) {
        tokenRef.current = storedToken;
        setToken(storedToken);
        setUsername(storedUser);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }

  async function login(usernameInput: string, password: string) {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Login failed");
    }

    const data = (await response.json()) as { token: string; username: string };
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USERNAME_KEY, data.username);
    tokenRef.current = data.token;
    setToken(data.token);
    setUsername(data.username);
    biometricChecked.current = true;
    setBiometricStatus("unavailable");
    pushRegistered.current = false;
  }

  async function logout() {
    if (tokenRef.current) {
      await unregisterPushToken(tokenRef.current);
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USERNAME_KEY);
    tokenRef.current = null;
    setToken(null);
    setUsername(null);
    biometricChecked.current = false;
    setBiometricStatus("idle");
    pushRegistered.current = false;
  }

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return true;
    try {
      const LocalAuthentication = await import("expo-local-authentication");
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access LogiCopilot",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setBiometricStatus("unlocked");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  function skipBiometric() {
    setBiometricStatus("unavailable");
  }

  function getToken() {
    return tokenRef.current;
  }

  return (
    <AuthContext.Provider
      value={{ token, username, isLoading, biometricStatus, login, logout, unlockWithBiometric, skipBiometric, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export async function attemptBiometricAuth(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const LocalAuthentication = await import("expo-local-authentication");
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Access LogiCopilot",
      fallbackLabel: "Use Password",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
