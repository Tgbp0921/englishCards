import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { colorPalette } from "../palette";

const LESSONS_STORAGE_KEY = "lessons";
const seedDate = 1780691558047;

const fallbackMediaByEnglish = {
  hello: {
    imgSrc:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&auto=format&fit=crop",
  },
  goodbye: {
    imgSrc:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  "thank you": {
    imgSrc:
      "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=900&auto=format&fit=crop",
  },
};

const normalizePointHistory = (points) =>
  Array.isArray(points) && points.length
    ? points
    : [{ date: Date.now(), point: 0 }];

const isBrokenSeedUrl = (url) =>
  typeof url === "string" && url.includes("your-cdn.com");

const getFallbackMedia = (english) =>
  fallbackMediaByEnglish[String(english || "").toLocaleLowerCase("en-US")] || {};

const normalizeCard = (card) => {
  const { fromEnToTr, fromTrToEn, ...cardWithoutOldStats } = card;
  const fallbackMedia = getFallbackMedia(card.english);

  return {
    ...cardWithoutOldStats,
    englishSound: isBrokenSeedUrl(card.englishSound) ? "" : card.englishSound,
    exampleSound: isBrokenSeedUrl(card.exampleSound) ? "" : card.exampleSound,
    imgSrc: isBrokenSeedUrl(card.imgSrc)
      ? fallbackMedia.imgSrc || ""
      : card.imgSrc,
    fromEnToTrPoints: normalizePointHistory(card.fromEnToTrPoints),
    fromTrToEnPoints: normalizePointHistory(card.fromTrToEnPoints),
  };
};

const normalizeLesson = (lesson) => {
  const { enToTrPoint, trToEnPoint, ...lessonWithoutOldPoints } = lesson;

  return {
    ...lessonWithoutOldPoints,
    cards: (lesson.cards || []).map(normalizeCard),
  };
};

const normalizeLessons = (lessons) => (lessons || []).map(normalizeLesson);

const initialLessons = [
  {
    name: "1. ders",
    date: seedDate,
    id: Math.random(),
    enToTrLastExamDate: null,
    enToTrExams: [{ date: seedDate, point: 50 }],
    trToEnLastExamDate: null,
    trToEnExams: [{ date: seedDate, point: 30 }],
    cards: [
      {
        id: Math.random(),
        english: "Hello",
        turkish: "Merhaba",
        example: "Hello, how are you?",
        exampleSound: "",
        englishSound: "",
        imgSrc: fallbackMediaByEnglish.hello.imgSrc,
        fromEnToTrPoints: [], //{ date: Date.now, point: 0 }
        fromTrToEnPoints: [], //{ date: Date.now, point: 0 }
      },
      {
        id: Math.random(),
        english: "Goodbye",
        turkish: "Hoşçakal",
        example: "Goodbye, see you later!",
        exampleSound: "",
        englishSound: "",
        imgSrc: fallbackMediaByEnglish.goodbye.imgSrc,
        fromEnToTrPoints: [], //{ date: Date.now, point: 0 }
        fromTrToEnPoints: [], //{ date: Date.now, point: 0 }
      },
      {
        id: Math.random(),
        english: "Thank you",
        turkish: "Teşekkür ederim",
        example: "Thank you for your help!",
        exampleSound: "",
        englishSound: "",
        imgSrc: fallbackMediaByEnglish["thank you"].imgSrc,
        fromEnToTrPoints: [], //{ date: Date.now, point: 0 }
        fromTrToEnPoints: [], //{ date: Date.now, point: 0 }
      },
    ],
  },
];

export const DataContext = createContext({
  colorPalette,
  palette: colorPalette,
  ascncData: { lessons: [] },
  loading: true,
  setAscncData: () => {},
  updateLesson: () => {},
});

export function DataProvider({ children }) {
  const [ascncData, setAscncData] = useState({ lessons: [] });
  const [loading, setLoading] = useState(true);
  const didHydrate = useRef(false);

  useEffect(() => {
    const hydrateLessons = async () => {
      try {
        const storedLessons = await AsyncStorage.getItem(LESSONS_STORAGE_KEY);
        const normalizedInitialLessons = normalizeLessons(initialLessons);
        const lessons = storedLessons
          ? normalizeLessons(JSON.parse(storedLessons))
          : normalizedInitialLessons;

        if (!storedLessons) {
          await AsyncStorage.setItem(
            LESSONS_STORAGE_KEY,
            JSON.stringify(normalizedInitialLessons),
          );
        }

        setAscncData({ lessons });
      } catch (error) {
        console.warn("Lessons could not be loaded from storage.", error);
        setAscncData({ lessons: normalizeLessons(initialLessons) });
      } finally {
        didHydrate.current = true;
        setLoading(false);
      }
    };

    hydrateLessons();
  }, []);

  useEffect(() => {
    if (!didHydrate.current || loading) {
      return;
    }

    AsyncStorage.setItem(
      LESSONS_STORAGE_KEY,
      JSON.stringify(ascncData.lessons || []),
    ).catch((error) => {
      console.warn("Lessons could not be saved to storage.", error);
    });
  }, [ascncData, loading]);

  const updateLesson = useCallback((lessonId, updater) => {
    setAscncData((previousData) => ({
      ...previousData,
      lessons: (previousData.lessons || []).map((lesson) => {
        if (lesson.id !== lessonId) {
          return lesson;
        }

        return typeof updater === "function" ? updater(lesson) : updater;
      }),
    }));
  }, []);

  const value = useMemo(
    () => ({
      colorPalette,
      palette: colorPalette,
      ascncData,
      loading,
      setAscncData,
      updateLesson,
    }),
    [ascncData, loading, updateLesson],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
