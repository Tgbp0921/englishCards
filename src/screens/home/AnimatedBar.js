import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function AnimatedBar({ color, percent, height = 10, trackColor }) {
  const progress = useRef(new Animated.Value(0)).current;
  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${Math.max(0, Math.min(100, percent))}%`],
  });

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [percent, progress]);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
