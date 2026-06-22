import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, Menu, Pencil, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { fetch } from "expo/fetch";
import {
  useCreateOpenaiConversation,
  useDeleteOpenaiConversation,
  useListOpenaiConversations,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useNetwork } from "@/context/NetworkContext";
import { enqueueMessage, getQueueForConv, removeFromQueue } from "@/hooks/useChatQueue";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput, type PendingImage } from "@/components/chat/ChatInput";
import { QuickActions } from "@/components/chat/QuickActions";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ConversationList } from "@/components/chat/ConversationList";
import { EmptyState } from "@/components/shared/EmptyState";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import colorTokens from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  queued?: boolean;
  imageUri?: string;
}

interface QuickActionItem {
  id: string;
  category: string;
  label: string;
  prompt: string;
  icon: string;
}

let messageCounter = 0;
function genId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

// Word-boundary truncation for conversation titles
function toTitle(text: string, max = 60): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 10 ? cut.slice(0, lastSpace) : cut) + "…";
}

const QUICK_ACTIONS_CACHE_KEY = "logicopilot_quick_actions";
const ACTIVE_CONV_KEY = "logicopilot_active_conv";
const MSG_CACHE_PREFIX = "logicopilot_messages_";
const CONVERSATIONS_CACHE_KEY = "logicopilot_conversations";

function msgCacheKey(convId: number) {
  return `${MSG_CACHE_PREFIX}${convId}`;
}

async function saveMessageCache(convId: number, msgs: Message[]) {
  try {
    await AsyncStorage.setItem(msgCacheKey(convId), JSON.stringify(msgs));
  } catch {}
}

async function loadMessageCache(convId: number): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(msgCacheKey(convId));
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

interface CachedConversation {
  id: number;
  title: string;
  createdAt: string;
}

async function saveConversationsCache(convs: CachedConversation[]) {
  try {
    await AsyncStorage.setItem(CONVERSATIONS_CACHE_KEY, JSON.stringify(convs));
  } catch {}
}

async function loadConversationsCache(): Promise<CachedConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedConversation[]) : [];
  } catch {
    return [];
  }
}

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_DOMAIN) return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  return "";
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const { getToken } = useAuth();
  const { isOnline } = useNetwork();

  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [quickActions, setQuickActions] = useState<QuickActionItem[]>([]);
  const [hasQueued, setHasQueued] = useState(false);
  const [cachedConversations, setCachedConversations] = useState<CachedConversation[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const initializedRef = useRef(false);
  const streamAbortRef = useRef<(() => void) | null>(null);
  const isDrainingRef = useRef(false);
  const activeConvIdRef = useRef<number | null>(null);
  const processedPromptRef = useRef<string | null>(null);

  const { data: conversations, refetch: refetchConvs } = useListOpenaiConversations();
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  const topPadding = Platform.OS === "web" ? 67 : 0;
  const bottomPadding = Platform.OS === "web" ? 34 : 0;
  const headerHeight = 60 + (Platform.OS === "web" ? topPadding : insets.top);
  // Standard React Navigation tab bar height + safe-area bottom inset.
  // The tab bar is position:absolute so without this the input hides behind it.
  const TAB_BAR_HEIGHT = 56;
  const contentBottom = Platform.OS === "web" ? bottomPadding : TAB_BAR_HEIGHT + insets.bottom;

  useEffect(() => {
    loadQuickActions();
    loadActiveConvId();
    loadConversationsCache().then(setCachedConversations);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (conversations !== undefined) {
      const toCache: CachedConversation[] = conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
      }));
      setCachedConversations(toCache);
      saveConversationsCache(toCache);
    }
  }, [conversations]);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  useEffect(() => {
    if (params.prompt && params.prompt !== processedPromptRef.current) {
      processedPromptRef.current = params.prompt;
      handleSend(params.prompt);
      router.setParams({ prompt: undefined });
    }
  }, [params.prompt]);

  useEffect(() => {
    if (activeConvId !== null) {
      initializedRef.current = false;
      setMessages([]);
      loadConversation(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    if (isOnline && activeConvId !== null && !isDrainingRef.current) {
      drainQueue(activeConvId);
    }
  }, [isOnline, activeConvId]);

  async function loadQuickActions() {
    try {
      const cached = await AsyncStorage.getItem(QUICK_ACTIONS_CACHE_KEY);
      if (cached) setQuickActions(JSON.parse(cached) as QuickActionItem[]);
    } catch {}
    try {
      const baseUrl = getBaseUrl();
      const resp = await fetch(`${baseUrl}/api/quick-actions`);
      if (resp.ok) {
        const data = (await resp.json()) as QuickActionItem[];
        setQuickActions(data);
        await AsyncStorage.setItem(QUICK_ACTIONS_CACHE_KEY, JSON.stringify(data));
      }
    } catch {}
  }

  async function loadActiveConvId() {
    try {
      const stored = await AsyncStorage.getItem(ACTIVE_CONV_KEY);
      if (stored) setActiveConvId(parseInt(stored, 10));
    } catch {}
  }

  async function persistActiveConvId(id: number | null) {
    try {
      if (id === null) await AsyncStorage.removeItem(ACTIVE_CONV_KEY);
      else await AsyncStorage.setItem(ACTIVE_CONV_KEY, String(id));
    } catch {}
  }

  async function loadConversation(convId: number) {
    if (initializedRef.current) return;

    const cached = await loadMessageCache(convId);
    if (cached.length > 0) {
      setMessages(cached);
      initializedRef.current = true;
    }

    if (!isOnline) return;

    try {
      const baseUrl = getBaseUrl();
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch(`${baseUrl}/api/openai/conversations/${convId}/messages`, { headers });
      if (resp.ok) {
        const data = (await resp.json()) as Array<{ id: number; role: string; content: string }>;
        const serverMsgs: Message[] = data.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const queuedItems = await getQueueForConv(convId);
        const queuedMsgs: Message[] = queuedItems.map((q) => ({
          id: q.id,
          role: "user",
          content: q.content,
          queued: true,
        }));

        const allMsgs = [...serverMsgs, ...queuedMsgs];
        setMessages(allMsgs);
        initializedRef.current = true;
        await saveMessageCache(convId, allMsgs);
        setHasQueued(queuedMsgs.length > 0);
      }
    } catch {}
  }

  async function drainQueue(convId: number) {
    if (isDrainingRef.current) return;
    const queue = await getQueueForConv(convId);
    if (queue.length === 0) {
      setHasQueued(false);
      return;
    }

    isDrainingRef.current = true;
    setHasQueued(false);

    for (const item of queue) {
      if (activeConvIdRef.current !== convId) break;
      await removeFromQueue(item.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, queued: false } : m)),
      );
      await streamMessage(convId, item.content, item.id);
    }

    isDrainingRef.current = false;
  }

  function handleNewChat() {
    // Lazy creation: don't create a DB record until the user sends the first message.
    // The real title (derived from that message) will be used at creation time.
    setShowSidebar(false);
    setActiveConvId(null);
    setMessages([]);
    initializedRef.current = true;
    persistActiveConvId(null);
  }

  async function handleSelectConv(id: number) {
    setShowSidebar(false);
    setActiveConvId(id);
    persistActiveConvId(id);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  async function handleDeleteConv(id: number) {
    try {
      await deleteConv.mutateAsync({ id });
      AsyncStorage.removeItem(msgCacheKey(id)).catch(() => {});
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
        persistActiveConvId(null);
        initializedRef.current = false;
      }
      refetchConvs();
    } catch {}
  }

  async function handleSend(text: string, image?: PendingImage) {
    const hasContent = text.trim().length > 0 || !!image;
    if (isStreaming || !hasContent) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let convId = activeConvId;

    // Offline path — images can't be queued (too large for AsyncStorage), text only
    if (!isOnline) {
      const queueText = text.trim() || "(image — attach when back online)";
      if (convId === null) {
        try {
          const result = await createConv.mutateAsync({ data: { title: toTitle(queueText) } });
          convId = result.id;
          setActiveConvId(convId);
          persistActiveConvId(convId);
          initializedRef.current = true;
          refetchConvs();
        } catch {
          const localId = genId();
          const userMsg: Message = { id: localId, role: "user", content: queueText, queued: true };
          setMessages((prev) => [...prev, userMsg]);
          setHasQueued(true);
          return;
        }
      }
      const localId = genId();
      await enqueueMessage(convId, queueText, localId);
      const userMsg: Message = { id: localId, role: "user", content: queueText, queued: true };
      setMessages((prev) => {
        const updated = [...prev, userMsg];
        saveMessageCache(convId!, updated);
        return updated;
      });
      setHasQueued(true);
      return;
    }

    if (convId === null) {
      const title = image && !text.trim() ? "[Image]" : toTitle(text);
      try {
        const result = await createConv.mutateAsync({ data: { title } });
        convId = result.id;
        setActiveConvId(convId);
        persistActiveConvId(convId);
        initializedRef.current = true;
        refetchConvs();
      } catch {
        return;
      }
    }

    const localId = genId();
    const displayContent = text.trim() || (image ? "(image)" : "");
    const userMsg: Message = {
      id: localId,
      role: "user",
      content: displayContent,
      imageUri: image?.uri,
    };
    setMessages((prev) => [...prev, userMsg]);
    await streamMessage(convId, text, localId, image);
  }

  async function streamMessage(convId: number, content: string, userMsgId: string, image?: PendingImage) {
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;
    const assistantId = genId();
    let aborted = false;

    const abortController = {
      abort: () => {
        aborted = true;
      },
    };
    streamAbortRef.current = abortController.abort;

    try {
      const baseUrl = getBaseUrl();
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: Record<string, unknown> = {
        content: content.trim() || (image ? "(analyse this image)" : ""),
      };
      if (image) {
        body.imageData = image.base64;
        body.imageMimeType = image.mimeType;
      }

      const response = await fetch(`${baseUrl}/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data) as {
              content?: string;
              done?: boolean;
              error?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.done) break;
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => {
                  const updated = [...prev, { id: assistantId, role: "assistant" as const, content: fullContent }];
                  return updated;
                });
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.id === assistantId) {
                    updated[updated.length - 1] = { ...last, content: fullContent };
                  }
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("[streamMessage] outer catch:", err);
      setShowTyping(false);
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      streamAbortRef.current = null;

      setMessages((prev) => {
        saveMessageCache(convId, prev);
        return prev;
      });
    }
  }

  const reversedMessages = [...messages].reverse();

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <OfflineBanner />

      {hasQueued && isOnline && (
        <View style={[styles.queueBanner, { backgroundColor: colors.success }]}>
          <Clock size={14} color={colors.successForeground} />
          <Text style={styles.queueBannerText}>Sending queued messages…</Text>
        </View>
      )}

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === "web" ? topPadding : insets.top,
            height: headerHeight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setShowSidebar(true)}
          activeOpacity={0.7}
        >
          <Menu size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>LogiCopilot</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleNewChat} activeOpacity={0.7}>
          <Pencil size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {messages.length === 0 && !isStreaming ? (
          <View style={styles.emptyContainer}>
            <View style={styles.welcomeContent}>
              <View style={styles.welcomeIcon}>
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>
                How can I help?
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.mutedForeground }]}>
                Ask about ERP, warehouse ops, procurement, HSE, or lifting operations.
              </Text>
            </View>
            {quickActions.length > 0 && (
              <View style={styles.quickActionsWrapper}>
                <Text style={[styles.quickActionsLabel, { color: colors.mutedForeground }]}>
                  Quick Actions
                </Text>
                <QuickActions actions={quickActions} onSelect={handleSend} />
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.messageList,
              { paddingBottom: contentBottom },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={{ paddingBottom: isKeyboardVisible ? 0 : contentBottom }}>
          <ChatInput onSend={(text, image) => handleSend(text, image)} disabled={isStreaming} />
          {!isOnline && (
            <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
              Messages typed offline will be queued and sent automatically when reconnected.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showSidebar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={[styles.sidebarModal, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.sidebarHeader,
              {
                borderBottomColor: colors.border,
                paddingTop: Platform.OS === "web" ? topPadding : insets.top,
              },
            ]}
          >
            <Text style={[styles.sidebarTitle, { color: colors.foreground }]}>Conversations</Text>
            <TouchableOpacity onPress={() => setShowSidebar(false)} style={styles.closeBtn}>
              <X size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ConversationList
            conversations={conversations ?? cachedConversations}
            activeId={activeConvId}
            onSelect={handleSelectConv}
            onDelete={handleDeleteConv}
            onNewChat={handleNewChat}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 24,
  },
  welcomeContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    overflow: "hidden",
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  quickActionsWrapper: {
    gap: 8,
  },
  quickActionsLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
  },
  messageList: {
    paddingVertical: 12,
  },
  queueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  queueBannerText: {
    color: colorTokens.light.successForeground,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  offlineHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    lineHeight: 16,
  },
  sidebarModal: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    minHeight: 80,
  },
  sidebarTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
