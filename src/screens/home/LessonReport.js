import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import { getScoreColor } from "./homeStats";

export default function LessonReport({ data, palette }) {
  return (
    <AnimatedPanel
      delay={200}
      style={[
        styles.panel,
        { backgroundColor: palette.app.surface, borderColor: palette.app.border },
      ]}
    >
      <Text style={[styles.title, { color: palette.app.text }]}>Ders Raporu</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View
            style={[
              styles.row,
              styles.headerRow,
              { backgroundColor: palette.app.surfaceSoft },
            ]}
          >
            {["Ders", "Kelime", "En-Tr", "Tr-En", "Ort.", "Zayif"].map(
              (label, index) => (
                <Text
                  key={label}
                  style={[
                    styles.cell,
                    index === 0 && styles.lessonCell,
                    { color: palette.app.mutedText },
                  ]}
                >
                  {label}
                </Text>
              ),
            )}
          </View>
          {data.map((lesson) => (
            <View
              key={lesson.id}
              style={[styles.row, { borderTopColor: palette.app.border }]}
            >
              <Text
                style={[
                  styles.cell,
                  styles.lessonCell,
                  { color: palette.app.text },
                ]}
                numberOfLines={1}
              >
                {lesson.name}
              </Text>
              <Text style={[styles.cell, { color: palette.app.text }]}>
                {lesson.wordCount}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { color: getScoreColor(lesson.enAverage, palette) },
                ]}
              >
                {lesson.enAverage}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { color: getScoreColor(lesson.trAverage, palette) },
                ]}
              >
                {lesson.trAverage}
              </Text>
              <Text
                style={[
                  styles.cell,
                  { color: getScoreColor(lesson.average, palette) },
                ]}
              >
                {lesson.average}
              </Text>
              <Text style={[styles.cell, { color: palette.score.low }]}>
                {lesson.weakCount}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
  },
  headerRow: {
    borderTopWidth: 0,
    borderRadius: 6,
  },
  cell: {
    width: 58,
    paddingHorizontal: 5,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  lessonCell: {
    width: 104,
    textAlign: "left",
  },
});
