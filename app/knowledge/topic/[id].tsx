import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, BookOpen, ChevronRight, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useGetKnowledgeTopic } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useNetwork } from "@/context/NetworkContext";
import { LoadingShimmer } from "@/components/shared/LoadingShimmer";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

type Topic = {
  id: string;
  title: string;
  summary: string;
  content: string;
  level: string;
  tags: string[];
  keyPoints: string[];
  relatedTopics: string[];
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: colorTokens.light.success,
  intermediate: colorTokens.light.warning,
  advanced: colorTokens.light.destructive,
};

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const { data: topic, isLoading, error } = useGetKnowledgeTopic(id ?? "");
  const { cached, cacheLoaded, saveToCache } = useOfflineCache<Topic>(`logicopilot_topic_${id ?? ""}`);

  useEffect(() => {
    if (topic) saveToCache(topic as Topic);
  }, [topic]);

  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const displayed: Topic | undefined = (topic as Topic | undefined) ?? cached;
  const isStale = !topic && !!cached && (!isOnline || !!error);
  const levelColor = displayed ? (LEVEL_COLORS[displayed.level] ?? colors.primary) : colors.primary;

  function handleAskAI() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prompt = `Tell me more about: ${displayed?.title ?? "this topic"}`;
    router.push({ pathname: "/(tabs)", params: { prompt } });
  }

  if ((isLoading && !cacheLoaded) || (isLoading && !cached)) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          <LoadingShimmer height={28} width="70%" />
          <LoadingShimmer height={14} width="90%" style={{ marginTop: 12 }} />
          <LoadingShimmer height={14} width="80%" style={{ marginTop: 6 }} />
          <LoadingShimmer height={14} width="85%" style={{ marginTop: 6 }} />
        </ScrollView>
      </View>
    );
  }

  if ((error || !displayed) && !cached) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon={AlertCircle} title="Topic not found" description="This topic could not be loaded." />
      </View>
    );
  }

  if (!displayed) return null;

  const contentSections = displayed.content.split("\n\n");

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {isStale && <OfflineBanner message="Showing cached content" />}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 + bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.meta}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "18" }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{displayed.level}</Text>
          </View>
          <View style={styles.tags}>
            {displayed.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{displayed.title}</Text>
        <Text style={[styles.summary, { color: colors.mutedForeground }]}>{displayed.summary}</Text>

        <Pressable
          style={[styles.askAIBtn, { backgroundColor: colors.accent }]}
          onPress={handleAskAI}
        >
          <MessageCircle size={18} color={colors.accentForeground} />
          <Text style={styles.askAIText}>Ask AI about this</Text>
        </Pressable>

        <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
          {contentSections.map((section, i) => {
            const isBold = section.startsWith("**");
            if (isBold) {
              const parts = section.split(/\*\*(.*?)\*\*/g);
              return (
                <Text key={i} style={[styles.contentText, { color: colors.foreground }]}>
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <Text key={j} style={styles.bold}>{part}</Text>
                    ) : (
                      part
                    ),
                  )}
                </Text>
              );
            }
            return (
              <Text key={i} style={[styles.contentText, { color: colors.foreground }]}>
                {section}
              </Text>
            );
          })}
        </View>

        {displayed.keyPoints.length > 0 && (
          <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Points</Text>
            {displayed.keyPoints.map((point, i) => (
              <View key={i} style={styles.keyPoint}>
                <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                <Text style={[styles.keyPointText, { color: colors.foreground }]}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {displayed.relatedTopics.length > 0 && (
          <View style={[styles.contentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Related Topics</Text>
            {displayed.relatedTopics.map((rel) => (
              <TouchableRelated key={rel} id={rel} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TouchableRelated({ id, colors }: { id: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.relatedItem,
        { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={() => router.push(`/knowledge/topic/${id}`)}
    >
      <BookOpen size={14} color={colors.primary} />
      <Text style={[styles.relatedText, { color: colors.primary }]}>{id.replace(/-/g, " ")}</Text>
      <ChevronRight size={14} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingContainer: { padding: 16, gap: 8 },
  content: { padding: 16, gap: 16 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  summary: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  askAIBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  askAIText: {
    color: colorTokens.light.accentForeground,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  contentCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  contentText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  bold: {
    fontFamily: "Inter_700Bold",
  },
  keyPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  relatedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  relatedText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
});
