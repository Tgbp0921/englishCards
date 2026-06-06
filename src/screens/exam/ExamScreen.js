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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DataContext } from "../../../context/DataContext";

const CARD_SECONDS = 10;
const RECOGNITION_LIMIT_MS = 4000;
const RESULT_SETTLE_MS = 350;

const shuffleCards = (cards) =>
  [...cards]
    .map((card) => ({ card, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ card }) => card);

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

const getLevenshteinDistance = (left, right) => {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const distances = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    distances[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + cost,
      );
    }
  }

  return distances[left.length][right.length];
};

const answersMatch = (givenAnswer, expectedAnswer) => {
  const normalizedGiven = normalizeAnswer(givenAnswer);
  const normalizedExpected = normalizeAnswer(expectedAnswer);
  const compactGiven = compactAnswer(givenAnswer);
  const compactExpected = compactAnswer(expectedAnswer);

  if (!compactGiven || !compactExpected) {
    return false;
  }

  if (
    normalizedGiven === normalizedExpected ||
    compactGiven === compactExpected
  ) {
    return true;
  }

  const distance = getLevenshteinDistance(compactGiven, compactExpected);
  const maxLength = Math.max(compactGiven.length, compactExpected.length);
  const allowedDistance = maxLength <= 6 ? 1 : 2;

  return distance <= allowedDistance;
};

const calculateScore = (elapsedSeconds) => {
  if (elapsedSeconds <= 3) {
    return 100;
  }

  return Math.max(30, Math.round(100 - ((elapsedSeconds - 3) / 7) * 70));
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

const withOpacity = (hex, opacity) => {
  const color = String(hex || "").replace("#", "");

  if (color.length !== 6) {
    return hex;
  }

  const red = parseInt(color.slice(0, 2), 16);
  const green = parseInt(color.slice(2, 4), 16);
  const blue = parseInt(color.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
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
  } catch (error) {
    console.warn("Audio could not be played.", error);
    return false;
  }
};

const speakEnglish = (text) => {
  if (!text) {
    return;
  }

  Speech.stop();
  Speech.speak(text, {
    language: "en-US",
    rate: 0.9,
  });
};

const playEnglishAudio = (uri, fallbackText) => {
  if (!playRemoteAudio(uri)) {
    speakEnglish(fallbackText);
  }
};

const playCardRevealAudio = (card, examDirection) => {
  if (examDirection === "trToEn") {
    playEnglishAudio(card.englishSound, card.english);
    setTimeout(() => playEnglishAudio(card.exampleSound, card.example), 900);
    return;
  }

  playEnglishAudio(card.exampleSound, card.example);
};

export default function ExamScreen({ navigation, route }) {
  const { lessonId, direction = "enToTr" } = route.params || {};
  const { ascncData, loading, palette, updateLesson } = useContext(DataContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(CARD_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [results, setResults] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [timerVersion, setTimerVersion] = useState(0);
  const finishedSavedRef = useRef(false);
  const recognitionTimeoutRef = useRef(null);
  const releaseRequestedRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const recordButtonOpacity = useRef(new Animated.Value(1)).current;
  const timerBarOpacity = useRef(new Animated.Value(1)).current;
  const timerBarProgress = useRef(new Animated.Value(1)).current;
  const timerBarProgressRef = useRef(1);

  const lesson = useMemo(
    () => (ascncData.lessons || []).find((item) => item.id === lessonId),
    [ascncData.lessons, lessonId],
  );

  const cards = useMemo(() => shuffleCards(lesson?.cards || []), [lesson]);
  const currentCard = cards[currentIndex];
  const questionText =
    direction === "enToTr" ? currentCard?.english : currentCard?.turkish;
  const answerTarget =
    direction === "enToTr" ? currentCard?.turkish : currentCard?.english;

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
    const message = event.message || event.error || "Konusma tanima hatasi.";
    setRecognitionError(message);
    isRecognizingRef.current = false;
    setIsRecognizing(false);
    setIsChecking(false);
    setIsPaused(false);
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
    if (remaining <= 3 && !isPaused && !isRevealed && !isFinished) {
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
  }, [isFinished, isPaused, isRevealed, remaining, timerBarOpacity]);

  useEffect(() => {
    const progressListenerId = timerBarProgress.addListener(({ value }) => {
      timerBarProgressRef.current = value;
    });

    return () => {
      timerBarProgress.removeListener(progressListenerId);
    };
  }, [timerBarProgress]);

  useEffect(() => {
    timerBarProgress.stopAnimation();

    if (isRevealed || isFinished || !currentCard) {
      timerBarProgress.setValue(0);
      return undefined;
    }

    if (isPaused) {
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
  }, [isFinished, isPaused, isRevealed, timerBarProgress, timerVersion]);

  useEffect(() => {
    if (!currentCard || isFinished) {
      return;
    }

    timerBarProgressRef.current = 1;
    timerBarProgress.setValue(1);
    setTimerVersion((value) => value + 1);
    setRemaining(CARD_SECONDS);
    setTranscriptText("");
    setRecognitionError("");
    latestTranscriptRef.current = "";
    setIsPaused(false);
    setIsRevealed(false);
    if (direction === "enToTr") {
      playEnglishAudio(currentCard.englishSound, currentCard.english);
    }
  }, [currentCard, direction, isFinished]);

  useEffect(() => {
    if (isPaused || isRevealed || isFinished || !currentCard) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          revealCard(false, 0);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isRevealed, isFinished, currentCard]);

  useEffect(() => {
    if (!isFinished || finishedSavedRef.current || !lesson) {
      return;
    }

    finishedSavedRef.current = true;
    const average = getAverageScore();
    const now = Date.now();
    const examKey = direction === "enToTr" ? "enToTrExams" : "trToEnExams";
    const pointsKey =
      direction === "enToTr" ? "fromEnToTrPoints" : "fromTrToEnPoints";

    updateLesson(lesson.id, (previousLesson) => ({
      ...previousLesson,
      [examKey]: [
        ...(previousLesson[examKey] || []),
        { date: now, point: average },
      ],
      cards: previousLesson.cards.map((card) => {
        const result = results.find((item) => item.cardId === card.id);

        if (!result) {
          return card;
        }

        const { fromEnToTr, fromTrToEn, ...cardWithoutOldStats } = card;

        return {
          ...cardWithoutOldStats,
          fromEnToTrPoints: card.fromEnToTrPoints || [],
          fromTrToEnPoints: card.fromTrToEnPoints || [],
          [pointsKey]: [
            ...(card[pointsKey] || []),
            { date: now, point: result.score },
          ],
        };
      }),
    }));
  }, [direction, isFinished, lesson, results, updateLesson]);

  const revealCard = (correct, score) => {
    if (!currentCard || isRevealed) {
      return;
    }

    setIsPaused(true);
    setIsRevealed(true);
    setResults((previousResults) => [
      ...previousResults.filter((item) => item.cardId !== currentCard.id),
      {
        cardId: currentCard.id,
        english: currentCard.english,
        turkish: currentCard.turkish,
        correct,
        score,
      },
    ]);
    playCardRevealAudio(currentCard, direction);
  };

  const getAverageScore = () => {
    if (!cards.length) {
      return 0;
    }

    const total = results.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / cards.length);
  };

  const checkTranscript = () => {
    const transcript = latestTranscriptRef.current;
    const isCorrect = answersMatch(transcript, answerTarget);

    if (isCorrect) {
      const elapsed = CARD_SECONDS - remaining;
      revealCard(true, calculateScore(elapsed));
    } else if (remaining > 0) {
      setIsPaused(false);
    }

    releaseRequestedRef.current = false;
    isStoppingRef.current = false;
    setIsChecking(false);
  };

  const stopSpeechRecognitionAndCheck = async () => {
    if (isStoppingRef.current) {
      return;
    }

    if (!isRecognizingRef.current) {
      releaseRequestedRef.current = true;
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
      console.warn("Speech recognition could not be checked.", error);
      setRecognitionError(error.message);
      setIsPaused(false);
      releaseRequestedRef.current = false;
      isStoppingRef.current = false;
      setIsChecking(false);
    }
  };

  const startSpeechRecognition = async () => {
    if (!currentCard || isRecognizing || isChecking) {
      return;
    }

    setIsChecking(true);
    setIsPaused(true);
    setRecognitionError("");
    setTranscriptText("");
    latestTranscriptRef.current = "";
    releaseRequestedRef.current = false;

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
        lang: direction === "enToTr" ? "tr-TR" : "en-US",
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

      recognitionTimeoutRef.current = setTimeout(() => {
        stopSpeechRecognitionAndCheck();
      }, RECOGNITION_LIMIT_MS);

      if (releaseRequestedRef.current) {
        stopSpeechRecognitionAndCheck();
      }
    } catch (error) {
      console.warn("Speech recognition could not be started.", error);
      setRecognitionError(error.message);
      setIsChecking(false);
      setIsPaused(false);
    }
  };

  const goNext = () => {
    if (currentIndex >= cards.length - 1) {
      setIsFinished(true);
      return;
    }

    setCurrentIndex((value) => value + 1);
  };

  if (loading || !lesson) {
    return (
      <View
        style={[styles.centered, { backgroundColor: palette.app.background }]}
      >
        <ActivityIndicator color={palette.app.primary} />
      </View>
    );
  }

  if (isFinished) {
    const average = getAverageScore();

    return (
      <View
        style={[styles.container, { backgroundColor: palette.app.background }]}
      >
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={26} color={palette.app.text} />
        </TouchableOpacity>
        <Text
          style={[
            styles.finishTitle,
            { color: getScoreColor(average, palette) },
          ]}
        >
          {average}
        </Text>
        <Text style={[styles.finishSubtitle, { color: palette.app.mutedText }]}>
          Toplam puan
        </Text>

        <ScrollView style={styles.resultsList}>
          {results.map((item) => (
            <View
              key={item.cardId}
              style={[
                styles.resultRow,
                {
                  backgroundColor: palette.app.surface,
                  borderColor: palette.app.border,
                },
              ]}
            >
              <View style={styles.resultWords}>
                <Text style={[styles.resultText, { color: palette.app.text }]}>
                  {item.english}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={palette.app.mutedText}
                />
                <Text style={[styles.resultText, { color: palette.app.text }]}>
                  {item.turkish}
                </Text>
              </View>
              <Text
                style={[
                  styles.resultScore,
                  { color: getScoreColor(item.score, palette) },
                ]}
              >
                {item.score}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: palette.app.background }]}
    >
      <View style={styles.topBar}>
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
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={26} color={palette.app.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        style={styles.questionScrollerWrap}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.questionScroller}
      >
        {cards.map((card, index) => {
          const result = results.find((item) => item.cardId === card.id);
          const color = result
            ? getScoreColor(result.score, palette)
            : index === currentIndex
              ? palette.app.primary
              : palette.score.empty;

          return (
            <View
              key={card.id}
              style={[
                styles.questionBox,
                {
                  backgroundColor: withOpacity(color, 0.5),
                  borderColor: color,
                },
              ]}
            >
              <Text
                style={[styles.questionBoxText, { color: palette.black.base }]}
              >
                {index + 1}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.app.surface,
            borderColor: palette.app.border,
          },
        ]}
      >
        {!isRevealed ? (
          <View style={styles.questionContent}>
            <Text style={[styles.question, { color: palette.app.text }]}>
              {questionText}
            </Text>
            {direction === "trToEn" && currentCard.imgSrc ? (
              <Image
                source={{ uri: currentCard.imgSrc }}
                onError={() =>
                  console.warn("Image could not be loaded.", currentCard.imgSrc)
                }
                style={styles.cardImage}
              />
            ) : null}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.revealedContent}>
            <Text style={[styles.answer, { color: palette.app.text }]}>
              {answerTarget}
            </Text>
            {direction === "enToTr" && currentCard.imgSrc ? (
              <Image
                source={{ uri: currentCard.imgSrc }}
                onError={() =>
                  console.warn("Image could not be loaded.", currentCard.imgSrc)
                }
                style={styles.cardImage}
              />
            ) : null}
            <Text style={[styles.example, { color: palette.app.mutedText }]}>
              {currentCard.example}
            </Text>
            {direction !== "enToTr" && currentCard.imgSrc ? (
              <Image
                source={{ uri: currentCard.imgSrc }}
                onError={() =>
                  console.warn("Image could not be loaded.", currentCard.imgSrc)
                }
                style={styles.cardImage}
              />
            ) : null}
          </ScrollView>
        )}

        <Text
          style={[
            styles.transcriptText,
            { color: palette.app.mutedText, height: 20 },
          ]}
        >
          {transcriptText}
        </Text>
      </View>
      <View
        style={{ height: 110, alignItems: "center", justifyContent: "center" }}
      >
        {!isRevealed ? (
          <View style={styles.answerArea}>
            <Animated.View
              style={[
                styles.recordButtonShell,
                { opacity: recordButtonOpacity },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.85}
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
            {recognitionError ? (
              <Text style={[styles.errorText, { color: palette.score.low }]}>
                {recognitionError}
              </Text>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: palette.app.primary },
            ]}
            onPress={goNext}
          >
            <Text style={styles.nextText}>
              {currentIndex >= cards.length - 1 ? "Bitir" : "Sonraki"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
    paddingTop: 18,
  },
  homeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    paddingRight: 4,
  },
  questionScroller: {
    gap: 8,
    paddingRight: 18,
  },
  questionScrollerWrap: {
    flexGrow: 0,
    height: 36,
    marginBottom: 14,
  },
  questionBox: {
    width: 34,
    height: 34,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  questionBoxText: {
    fontSize: 14,
    fontWeight: "900",
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
  card: {
    flex: 1,
    minHeight: 280,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  question: {
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
  },
  questionContent: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  revealedContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  answer: {
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  example: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  cardImage: {
    width: "100%",
    maxWidth: 280,
    height: 170,
    borderRadius: 8,
    resizeMode: "cover",
  },
  answerArea: {
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  recordButtonShell: {
    width: 76,
    height: 76,
  },
  recordButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  nextButton: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 320,
    minHeight: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },
  finishTitle: {
    fontSize: 72,
    fontWeight: "900",
    textAlign: "center",
  },
  finishSubtitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 18,
  },
  resultsList: {
    flex: 1,
  },
  resultRow: {
    minHeight: 60,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "800",
  },
  resultWords: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  resultScore: {
    fontSize: 22,
    fontWeight: "900",
  },
});
