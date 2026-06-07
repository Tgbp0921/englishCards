import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import { getScoreColor } from "./homeStats";

const items = [
  { key: "totalWords", label: "Toplam Kelime", icon: "albums-outline" },
  { key: "totalLessons", label: "Toplam Ders", icon: "library-outline" },
  { key: "totalAttempts", label: "Toplam Deneme", icon: "mic-outline" },
  { key: "overallAverage", label: "Genel Ortalama", icon: "pulse-outline" },
  { key: "lastStudy", label: "Son Calisma", icon: "time-outline" },
];

function AnimatedNumber({ color, value }) {
  const numericValue = Number(value) || 0;
  const progress = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const listenerId = progress.addListener(({ value: animatedValue }) => {
      setDisplayValue(Math.round(animatedValue));
    });

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: numericValue,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    return () => {
      progress.removeListener(listenerId);
    };
  }, [numericValue, progress]);

  return <Text style={[styles.value, { color }]}>{displayValue}</Text>;
}

export default function OverviewStats({ data, palette }) {
  return (
    <AnimatedPanel delay={40}>
      <View style={styles.grid}>
        {items.map((item) => {
          const isAverage = item.key === "overallAverage";
          const isNumeric = item.key !== "lastStudy";
          const value = data[item.key];
          const valueColor = isAverage
            ? getScoreColor(Number(value) || 0, palette)
            : palette.app.text;

          return (
            <View
              key={item.key}
              style={[
                styles.card,
                {
                  backgroundColor: palette.app.surface,
                  borderColor: palette.app.border,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={
                  isAverage
                    ? getScoreColor(Number(value) || 0, palette)
                    : palette.app.primary
                }
              />
              <Text style={[styles.label, { color: palette.app.mutedText }]}>
                {item.label}
              </Text>
              {isNumeric ? (
                <AnimatedNumber color={valueColor} value={value} />
              ) : (
                <Text style={[styles.value, { color: valueColor }]}>
                  {value}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </AnimatedPanel>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  card: {
    flexGrow: 1,
    flexBasis: "31%",
    minHeight: 88,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 22,
    fontWeight: "900",
  },
});
