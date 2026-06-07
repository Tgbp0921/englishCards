import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DataContext } from "../../../context/DataContext";

const MAX_WORD_COUNT = 30;

const modes = [
  { key: "mixed", label: "Karisik" },
  { key: "weak", label: "Az bilinen" },
  { key: "forgotten", label: "Unutulan" },
];

const tabs = [
  { key: "quick", label: "Hizli secim" },
  { key: "manual", label: "Elle secim" },
];

const manualDirections = [
  { key: "enToTr", label: "En" },
  { key: "trToEn", label: "Tr" },
];

const sortFields = [
  { key: "word", label: "A-Z", ascKey: "wordAsc", descKey: "wordDesc" },
  { key: "enScore", label: "1-9", ascKey: "enScoreAsc", descKey: "enScoreDesc" },
  { key: "trScore", label: "1-9", ascKey: "trScoreAsc", descKey: "trScoreDesc" },
];

const getAllPoints = (card) => [
  ...(card.fromEnToTrPoints || []),
  ...(card.fromTrToEnPoints || []),
];

const getLastThreeAverage = (card) => {
  const points = getAllPoints(card)
    .sort((a, b) => b.date - a.date)
    .slice(0, 3);

  if (!points.length) {
    return 0;
  }

  return Math.round(
    points.reduce((sum, item) => sum + (item.point || 0), 0) / points.length,
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

const getEnScore = (card) => averagePoints(card.fromEnToTrPoints || []);

const getTrScore = (card) => averagePoints(card.fromTrToEnPoints || []);

const getLastAnswerDate = (card) =>
  getAllPoints(card).reduce(
    (latestDate, item) => Math.max(latestDate, item.date || 0),
    0,
  );

const byWeakest = (left, right) =>
  getLastThreeAverage(left.card) - getLastThreeAverage(right.card) ||
  getLastAnswerDate(left.card) - getLastAnswerDate(right.card);

const byForgotten = (left, right) =>
  getLastAnswerDate(left.card) - getLastAnswerDate(right.card) ||
  getLastThreeAverage(left.card) - getLastThreeAverage(right.card);

const getCandidateKey = (candidate) =>
  `${candidate.lessonId}-${candidate.card.id}`;

const takeUnique = (source, limit, existingKeys = new Set()) => {
  const selected = [];
  const selectedKeys = new Set(existingKeys);

  source.some((candidate) => {
    const key = getCandidateKey(candidate);

    if (!selectedKeys.has(key)) {
      selected.push(candidate);
      selectedKeys.add(key);
    }

    return selected.length >= limit;
  });

  return selected;
};

const pickCards = (candidates, mode, count) => {
  const weakCards = [...candidates].sort(byWeakest);
  const forgottenCards = [...candidates].sort(byForgotten);

  if (mode === "weak") {
    return takeUnique(weakCards, count);
  }

  if (mode === "forgotten") {
    return takeUnique(forgottenCards, count);
  }

  const weakCount = Math.ceil(count / 2);
  const forgottenCount = Math.floor(count / 2);
  const pickedWeak = takeUnique(weakCards, weakCount);
  const pickedKeys = new Set(pickedWeak.map(getCandidateKey));
  const pickedForgotten = takeUnique(forgottenCards, forgottenCount, pickedKeys);
  const combined = [...pickedWeak, ...pickedForgotten];

  if (combined.length >= count) {
    return combined;
  }

  const remainingKeys = new Set(combined.map(getCandidateKey));
  return [
    ...combined,
    ...takeUnique(
      [...weakCards, ...forgottenCards],
      count - combined.length,
      remainingKeys,
    ),
  ];
};

export default function StudyScreen({ navigation }) {
  const { ascncData, loading, palette } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState("quick");
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);
  const [didInitLessonSelection, setDidInitLessonSelection] = useState(false);
  const [selectedMode, setSelectedMode] = useState("mixed");
  const [wordCount, setWordCount] = useState(5);
  const [lessonSelectOpen, setLessonSelectOpen] = useState(false);
  const [countSelectOpen, setCountSelectOpen] = useState(false);
  const [manualDirection, setManualDirection] = useState("enToTr");
  const [openLessonIds, setOpenLessonIds] = useState([]);
  const [selectedWordKeys, setSelectedWordKeys] = useState([]);
  const [tooltipKey, setTooltipKey] = useState(null);
  const [longPressedKey, setLongPressedKey] = useState(null);
  const [manualSortKey, setManualSortKey] = useState("wordAsc");

  const lessons = useMemo(
    () => [...(ascncData.lessons || [])].sort((a, b) => a.date - b.date),
    [ascncData.lessons],
  );

  const lessonOptions = useMemo(
    () => [
      {
        id: "all",
        name: "Hepsi",
        count: lessons.reduce(
          (sum, lesson) => sum + (lesson.cards?.length || 0),
          0,
        ),
      },
      ...lessons.map((lesson) => ({
        id: lesson.id,
        name: lesson.name,
        count: lesson.cards?.length || 0,
      })),
    ],
    [lessons],
  );

  useEffect(() => {
    if (didInitLessonSelection || !lessons.length) {
      return;
    }

    setSelectedLessonIds(lessons.map((lesson) => lesson.id));
    setDidInitLessonSelection(true);
  }, [didInitLessonSelection, lessons]);

  const allLessonIds = useMemo(
    () => lessons.map((lesson) => lesson.id),
    [lessons],
  );
  const allLessonsSelected =
    allLessonIds.length > 0 &&
    allLessonIds.every((lessonId) => selectedLessonIds.includes(lessonId));
  const selectedLessonLabel = allLessonsSelected
    ? "Hepsi"
    : selectedLessonIds.length
      ? `${selectedLessonIds.length} ders`
      : "Ders sec";

  const candidates = useMemo(
    () =>
      lessons
        .filter((lesson) => selectedLessonIds.includes(lesson.id))
        .flatMap((lesson) =>
          (lesson.cards || []).map((card) => ({
            lessonId: lesson.id,
            lessonName: lesson.name,
            card,
          })),
        ),
    [lessons, selectedLessonIds],
  );

  const maxWordCount = Math.min(MAX_WORD_COUNT, candidates.length);
  const countOptions = Array.from(
    { length: maxWordCount },
    (_, index) => index + 1,
  );

  useEffect(() => {
    if (!maxWordCount) {
      setWordCount(0);
      return;
    }

    setWordCount(Math.min(5, maxWordCount));
  }, [maxWordCount, selectedLessonIds]);

  const toggleAllLessons = () => {
    setSelectedLessonIds(allLessonsSelected ? [] : allLessonIds);
  };

  const toggleLesson = (lessonId) => {
    setSelectedLessonIds((previousIds) =>
      previousIds.includes(lessonId)
        ? previousIds.filter((id) => id !== lessonId)
        : [...previousIds, lessonId],
    );
  };

  const getWordKey = (lessonId, cardId) => `${lessonId}-${cardId}`;

  const isWordSelected = (lessonId, cardId) =>
    selectedWordKeys.includes(getWordKey(lessonId, cardId));

  const getLessonWordKeys = (lesson) =>
    (lesson.cards || []).map((card) => getWordKey(lesson.id, card.id));

  const getLessonSelectedCount = (lesson) =>
    getLessonWordKeys(lesson).filter((key) => selectedWordKeys.includes(key))
      .length;

  const toggleAccordion = (lessonId) => {
    setOpenLessonIds((previousIds) =>
      previousIds.includes(lessonId)
        ? previousIds.filter((id) => id !== lessonId)
        : [...previousIds, lessonId],
    );
  };

  const toggleLessonWords = (lesson) => {
    const lessonWordKeys = getLessonWordKeys(lesson);
    const allSelected = lessonWordKeys.every((key) =>
      selectedWordKeys.includes(key),
    );

    setSelectedWordKeys((previousKeys) => {
      if (allSelected) {
        return previousKeys.filter((key) => !lessonWordKeys.includes(key));
      }

      return [...new Set([...previousKeys, ...lessonWordKeys])];
    });
  };

  const toggleWord = (lessonId, cardId) => {
    const key = getWordKey(lessonId, cardId);

    setSelectedWordKeys((previousKeys) =>
      previousKeys.includes(key)
        ? previousKeys.filter((item) => item !== key)
        : [...previousKeys, key],
    );
  };

  const getSortedCards = (cards = []) =>
    [...cards].sort((left, right) => {
      if (manualSortKey === "enScoreAsc") {
        return getEnScore(left) - getEnScore(right);
      }
      if (manualSortKey === "enScoreDesc") {
        return getEnScore(right) - getEnScore(left);
      }
      if (manualSortKey === "trScoreAsc") {
        return getTrScore(left) - getTrScore(right);
      }
      if (manualSortKey === "trScoreDesc") {
        return getTrScore(right) - getTrScore(left);
      }

      const leftWord =
        manualDirection === "enToTr" ? left.english : left.turkish;
      const rightWord =
        manualDirection === "enToTr" ? right.english : right.turkish;
      const comparison = String(leftWord || "").localeCompare(
        String(rightWord || ""),
        "tr",
      );

      return manualSortKey === "wordDesc" ? -comparison : comparison;
    });

  const toggleManualSort = (field) => {
    setManualSortKey((previousKey) =>
      previousKey === field.ascKey ? field.descKey : field.ascKey,
    );
  };

  const startMixedExam = () => {
    const selectedCards = pickCards(candidates, selectedMode, wordCount);

    if (!selectedCards.length) {
      return;
    }

    navigation.navigate("Exam", {
      direction: "enToTr",
      returnRoute: "study",
      returnIcon: "create-outline",
      isPracticeMode: true,
      mixedCardRefs: selectedCards.map((candidate) => ({
        lessonId: candidate.lessonId,
        cardId: candidate.card.id,
      })),
    });
  };

  const startManualExam = () => {
    const selectedCards = lessons.flatMap((lesson) =>
      (lesson.cards || [])
        .filter((card) => isWordSelected(lesson.id, card.id))
        .map((card) => ({
          lessonId: lesson.id,
          cardId: card.id,
        })),
    );

    if (!selectedCards.length) {
      return;
    }

    navigation.navigate("Exam", {
      direction: manualDirection,
      returnRoute: "study",
      returnIcon: "create-outline",
      isPracticeMode: true,
      mixedCardRefs: selectedCards,
    });
  };

  const startActiveSelection = () => {
    if (activeTab === "manual") {
      startManualExam();
      return;
    }

    startMixedExam();
  };

  const canStart =
    activeTab === "manual" ? selectedWordKeys.length > 0 : maxWordCount > 0;

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
    <View style={[styles.container, { backgroundColor: palette.app.background }]}>
      <Text style={[styles.title, { color: palette.app.text }]}>CALISMA</Text>

      <View style={styles.topControls}>
        <View style={[styles.tabs, { borderColor: palette.app.border }]}>
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  {
                    borderBottomColor: isSelected
                      ? palette.app.primary
                      : "transparent",
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isSelected
                        ? palette.app.primary
                        : palette.app.mutedText,
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          disabled={!canStart}
          style={[
            styles.headerStartButton,
            {
              backgroundColor: palette.app.primary,
              opacity: canStart ? 1 : 0.55,
            },
          ]}
          onPress={startActiveSelection}
        >
          <Text style={styles.startText}>Basla</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "quick" ? (
        <>

      <View
        style={[
          styles.panel,
          { backgroundColor: palette.app.surface, borderColor: palette.app.border },
        ]}
      >
        <Text style={[styles.label, { color: palette.app.mutedText }]}>Ders</Text>
        <TouchableOpacity
          style={[styles.selectButton, { borderColor: palette.app.border }]}
          onPress={() => setLessonSelectOpen(true)}
        >
          <Text style={[styles.selectText, { color: palette.app.text }]}>
            {selectedLessonLabel}
          </Text>
          <View style={styles.selectMeta}>
            <Text style={[styles.selectCount, { color: palette.app.mutedText }]}>
              {maxWordCount} kelime
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={palette.app.mutedText}
            />
          </View>
        </TouchableOpacity>

        <Text style={[styles.label, { color: palette.app.mutedText }]}>Tur</Text>
        <View style={styles.radioGroup}>
          {modes.map((mode) => {
            const isSelected = selectedMode === mode.key;

            return (
              <Pressable
                key={mode.key}
                style={styles.radioRow}
                onPress={() => setSelectedMode(mode.key)}
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
                <Text style={[styles.radioText, { color: palette.app.text }]}>
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: palette.app.mutedText }]}>
          Kelime sayisi
        </Text>
        <TouchableOpacity
          disabled={!maxWordCount}
          style={[
            styles.selectButton,
            {
              borderColor: palette.app.border,
              opacity: maxWordCount ? 1 : 0.55,
            },
          ]}
          onPress={() => setCountSelectOpen(true)}
        >
          <Text style={[styles.selectText, { color: palette.app.text }]}>
            {wordCount || 0}
          </Text>
          <View style={styles.selectMeta}>
            <Text style={[styles.selectCount, { color: palette.app.mutedText }]}>
              max {maxWordCount}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={palette.app.mutedText}
            />
          </View>
        </TouchableOpacity>

      </View>
        </>
      ) : (
        <View
          style={[
            styles.panel,
            styles.manualPanel,
            { backgroundColor: palette.app.surface, borderColor: palette.app.border },
          ]}
        >
          <View style={styles.manualHeader}>
            <View style={styles.directionGroup}>
              {manualDirections.map((direction) => {
                const isSelected = manualDirection === direction.key;

                return (
                  <Pressable
                    key={direction.key}
                    style={styles.directionOption}
                    onPress={() => setManualDirection(direction.key)}
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
                    <Text
                      style={[styles.directionText, { color: palette.app.text }]}
                    >
                      {direction.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.selectedCount, { color: palette.app.mutedText }]}>
              {selectedWordKeys.length} secili
            </Text>
          </View>

          <ScrollView style={styles.manualList}>
            {lessons.map((lesson) => {
              const isOpen = openLessonIds.includes(lesson.id);
              const selectedCount = getLessonSelectedCount(lesson);

              return (
                <View
                  key={lesson.id}
                  style={[
                    styles.accordion,
                    {
                      borderColor: palette.app.border,
                      backgroundColor: palette.app.surfaceSoft,
                    },
                  ]}
                >
                  <View style={styles.accordionHeader}>
                    <TouchableOpacity
                      style={styles.accordionTitleButton}
                      onPress={() => toggleAccordion(lesson.id)}
                    >
                      <Ionicons
                        name={isOpen ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color={palette.app.primary}
                      />
                      <Text
                        style={[
                          styles.accordionTitle,
                          { color: palette.app.text },
                        ]}
                      >
                        {lesson.name}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.accordionMeta,
                        { color: palette.app.mutedText },
                      ]}
                    >
                      {selectedCount}/{lesson.cards?.length || 0}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        { borderColor: palette.app.border },
                      ]}
                      onPress={() => toggleLessonWords(lesson)}
                    >
                      <Text
                        style={[
                          styles.smallButtonText,
                          { color: palette.app.primary },
                        ]}
                      >
                        Hepsi
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isOpen ? (
                    <View
                      style={[
                        styles.accordionBody,
                        { backgroundColor: palette.app.surface },
                      ]}
                    >
                      <View style={styles.sortRow}>
                        {sortFields.map((field) => {
                          const isSelected =
                            manualSortKey === field.ascKey ||
                            manualSortKey === field.descKey;
                          const isDesc = manualSortKey === field.descKey;

                          return (
                            <TouchableOpacity
                              key={field.key}
                              style={styles.sortButton}
                              onPress={() => toggleManualSort(field)}
                            >
                              <Text
                                style={[
                                  styles.sortText,
                                  {
                                    color: isSelected
                                      ? palette.black.base
                                      : "rgba(0, 0, 0, 0.34)",
                                  },
                                ]}
                              >
                                {field.label}
                              </Text>
                              <Ionicons
                                name={isDesc ? "arrow-up" : "arrow-down"}
                                size={13}
                                color={
                                  isSelected
                                    ? palette.black.base
                                    : "rgba(0, 0, 0, 0.34)"
                                }
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {getSortedCards(lesson.cards || []).map((card, index) => {
                        const key = getWordKey(lesson.id, card.id);
                        const isSelected = selectedWordKeys.includes(key);
                        const shownWord =
                          manualDirection === "enToTr"
                            ? card.english
                            : card.turkish;
                        const tooltipWord =
                          manualDirection === "enToTr"
                            ? card.turkish
                            : card.english;

                        return (
                          <View key={card.id}>
                            <TouchableOpacity
                              activeOpacity={0.82}
                              delayLongPress={220}
                              style={styles.wordRow}
                              onPress={() => {
                                if (longPressedKey === key) {
                                  return;
                                }

                                toggleWord(lesson.id, card.id);
                              }}
                              onLongPress={() => {
                                setLongPressedKey(key);
                                setTooltipKey(key);
                              }}
                              onPressOut={() => {
                                setTooltipKey(null);
                                setTimeout(() => {
                                  setLongPressedKey(null);
                                }, 80);
                              }}
                            >
                              <View style={styles.wordCell}>
                                <Text
                                  style={[
                                    styles.wordText,
                                    { color: palette.app.text },
                                  ]}
                                >
                                  {shownWord}
                                </Text>
                                {tooltipKey === key ? (
                                  <View
                                    style={[
                                      styles.tooltip,
                                      { backgroundColor: palette.app.primary },
                                    ]}
                                  >
                                    <Text style={styles.tooltipText}>
                                      {tooltipWord}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text
                                style={[
                                  styles.scoreText,
                                  { color: palette.app.mutedText },
                                ]}
                              >
                                En {getEnScore(card)}
                              </Text>
                              <Text
                                style={[
                                  styles.scoreText,
                                  { color: palette.app.mutedText },
                                ]}
                              >
                                Tr {getTrScore(card)}
                              </Text>
                              <Ionicons
                                name={
                                  isSelected
                                    ? "checkbox-outline"
                                    : "square-outline"
                                }
                                size={22}
                                color={
                                  isSelected
                                    ? palette.app.primary
                                    : palette.app.mutedText
                                }
                              />
                            </TouchableOpacity>
                            {index < (lesson.cards || []).length - 1 ? (
                              <View
                                style={[
                                  styles.wordSeparator,
                                  { backgroundColor: palette.app.border },
                                ]}
                              />
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

        </View>
      )}

      <Modal visible={lessonSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: palette.app.surface, borderColor: palette.app.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.app.text }]}>
                Ders sec
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setLessonSelectOpen(false)}
              >
                <Ionicons name="close-outline" size={28} color={palette.app.text} />
              </TouchableOpacity>
            </View>
            {lessonOptions.map((option) => {
              const isAllOption = option.id === "all";
              const isSelected = isAllOption
                ? allLessonsSelected
                : selectedLessonIds.includes(option.id);

              return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionRow, { borderColor: palette.app.border }]}
                onPress={() => {
                  if (isAllOption) {
                    toggleAllLessons();
                    return;
                  }

                  toggleLesson(option.id);
                }}
              >
                <View style={styles.optionLabelGroup}>
                  <Ionicons
                    name={
                      isSelected ? "checkbox-outline" : "square-outline"
                    }
                    size={22}
                    color={
                      isSelected
                        ? palette.app.primary
                        : palette.app.mutedText
                    }
                  />
                  <Text style={[styles.optionText, { color: palette.app.text }]}>
                    {option.name}
                  </Text>
                </View>
                <Text
                  style={[styles.optionMeta, { color: palette.app.mutedText }]}
                >
                  {option.count}
                </Text>
              </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={countSelectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: palette.app.surface, borderColor: palette.app.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.app.text }]}>
                Kelime sayisi
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setCountSelectOpen(false)}
              >
                <Ionicons name="close-outline" size={28} color={palette.app.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.countList}>
              {countOptions.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[styles.optionRow, { borderColor: palette.app.border }]}
                  onPress={() => {
                    setWordCount(count);
                    setCountSelectOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: palette.app.text }]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    gap: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  topControls: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tabs: {
    flex: 1,
    maxWidth: 230,
    minHeight: 38,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 2,
  },
  tabButton: {
    flex: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
  },
  headerStartButton: {
    width: 104,
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  manualPanel: {
    flex: 1,
    minHeight: 0,
  },
  manualHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  directionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  directionOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  directionText: {
    fontSize: 15,
    fontWeight: "900",
  },
  selectedCount: {
    fontSize: 13,
    fontWeight: "900",
  },
  manualList: {
    flex: 1,
  },
  accordion: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 7,
    overflow: "hidden",
  },
  accordionHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  accordionTitleButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  accordionMeta: {
    fontSize: 13,
    fontWeight: "900",
  },
  smallButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  accordionBody: {
    paddingHorizontal: 8,
    paddingBottom: 6,
    gap: 4,
  },
  sortRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  sortButton: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  sortText: {
    fontSize: 11,
    fontWeight: "900",
  },
  wordRow: {
    minHeight: 34,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  wordCell: {
    flex: 1,
    justifyContent: "center",
  },
  wordText: {
    fontSize: 14,
    fontWeight: "900",
  },
  scoreText: {
    width: 42,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  wordSeparator: {
    width: "30%",
    height: 1,
    alignSelf: "center",
    opacity: 0.55,
  },
  tooltip: {
    position: "absolute",
    left: 0,
    bottom: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 12,
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  selectButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  selectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectCount: {
    fontSize: 13,
    fontWeight: "800",
  },
  radioGroup: {
    gap: 8,
  },
  radioRow: {
    minHeight: 40,
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
    fontWeight: "800",
  },
  startButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
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
    maxHeight: "82%",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 14,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRow: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLabelGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "900",
  },
  optionMeta: {
    fontSize: 14,
    fontWeight: "800",
  },
  countList: {
    maxHeight: 360,
  },
});
