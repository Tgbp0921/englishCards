import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DataContext } from "../../../context/DataContext";

const RECORDING_LIMIT_MS = 4000;
const RESULT_SETTLE_MS = 350;
const CARD_SECONDS = 10;

const directions = [
  { key: "enToTr", from: "En", to: "Tr", label: "Ingilizce -> Turkce" },
  { key: "trToEn", from: "Tr", to: "En", label: "Turkce -> Ingilizce" },
];

const ranges = [
  { key: "great", label: "100-85", min: 85, max: 101 },
  { key: "good", label: "85-70", min: 70, max: 85 },
  { key: "mid", label: "70-50", min: 50, max: 70 },
  { key: "low", label: "50-0", min: 0, max: 50 },
];

const normalizeAnswer = (value) =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compactAnswer = (value) => normalizeAnswer(value).replace(/\s/g, "");

const answersMatch = (givenAnswer, expectedAnswer) => {
  const given = compactAnswer(givenAnswer);
  const expected = compactAnswer(expectedAnswer);

  return Boolean(given && expected && given === expected);
};

const calculateScore = (elapsedSeconds) => {
  if (elapsedSeconds <= 3) {
    return 100;
  }

  return Math.max(30, Math.round(100 - ((elapsedSeconds - 3) / 7) * 70));
};

const averagePoints = (points = []) => {
  if (!points.length) {
    return 0;
  }

  return Math.round(
    points.reduce((sum, item) => sum + (item.point || 0), 0) / points.length,
  );
};

const getLastFiveAverage = (card, direction) => {
  const pointsKey =
    direction === "enToTr" ? "fromEnToTrPoints" : "fromTrToEnPoints";
  const points = [...(card[pointsKey] || [])]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  return averagePoints(points);
};

const getOverallCardAverage = (card) =>
  averagePoints([
    ...(card.fromEnToTrPoints || []),
    ...(card.fromTrToEnPoints || []),
  ]);

const getBucketCounts = (cards = []) =>
  ranges.map((range) => {
    const rangeCards = cards.filter((card) => {
      const average = getOverallCardAverage(card);
      return average >= range.min && average < range.max;
    });

    return {
      ...range,
      cards: rangeCards,
      count: rangeCards.length,
    };
  });

const pickLowestCard = (cards, direction, excludedCardId = null) => {
  const candidates = (cards || []).filter((card) => card.id !== excludedCardId);
  const source = candidates.length ? candidates : cards || [];

  return [...source].sort(
    (left, right) =>
      getLastFiveAverage(left, direction) -
      getLastFiveAverage(right, direction),
  )[0];
};

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

const getTimerBarColor = (remainingSeconds) => {
  const progress = Math.max(0, Math.min(1, remainingSeconds / CARD_SECONDS));
  const red = Math.round(40 + (1 - progress) * 201);
  const green = Math.round(120 - (1 - progress) * 68);
  const blue = Math.round(216 - (1 - progress) * 180);

  return `rgb(${red}, ${green}, ${blue})`;
};

const playRemoteAudio = (uri) => {
  if (!uri) {
    return false;
  }

  try {
    const player = createAudioPlayer(uri);
    player.play();
    setTimeout(() => player.remove(), 8000);
    return true;
  } catch (_error) {
    return false;
  }
};

const speakEnglish = (text) => {
  if (!text) {
    return;
  }

  Speech.stop();
  Speech.speak(text, { language: "en-US", rate: 0.9 });
};

const playEnglishAudio = (uri, fallbackText) => {
  if (!playRemoteAudio(uri)) {
    speakEnglish(fallbackText);
  }
};

const DirectionLabel = ({ direction, palette }) => (
  <View style={styles.directionLabel}>
    <Text style={[styles.directionText, { color: palette.app.text }]}>
      {direction.from}
    </Text>
    <Ionicons name="arrow-forward" size={16} color={palette.app.mutedText} />
    <Text style={[styles.directionText, { color: palette.app.text }]}>
      {direction.to}
    </Text>
  </View>
);

export default function StudyScreen({ navigation }) {
  const { ascncData, loading, palette, updateLesson } = useContext(DataContext);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState("enToTr");
  const [wordRange, setWordRange] = useState(null);
  const [studyState, setStudyState] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isTimePaused, setIsTimePaused] = useState(false);
  const [remaining, setRemaining] = useState(CARD_SECONDS);
  const [transcriptText, setTranscriptText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [timerVersion, setTimerVersion] = useState(0);
  const latestTranscriptRef = useRef("");
  const recognitionTimeoutRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const recordButtonOpacity = useRef(new Animated.Value(1)).current;
  const timerBarOpacity = useRef(new Animated.Value(1)).current;
  const timerBarProgress = useRef(new Animated.Value(1)).current;
  const timerBarProgressRef = useRef(1);

  const lessons = useMemo(
    () => [...(ascncData.lessons || [])].sort((a, b) => a.date - b.date),
    [ascncData.lessons],
  );

  const currentCard = studyState?.card;
  const currentDirection = studyState?.direction || selectedDirection;
  const questionText =
    currentDirection === "enToTr" ? currentCard?.english : currentCard?.turkish;
  const answerTarget =
    currentDirection === "enToTr" ? currentCard?.turkish : currentCard?.english;

  useEffect(() => {
    navigation.setOptions({ headerShown: !studyState });

    return () => {
      navigation.setOptions({ headerShown: true });
    };
  }, [navigation, studyState]);

  useSpeechRecognitionEvent("start", () => {
    isRecognizingRef.current = true;
    setIsRecognizing(true);
  });

  useSpeechRecognitionEvent("end", () => {
    isRecognizingRef.current = false;
    setIsRecognizing(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript || "";
    latestTranscriptRef.current = transcript;
    setTranscriptText(transcript);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setRecognitionError(
      event.message || event.error || "Konusma tanima hatasi.",
    );
    isRecognizingRef.current = false;
    setIsRecognizing(false);
    setIsChecking(false);
  });

  useEffect(() => {
    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentCard || isRevealed) {
      return;
    }

    if (currentDirection === "enToTr") {
      playEnglishAudio(currentCard.englishSound, currentCard.english);
    }
  }, [currentCard, currentDirection, isRevealed]);

  useEffect(() => {
    if (isRecognizing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordButtonOpacity, {
            toValue: 0.5,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(recordButtonOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      );

      animation.start();
      return () => animation.stop();
    }

    recordButtonOpacity.setValue(1);
    return undefined;
  }, [isRecognizing, recordButtonOpacity]);

  useEffect(() => {
    if (remaining <= 3 && !isTimePaused && !isRevealed && studyState) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(timerBarOpacity, {
            toValue: 0.25,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(timerBarOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      );

      animation.start();
      return () => animation.stop();
    }

    timerBarOpacity.setValue(1);
    return undefined;
  }, [isRevealed, isTimePaused, remaining, studyState, timerBarOpacity]);

  useEffect(() => {
    const progressListenerId = timerBarProgress.addListener(({ value }) => {
      timerBarProgressRef.current = value;
    });

    return () => timerBarProgress.removeListener(progressListenerId);
  }, [timerBarProgress]);

  useEffect(() => {
    timerBarProgress.stopAnimation();

    if (!studyState || isRevealed) {
      timerBarProgress.setValue(0);
      return undefined;
    }

    if (isTimePaused) {
      timerBarProgress.stopAnimation((value) => {
        timerBarProgressRef.current = value;
        timerBarProgress.setValue(value);
      });
      return undefined;
    }

    const startProgress = timerBarProgressRef.current;
    timerBarProgress.setValue(startProgress);
    const animation = Animated.timing(timerBarProgress, {
      toValue: 0,
      duration: Math.max(0, startProgress * CARD_SECONDS * 1000),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [isRevealed, isTimePaused, studyState, timerBarProgress, timerVersion]);

  useEffect(() => {
    if (!studyState || isTimePaused || isRevealed) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          revealAndSave(0);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, isTimePaused, studyState]);

  const closeDirectionModal = () => setSelectedLesson(null);
  const closeWordRangeModal = () => setWordRange(null);

  const startStudy = () => {
    if (!selectedLesson) {
      return;
    }

    const card = pickLowestCard(selectedLesson.cards, selectedDirection);

    setStudyState({
      lessonId: selectedLesson.id,
      direction: selectedDirection,
      card,
      lastResult: null,
    });
    timerBarProgressRef.current = 1;
    timerBarProgress.setValue(1);
    setTimerVersion((value) => value + 1);
    setRemaining(CARD_SECONDS);
    setIsRevealed(false);
    setIsTimePaused(false);
    setTranscriptText("");
    setRecognitionError("");
    latestTranscriptRef.current = "";
    setSelectedLesson(null);
  };

  const revealAndSave = (score) => {
    if (!studyState?.card || isRevealed) {
      return;
    }

    const now = Date.now();
    const pointsKey =
      studyState.direction === "enToTr"
        ? "fromEnToTrPoints"
        : "fromTrToEnPoints";

    let nextCard = studyState.card;

    updateLesson(studyState.lessonId, (lesson) => {
      const updatedCards = lesson.cards.map((card) => {
        if (card.id !== studyState.card.id) {
          return card;
        }

        return {
          ...card,
          [pointsKey]: [
            ...(card[pointsKey] || []),
            { date: now, point: score },
          ],
        };
      });

      nextCard = pickLowestCard(
        updatedCards,
        studyState.direction,
        studyState.card.id,
      );

      return {
        ...lesson,
        cards: updatedCards,
      };
    });

    setStudyState((previous) => ({
      ...previous,
      card: studyState.card,
      nextCard,
      lastResult: score,
    }));
    setIsRevealed(true);

    if (studyState.direction === "trToEn") {
      playEnglishAudio(studyState.card.englishSound, studyState.card.english);
      setTimeout(
        () =>
          playEnglishAudio(
            studyState.card.exampleSound,
            studyState.card.example,
          ),
        900,
      );
    } else {
      playEnglishAudio(studyState.card.exampleSound, studyState.card.example);
    }
  };

  const checkTranscript = () => {
    const isCorrect = answersMatch(latestTranscriptRef.current, answerTarget);
    const elapsed = CARD_SECONDS - remaining;
    revealAndSave(isCorrect ? calculateScore(elapsed) : 0);
    setIsTimePaused(false);
    setIsChecking(false);
    isStoppingRef.current = false;
  };

  const stopSpeechRecognitionAndCheck = async () => {
    if (isStoppingRef.current) {
      return;
    }

    if (!isRecognizingRef.current) {
      return;
    }

    isStoppingRef.current = true;
    setIsChecking(true);

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }

    try {
      await ExpoSpeechRecognitionModule.stop();
      setTimeout(checkTranscript, RESULT_SETTLE_MS);
    } catch (error) {
      setRecognitionError(error.message);
      setIsTimePaused(false);
      setIsChecking(false);
      isStoppingRef.current = false;
    }
  };

  const startSpeechRecognition = async () => {
    if (!currentCard || isRecognizing || isChecking) {
      return;
    }

    setIsChecking(true);
    setIsTimePaused(true);
    setRecognitionError("");
    setTranscriptText("");
    latestTranscriptRef.current = "";

    try {
      const permissions =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permissions.granted) {
        throw new Error("Mikrofon veya konusma tanima izni verilmedi.");
      }

      const isAvailable =
        await ExpoSpeechRecognitionModule.isRecognitionAvailable();

      if (!isAvailable) {
        throw new Error("Bu cihazda konusma tanima kullanilamiyor.");
      }

      ExpoSpeechRecognitionModule.start({
        lang: currentDirection === "enToTr" ? "tr-TR" : "en-US",
        interimResults: true,
        continuous: false,
        maxAlternatives: 3,
        contextualStrings: [answerTarget],
        androidIntentOptions: {
          EXTRA_MASK_OFFENSIVE_WORDS: false,
        },
      });

      isRecognizingRef.current = true;
      setIsRecognizing(true);
      setIsChecking(false);
      recognitionTimeoutRef.current = setTimeout(
        stopSpeechRecognitionAndCheck,
        RECORDING_LIMIT_MS,
      );
    } catch (error) {
      setRecognitionError(error.message);
      setIsTimePaused(false);
      setIsChecking(false);
    }
  };

  const goNext = () => {
    setStudyState((previous) => ({
      ...previous,
      card: previous.nextCard || previous.card,
      nextCard: null,
      lastResult: null,
    }));
    timerBarProgressRef.current = 1;
    timerBarProgress.setValue(1);
    setTimerVersion((value) => value + 1);
    setRemaining(CARD_SECONDS);
    setIsRevealed(false);
    setIsTimePaused(false);
    setTranscriptText("");
    setRecognitionError("");
    latestTranscriptRef.current = "";
  };

  if (loading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.app.background }]}
      >
        <ActivityIndicator color={palette.app.primary} />
      </View>
    );
  }

  if (studyState) {
    const selectedDirectionMeta = directions.find(
      (direction) => direction.key === studyState.direction,
    );

    return (
      <View
        style={[
          styles.practiceContainer,
          { backgroundColor: palette.app.background },
        ]}
      >
        <View style={styles.practiceHeader}>
          <View
            style={[styles.timerTrack, { backgroundColor: palette.app.border }]}
          >
            <Animated.View
              style={[
                styles.timerBar,
                {
                  width: timerBarProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: getTimerBarColor(remaining),
                  opacity: timerBarOpacity,
                },
              ]}
            />
          </View>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Ionicons name="home-outline" size={25} color={palette.app.text} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.practiceCard,
            {
              backgroundColor: palette.app.surface,
              borderColor: palette.app.border,
            },
          ]}
        >
          {!isRevealed ? (
            <View style={styles.cardContent}>
              <Text style={[styles.question, { color: palette.app.text }]}>
                {questionText}
              </Text>
              {currentDirection === "trToEn" && currentCard?.imgSrc ? (
                <Image
                  source={{ uri: currentCard.imgSrc }}
                  style={styles.cardImage}
                />
              ) : null}
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.cardContent}>
              <Text
                style={[
                  styles.resultPoint,
                  { color: getScoreColor(studyState.lastResult || 0, palette) },
                ]}
              >
                {studyState.lastResult}
              </Text>
              <Text style={[styles.answer, { color: palette.app.text }]}>
                {answerTarget}
              </Text>
              {currentCard?.imgSrc ? (
                <Image
                  source={{ uri: currentCard.imgSrc }}
                  style={styles.cardImage}
                />
              ) : null}
              <Text style={[styles.example, { color: palette.app.mutedText }]}>
                {currentCard?.example}
              </Text>
            </ScrollView>
          )}

          <Text style={[styles.transcript, { color: palette.app.mutedText }]}>
            {transcriptText}
          </Text>
        </View>

        <View style={styles.practiceActions}>
          {!isRevealed ? (
            <Animated.View style={{ opacity: recordButtonOpacity }}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  { backgroundColor: palette.score.low },
                ]}
                onPressIn={startSpeechRecognition}
                onPressOut={stopSpeechRecognitionAndCheck}
              >
                <Ionicons name="mic" size={34} color={palette.black.base} />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: palette.app.primary },
              ]}
              onPress={goNext}
            >
              <Text style={styles.nextText}>Sonraki</Text>
            </TouchableOpacity>
          )}
          {recognitionError ? (
            <Text style={[styles.errorText, { color: palette.score.low }]}>
              {recognitionError}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: palette.app.background }]}
    >
      <Text style={[styles.title, { color: palette.app.text }]}>Çalışma</Text>

      <ScrollView contentContainerStyle={styles.lessonList}>
        {lessons.map((lesson) => (
          <View
            key={lesson.id}
            style={[
              styles.lessonCard,
              {
                backgroundColor: palette.app.surface,
                borderColor: palette.app.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.lessonHeader}
              onPress={() => setSelectedLesson(lesson)}
            >
              <Text style={[styles.lessonName, { color: palette.app.text }]}>
                {lesson.name}
              </Text>
              <Text
                style={[styles.lessonCount, { color: palette.app.mutedText }]}
              >
                {lesson.cards?.length || 0} kelime
              </Text>
            </TouchableOpacity>

            <View style={styles.bucketRow}>
              {getBucketCounts(lesson.cards || []).map((bucket) => (
                <TouchableOpacity
                  key={bucket.key}
                  style={[
                    styles.bucket,
                    { backgroundColor: palette.app.surfaceSoft },
                  ]}
                  onPress={() =>
                    setWordRange({
                      lessonName: lesson.name,
                      label: bucket.label,
                      cards: bucket.cards,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.bucketLabel,
                      { color: palette.app.mutedText },
                    ]}
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
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

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
              Çalışma yonu
            </Text>
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
                  <Text style={[styles.radioText, { color: palette.app.text }]}>
                    {direction.label}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.app.border },
                ]}
                onPress={closeDirectionModal}
              >
                <Text
                  style={[styles.secondaryText, { color: palette.app.text }]}
                >
                  Vazgec
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: palette.app.primary },
                ]}
                onPress={startStudy}
              >
                <Text style={styles.primaryText}>Basla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(wordRange)} transparent animationType="fade">
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
            <View style={styles.wordModalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.app.text }]}>
                  {wordRange?.label}
                </Text>
                <Text
                  style={[
                    styles.wordModalSubtitle,
                    { color: palette.app.mutedText },
                  ]}
                >
                  {wordRange?.lessonName}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeWordRangeModal}
              >
                <Ionicons
                  name="close-outline"
                  size={28}
                  color={palette.app.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.wordList}>
              {wordRange?.cards.length ? (
                wordRange.cards.map((card) => {
                  const average = getOverallCardAverage(card);
                  const enToTrAverage = averagePoints(
                    card.fromEnToTrPoints || [],
                  );
                  const trToEnAverage = averagePoints(
                    card.fromTrToEnPoints || [],
                  );

                  return (
                    <View
                      key={card.id}
                      style={[
                        styles.wordRow,
                        { borderColor: palette.app.border },
                      ]}
                    >
                      <View style={styles.wordTextGroup}>
                        <Text
                          style={[
                            styles.wordTitle,
                            { color: palette.app.text },
                          ]}
                        >
                          {card.english}
                        </Text>
                        <Text
                          style={[
                            styles.wordSubtitle,
                            { color: palette.app.mutedText },
                          ]}
                        >
                          {card.turkish}
                        </Text>
                      </View>
                      <View style={styles.wordScores}>
                        <Text
                          style={[
                            styles.wordAverage,
                            { color: getScoreColor(average, palette) },
                          ]}
                        >
                          {average}
                        </Text>
                        <Text
                          style={[
                            styles.wordSmallScore,
                            { color: palette.app.mutedText },
                          ]}
                        >
                          E:{enToTrAverage} T:{trToEnAverage}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text
                  style={[styles.emptyText, { color: palette.app.mutedText }]}
                >
                  Bu aralikta kelime yok.
                </Text>
              )}
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
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
  },
  lessonList: {
    gap: 12,
    paddingBottom: 18,
  },
  lessonCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  lessonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  lessonName: {
    fontSize: 19,
    fontWeight: "900",
  },
  lessonCount: {
    fontSize: 14,
    fontWeight: "800",
  },
  bucketRow: {
    flexDirection: "row",
    gap: 8,
  },
  bucket: {
    flex: 1,
    minHeight: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bucketLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  bucketValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  wordModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  wordModalSubtitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: -8,
    marginBottom: 12,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  wordList: {
    maxHeight: 360,
  },
  wordRow: {
    minHeight: 62,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wordTextGroup: {
    flex: 1,
  },
  wordTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  wordSubtitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  wordScores: {
    alignItems: "flex-end",
  },
  wordAverage: {
    fontSize: 22,
    fontWeight: "900",
  },
  wordSmallScore: {
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    padding: 18,
    textAlign: "center",
    fontWeight: "800",
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
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  radioRow: {
    minHeight: 46,
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "900",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  practiceContainer: {
    flex: 1,
    padding: 18,
  },
  practiceHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  timerTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  timerBar: {
    height: 10,
    borderRadius: 5,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  directionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  directionText: {
    fontSize: 16,
    fontWeight: "900",
  },
  practiceCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  cardContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  question: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
  },
  answer: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  resultPoint: {
    fontSize: 42,
    fontWeight: "900",
  },
  example: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  cardImage: {
    width: "100%",
    maxWidth: 280,
    height: 170,
    borderRadius: 8,
    resizeMode: "cover",
  },
  transcript: {
    minHeight: 24,
    marginTop: 10,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  practiceActions: {
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButton: {
    width: "100%",
    maxWidth: 320,
    minHeight: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
});

// const sampleLesson = {
//   name: "2. ders",
//   date: 1780691558047,
//   id: 0.1236631260217153,
//   enToTrExams: [],
//   trToEnExams: [],
//   cards: [
//     {
//       id: Math.random(),
//       english: "say",
//       turkish: "söylemek",
//       example: "Please say your name.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?speaking",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "think",
//       turkish: "düşünmek",
//       example: "I think it is a good idea.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?thinking",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "my week",
//       turkish: "haftam",
//       example: "My week was very busy.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?calendar",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "early",
//       turkish: "erken",
//       example: "She arrived early.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?morning",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "often",
//       turkish: "sık sık",
//       example: "I often visit my grandparents.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?routine",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "grew",
//       turkish: "büyüdü",
//       example: "The plant grew quickly.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?plant",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "before",
//       turkish: "önce",
//       example: "Wash your hands before dinner.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?clock",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "keep",
//       turkish: "saklamak / sürdürmek",
//       example: "Keep your room clean.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?storage",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "prediction",
//       turkish: "tahmin",
//       example: "My prediction was correct.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?forecast",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "survey",
//       turkish: "anket",
//       example: "We completed a survey at school.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?survey",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "environment",
//       turkish: "çevre",
//       example: "We should protect the environment.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?environment",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "box",
//       turkish: "kutu",
//       example: "The toy is in the box.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?box",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "vegetable",
//       turkish: "sebze",
//       example: "Carrot is a vegetable.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?vegetable",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "bowl",
//       turkish: "kase",
//       example: "The soup is in the bowl.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?bowl",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "bottle",
//       turkish: "şişe",
//       example: "I bought a bottle of water.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?bottle",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "cheese",
//       turkish: "peynir",
//       example: "I like cheese on pizza.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?cheese",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "what kind",
//       turkish: "ne tür",
//       example: "What kind of music do you like?",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?question",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "pear",
//       turkish: "armut",
//       example: "She ate a pear.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?pear",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "sauce",
//       turkish: "sos",
//       example: "Add some sauce to the pasta.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?sauce",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "sweet",
//       turkish: "tatlı",
//       example: "This cake is very sweet.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?dessert",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "sack",
//       turkish: "çuval",
//       example: "The potatoes are in a sack.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?sack",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "big",
//       turkish: "büyük",
//       example: "They live in a big house.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?big-house",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "the biggest",
//       turkish: "en büyük",
//       example: "It is the biggest building in town.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?skyscraper",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//     {
//       id: Math.random(),
//       english: "mistake",
//       turkish: "hata",
//       example: "Everyone makes mistakes.",
//       exampleSound: "",
//       englishSound: "",
//       imgSrc: "https://source.unsplash.com/featured/?error",
//       fromEnToTrPoints: [],
//       fromTrToEnPoints: [],
//     },
//   ],
// };

// const card3 = [
//   {
//     id: Math.random(),
//     english: "poetry",
//     turkish: "şiir",
//     example: "She loves reading poetry.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?poetry",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "rhyme",
//     turkish: "uyak / kafiye",
//     example: "Cat and hat rhyme.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?book",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "competition",
//     turkish: "yarışma",
//     example: "He won the competition.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?competition",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "acrostic",
//     turkish: "akrostiş",
//     example: "We wrote an acrostic poem.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?writing",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "wing",
//     turkish: "kanat",
//     example: "The bird spread its wings.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?wing",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "letter",
//     turkish: "harf",
//     example: "A is the first letter.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?alphabet",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "line",
//     turkish: "satır / çizgi",
//     example: "Draw a straight line.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?line",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "spell",
//     turkish: "hecelemek",
//     example: "Can you spell your name?",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?spelling",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "connected to",
//     turkish: "bağlı",
//     example: "The printer is connected to the computer.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?connection",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "a bag of",
//     turkish: "bir paket / torba",
//     example: "I bought a bag of apples.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?shopping-bag",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "want to",
//     turkish: "istemek",
//     example: "I want to learn English.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?goal",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "stack",
//     turkish: "yığın",
//     example: "There is a stack of books.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?stack-books",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "last",
//     turkish: "son",
//     example: "This is the last page.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?last-page",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "sometimes",
//     turkish: "bazen",
//     example: "I sometimes drink tea.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?thinking",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "never",
//     turkish: "asla",
//     example: "I never smoke.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?no",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "always",
//     turkish: "her zaman",
//     example: "She always smiles.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?smile",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "bright",
//     turkish: "parlak",
//     example: "The sun is very bright today.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?bright-light",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
//   {
//     id: Math.random(),
//     english: "take",
//     turkish: "almak",
//     example: "Please take your bag with you.",
//     exampleSound: "",
//     englishSound: "",
//     imgSrc: "https://source.unsplash.com/featured/?taking",
//     fromEnToTrPoints: [],
//     fromTrToEnPoints: [],
//   },
// ];
