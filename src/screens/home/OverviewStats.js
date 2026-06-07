import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import { getScoreColor } from "./homeStats";

const items = [
  { key: "totalWords", label: "Toplam Kelime", icon: "albums-outline" },
  { key: "totalLessons", label: "Toplam Ders", icon: "library-outline" },
  { key: "totalAttempts", label: "Toplam Deneme", icon: "mic-outline" },
  { key: "overallAverage", label: "Genel Ortalama", icon: "pulse-outline" },
  { key: "lastStudy", label: "Son Calisma", icon: "time-outline" },
];

export default function OverviewStats({ data, palette }) {
  return (
    <AnimatedPanel delay={40}>
      <View style={styles.grid}>
        {items.map((item) => {
          const isAverage = item.key === "overallAverage";
          const value = data[item.key];

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
              <Text
                style={[
                  styles.value,
                  {
                    color: isAverage
                      ? getScoreColor(Number(value) || 0, palette)
                      : palette.app.text,
                  },
                ]}
              >
                {value}
              </Text>
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
