import React, { useEffect } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { AlertCircle, AlignLeft, Calendar, CheckSquare, ChevronDown, Edit3, Hash, Minus, Sparkles, Type } from "lucide-react-native";
import { useGetForm } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useNetwork } from "@/context/NetworkContext";
import { LoadingShimmer } from "@/components/shared/LoadingShimmer";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

type Form = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  fields: FormField[];
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  select: ChevronDown,
  date: Calendar,
  number: Hash,
  checkbox: CheckSquare,
  signature: Edit3,
};

const CATEGORY_COLORS: Record<string, string> = {
  HSE: colorTokens.light.destructive,
  Warehouse: colorTokens.light.primary,
  Lifting: colorTokens.light.warning,
  Procurement: colorTokens.light.success,
};

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const { data: form, isLoading, error } = useGetForm(id ?? "");
  const { cached, cacheLoaded, saveToCache } = useOfflineCache<Form>(`logicopilot_form_${id ?? ""}`);

  useEffect(() => {
    if (form) saveToCache(form as Form);
  }, [form]);

  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const displayed: Form | undefined = (form as Form | undefined) ?? cached;
  const isStale = !form && !!cached && (!isOnline || !!error);
  const catColor = displayed ? (CATEGORY_COLORS[displayed.category] ?? colors.primary) : colors.primary;

  if ((isLoading && !cacheLoaded) || (isLoading && !cached)) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          {[1, 2, 3, 4, 5].map((k) => (
            <View key={k} style={styles.loadingField}>
              <LoadingShimmer height={12} width="40%" />
              <LoadingShimmer height={40} style={{ marginTop: 4 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if ((error || !displayed) && !cached) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon={AlertCircle} title="Form not found" description="This form could not be loaded." />
      </View>
    );
  }

  if (!displayed) return null;

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
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.headerTop}>
            <View style={[styles.categoryPill, { backgroundColor: catColor + "18" }]}>
              <Text style={[styles.categoryLabel, { color: catColor }]}>{displayed.category}</Text>
            </View>
            <Text style={[styles.fieldCount, { color: colors.mutedForeground }]}>
              {displayed.fields.length} fields
            </Text>
          </View>
          <Text style={[styles.formName, { color: colors.foreground }]}>{displayed.name}</Text>
          <Text style={[styles.formDesc, { color: colors.mutedForeground }]}>{displayed.description}</Text>
          <View style={styles.tags}>
            {displayed.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.fillBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/forms/fill/${displayed.id}`)}
            activeOpacity={0.85}
          >
            <Sparkles size={16} color="#fff" />
            <Text style={styles.fillBtnText}>Fill from Photo</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Form Fields</Text>

        {displayed.fields.map((field, index) => {
          const FieldIcon = FIELD_ICONS[field.type] ?? Minus;
          return (
            <View
              key={field.id}
              style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.fieldHeader}>
                <View style={[styles.fieldNum, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.fieldNumText, { color: colors.primary }]}>{index + 1}</Text>
                </View>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
                {field.required && (
                  <View style={[styles.requiredBadge, { backgroundColor: colors.destructive + "18" }]}>
                    <Text style={[styles.requiredText, { color: colors.destructive }]}>Required</Text>
                  </View>
                )}
              </View>

              <View style={styles.fieldMeta}>
                <View style={styles.fieldType}>
                  <FieldIcon size={13} color={colors.mutedForeground} />
                  <Text style={[styles.fieldTypeText, { color: colors.mutedForeground }]}>
                    {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                  </Text>
                </View>
              </View>

              {field.placeholder && (
                <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
                  {field.placeholder}
                </Text>
              )}

              {field.options && field.options.length > 0 && (
                <View style={styles.options}>
                  <Text style={[styles.optionsLabel, { color: colors.mutedForeground }]}>Options:</Text>
                  {field.options.map((opt, i) => (
                    <View key={i} style={styles.optionRow}>
                      <View style={[styles.optionDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.optionText, { color: colors.foreground }]}>{opt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  loadingContainer: { padding: 16, gap: 12 },
  loadingField: { gap: 4 },
  content: { padding: 16, gap: 12 },
  headerCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  fieldCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  formName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  formDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginLeft: 4,
  },
  fieldCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  fieldNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldNumText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  fieldMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldType: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fieldTypeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  placeholder: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  options: {
    gap: 4,
    marginTop: 4,
  },
  optionsLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  optionText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  fillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  fillBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
