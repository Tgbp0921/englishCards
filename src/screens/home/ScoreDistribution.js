import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import AnimatedBar from "./AnimatedBar";
import { getScoreColor } from "./homeStats";

export default function ScoreDistribution({ data, palette }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(1, ...data.map((item) => item.count));

  return (
    <AnimatedPanel
      delay={280}
      style={[
        styles.panel,
        { backgroundColor: palette.app.surface, borderColor: palette.app.border },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: palette.app.text }]}>
          Puan Dagilimi
        </Text>
        <Text style={[styles.total, { color: palette.app.mutedText }]}>
          {total} kelime
        </Text>
      </View>
      {data.map((item) => {
        const color = getScoreColor(item.min, palette);

        return (
          <View key={item.key} style={styles.row}>
            <Text style={[styles.label, { color }]}>{item.label}</Text>
            <AnimatedBar
              color={color}
              percent={(item.count / maxCount) * 100}
              height={12}
              trackColor={palette.app.surfaceSoft}
            />
            <Text style={[styles.count, { color: palette.app.text }]}>
              {item.count}
            </Text>
          </View>
        );
      })}
    </AnimatedPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  total: {
    fontSize: 12,
    fontWeight: "900",
  },
  row: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  label: {
    width: 48,
    fontSize: 12,
    fontWeight: "900",
  },
  count: {
    width: 28,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right",
  },
});
