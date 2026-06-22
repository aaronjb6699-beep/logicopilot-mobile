import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MessageSquare, Plus, Trash2 } from "lucide-react-native";
import { useColors } from "@/hooks/useColors";
import colorTokens from "@/constants/colors";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNewChat: () => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
}: ConversationListProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
        onPress={onNewChat}
        activeOpacity={0.8}
      >
        <Plus size={18} color={colors.primaryForeground} />
        <Text style={styles.newChatText}>New Chat</Text>
      </TouchableOpacity>

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isActive = item.id === activeId;
          return (
            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: isActive ? colors.secondary : "transparent",
                  borderColor: isActive ? colors.border : "transparent",
                },
              ]}
              onPress={() => onSelect(item.id)}
              activeOpacity={0.7}
            >
              <MessageSquare
                size={15}
                color={isActive ? colors.accent : colors.mutedForeground}
                style={styles.itemIcon}
              />
              <Text
                style={[
                  styles.itemTitle,
                  { color: isActive ? colors.accent : colors.foreground },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() => onDelete(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  newChatText: {
    color: colorTokens.light.primaryForeground,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 8,
    gap: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemTitle: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  deleteBtn: {
    flexShrink: 0,
    padding: 2,
  },
});
