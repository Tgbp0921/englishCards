import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import React, {
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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
import { DataContext } from "../../context/DataContext";

const CARD_SECONDS = 7;
const RECOGNITION_LIMIT_MS = 4000;
const RESULT_SETTLE_MS = 350;
const MIC_COOLDOWN_MS = 700;
const CARD_SLIDE_DISTANCE = 42;

const confettiPieces = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 19) % 84)}%`,
  size: 7 + (index % 4) * 2,
  drift: (index % 2 === 0 ? 1 : -1) * (18 + (index % 5) * 7),
  fall: 42 + (index % 6) * 14,
  rotate: index % 2 === 0 ? "180deg" : "-180deg",
}));

const confettiColors = {
  correct: ["#20C997", "#51A86B", "#B7F7C8", "#FFFFFF"],
};

const brokenHeartPieces = Array.from({ length: 14 }, (_, index) => {
  const topBand = index < 5;
  const bottomBand = index >= 5 && index < 9;
  const leftBand = index >= 9 && index < 12;

  return {
    id: index,
    left:
      topBand || bottomBand
        ? `${12 + ((index * 17) % 70)}%`
        : leftBand
          ? `${2 + (index % 3) * 5}%`
          : `${84 + (index % 2) * 5}%`,
    top: topBand
      ? `${4 + (index % 3) * 4}%`
      : bottomBand
        ? `${82 + (index % 3) * 4}%`
        : `${25 + ((index * 13) % 42)}%`,
    size: 36 + (index % 4) * 8,
    fall: 10 + (index % 4) * 5,
  };
});

const getSessionPhase = (state) => {
  if (state.isFinished) {
    return "finished";
  }
  if (state.isRevealed) {
    return "revealed";
  }
  if (state.isRecognizing) {
    return "listening";
  }
  if (state.isChecking) {
    return "checking";
  }
  return "question";
};

const initialSessionUi = {
  isPaused: false,
  isRevealed: false,
  isFinished: false,
  isChecking: false,
  isRecognizing: false,
  phase: "question",
};

const examSessionUiReducer = (state, action) => {
  if (action.type === "resetQuestion") {
    return initialSessionUi;
  }

  if (action.type === "set") {
    const nextState = {
      ...state,
      [action.key]: action.value,
    };

    return {
      ...nextState,
      phase: getSessionPhase(nextState),
    };
  }

  return state;
};

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
  if (elapsedSeconds <= 2) {
    return 100;
  }

  return Math.max(30, Math.round(100 - ((elapsedSeconds - 2) / 5) * 70));
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

const playCardRevealAudio = (card, examDirection) => {
  if (examDirection === "trToEn") {
    speakEnglish(card.english);
    setTimeout(() => speakEnglish(card.example), 900);
    return;
  }

  speakEnglish(card.example);
};

export default function ExamScreen({ navigation, route }) {
  const {
    lessonId,
    direction = "enToTr",
    returnRoute = "Home",
    returnIcon = "home-outline",
    isPracticeMode = false,
    mixedCardRefs = [],
  } = route.params || {};
  const { ascncData, loading, palette, updateLesson } = useContext(DataContext);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(CARD_SECONDS);
  const [results, setResults] = useState([]);
  const [sessionUi, dispatchSessionUi] = useReducer(
    examSessionUiReducer,
    initialSessionUi,
  );
  const [transcriptText, setTranscriptText] = useState("");
  const [recognitionError, setRecognitionError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timerVersion, setTimerVersion] = useState(0);
  const [practiceRound, setPracticeRound] = useState(0);
  const [cards, setCards] = useState([]);
  const sessionKeyRef = useRef(null);
  const finishedSavedRef = useRef(false);
  const recognitionTimeoutRef = useRef(null);
  const resultSettleTimeoutRef = useRef(null);
  const releaseRequestedRef = useRef(false);
  const isStartingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const nextMicAllowedAtRef = useRef(0);
  const latestTranscriptRef = useRef("");
  const recordButtonOpacity = useRef(new Animated.Value(1)).current;
  const timerBarOpacity = useRef(new Animated.Value(1)).current;
  const timerBarProgress = useRef(new Animated.Value(1)).current;
  const timerBarProgressRef = useRef(1);
  const cardEnter = useRef(new Animated.Value(1)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const finishAnim = useRef(new Animated.Value(0)).current;
  const {
    isPaused,
    isRevealed,
    isFinished,
    isChecking,
    isRecognizing,
  } = sessionUi;
  const setSessionUiField = (key, value) =>
    dispatchSessionUi({ type: "set", key, value });
  const setIsPaused = (value) => setSessionUiField("isPaused", value);
  const setIsRevealed = (value) => setSessionUiField("isRevealed", value);
  const setIsFinished = (value) => setSessionUiField("isFinished", value);
  const setIsChecking = (value) => setSessionUiField("isChecking", value);
  const setIsRecognizing = (value) =>
    setSessionUiField("isRecognizing", value);
  const triggerFeedback = (type) => {
    if (type === "wrong") {
      return;
    }

    setFeedback({ type, key: Date.now() });
  };

  const isMixedExam = Array.isArray(mixedCardRefs) && mixedCardRefs.length > 0;

  const lesson = useMemo(
    () => (ascncData.lessons || []).find((item) => item.id === lessonId),
    [ascncData.lessons, lessonId],
  );

  const currentCard = cards[currentIndex];
  const currentCardKey = currentCard
    ? `${currentCard.lessonId}-${currentCard.id}`
    : "";
  const questionText =
    direction === "enToTr" ? currentCard?.english : currentCard?.turkish;
  const answerTarget =
    direction === "enToTr" ? currentCard?.turkish : currentCard?.english;
  const goToReturnRoute = () => navigation.navigate(returnRoute);

  const mixedRefsKey = useMemo(
    () =>
      (mixedCardRefs || [])
        .map((ref) => `${ref.lessonId}:${ref.cardId}`)
        .join("|"),
    [mixedCardRefs],
  );

  const sessionKey = `${lessonId || "mixed"}-${direction}-${mixedRefsKey}`;

  useEffect(() => {
    if (loading || sessionKeyRef.current === sessionKey) {
      return;
    }

    let nextCards = [];

    if (isMixedExam) {
      nextCards = mixedCardRefs
        .map((ref) => {
          const sourceLesson = (ascncData.lessons || []).find(
            (item) => item.id === ref.lessonId,
          );
          const card = (sourceLesson?.cards || []).find(
            (item) => item.id === ref.cardId,
          );

          return card && sourceLesson
            ? { ...card, lessonId: sourceLesson.id }
            : null;
        })
        .filter(Boolean);
    } else {
      if (!lesson) {
        return;
      }

      nextCards = shuffleCards(lesson.cards || []).map((card) => ({
        ...card,
        lessonId: lesson.id,
      }));
    }

    sessionKeyRef.current = sessionKey;
    finishedSavedRef.current = false;
    setCards(nextCards);
    setCurrentIndex(0);
    setResults([]);
    dispatchSessionUi({ type: "resetQuestion" });
    setPracticeRound(0);
    setRemaining(CARD_SECONDS);
    setTranscriptText("");
    setRecognitionError("");
    latestTranscriptRef.current = "";
  }, [
    ascncData.lessons,
    direction,
    isMixedExam,
    lesson,
    loading,
    mixedCardRefs,
    sessionKey,
  ]);

  useSpeechRecognitionEvent("start", () => {
    isStartingRef.current = false;
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
    isStartingRef.current = false;
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
      if (resultSettleTimeoutRef.current) {
        clearTimeout(resultSettleTimeoutRef.current);
      }
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useEffect(() => {
    if (!feedback) {
      feedbackAnim.stopAnimation();
      feedbackAnim.setValue(0);
      return undefined;
    }

    feedbackAnim.setValue(0);
    if (feedback.type === "timeout") {
      const feedbackKey = feedback.key;
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setFeedback((currentFeedback) =>
            currentFeedback?.key === feedbackKey ? null : currentFeedback,
          );
        }
      });
      return undefined;
    }

    const animation = Animated.loop(
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [feedback, feedbackAnim]);

  useEffect(() => {
    if (!currentCard || isFinished) {
      return undefined;
    }

    cardEnter.stopAnimation();
    cardEnter.setValue(0);
    Animated.spring(cardEnter, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();

    return undefined;
  }, [cardEnter, currentCardKey, currentCard, isFinished]);

  useEffect(() => {
    if (!isFinished) {
      finishAnim.stopAnimation();
      finishAnim.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(finishAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(finishAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [finishAnim, isFinished]);

  useEffect(() => {
    if (isRecognizing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordButtonOpacity, {
            toValue: 0.5,
            duration: 450,
            useNativeDriver: false,
          }),
          Animated.timing(recordButtonOpacity, {
            toValue: 1,
            duration: 450,
            useNativeDriver: false,
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
            useNativeDriver: false,
          }),
          Animated.timing(timerBarOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: false,
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
    setFeedback(null);
    latestTranscriptRef.current = "";
    dispatchSessionUi({ type: "resetQuestion" });
    if (direction === "enToTr") {
      speakEnglish(currentCard.english);
    }
  }, [currentCard, direction, isFinished, practiceRound]);

  useEffect(() => {
    if (isPaused || isRevealed || isFinished || !currentCard) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(timer);
          revealCard(false, 0, "timeout");
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, isRevealed, isFinished, currentCard]);

  useEffect(() => {
    if (
      isPracticeMode ||
      !isFinished ||
      finishedSavedRef.current ||
      !cards.length
    ) {
      return;
    }

    finishedSavedRef.current = true;
    const average = getAverageScore();
    const now = Date.now();
    const examKey = direction === "enToTr" ? "enToTrExams" : "trToEnExams";
    const pointsKey =
      direction === "enToTr" ? "fromEnToTrPoints" : "fromTrToEnPoints";

    const updateLessonCards = (previousLesson, shouldSaveExamScore) => ({
      ...previousLesson,
      ...(shouldSaveExamScore
        ? {
            [examKey]: [
              ...(previousLesson[examKey] || []),
              { date: now, point: average },
            ],
          }
        : {}),
      cards: previousLesson.cards.map((card) => {
        const result = results.find(
          (item) =>
            item.lessonId === previousLesson.id && item.cardId === card.id,
        );

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
    });

    if (isMixedExam) {
      const lessonIds = [...new Set(results.map((item) => item.lessonId))];
      lessonIds.forEach((resultLessonId) => {
        updateLesson(resultLessonId, (previousLesson) =>
          updateLessonCards(previousLesson, false),
        );
      });
      return;
    }

    if (lesson) {
      updateLesson(lesson.id, (previousLesson) =>
        updateLessonCards(previousLesson, true),
      );
    }
  }, [
    cards.length,
    direction,
    isFinished,
    isMixedExam,
    lesson,
    results,
    updateLesson,
  ]);

  const revealCard = (correct, score, reason = correct ? "correct" : "wrong") => {
    if (!currentCard || isRevealed) {
      return;
    }

    setIsPaused(true);
    setIsRevealed(true);
    setResults((previousResults) => [
      ...previousResults.filter(
        (item) => item.resultKey !== currentCardKey,
      ),
      {
        resultKey: currentCardKey,
        lessonId: currentCard.lessonId,
        cardId: currentCard.id,
        english: currentCard.english,
        turkish: currentCard.turkish,
        correct,
        score,
      },
    ]);
    triggerFeedback(reason);
    setTimeout(() => playCardRevealAudio(currentCard, direction), 450);
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
      if (!isStartingRef.current) {
        return;
      }

      releaseRequestedRef.current = true;
      return;
    }

    isStoppingRef.current = true;
    setIsChecking(true);

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    if (resultSettleTimeoutRef.current) {
      clearTimeout(resultSettleTimeoutRef.current);
      resultSettleTimeoutRef.current = null;
    }

    try {
      await ExpoSpeechRecognitionModule.stop();
      resultSettleTimeoutRef.current = setTimeout(() => {
        resultSettleTimeoutRef.current = null;
        checkTranscript();
      }, RESULT_SETTLE_MS);
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
    const now = Date.now();

    if (!currentCard || isRecognizing || isChecking || now < nextMicAllowedAtRef.current) {
      return;
    }

    nextMicAllowedAtRef.current = now + MIC_COOLDOWN_MS;
    abortSpeechRecognition();
    isStartingRef.current = true;
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
      isStartingRef.current = false;
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
      isStartingRef.current = false;
      setRecognitionError(error.message);
      setIsChecking(false);
      setIsPaused(false);
    }
  };

  const abortSpeechRecognition = () => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    if (resultSettleTimeoutRef.current) {
      clearTimeout(resultSettleTimeoutRef.current);
      resultSettleTimeoutRef.current = null;
    }

    releaseRequestedRef.current = false;
    isStartingRef.current = false;
    isStoppingRef.current = false;
    isRecognizingRef.current = false;
    setIsRecognizing(false);
    setIsChecking(false);

    try {
      ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      console.warn("Speech recognition could not be aborted.", error);
    }
  };

  const goNext = () => {
    abortSpeechRecognition();
    dispatchSessionUi({ type: "resetQuestion" });
    setTranscriptText("");
    setRecognitionError("");
    setFeedback(null);
    latestTranscriptRef.current = "";
    setRemaining(CARD_SECONDS);
    timerBarProgressRef.current = 1;
    timerBarProgress.setValue(1);

    if (currentIndex >= cards.length - 1) {
      if (isPracticeMode) {
        setPracticeRound((value) => value + 1);
        setCurrentIndex(0);
        return;
      }

      setIsFinished(true);
      return;
    }

    setCurrentIndex((value) => value + 1);
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

  if (!cards.length) {
    return (
      <View
        style={[styles.container, { backgroundColor: palette.app.background }]}
      >
        <TouchableOpacity
          style={styles.homeButton}
          onPress={goToReturnRoute}
        >
          <Ionicons name={returnIcon} size={26} color={palette.app.text} />
        </TouchableOpacity>
        <Text style={[styles.emptyStateText, { color: palette.app.mutedText }]}>
          Calisilacak kelime bulunamadi.
        </Text>
      </View>
    );
  }

  const cardAnimatedStyle = {
    opacity: cardEnter,
    transform: [
      {
        translateX: cardEnter.interpolate({
          inputRange: [0, 1],
          outputRange: [CARD_SLIDE_DISTANCE, 0],
        }),
      },
      {
        scale: cardEnter.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  if (isFinished) {
    const average = getAverageScore();
    const finishColor = getScoreColor(average, palette);
    const finishScale = finishAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1.08],
    });
    const finishOpacity = finishAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.14, 0.32],
    });

    return (
      <View
        style={[styles.container, { backgroundColor: palette.app.background }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.finishGlow,
            {
              backgroundColor: finishColor,
              opacity: finishOpacity,
              transform: [{ scale: finishScale }],
            },
          ]}
        />
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.finishMood,
            {
              color: finishColor,
              opacity: finishOpacity,
              transform: [{ scale: finishScale }],
            },
          ]}
        >
          {average >= 70 ? "HEY!" : ":("}
        </Animated.Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={goToReturnRoute}
        >
          <Ionicons name={returnIcon} size={26} color={palette.app.text} />
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
              key={item.resultKey}
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
          onPress={goToReturnRoute}
        >
          <Ionicons name={returnIcon} size={26} color={palette.app.text} />
        </TouchableOpacity>
      </View>

      {!isPracticeMode ? (
        <ScrollView
          horizontal
          style={styles.questionScrollerWrap}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.questionScroller}
        >
          {cards.map((card, index) => {
            const result = results.find(
              (item) => item.resultKey === `${card.lessonId}-${card.id}`,
            );
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
      ) : null}

      <Animated.View
        style={[
          styles.card,
          cardAnimatedStyle,
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
      </Animated.View>
      {feedback?.type === "correct" ? (
        <Animated.View pointerEvents="none" style={styles.feedbackLayer}>
          {confettiPieces.map((piece) => (
            <Animated.View
              key={`${feedback.key}-${piece.id}`}
              style={[
                styles.confettiPiece,
                {
                  left: piece.left,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor:
                    confettiColors[feedback.type][
                      piece.id % confettiColors[feedback.type].length
                    ],
                  opacity: feedbackAnim.interpolate({
                    inputRange: [0, 0.12, 0.78, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, piece.drift],
                      }),
                    },
                    {
                      translateY: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-28, piece.fall],
                      }),
                    },
                    {
                      rotate: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", piece.rotate],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </Animated.View>
      ) : null}
      {feedback?.type === "timeout" ? (
        <Animated.View pointerEvents="none" style={styles.heartLayer}>
          {brokenHeartPieces.map((piece) => {
            const halfSize = piece.size / 2;

            return (
              <Animated.View
                key={`${feedback.key}-split-heart-${piece.id}`}
                style={[
                  styles.heartWrap,
                  {
                    left: piece.left,
                    top: piece.top,
                    width: piece.size,
                    height: piece.size,
                    opacity: feedbackAnim.interpolate({
                      inputRange: [0, 0.12, 0.58, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                    transform: [
                      {
                        scale: feedbackAnim.interpolate({
                          inputRange: [0, 0.2, 0.42, 1],
                          outputRange: [0.35, 1.12, 0.96, 0.82],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.heartClip,
                    styles.heartClipLeft,
                    {
                      width: halfSize,
                      height: piece.size,
                      transform: [
                        {
                          translateX: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: [0, -2, -piece.size * 0.36],
                          }),
                        },
                        {
                          translateY: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: [0, 0, piece.fall],
                          }),
                        },
                        {
                          rotate: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: ["0deg", "-7deg", "-30deg"],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heartText,
                      {
                        color: palette.score.low,
                        width: piece.size,
                        height: piece.size,
                        fontSize: piece.size,
                        lineHeight: piece.size,
                      },
                    ]}
                  >
                    {"\u2665"}
                  </Text>
                </Animated.View>
                <Animated.View
                  style={[
                    styles.heartClip,
                    styles.heartClipRight,
                    {
                      width: halfSize,
                      height: piece.size,
                      transform: [
                        {
                          translateX: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: [0, 2, piece.size * 0.36],
                          }),
                        },
                        {
                          translateY: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: [0, 0, piece.fall],
                          }),
                        },
                        {
                          rotate: feedbackAnim.interpolate({
                            inputRange: [0, 0.38, 1],
                            outputRange: ["0deg", "7deg", "30deg"],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heartText,
                      {
                        color: palette.score.low,
                        width: piece.size,
                        height: piece.size,
                        fontSize: piece.size,
                        lineHeight: piece.size,
                        transform: [{ translateX: -halfSize }],
                      },
                    ]}
                  >
                    {"\u2665"}
                  </Text>
                </Animated.View>
              </Animated.View>
            );
          })}
        </Animated.View>
      ) : null}
      <View style={styles.bottomActionArea}>
        {!isRevealed ? (
          <View style={styles.answerArea}>
            {recognitionError ? (
              <Text style={[styles.errorText, { color: palette.score.low }]}>
                {recognitionError}
              </Text>
            ) : null}
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
                <Ionicons name="mic" size={43} color={palette.black.base} />
              </TouchableOpacity>
            </Animated.View>
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
              {!isPracticeMode && currentIndex >= cards.length - 1
                ? "Bitir"
                : "Sonraki"}
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
  bottomActionArea: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -35 }],
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
    marginBottom: 25,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  feedbackLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 8,
  },
  heartLayer: {
    position: "absolute",
    top: 116,
    right: 24,
    bottom: 145,
    left: 24,
    borderRadius: 8,
    overflow: "hidden",
    zIndex: 8,
  },
  heartWrap: {
    position: "absolute",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  heartClip: {
    position: "absolute",
    top: 0,
    overflow: "hidden",
  },
  heartClipLeft: {
    left: 0,
  },
  heartClipRight: {
    right: 0,
  },
  heartText: {
    position: "absolute",
    top: 0,
    left: 0,
    fontWeight: "900",
    includeFontPadding: false,
    textAlign: "center",
  },
  confettiPiece: {
    position: "absolute",
    top: 118,
    borderRadius: 3,
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
    justifyContent: "center",
    marginTop: 16,
    minHeight: 110,
    position: "relative",
    width: "100%",
  },
  recordButtonShell: {
    width: 95,
    height: 95,
  },
  recordButton: {
    width: 95,
    height: 95,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    position: "absolute",
    bottom: 105,
    maxWidth: 300,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    zIndex: 2,
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
    zIndex: 1,
  },
  finishSubtitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 18,
    zIndex: 1,
  },
  finishGlow: {
    position: "absolute",
    top: 82,
    alignSelf: "center",
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  finishMood: {
    position: "absolute",
    top: 92,
    alignSelf: "center",
    fontSize: 92,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyStateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    textAlignVertical: "center",
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
