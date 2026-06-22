import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Clock, WifiOff } from "lucide-react-native";
import { useNetwork } from "@/context/NetworkContext";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";

interface Props {
  message?: string;
  forceShow?: boolean;
}

export function OfflineBanner({ message, forceShow }: Props) {
  const { isOnline } = useNetwork();
  const colors = useColors();

  const shouldShow = forceShow || !isOnline;
  if (!shouldShow) return null;

  const text = message ?? "No internet connection — messages will be sent when you're back online";

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      {isOnline ? <Clock size={14} color={colors.warningForeground} /> : <WifiOff size={14} color={colors.warningForeground} />}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: colorTokens.light.warningForeground,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});
