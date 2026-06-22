import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Globe, Repeat2, XCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { useNetwork } from "@/context/NetworkContext";

type Direction = "hinglish_to_english" | "english_to_hinglish";

const DIRECTIONS = [
  { key: "hinglish_to_english" as Direction, label: "Hinglish → English", from: "Hinglish", to: "English" },
  { key: "english_to_hinglish" as Direction, label: "English → Hinglish", from: "English", to: "Hinglish" },
];

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

export default function TranslateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();

  const [direction, setDirection] = useState<Direction>("hinglish_to_english");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDir = DIRECTIONS.find((d) => d.key === direction) ?? DIRECTIONS[0]!;

  async function handleTranslate() {
    if (!inputText.trim()) return;
    if (!isOnline) {
      setError("Translation requires an internet connection.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError(null);
    setIsLoading(true);
    setTranslatedText(null);
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim(), direction }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Translation failed");
      }
      const data = (await response.json()) as { translatedText: string; detectedLanguage: string };
      setTranslatedText(data.translatedText);
      setDetectedLang(data.detectedLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function swapDirection() {
    setDirection((prev) =>
      prev === "hinglish_to_english" ? "english_to_hinglish" : "hinglish_to_english",
    );
    setTranslatedText(null);
    setDetectedLang(null);
    setError(null);
    const tmp = inputText;
    setInputText(translatedText ?? "");
    setTranslatedText(tmp || null);
  }

  const bottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 + bottomPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.directionRow}>
            {DIRECTIONS.map((d) => (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.dirBtn,
                  direction === d.key && { backgroundColor: colors.primary },
                  { borderColor: direction === d.key ? colors.primary : colors.border },
                ]}
                onPress={() => {
                  setDirection(d.key);
                  setTranslatedText(null);
                  setError(null);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dirBtnText,
                    { color: direction === d.key ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.languageRow}>
            <View style={styles.langBadge}>
              <Text style={[styles.langLabel, { color: colors.primary }]}>{currentDir.from}</Text>
            </View>
            <TouchableOpacity onPress={swapDirection} style={styles.swapBtn}>
              <Repeat2 size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={styles.langBadge}>
              <Text style={[styles.langLabel, { color: colors.primary }]}>{currentDir.to}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelLabel, { color: colors.mutedForeground }]}>Input ({currentDir.from})</Text>
          <TextInput
            style={[styles.textArea, { color: colors.foreground }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Type in ${currentDir.from}…`}
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
          />
          <View style={styles.inputFooter}>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {inputText.length}/2000
            </Text>
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => setInputText("")}>
                <XCircle size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.translateBtn,
            { backgroundColor: inputText.trim() && isOnline ? colors.primary : colors.muted },
          ]}
          onPress={handleTranslate}
          disabled={!inputText.trim() || isLoading || !isOnline}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Globe size={18} color={inputText.trim() && isOnline ? colors.primaryForeground : colors.mutedForeground} />
              <Text
                style={[
                  styles.translateBtnText,
                  { color: inputText.trim() && isOnline ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                Translate
              </Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
            <AlertCircle size={14} color={colors.destructive} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {translatedText && (
          <View style={[styles.resultCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.panelLabel, { color: colors.primary }]}>
                Translation ({currentDir.to})
              </Text>
              {detectedLang && (
                <Text style={[styles.detected, { color: colors.mutedForeground }]}>
                  Detected: {detectedLang}
                </Text>
              )}
            </View>
            <Text style={[styles.resultText, { color: colors.foreground }]} selectable>
              {translatedText}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  directionRow: {
    flexDirection: "row",
    gap: 8,
  },
  dirBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  dirBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  langBadge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  langLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  swapBtn: {
    padding: 10,
  },
  inputCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  panelLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textArea: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 100,
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  translateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    color: colorTokens.light.destructive,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  resultCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detected: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  resultText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
