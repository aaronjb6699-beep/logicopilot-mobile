import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Camera, CheckCircle, ChevronDown, ChevronUp, ImageIcon, XCircle, AlertTriangle } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

type CheckStatus = "PRESENT" | "MISSING / BLANK" | "CANNOT READ";

interface CheckItem {
  item: string;
  status: CheckStatus;
}

interface CheckResult {
  identified: boolean;
  formId?: string | null;
  formTitle?: string | null;
  docNo?: string | null;
  checks: CheckItem[];
  unknownFormMessage?: string | null;
}

const STATUS_CONFIG: Record<CheckStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  PRESENT: { icon: CheckCircle, color: colorTokens.light.success, label: "Present" },
  "MISSING / BLANK": { icon: XCircle, color: colorTokens.light.destructive, label: "Missing / Blank" },
  "CANNOT READ": { icon: AlertTriangle, color: colorTokens.light.warning, label: "Cannot Read" },
};

function StatusIcon({ status }: { status: CheckStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return <Icon size={18} color={cfg.color} />;
}

function StatusBadge({ status, colors }: { status: CheckStatus; colors: ReturnType<typeof useColors> }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + "18" }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ResultSection({
  title,
  items,
  colors,
}: {
  title: string;
  items: CheckItem[];
  colors: ReturnType<typeof useColors>;
}) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;
  return (
    <View style={[styles.resultSection, { borderColor: colors.border }]}>
      <Pressable style={styles.resultSectionHeader} onPress={() => setExpanded((v) => !v)}>
        <Text style={[styles.resultSectionTitle, { color: colors.foreground }]}>
          {title} ({items.length})
        </Text>
        {expanded ? (
          <ChevronUp size={16} color={colors.mutedForeground} />
        ) : (
          <ChevronDown size={16} color={colors.mutedForeground} />
        )}
      </Pressable>
      {expanded &&
        items.map((check, idx) => (
          <View
            key={idx}
            style={[
              styles.checkRow,
              { borderTopColor: colors.border },
              idx === 0 && styles.checkRowFirst,
            ]}
          >
            <StatusIcon status={check.status} />
            <Text style={[styles.checkItem, { color: colors.foreground }]}>{check.item}</Text>
          </View>
        ))}
    </View>
  );
}

export default function PermitCheckerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  async function pickImage(source: "camera" | "gallery") {
    let asset: ImagePicker.ImagePickerAsset | null = null;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission required", "Please allow camera access in settings.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        quality: 0.85,
        base64: true,
        exif: false,
      });
      if (!res.canceled && res.assets[0]) asset = res.assets[0];
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Gallery permission required", "Please allow photo library access in settings.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        quality: 0.85,
        base64: true,
        exif: false,
      });
      if (!res.canceled && res.assets[0]) asset = res.assets[0];
    }

    if (!asset) return;

    setImageUri(asset.uri);
    setResult(null);

    const b64 = asset.base64 ?? null;
    setImageBase64(b64);

    const mt = asset.mimeType;
    if (mt === "image/png") setMimeType("image/png");
    else if (mt === "image/webp") setMimeType("image/webp");
    else setMimeType("image/jpeg");
  }

  async function runCheck() {
    if (!imageBase64) return;
    setLoading(true);
    setResult(null);
    try {
      const baseUrl = getBaseUrl();
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${baseUrl}/api/permit-checker`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        Alert.alert("Check failed", err.error ?? "An error occurred. Please try again.");
        return;
      }

      const data: CheckResult = await resp.json();
      setResult(data);
    } catch {
      Alert.alert("Network error", "Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
  }

  const missing = result?.checks.filter((c) => c.status === "MISSING / BLANK") ?? [];
  const cannotRead = result?.checks.filter((c) => c.status === "CANNOT READ") ?? [];
  const present = result?.checks.filter((c) => c.status === "PRESENT") ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Permit & DSTI Checker",
          headerBackTitle: "Back",
        }}
      />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>RAQ Permit & DSTI Completeness Checker</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Take a photo or upload an image of a RAQ permit or DSTI form. The AI will scan it and flag any missing,
            blank, or unreadable fields — for human review only.
          </Text>
          <Text style={[styles.infoCaution, { color: colors.mutedForeground }]}>
            Supported: Hot Work · Excavation · Work at Height · Scaffold · DSTI
          </Text>
        </View>

        {!imageUri && (
          <View style={styles.pickRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => pickImage("camera")}
            >
              <Camera size={20} color={colors.primaryForeground} />
              <Text style={styles.pickButtonText}>Take Photo</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.pickButton,
                styles.pickButtonSecondary,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => pickImage("gallery")}
            >
              <ImageIcon size={20} color={colors.primary} />
              <Text style={[styles.pickButtonText, { color: colors.primary }]}>Choose from Gallery</Text>
            </Pressable>
          </View>
        )}

        {imageUri && (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <View style={styles.previewActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={runCheck}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>Run Check</Text>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={reset}
                disabled={loading}
              >
                <Text style={[styles.actionButtonSecondaryText, { color: colors.mutedForeground }]}>
                  Change Photo
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Analysing document — this may take a few seconds…
            </Text>
          </View>
        )}

        {result && !result.identified && (
          <View style={[styles.unknownCard, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "60" }]}>
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={[styles.unknownText, { color: colors.foreground }]}>
              {result.unknownFormMessage ?? "Document not recognised. Please upload a RAQ permit or DSTI."}
            </Text>
          </View>
        )}

        {result && result.identified && (
          <View style={styles.results}>
            <View style={[styles.resultHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.resultFormTitle, { color: colors.foreground }]}>
                {result.formTitle}
              </Text>
              {result.docNo && (
                <Text style={[styles.resultDocNo, { color: colors.mutedForeground }]}>{result.docNo}</Text>
              )}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryBadge, { backgroundColor: colors.destructive + "18" }]}>
                  <XCircle size={14} color={colors.destructive} />
                  <Text style={[styles.summaryBadgeText, { color: colors.destructive }]}>{missing.length} Missing</Text>
                </View>
                <View style={[styles.summaryBadge, { backgroundColor: colors.warning + "18" }]}>
                  <AlertTriangle size={14} color={colors.warning} />
                  <Text style={[styles.summaryBadgeText, { color: colors.warning }]}>{cannotRead.length} Cannot Read</Text>
                </View>
                <View style={[styles.summaryBadge, { backgroundColor: colors.success + "18" }]}>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={[styles.summaryBadgeText, { color: colors.success }]}>{present.length} Present</Text>
                </View>
              </View>
              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                For human verification only. This tool does not approve, validate, or sign any permit.
              </Text>
            </View>

            <ResultSection title="Missing / Blank" items={missing} colors={colors} />
            <ResultSection title="Cannot Read" items={cannotRead} colors={colors} />
            <ResultSection title="Present" items={present} colors={colors} />

            <Pressable
              style={({ pressed }) => [
                styles.retakeButton,
                { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={reset}
            >
              <Text style={[styles.retakeButtonText, { color: colors.primary }]}>Check Another Permit</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  infoCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  infoCaution: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  pickRow: {
    gap: 10,
  },
  pickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  pickButtonSecondary: {
    borderWidth: 1,
  },
  pickButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colorTokens.light.primaryForeground,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 260,
    backgroundColor: colorTokens.light.surfaceSecondary,
  },
  previewActions: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  actionButtonText: {
    color: colorTokens.light.primaryForeground,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  actionButtonSecondary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionButtonSecondaryText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 4,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  unknownCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  unknownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  results: {
    gap: 12,
  },
  resultHeader: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 6,
  },
  resultFormTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  resultDocNo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    fontStyle: "italic",
  },
  resultSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultSectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkRowFirst: {
    borderTopWidth: 0,
  },
  checkItem: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  retakeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  retakeButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
