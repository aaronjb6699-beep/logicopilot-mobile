import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  Camera,
  CheckCircle,
  ChevronDown,
  Edit3,
  ImageIcon,
  Send,
  Sparkles,
} from "lucide-react-native";
import { useGetForm } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

type FormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "date" | "number" | "checkbox" | "signature";
  required: boolean;
  placeholder?: string | null;
  options?: string[] | null;
};

type Form = {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: FormField[];
};

type FillState = "idle" | "capturing" | "extracting" | "filling" | "submitting" | "done";

// ─── Select Modal ──────────────────────────────────────────────────────────────

function SelectModal({
  visible,
  options,
  value,
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.modalOption,
                {
                  backgroundColor: opt === value ? colors.primary + "18" : "transparent",
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  { color: opt === value ? colors.primary : colors.foreground },
                ]}
              >
                {opt}
              </Text>
              {opt === value && <CheckCircle size={18} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.modalCancel, { backgroundColor: colors.secondary }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Individual field renderer ─────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  colors,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [selectOpen, setSelectOpen] = useState(false);

  if (field.type === "checkbox") {
    const checked = value === "true";
    return (
      <View style={[styles.checkRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.checkLabel, { color: colors.foreground }]}>{field.label}</Text>
        <Switch
          value={checked}
          onValueChange={(v) => onChange(v ? "true" : "false")}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>
    );
  }

  if (field.type === "signature") {
    const signed = value === "signed";
    return (
      <View style={[styles.sigRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.sigLeft}>
          <Edit3 size={16} color={colors.mutedForeground} />
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
          {field.required && (
            <View style={[styles.reqBadge, { backgroundColor: colors.destructive + "18" }]}>
              <Text style={[styles.reqText, { color: colors.destructive }]}>Required</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onChange(signed ? "" : "signed")}
          activeOpacity={0.7}
          style={[
            styles.sigBtn,
            { backgroundColor: signed ? colors.success + "18" : colors.secondary },
          ]}
        >
          {signed && <CheckCircle size={14} color={colors.success} />}
          <Text style={[styles.sigBtnText, { color: signed ? colors.success : colors.mutedForeground }]}>
            {signed ? "Signed" : "Mark Signed"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (field.type === "select") {
    const opts = field.options ?? [];
    return (
      <>
        <SelectModal
          visible={selectOpen}
          options={opts}
          value={value}
          onSelect={onChange}
          onClose={() => setSelectOpen(false)}
          colors={colors}
        />
        <TouchableOpacity
          style={[styles.selectBtn, { borderColor: value ? colors.primary : colors.border, backgroundColor: colors.card }]}
          onPress={() => setSelectOpen(true)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.selectBtnText,
              { color: value ? colors.foreground : colors.mutedForeground },
            ]}
            numberOfLines={1}
          >
            {value || `Select ${field.label}`}
          </Text>
          <ChevronDown size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </>
    );
  }

  // text, textarea, date, number
  const isMulti = field.type === "textarea";
  const isNumeric = field.type === "number";
  const isDate = field.type === "date";

  return (
    <TextInput
      style={[
        styles.input,
        isMulti && styles.inputMulti,
        {
          borderColor: value ? colors.primary : colors.border,
          backgroundColor: colors.card,
          color: colors.foreground,
        },
      ]}
      value={value}
      onChangeText={onChange}
      placeholder={
        isDate
          ? "YYYY-MM-DD"
          : (field.placeholder ?? `Enter ${field.label.toLowerCase()}`)
      }
      placeholderTextColor={colors.mutedForeground}
      multiline={isMulti}
      numberOfLines={isMulti ? 4 : 1}
      keyboardType={isNumeric ? "numeric" : "default"}
      textAlignVertical={isMulti ? "top" : "center"}
      returnKeyType={isMulti ? "default" : "next"}
    />
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function FillFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const { data: form, isLoading } = useGetForm(id ?? "");
  const [fillState, setFillState] = useState<FillState>("idle");
  const [values, setValues] = useState<Record<string, string>>({});
  const [extractError, setExtractError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Pre-populate empty values when form loads
  useEffect(() => {
    if (form && Object.keys(values).length === 0) {
      const initial: Record<string, string> = {};
      for (const f of (form as Form).fields) {
        initial[f.id] = f.type === "checkbox" ? "false" : "";
      }
      setValues(initial);
    }
  }, [form]);

  const setValue = useCallback((fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  }, []);

  // ── Image capture ────────────────────────────────────────────────────────────

  async function pickImage(useCamera: boolean) {
    setFillState("capturing");
    setExtractError(null);

    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.9,
        base64: true,
        allowsEditing: false,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.[0]) {
        setFillState(Object.keys(values).some((k) => values[k]) ? "filling" : "idle");
        return;
      }

      const asset = result.assets[0];
      const b64 = asset.base64;
      if (!b64) {
        setExtractError("Could not read image data. Please try again.");
        setFillState("idle");
        return;
      }

      setImageUri(asset.uri);
      await extractFromImage(b64, asset.mimeType ?? "image/jpeg");
    } catch (err) {
      setExtractError("Failed to capture image. Check camera permissions.");
      setFillState("idle");
    }
  }

  // ── AI extraction ────────────────────────────────────────────────────────────

  async function extractFromImage(imageBase64: string, mimeType: string) {
    if (!form) return;
    setFillState("extracting");
    setExtractError(null);

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const safeMime = allowedTypes.has(mimeType) ? mimeType : "image/jpeg";

    try {
      const resp = await fetch(`${getBaseUrl()}/api/forms/${id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: safeMime }),
      });

      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error ${resp.status}`);
      }

      const data = (await resp.json()) as { values: Record<string, string> };

      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data.values)) {
          next[k] = typeof v === "string" ? v : String(v ?? "");
        }
        return next;
      });

      setFillState("filling");
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed. Try again.";
      setExtractError(msg);
      setFillState("idle");
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form) return;

    const typedForm = form as Form;
    const missing = typedForm.fields.filter(
      (f) => f.required && (!values[f.id] || values[f.id].trim() === "" || values[f.id] === "false"),
    );

    if (missing.length > 0) {
      Alert.alert(
        "Required fields missing",
        `Please fill in: ${missing.map((f) => f.label).join(", ")}`,
        [{ text: "OK" }],
      );
      return;
    }

    setFillState("submitting");

    try {
      const resp = await fetch(`${getBaseUrl()}/api/forms/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: id, values }),
      });

      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Server error ${resp.status}`);
      }

      setFillState("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed.";
      Alert.alert("Submission failed", msg, [{ text: "OK" }]);
      setFillState("filling");
    }
  }

  // ─── Render: loading ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading form…</Text>
      </View>
    );
  }

  if (!form) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.destructive }]}>Form not found.</Text>
      </View>
    );
  }

  const typedForm = form as Form;

  // ─── Render: success ─────────────────────────────────────────────────────────

  if (fillState === "done") {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <CheckCircle size={64} color={colors.success} />
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>Form Submitted!</Text>
        <Text style={[styles.doneDesc, { color: colors.mutedForeground }]}>
          {typedForm.name} has been saved successfully.
        </Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>Back to Forms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doneBtnAlt, { borderColor: colors.border }]}
          onPress={() => {
            const fresh: Record<string, string> = {};
            for (const f of typedForm.fields) {
              fresh[f.id] = f.type === "checkbox" ? "false" : "";
            }
            setValues(fresh);
            setImageUri(null);
            setFillState("idle");
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.doneBtnAltText, { color: colors.foreground }]}>Fill Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render: idle / extracting / filling / submitting ────────────────────────

  const isExtracting = fillState === "extracting";
  const isSubmitting = fillState === "submitting";
  const isBusy = isExtracting || isSubmitting || fillState === "capturing";

  return (
    <>
      <Stack.Screen
        options={{
          title: typedForm.name,
          headerBackTitle: "Form",
        }}
      />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Photo capture banner ── */}
          <View style={[styles.captureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.captureHeader}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.captureTitle, { color: colors.foreground }]}>
                AI Auto-Fill
              </Text>
            </View>
            <Text style={[styles.captureDesc, { color: colors.mutedForeground }]}>
              Take a photo of your physical form and AI will fill everything in automatically.
            </Text>

            {extractError && (
              <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "18" }]}>
                <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{extractError}</Text>
              </View>
            )}

            {isExtracting ? (
              <View style={styles.extractingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.extractingText, { color: colors.primary }]}>
                  AI is reading your form…
                </Text>
              </View>
            ) : (
              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.primary }]}
                  onPress={() => pickImage(true)}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  <Camera size={18} color="#fff" />
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.captureBtnAlt, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                  onPress={() => pickImage(false)}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  <ImageIcon size={18} color={colors.foreground} />
                  <Text style={[styles.captureBtnAltText, { color: colors.foreground }]}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {imageUri && fillState === "filling" && (
              <Text style={[styles.extractedNote, { color: colors.success }]}>
                ✓ Form scanned — review and edit fields below
              </Text>
            )}
          </View>

          {/* ── Form fields ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Form Fields</Text>

          {typedForm.fields.map((field) => (
            <View key={field.id} style={styles.fieldBlock}>
              {field.type !== "checkbox" && field.type !== "signature" && (
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                    {field.label}
                  </Text>
                  {field.required && (
                    <View style={[styles.reqBadge, { backgroundColor: colors.destructive + "18" }]}>
                      <Text style={[styles.reqText, { color: colors.destructive }]}>Required</Text>
                    </View>
                  )}
                </View>
              )}
              <FieldInput
                field={field}
                value={values[field.id] ?? ""}
                onChange={(v) => setValue(field.id, v)}
                colors={colors}
              />
            </View>
          ))}

          {/* ── Submit button ── */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: isSubmitting ? colors.primary + "80" : colors.primary },
            ]}
            onPress={handleSubmit}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={18} color="#fff" />
            )}
            <Text style={styles.submitBtnText}>
              {isSubmitting ? "Submitting…" : "Submit Form"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12 },

  // Loading / error
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 16, fontFamily: "Inter_500Medium" },

  // Capture card
  captureCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 4,
  },
  captureHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  captureTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  captureDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  captureButtons: { flexDirection: "row", gap: 10 },
  captureBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  captureBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  captureBtnAlt: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  captureBtnAltText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  extractingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  extractingText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  extractedNote: { fontSize: 13, fontFamily: "Inter_500Medium" },
  errorBanner: { padding: 10, borderRadius: 8 },
  errorBannerText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  // Section
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginLeft: 2, marginTop: 4 },

  // Field block
  fieldBlock: { gap: 6 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  reqBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  reqText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  // Text input
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 44,
  },
  inputMulti: {
    minHeight: 100,
    paddingTop: 10,
  },

  // Select
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  selectBtnText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, marginRight: 8 },

  // Checkbox row
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  checkLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },

  // Signature row
  sigRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minHeight: 52,
  },
  sigLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  sigBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sigBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  // Select modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  // Done screen
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 20, marginBottom: 8 },
  doneDesc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  doneBtn: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  doneBtnAlt: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
  },
  doneBtnAltText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
