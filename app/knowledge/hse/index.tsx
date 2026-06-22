import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { UAE_HSE_SECTIONS } from "@/data/hseReference";

const ACCENT_COLORS = [
  colorTokens.light.warning,
  colorTokens.light.primary,
  "#1B7340",
  "#4A1A6E",
  "#0F4C75",
  "#1E6B8E",
  "#2B5090",
  "#1A4A5E",
];

export default function HseListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "HSE Reference" }} />
      <FlatList
        data={UAE_HSE_SECTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 80 + bottomPadding },
        ]}
        ListHeaderComponent={
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {UAE_HSE_SECTIONS.length} sections · Tap to read
          </Text>
        }
        renderItem={({ item, index }) => {
          const accent = ACCENT_COLORS[index % ACCENT_COLORS.length] ?? colorTokens.light.warning;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => router.push(`/knowledge/hse/${item.id}`)}
            >
              <View style={[styles.accentBar, { backgroundColor: accent }]} />
              <View style={styles.cardBody}>
                <Text
                  style={[styles.cardTitle, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.cardSummary, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {item.summary}
                </Text>
                <Text style={[styles.pointCount, { color: accent }]}>
                  {item.points.length} points
                </Text>
              </View>
              <ChevronRight size={18} color={colors.mutedForeground} style={styles.chevron} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 8 },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  cardSummary: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  pointCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 2,
  },
  chevron: {
    marginRight: 12,
  },
});
