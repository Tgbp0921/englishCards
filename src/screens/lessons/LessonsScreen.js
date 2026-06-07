import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DataContext } from "../../../context/DataContext";

const directions = [
  { key: "enToTr", from: "Ingilizce", to: "Turkce" },
  { key: "trToEn", from: "Turkce", to: "Ingilizce" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const getDecayedBestExamScore = (exams = []) => {
  if (!Array.isArray(exams) || !exams.length) {
    return 0;
  }

  const now = Date.now();

  return exams.reduce((bestScore, exam) => {
    const elapsedDays = Math.max(0, Math.floor((now - exam.date) / DAY_MS));
    const decayedScore = Math.max(
      0,
      Math.round((exam.point || 0) - elapsedDays),
    );

    return Math.max(bestScore, decayedScore);
  }, 0);
};

const formatExamDate = (date) =>
  new Date(date).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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

const DirectionLabel = ({ from, to, palette, compact = false }) => (
  <View style={styles.directionLabel}>
    <Text
      style={[
        compact ? styles.headerDirectionText : styles.radioText,
        { color: palette.app.text },
      ]}
    >
      {from}
    </Text>
    <Ionicons
      name="arrow-forward"
      size={compact ? 14 : 17}
      color={palette.app.mutedText}
    />
    <Text
      style={[
        compact ? styles.headerDirectionText : styles.radioText,
        { color: palette.app.text },
      ]}
    >
      {to}
    </Text>
  </View>
);

export default function LessonsScreen({ navigation }) {
  const { ascncData, loading, palette } = useContext(DataContext);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState("enToTr");
  const [scoreHistory, setScoreHistory] = useState(null);

  const lessons = useMemo(
    () => [...(ascncData.lessons || [])].sort((a, b) => a.date - b.date),
    [ascncData.lessons],
  );

  const closeModal = () => {
    setSelectedLesson(null);
    setSelectedDirection("enToTr");
  };

  const startExam = () => {
    if (!selectedLesson) {
      return;
    }

    navigation.navigate("Exam", {
      lessonId: selectedLesson.id,
      direction: selectedDirection,
      returnRoute: "lessons",
      returnIcon: "book-outline",
    });
    closeModal();
  };

  const openScoreHistory = (lesson, directionKey) => {
    const direction = directions.find((item) => item.key === directionKey);
    const examsKey = directionKey === "enToTr" ? "enToTrExams" : "trToEnExams";
    const exams = [...(lesson[examsKey] || [])].sort((a, b) => b.date - a.date);

    setScoreHistory({
      lessonName: lesson.name,
      direction,
      exams,
    });
  };

  const closeScoreHistory = () => setScoreHistory(null);

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.app.background }]}
      >
        <ActivityIndicator color={palette.app.primary} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: palette.app.background }]}
    >
      <Text style={[styles.title, { color: palette.app.text }]}>SINAV</Text>

      <View
        style={[
          styles.table,
          {
            backgroundColor: palette.app.surface,
            borderColor: palette.app.border,
          },
        ]}
      >
        <View
          style={[
            styles.row,
            styles.headerRow,
            { backgroundColor: palette.app.surfaceSoft },
          ]}
        >
          <Text
            style={[
              styles.headerCell,
              styles.lessonCell,
              styles.lessonHeaderCell,
              { color: palette.app.text },
            ]}
          >
            Ders
          </Text>
          <View style={styles.headerDirectionCell}>
            <DirectionLabel from="En" to="Tr" palette={palette} compact />
          </View>
          <View style={styles.headerDirectionCell}>
            <DirectionLabel from="Tr" to="En" palette={palette} compact />
          </View>
        </View>

        <FlatList
          data={lessons}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const enToTrScore = getDecayedBestExamScore(item.enToTrExams);
            const trToEnScore = getDecayedBestExamScore(item.trToEnExams);

            return (
              <View
                style={[styles.row, { borderTopColor: palette.app.border }]}
              >
                <TouchableOpacity
                  style={styles.lessonCell}
                  onPress={() => setSelectedLesson(item)}
                >
                  <Text
                    style={[styles.lessonName, { color: palette.app.primary }]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.lessonStart, { color: palette.app.mutedText }]}
                  >
                    Basla
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => openScoreHistory(item, "enToTr")}
                >
                  <Text
                    style={[
                      styles.scoreCell,
                      { color: getScoreColor(enToTrScore, palette) },
                    ]}
                  >
                    {enToTrScore}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => openScoreHistory(item, "trToEn")}
                >
                  <Text
                    style={[
                      styles.scoreCell,
                      { color: getScoreColor(trToEnScore, palette) },
                    ]}
                  >
                    {trToEnScore}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.app.mutedText }]}>
              Kayitli ders yok.
            </Text>
          }
        />
      </View>

      <Modal visible={Boolean(selectedLesson)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: palette.app.surface,
                borderColor: palette.app.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.app.text }]}>
              Sinava baslansin mi?
            </Text>

            <View style={styles.radioGroup}>
              {directions.map((direction) => {
                const isSelected = selectedDirection === direction.key;
                return (
                  <Pressable
                    key={direction.key}
                    style={styles.radioRow}
                    onPress={() => setSelectedDirection(direction.key)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: palette.app.primary },
                      ]}
                    >
                      {isSelected ? (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: palette.app.primary },
                          ]}
                        />
                      ) : null}
                    </View>
                    <DirectionLabel
                      from={direction.from}
                      to={direction.to}
                      palette={palette}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.app.border },
                ]}
                onPress={closeModal}
              >
                <Text
                  style={[styles.secondaryText, { color: palette.app.text }]}
                >
                  Hayir
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: palette.app.primary },
                ]}
                onPress={startExam}
              >
                <Text style={styles.primaryText}>Evet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(scoreHistory)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: palette.app.surface,
                borderColor: palette.app.border,
              },
            ]}
          >
            <View style={styles.historyHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.app.text }]}>
                  Not gecmisi
                </Text>
                {scoreHistory ? (
                  <DirectionLabel
                    from={scoreHistory.direction.from}
                    to={scoreHistory.direction.to}
                    palette={palette}
                  />
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeScoreHistory}
              >
                <Ionicons
                  name="close-outline"
                  size={28}
                  color={palette.app.text}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.historyLessonName,
                { color: palette.app.mutedText },
              ]}
            >
              {scoreHistory?.lessonName}
            </Text>

            <View style={styles.historyList}>
              {scoreHistory?.exams.length ? (
                scoreHistory.exams.map((exam) => (
                  <View
                    key={`${exam.date}-${exam.point}`}
                    style={[
                      styles.historyRow,
                      { borderColor: palette.app.border },
                    ]}
                  >
                    <Text
                      style={[styles.historyDate, { color: palette.app.text }]}
                    >
                      {formatExamDate(exam.date)}
                    </Text>
                    <Text
                      style={[
                        styles.historyPoint,
                        { color: getScoreColor(exam.point || 0, palette) },
                      ]}
                    >
                      {exam.point || 0}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.empty, { color: palette.app.mutedText }]}>
                  Gecmis not yok.
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    padding: 18,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 18,
    textTransform: "uppercase",
  },
  table: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
  },
  headerRow: {
    borderTopWidth: 0,
  },
  headerCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  lessonHeaderCell: {
    textAlign: "left",
  },
  headerDirectionCell: {
    flex: 1,
    alignItems: "center",
  },
  directionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  headerDirectionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  lessonCell: {
    flex: 1.25,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  lessonName: {
    fontSize: 16,
    fontWeight: "800",
  },
  lessonStart: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 2,
  },
  scoreCell: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  scoreButton: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    padding: 18,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  historyLessonName: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  historyDate: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  historyPoint: {
    fontSize: 20,
    fontWeight: "900",
  },
  radioGroup: {
    gap: 12,
    marginBottom: 22,
  },
  radioRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioText: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "800",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
