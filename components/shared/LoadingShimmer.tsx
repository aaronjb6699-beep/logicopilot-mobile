import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function LoadingShimmer({ width = "100%", height = 16, borderRadius = 8, style }: ShimmerProps) {
  const colors = useColors();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(animatedValue, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.muted, colors.border],
  });

  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius, backgroundColor }, style]}
    />
  );
}

export function CardShimmer() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LoadingShimmer height={16} width="70%" />
      <LoadingShimmer height={12} width="90%" style={{ marginTop: 8 }} />
      <LoadingShimmer height={12} width="50%" style={{ marginTop: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
