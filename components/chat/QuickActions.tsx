import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

interface QuickAction {
  id: string;
  category: string;
  label: string;
  prompt: string;
  icon: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  onSelect: (prompt: string) => void;
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
  const colors = useColors();

  return (
    <FlatList
      horizontal
      data={actions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      showsHorizontalScrollIndicator={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onSelect(item.prompt)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, { color: colors.foreground }]}>{item.label}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
