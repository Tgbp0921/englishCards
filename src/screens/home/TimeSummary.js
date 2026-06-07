import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import AnimatedBar from "./AnimatedBar";
import { getScoreColor } from "./homeStats";

export default function TimeSummary({ data, palette }) {
  const maxTotal = Math.max(1, ...data.map((item) => item.total));

  return (
    <AnimatedPanel
      delay={120}
      style={[
        styles.panel,
        { backgroundColor: palette.app.surface, borderColor: palette.app.border },
      ]}
    >
      <Text style={[styles.title, { color: palette.app.text }]}>Zaman Ozeti</Text>
      {data.map((item) => (
        <View key={item.key} style={styles.row}>
          <Text style={[styles.label, { color: palette.app.text }]}>
            {item.label}
          </Text>
          <View style={styles.metrics}>
            <Text style={[styles.metric, { color: palette.app.mutedText }]}>
              {item.total} cevap
            </Text>
            <Text style={[styles.metric, { color: palette.score.excellent }]}>
              {item.correct} dogru
            </Text>
            <Text style={[styles.metric, { color: palette.score.low }]}>
              {item.wrong} yanlis
            </Text>
            <Text
              style={[
                styles.average,
                { color: getScoreColor(item.average, palette) },
              ]}
            >
              ort. {item.average}
            </Text>
          </View>
          <AnimatedBar
            color={getScoreColor(item.average, palette)}
            percent={(item.total / maxTotal) * 100}
            trackColor={palette.app.surfaceSoft}
          />
        </View>
      ))}
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
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  row: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metric: {
    fontSize: 11,
    fontWeight: "800",
  },
  average: {
    fontSize: 11,
    fontWeight: "900",
  },
});
