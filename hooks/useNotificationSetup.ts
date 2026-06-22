import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

/** Returns true when running inside the Expo Go client (SDK 53+ dropped push support there). */
async function isRunningInExpoGo(): Promise<boolean> {
  try {
    const Constants = (await import("expo-constants")).default;
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

export function useNotificationSetup() {
  const { token } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!token || registered.current || Platform.OS === "web") return;
    registered.current = true;
    void registerForPushNotifications(token);
  }, [token]);
}

type PermissionLike = { status: string; canAskAgain: boolean };

async function registerForPushNotifications(authToken: string) {
  try {
    // Push token APIs were removed from Expo Go in SDK 53 — skip silently.
    if (await isRunningInExpoGo()) return;

    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device");

    if (!Device.isDevice) return;

    let perm = (await Notifications.getPermissionsAsync()) as unknown as PermissionLike;

    if (perm.status !== "granted" && perm.canAskAgain) {
      perm = (await Notifications.requestPermissionsAsync()) as unknown as PermissionLike;
    }

    if (perm.status !== "granted") return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: true,
      }),
    });

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
  } catch {
    // Fail silently — push notifications are optional
  }
}
