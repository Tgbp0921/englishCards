import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DataContext } from "../../context/DataContext";

const DAY_MS = 24 * 60 * 60 * 1000;

const ranges = [
  { key: "month", label: "Son 1 ay", days: 30, icon: "calendar-outline" },
  { key: "week", label: "Son 1 hafta", days: 7, icon: "today-outline" },
  { key: "day", label: "Son 1 gun", days: 1, icon: "time-outline" },
];

const scoreRanges = [
  { key: "great", label: "100-85", min: 85, max: 101 },
  { key: "good", label: "85-70", min: 70, max: 85 },
  { key: "mid", label: "70-50", min: 50, max: 70 },
  { key: "low", label: "50-0", min: 0, max: 50 },
];

const getAllCardAttempts = (lessons) =>
  (lessons || []).flatMap((lesson) =>
    (lesson.cards || []).flatMap((card) => [
      ...(card.fromEnToTrPoints || []),
      ...(card.fromTrToEnPoints || []),
    ]),
  );

const getRangeStats = (attempts, days) => {
  const threshold = Date.now() - days * DAY_MS;
  const filteredAttempts = attempts.filter((attempt) => attempt.date >= threshold);
  const correct = filteredAttempts.filter((attempt) => (attempt.point || 0) > 0).length;

  return {
    total: filteredAttempts.length,
    correct,
    wrong: filteredAttempts.length - correct,
  };
};

const hasLastThreeHighEnToTrScores = (card) => {
  const lastThreeScores = [...(card.fromEnToTrPoints || [])]
    .sort((a, b) => b.date - a.date)
    .slice(0, 3);

  return (
    lastThreeScores.length === 3 &&
    lastThreeScores.every((attempt) => (attempt.point || 0) >= 85)
  );
};

const averagePoints = (points = []) => {
  if (!points.length) {
    return 0;
  }

  return Math.round(
    points.reduce((sum, item) => sum + (item.point || 0), 0) / points.length,
  );
};

const getOverallCardAverage = (card) =>
  averagePoints([
    ...(card.fromEnToTrPoints || []),
    ...(card.fromTrToEnPoints || []),
  ]);

const getBucketCounts = (cards = []) =>
  scoreRanges.map((range) => ({
    ...range,
    count: cards.filter((card) => {
      const average = getOverallCardAverage(card);
      return average >= range.min && average < range.max;
    }).length,
  }));

const getScoreColor = (score, palette) => {
  if (score < 50) {
    return palette.score.low;
  }
  if (score < 70) {
    return palette.score.medium;
  }
  if (score < 85) {
    return palette.score.good;
  }
  return palette.score.excellent;
};

export default function HomeScreen() {
  const { ascncData, palette } = useContext(DataContext);
  const lessons = ascncData.lessons || [];

  const summary = useMemo(() => {
    const attempts = getAllCardAttempts(lessons);
    const totalCards = lessons.reduce(
      (sum, lesson) => sum + (lesson.cards?.length || 0),
      0,
    );
    const highEnToTrCards = lessons.reduce(
      (sum, lesson) =>
        sum + (lesson.cards || []).filter(hasLastThreeHighEnToTrScores).length,
      0,
    );

    return {
      totalCards,
      highEnToTrCards,
      rangeStats: ranges.map((range) => ({
        ...range,
        ...getRangeStats(attempts, range.days),
      })),
      lessonStats: lessons.map((lesson) => ({
        id: lesson.id,
        name: lesson.name,
        cardCount: lesson.cards?.length || 0,
        buckets: getBucketCounts(lesson.cards || []),
        highEnToTrCards: (lesson.cards || []).filter(
          hasLastThreeHighEnToTrScores,
        ).length,
      })),
    };
  }, [lessons]);

  return (
    <View style={[styles.container, { backgroundColor: palette.app.background }]}>
      <Text style={[styles.title, { color: palette.app.text }]}>ANASAYFA</Text>

      <View style={styles.rangeGrid}>
        {summary.rangeStats.map((item) => (
          <View
            key={item.key}
            style={[
              styles.statCard,
              { backgroundColor: palette.app.surface, borderColor: palette.app.border },
            ]}
          >
            <View style={styles.statHeader}>
              <Ionicons name={item.icon} size={22} color={palette.app.primary} />
              <Text style={[styles.statTitle, { color: palette.app.text }]}>
                {item.label}
              </Text>
            </View>
            <Text style={[styles.statValue, { color: palette.app.text }]}>
              {item.total}
            </Text>
            <View style={styles.statFooter}>
              <View style={styles.footerItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={palette.score.excellent}
                />
                <Text style={[styles.footerText, { color: palette.app.mutedText }]}>
                  {item.correct}
                </Text>
              </View>
              <View style={styles.footerItem}>
                <Ionicons name="close-circle" size={16} color={palette.score.low} />
                <Text style={[styles.footerText, { color: palette.app.mutedText }]}>
                  {item.wrong}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalGrid}>
        <View
          style={[
            styles.wideCard,
            { backgroundColor: palette.app.surface, borderColor: palette.app.border },
          ]}
        >
          <Ionicons name="albums-outline" size={24} color={palette.app.primary} />
          <View>
            <Text style={[styles.metaLabel, { color: palette.app.mutedText }]}>
              Toplam kart
            </Text>
            <Text style={[styles.metaValue, { color: palette.app.text }]}>
              {summary.totalCards}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.wideCard,
            { backgroundColor: palette.app.surface, borderColor: palette.app.border },
          ]}
        >
          <Ionicons name="trophy-outline" size={24} color={palette.score.excellent} />
          <View>
            <Text style={[styles.metaLabel, { color: palette.app.mutedText }]}>
              Son 3 En-Tr 85+
            </Text>
            <Text style={[styles.metaValue, { color: palette.app.text }]}>
              {summary.highEnToTrCards}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.lessonScroller}
      >
        {summary.lessonStats.map((lesson) => (
          <View
            key={lesson.id}
            style={[
              styles.lessonCard,
              { backgroundColor: palette.app.surface, borderColor: palette.app.border },
            ]}
          >
            <Text style={[styles.lessonTitle, { color: palette.app.text }]}>
              {lesson.name}
            </Text>
            <View style={styles.lessonMetric}>
              <Ionicons name="library-outline" size={18} color={palette.app.primary} />
              <Text style={[styles.lessonMetricText, { color: palette.app.mutedText }]}>
                {lesson.cardCount} kart
              </Text>
            </View>
            <View style={styles.bucketRow}>
              {lesson.buckets.map((bucket) => (
                <View
                  key={bucket.key}
                  style={[
                    styles.bucket,
                    { backgroundColor: palette.app.surfaceSoft },
                  ]}
                >
                  <Text
                    style={[styles.bucketLabel, { color: palette.app.mutedText }]}
                  >
                    {bucket.label}
                  </Text>
                  <Text
                    style={[
                      styles.bucketValue,
                      { color: getScoreColor(bucket.min, palette) },
                    ]}
                  >
                    {bucket.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rangeGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  statHeader: {
    minHeight: 42,
    gap: 6,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  statValue: {
    fontSize: 34,
    fontWeight: "900",
  },
  statFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "900",
  },
  totalGrid: {
    flexDirection: "row",
    gap: 10,
  },
  wideCard: {
    flex: 1,
    minHeight: 78,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  lessonScroller: {
    gap: 10,
    paddingRight: 18,
  },
  lessonCard: {
    width: 240,
    minHeight: 142,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  lessonMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  lessonMetricText: {
    fontSize: 13,
    fontWeight: "800",
  },
  bucketRow: {
    flexDirection: "row",
    gap: 6,
  },
  bucket: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bucketLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  bucketValue: {
    fontSize: 18,
    fontWeight: "900",
  },
});
