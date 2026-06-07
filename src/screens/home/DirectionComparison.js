import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import AnimatedBar from "./AnimatedBar";
import { getScoreColor } from "./homeStats";

export default function DirectionComparison({ data, palette }) {
  const stronger =
    data.enAverage >= data.trAverage ? "En-Tr daha guclu" : "Tr-En daha guclu";

  return (
    <AnimatedPanel
      delay={440}
      style={[
        styles.panel,
        { backgroundColor: palette.app.surface, borderColor: palette.app.border },
      ]}
    >
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: palette.app.text }]}>
          Yon Karsilastirma
        </Text>
        <Text style={[styles.note, { color: palette.app.mutedText }]}>
          {stronger}
        </Text>
      </View>
      <View style={styles.directionRow}>
        <Text style={[styles.label, { color: palette.app.text }]}>En-Tr</Text>
        <AnimatedBar
          color={getScoreColor(data.enAverage, palette)}
          percent={data.enAverage}
          height={12}
          trackColor={palette.app.surfaceSoft}
        />
        <Text
          style={[
            styles.value,
            { color: getScoreColor(data.enAverage, palette) },
          ]}
        >
          {data.enAverage}
        </Text>
      </View>
      <View style={styles.directionRow}>
        <Text style={[styles.label, { color: palette.app.text }]}>Tr-En</Text>
        <AnimatedBar
          color={getScoreColor(data.trAverage, palette)}
          percent={data.trAverage}
          height={12}
          trackColor={palette.app.surfaceSoft}
        />
        <Text
          style={[
            styles.value,
            { color: getScoreColor(data.trAverage, palette) },
          ]}
        >
          {data.trAverage}
        </Text>
      </View>
    </AnimatedPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  note: {
    fontSize: 12,
    fontWeight: "900",
  },
  directionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    width: 44,
    fontSize: 13,
    fontWeight: "900",
  },
  value: {
    width: 34,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
  },
});
