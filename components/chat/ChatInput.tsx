import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Camera, Send, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";

export interface PendingImage {
  base64: string;
  mimeType: string;
  uri: string;
}

interface ChatInputProps {
  onSend: (text: string, image?: PendingImage) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const colors = useColors();
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const inputRef = useRef<TextInput>(null);

  const canSend = (text.trim().length > 0 || !!pendingImage) && !disabled;

  function handleSend() {
    if (!canSend) return;
    const message = text.trim();
    const image = pendingImage ?? undefined;
    setText("");
    setPendingImage(null);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSend(message, image);
    inputRef.current?.focus();
  }

  async function pickImage(source: "camera" | "gallery") {
    if (Platform.OS === "web") return;

    try {
      let asset: ImagePicker.ImagePickerAsset | null = null;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera access is required to take photos.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          exif: false,
        });
        if (!result.canceled && result.assets[0]) asset = result.assets[0];
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.85,
          base64: true,
          exif: false,
        });
        if (!result.canceled && result.assets[0]) asset = result.assets[0];
      }

      if (!asset || !asset.base64) return;

      const mt = asset.mimeType;
      const mimeType: "image/jpeg" | "image/png" | "image/webp" =
        mt === "image/png" ? "image/png" : mt === "image/webp" ? "image/webp" : "image/jpeg";

      setPendingImage({ base64: asset.base64, mimeType, uri: asset.uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      Alert.alert("Error", "Could not open image picker.");
    }
  }

  function handleAttachPress() {
    if (Platform.OS === "web") return;
    Alert.alert("Attach Photo", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Photo Library", onPress: () => pickImage("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {pendingImage && (
        <View style={styles.previewRow}>
          <Image source={{ uri: pendingImage.uri }} style={styles.previewThumb} resizeMode="cover" />
          <Pressable
            style={[styles.previewRemove, { backgroundColor: colors.foreground }]}
            onPress={() => setPendingImage(null)}
            hitSlop={8}
          >
            <X size={10} color={colors.card} />
          </Pressable>
        </View>
      )}
      <View style={styles.inputRow}>
        {Platform.OS !== "web" && (
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachPress}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Camera
              size={20}
              color={disabled ? colors.mutedForeground : pendingImage ? colors.accent : colors.primary}
            />
          </TouchableOpacity>
        )}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.background }]}
          value={text}
          onChangeText={setText}
          placeholder={pendingImage ? "Add a caption or just send the image…" : "Ask LogiCopilot anything…"}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? colors.accent : colors.muted },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Send
            size={18}
            color={canSend ? colors.accentForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
  },
  previewRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  previewRemove: {
    position: "absolute",
    top: 6,
    left: 72,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  attachButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    minHeight: 42,
    lineHeight: 20,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
