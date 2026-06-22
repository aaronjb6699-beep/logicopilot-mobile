import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { Clock } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  queued?: boolean;
  imageUri?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";
  const showText = message.content && message.content !== "(analyse this image)";

  const markdownStyles = {
    body: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
      margin: 0,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 4,
      color: colors.foreground,
    },
    heading1: {
      color: colors.foreground,
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      marginTop: 10,
      marginBottom: 4,
    },
    heading2: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      marginTop: 8,
      marginBottom: 4,
    },
    heading3: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      marginTop: 6,
      marginBottom: 2,
    },
    strong: {
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    em: {
      fontStyle: "italic" as const,
      color: colors.foreground,
    },
    bullet_list: {
      marginLeft: 4,
      marginBottom: 4,
    },
    ordered_list: {
      marginLeft: 4,
      marginBottom: 4,
    },
    list_item: {
      marginBottom: 2,
      color: colors.foreground,
    },
    code_inline: {
      backgroundColor: colors.muted,
      color: colors.foreground,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
    },
    fence: {
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 8,
      marginVertical: 4,
    },
    code_block: {
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 8,
      marginVertical: 4,
    },
    blockquote: {
      backgroundColor: colors.muted,
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingLeft: 8,
      marginVertical: 4,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 8,
    },
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>LC</Text>
        </View>
      )}
      <View style={[styles.bubbleWrapper, !isUser && styles.bubbleWrapperAssistant]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [
                  styles.userBubble,
                  {
                    backgroundColor: message.queued
                      ? colors.primary + "99"
                      : colors.primary,
                  },
                ]
              : [
                  styles.assistantBubble,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
          ]}
        >
          {isUser && message.imageUri && (
            <Image
              source={{ uri: message.imageUri }}
              style={styles.attachedImage}
              resizeMode="cover"
            />
          )}
          {showText && isUser && (
            <Text
              style={[
                styles.messageText,
                { color: colors.primaryForeground },
                !!message.imageUri && styles.messageTextWithImage,
              ]}
              selectable
            >
              {message.content}
            </Text>
          )}
          {showText && !isUser && (
            <Markdown style={markdownStyles}>
              {message.content}
            </Markdown>
          )}
        </View>
        {isUser && message.queued && (
          <View style={styles.queuedRow}>
            <Clock size={10} color={colors.mutedForeground} />
            <Text style={[styles.queuedLabel, { color: colors.mutedForeground }]}>
              Queued — will send when online
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: colorTokens.light.primaryForeground,
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  bubbleWrapper: {
    maxWidth: "78%",
    alignItems: "flex-end",
    gap: 3,
  },
  bubbleWrapperAssistant: {
    flex: 1,
    alignItems: "flex-start",
  },
  bubble: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 8,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  attachedImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  messageTextWithImage: {
    marginTop: 2,
  },
  queuedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  queuedLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
