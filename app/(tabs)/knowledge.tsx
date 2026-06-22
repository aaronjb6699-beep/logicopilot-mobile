import React, { useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { AlertCircle, ArrowUpCircle, BarChart2, BookOpen, ChevronRight, Database, Layers, Package, Shield, ShoppingCart, Truck, WifiOff } from "lucide-react-native";
import { useListKnowledgeCategories } from "@workspace/api-client-react";
import type { KnowledgeCategory } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { CardShimmer } from "@/components/shared/LoadingShimmer";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

const ICON_MAP: Record<string, LucideIcon> = {
  database: Database,
  layers: Layers,
  package: Package,
  "shopping-cart": ShoppingCart,
  "bar-chart-2": BarChart2,
  shield: Shield,
  "arrow-up-circle": ArrowUpCircle,
  truck: Truck,
};

const CATEGORY_COLORS = [
  colorTokens.light.primary,
  "#2B5090",
  "#1E6B8E",
  "#0F4C75",
  "#1B7340",
  colorTokens.light.warning,
  "#4A1A6E",
  "#1A4A5E",
];

export default function KnowledgeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading, error, refetch } = useListKnowledgeCategories();
  const { cached: cachedCategories, saveToCache } = useOfflineCache<KnowledgeCategory[]>("cache_knowledge_categories");

  useEffect(() => {
    if (categories) saveToCache(categories);
  }, [categories]);

  const displayData = categories ?? cachedCategories;
  const isOfflineFallback = !categories && !!cachedCategories;

  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  if (isLoading && !cachedCategories) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <OfflineBanner />
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((k) => <CardShimmer key={k} />)}
        </View>
      </View>
    );
  }

  if ((error || !displayData) && !cachedCategories) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={AlertCircle}
          title="Failed to load"
          description="Could not load the knowledge library. Check your connection."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <FlatList
        data={displayData ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 80 + bottomPadding },
        ]}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            {isOfflineFallback && (
              <View style={[styles.offlineNote, { backgroundColor: colors.secondary }]}>
                <WifiOff size={12} color={colors.mutedForeground} />
                <Text style={[styles.offlineNoteText, { color: colors.mutedForeground }]}>
                  Showing cached content
                </Text>
              </View>
            )}
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {(displayData ?? []).length} categories · Tap to explore
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? colorTokens.light.primary;
          const IconComp = ICON_MAP[item.icon] ?? BookOpen;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push(`/knowledge/${item.id}`)}
            >
              <View style={[styles.iconBg, { backgroundColor: color + "18" }]}>
                <IconComp size={24} color={color} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.topicCount, { color }]}>{item.topicCount} topics</Text>
                <ChevronRight size={14} color={colors.mutedForeground} />
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingContainer: { padding: 16, gap: 8 },
  list: { padding: 12, gap: 8 },
  row: { gap: 8 },
  offlineNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  offlineNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 160,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  topicCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
