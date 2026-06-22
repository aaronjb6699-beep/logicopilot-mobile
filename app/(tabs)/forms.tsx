import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, ChevronRight, FileText, Search, ShieldCheck, WifiOff, X } from "lucide-react-native";
import { useListForms } from "@workspace/api-client-react";
import type { Form } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { CardShimmer } from "@/components/shared/LoadingShimmer";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

const CATEGORY_COLORS: Record<string, string> = {
  HSE: colorTokens.light.destructive,
  Warehouse: colorTokens.light.primary,
  Lifting: colorTokens.light.warning,
  Procurement: colorTokens.light.success,
};

export default function FormsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { data: forms, isLoading, error, refetch } = useListForms();
  const { cached: cachedForms, saveToCache } = useOfflineCache<Form[]>("cache_forms_list");

  useEffect(() => {
    if (forms) saveToCache(forms);
  }, [forms]);

  const displayForms = forms ?? cachedForms;
  const isOfflineFallback = !forms && !!cachedForms;

  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  const filtered = (displayForms ?? []).filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase()) ||
      f.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, form) => {
    if (!acc[form.category]) acc[form.category] = [];
    acc[form.category]!.push(form);
    return acc;
  }, {});

  const sections = Object.entries(grouped);

  if (isLoading && !cachedForms) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <OfflineBanner />
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((k) => <CardShimmer key={k} />)}
        </View>
      </View>
    );
  }

  if (error && !cachedForms) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={AlertCircle}
          title="Failed to load forms"
          description="Could not load the forms library."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <Search size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search forms…"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={sections}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 80 + bottomPadding },
        ]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Pressable
              style={({ pressed }) => [
                styles.checkerBanner,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
              onPress={() => router.push("/permit-checker")}
            >
              <View style={styles.checkerBannerIcon}>
                <ShieldCheck size={22} color={colors.primaryForeground} />
              </View>
              <View style={styles.checkerBannerText}>
                <Text style={styles.checkerBannerTitle}>Permit & DSTI Checker</Text>
                <Text style={styles.checkerBannerDesc}>
                  Photo AI scan — flags missing or blank fields instantly
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
            {isOfflineFallback && (
              <View style={[styles.offlineNote, { backgroundColor: colors.secondary }]}>
                <WifiOff size={12} color={colors.mutedForeground} />
                <Text style={[styles.offlineNoteText, { color: colors.mutedForeground }]}>
                  Showing cached content
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon={FileText} title="No forms found" description="Try a different search term." />
        }
        renderItem={({ item: [category, categoryForms] }) => {
          const catColor = CATEGORY_COLORS[category] ?? colors.primary;
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.categoryPill, { backgroundColor: catColor + "18" }]}>
                  <Text style={[styles.categoryLabel, { color: catColor }]}>{category}</Text>
                </View>
                <Text style={[styles.formCount, { color: colors.mutedForeground }]}>
                  {categoryForms.length} form{categoryForms.length !== 1 ? "s" : ""}
                </Text>
              </View>
              {categoryForms.map((form) => (
                <Pressable
                  key={form.id}
                  style={({ pressed }) => [
                    styles.formCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => router.push(`/forms/${form.id}`)}
                >
                  <View style={styles.formCardContent}>
                    <Text style={[styles.formName, { color: colors.foreground }]}>{form.name}</Text>
                    <Text style={[styles.formDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {form.description}
                    </Text>
                    <View style={styles.tags}>
                      {form.tags.slice(0, 3).map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  list: { padding: 12, gap: 16 },
  listHeader: { gap: 8, marginBottom: 8 },
  checkerBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  checkerBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkerBannerText: { flex: 1, gap: 2 },
  checkerBannerTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colorTokens.light.primaryForeground,
  },
  checkerBannerDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  offlineNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  offlineNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  formCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  formCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  formCardContent: {
    flex: 1,
    gap: 4,
  },
  formName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  formDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
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
