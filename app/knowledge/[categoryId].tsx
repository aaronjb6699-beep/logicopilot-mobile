import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, ChevronRight } from "lucide-react-native";
import { useListKnowledgeTopics } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { CardShimmer } from "@/components/shared/LoadingShimmer";
import { EmptyState } from "@/components/shared/EmptyState";

const LEVEL_COLORS = {
  beginner: colorTokens.light.success,
  intermediate: colorTokens.light.warning,
  advanced: colorTokens.light.destructive,
};

export default function CategoryTopicsScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: topics, isLoading, error, refetch } = useListKnowledgeTopics(categoryId ?? "");

  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4].map((k) => <CardShimmer key={k} />)}
        </View>
      </View>
    );
  }

  if (error || !topics) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={AlertCircle}
          title="Failed to load topics"
          description="Could not load topics for this category."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 + bottomPadding },
        ]}
        ListHeaderComponent={
          <Text style={[styles.header, { color: colors.mutedForeground }]}>
            {topics.length} topic{topics.length !== 1 ? "s" : ""}
          </Text>
        }
        renderItem={({ item }) => {
          const levelColor = LEVEL_COLORS[item.level] ?? colors.primary;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push(`/knowledge/topic/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={[styles.levelBadge, { backgroundColor: levelColor + "18" }]}>
                  <Text style={[styles.levelText, { color: levelColor }]}>{item.level}</Text>
                </View>
              </View>
              <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.summary}
              </Text>
              <View style={styles.tagsRow}>
                {item.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                  </View>
                ))}
                <ChevronRight size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
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
  header: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  levelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  summary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
