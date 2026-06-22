import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Shield } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { UAE_HSE_SECTIONS } from "@/data/hseReference";
import { EmptyState } from "@/components/shared/EmptyState";

const ACCENT = colorTokens.light.warning;

export default function HseDetailScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const section = UAE_HSE_SECTIONS.find((s) => s.id === sectionId);

  if (!section) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "HSE Section" }} />
        <EmptyState
          icon={AlertCircle}
          title="Section not found"
          description="This HSE section could not be found."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 32 + bottomPadding },
      ]}
    >
      <Stack.Screen options={{ title: section.title }} />

      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={[styles.iconBg, { backgroundColor: ACCENT + "18" }]}>
          <Shield size={24} color={ACCENT} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {section.title}
        </Text>
        <Text style={[styles.summary, { color: colors.mutedForeground }]}>
          {section.summary}
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        KEY POINTS
      </Text>

      {section.points.map((point, i) => (
        <View
          key={i}
          style={[
            styles.pointRow,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: ACCENT }]} />
          <Text style={[styles.pointText, { color: colors.foreground }]}>
            {point}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 8 },
  headerCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 26,
  },
  summary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 2,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    flexShrink: 0,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
});
