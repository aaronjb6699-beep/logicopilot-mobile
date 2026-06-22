import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

export interface InAppNotification {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/** Returns true when running inside the Expo Go client. */
async function isRunningInExpoGo(): Promise<boolean> {
  try {
    const Constants = (await import("expo-constants")).default;
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

export function useNotificationListener(onReceived: (n: InAppNotification) => void) {
  useEffect(() => {
    if (Platform.OS === "web") return;

    let receivedSub: { remove: () => void } | null = null;
    let responseSub: { remove: () => void } | null = null;
    let cancelled = false;

    void (async () => {
      try {
        // Listeners also crash in Expo Go SDK 53+ — skip entirely.
        if (await isRunningInExpoGo()) return;
        if (cancelled) return;

        const Notifications = await import("expo-notifications");

        receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          const content = notification.request.content;
          onReceived({
            title: content.title ?? "LogiCopilot",
            body: content.body ?? undefined,
            data: (content.data as Record<string, unknown>) ?? {},
          });
        });

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
          navigateFromData(data);
        });
      } catch {
        // Fail silently — in-app banners are optional
      }
    })();

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function navigateFromData(data: Record<string, unknown>) {
  const screen = typeof data?.screen === "string" ? data.screen : null;
  switch (screen) {
    case "chat":
      router.push("/");
      break;
    case "knowledge":
      router.push("/(tabs)/knowledge");
      break;
    case "forms":
      router.push("/(tabs)/forms");
      break;
    case "translate":
      router.push("/(tabs)/translate");
      break;
    default:
      router.push("/");
      break;
  }
}
