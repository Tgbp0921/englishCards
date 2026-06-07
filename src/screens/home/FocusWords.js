import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AnimatedPanel from "./AnimatedPanel";
import { getScoreColor } from "./homeStats";

const toRefs = (items) =>
  items.map((item) => ({
    lessonId: item.lessonId,
    cardId: item.cardId,
  }));

function WordList({ title, items, palette, type, onStart }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={[
        styles.listCard,
        { backgroundColor: palette.app.surface, borderColor: palette.app.border },
      ]}
      onPress={() => onStart(toRefs(items))}
    >
      <View style={styles.listHeader}>
        <Text style={[styles.title, { color: palette.app.text }]}>{title}</Text>
        <View
          style={[
            styles.startPill,
            { backgroundColor: palette.app.primarySoft },
          ]}
        >
          <Ionicons name="play" size={13} color={palette.app.primary} />
          <Text style={[styles.startText, { color: palette.app.primary }]}>
            Basla
          </Text>
        </View>
      </View>
      <View style={styles.wordsWrap}>
        {items.map((item) => {
          const scoreColor = getScoreColor(item.enAverage, palette);

          return (
            <View
              key={`${item.lessonId}-${item.cardId}`}
              style={[
                styles.wordChip,
                { backgroundColor: palette.app.surfaceSoft },
              ]}
            >
              <Text style={[styles.wordText, { color: palette.app.text }]}>
                {item.english}
              </Text>
              <Text
                style={[
                  styles.wordMeta,
                  {
                    color:
                      type === "forgotten" ? palette.app.mutedText : scoreColor,
                  },
                ]}
              >
                {type === "forgotten" ? item.ageLabel : item.enAverage}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

export default function FocusWords({
  forgottenWords,
  onStart,
  palette,
  weakWords,
}) {
  return (
    <AnimatedPanel delay={360} style={styles.panel}>
      <WordList
        title="En Zayif Kelimeler"
        items={weakWords}
        palette={palette}
        type="weak"
        onStart={onStart}
      />
      <WordList
        title="En Uzun Suredir Calisilmayanlar"
        items={forgottenWords}
        palette={palette}
        type="forgotten"
        onStart={onStart}
      />
    </AnimatedPanel>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
  },
  listCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 11,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  startPill: {
    minHeight: 28,
    borderRadius: 8,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  startText: {
    fontSize: 11,
    fontWeight: "900",
  },
  wordsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  wordChip: {
    minHeight: 34,
    borderRadius: 8,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wordText: {
    fontSize: 13,
    fontWeight: "900",
  },
  wordMeta: {
    fontSize: 12,
    fontWeight: "900",
  },
});
