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
  const {
    enToTrPoint,
    trToEnPoint,
    enToTrLastExamDate,
    trToEnLastExamDate,
    ...lessonWithoutOldPoints
  } = lesson;

  return {
    ...lessonWithoutOldPoints,
    cards: (lesson.cards || []).map(normalizeCard),
  };
};

const normalizeLessons = (lessons) => (lessons || []).map(normalizeLesson);

const createSeedCard = ({ english, turkish, example, imgSrc }) => ({
  id: Math.random(),
  english,
  turkish,
  example,
  exampleSound: "",
  englishSound: "",
  imgSrc,
  fromEnToTrPoints: [],
  fromTrToEnPoints: [],
});

const createSeedLesson = ({ name, cards }) => ({
  name,
  date: seedDate,
  id: Math.random(),
  enToTrExams: [],
  trToEnExams: [],
  cards: cards.map(createSeedCard),
});

const initialLessons = [
  {
    name: "1. ders",
    date: seedDate,
    id: Math.random(),
    enToTrExams: [{ date: seedDate, point: 50 }],
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
  createSeedLesson({
    name: "2. ders",
    cards: [
      {
        english: "say",
        turkish: "söylemek",
        example: "Please say your name.",
        imgSrc: "https://source.unsplash.com/featured/?speaking",
      },
      {
        english: "think",
        turkish: "düşünmek",
        example: "I think it is a good idea.",
        imgSrc: "https://source.unsplash.com/featured/?thinking",
      },
      {
        english: "my week",
        turkish: "haftam",
        example: "My week was very busy.",
        imgSrc: "https://source.unsplash.com/featured/?calendar",
      },
      {
        english: "early",
        turkish: "erken",
        example: "She arrived early.",
        imgSrc: "https://source.unsplash.com/featured/?morning",
      },
      {
        english: "often",
        turkish: "sık sık",
        example: "I often visit my grandparents.",
        imgSrc: "https://source.unsplash.com/featured/?routine",
      },
      {
        english: "grew",
        turkish: "büyüdü",
        example: "The plant grew quickly.",
        imgSrc: "https://source.unsplash.com/featured/?plant",
      },
      {
        english: "before",
        turkish: "önce",
        example: "Wash your hands before dinner.",
        imgSrc: "https://source.unsplash.com/featured/?clock",
      },
      {
        english: "keep",
        turkish: "saklamak / sürdürmek",
        example: "Keep your room clean.",
        imgSrc: "https://source.unsplash.com/featured/?storage",
      },
      {
        english: "prediction",
        turkish: "tahmin",
        example: "My prediction was correct.",
        imgSrc: "https://source.unsplash.com/featured/?forecast",
      },
      {
        english: "survey",
        turkish: "anket",
        example: "We completed a survey at school.",
        imgSrc: "https://source.unsplash.com/featured/?survey",
      },
      {
        english: "environment",
        turkish: "çevre",
        example: "We should protect the environment.",
        imgSrc: "https://source.unsplash.com/featured/?environment",
      },
      {
        english: "box",
        turkish: "kutu",
        example: "The toy is in the box.",
        imgSrc: "https://source.unsplash.com/featured/?box",
      },
      {
        english: "vegetable",
        turkish: "sebze",
        example: "Carrot is a vegetable.",
        imgSrc: "https://source.unsplash.com/featured/?vegetable",
      },
      {
        english: "bowl",
        turkish: "kase",
        example: "The soup is in the bowl.",
        imgSrc: "https://source.unsplash.com/featured/?bowl",
      },
      {
        english: "bottle",
        turkish: "şişe",
        example: "I bought a bottle of water.",
        imgSrc: "https://source.unsplash.com/featured/?bottle",
      },
      {
        english: "cheese",
        turkish: "peynir",
        example: "I like cheese on pizza.",
        imgSrc: "https://source.unsplash.com/featured/?cheese",
      },
      {
        english: "what kind",
        turkish: "ne tür",
        example: "What kind of music do you like?",
        imgSrc: "https://source.unsplash.com/featured/?question",
      },
      {
        english: "pear",
        turkish: "armut",
        example: "She ate a pear.",
        imgSrc: "https://source.unsplash.com/featured/?pear",
      },
      {
        english: "sauce",
        turkish: "sos",
        example: "Add some sauce to the pasta.",
        imgSrc: "https://source.unsplash.com/featured/?sauce",
      },
      {
        english: "sweet",
        turkish: "tatlı",
        example: "This cake is very sweet.",
        imgSrc: "https://source.unsplash.com/featured/?dessert",
      },
      {
        english: "sack",
        turkish: "çuval",
        example: "The potatoes are in a sack.",
        imgSrc: "https://source.unsplash.com/featured/?sack",
      },
      {
        english: "big",
        turkish: "büyük",
        example: "They live in a big house.",
        imgSrc: "https://source.unsplash.com/featured/?big-house",
      },
      {
        english: "the biggest",
        turkish: "en büyük",
        example: "It is the biggest building in town.",
        imgSrc: "https://source.unsplash.com/featured/?skyscraper",
      },
      {
        english: "mistake",
        turkish: "hata",
        example: "Everyone makes mistakes.",
        imgSrc: "https://source.unsplash.com/featured/?error",
      },
    ],
  }),
  createSeedLesson({
    name: "3. ders",
    cards: [
      {
        english: "poetry",
        turkish: "şiir",
        example: "She loves reading poetry.",
        imgSrc: "https://source.unsplash.com/featured/?poetry",
      },
      {
        english: "rhyme",
        turkish: "uyak / kafiye",
        example: "Cat and hat rhyme.",
        imgSrc: "https://source.unsplash.com/featured/?book",
      },
      {
        english: "competition",
        turkish: "yarışma",
        example: "He won the competition.",
        imgSrc: "https://source.unsplash.com/featured/?competition",
      },
      {
        english: "acrostic",
        turkish: "akrostiş",
        example: "We wrote an acrostic poem.",
        imgSrc: "https://source.unsplash.com/featured/?writing",
      },
      {
        english: "wing",
        turkish: "kanat",
        example: "The bird spread its wings.",
        imgSrc: "https://source.unsplash.com/featured/?wing",
      },
      {
        english: "letter",
        turkish: "harf",
        example: "A is the first letter.",
        imgSrc: "https://source.unsplash.com/featured/?alphabet",
      },
      {
        english: "line",
        turkish: "satır / çizgi",
        example: "Draw a straight line.",
        imgSrc: "https://source.unsplash.com/featured/?line",
      },
      {
        english: "spell",
        turkish: "hecelemek",
        example: "Can you spell your name?",
        imgSrc: "https://source.unsplash.com/featured/?spelling",
      },
      {
        english: "connected to",
        turkish: "bağlı",
        example: "The printer is connected to the computer.",
        imgSrc: "https://source.unsplash.com/featured/?connection",
      },
      {
        english: "a bag of",
        turkish: "bir paket / torba",
        example: "I bought a bag of apples.",
        imgSrc: "https://source.unsplash.com/featured/?shopping-bag",
      },
      {
        english: "want to",
        turkish: "istemek",
        example: "I want to learn English.",
        imgSrc: "https://source.unsplash.com/featured/?goal",
      },
      {
        english: "stack",
        turkish: "yığın",
        example: "There is a stack of books.",
        imgSrc: "https://source.unsplash.com/featured/?stack-books",
      },
      {
        english: "last",
        turkish: "son",
        example: "This is the last page.",
        imgSrc: "https://source.unsplash.com/featured/?last-page",
      },
      {
        english: "sometimes",
        turkish: "bazen",
        example: "I sometimes drink tea.",
        imgSrc: "https://source.unsplash.com/featured/?thinking",
      },
      {
        english: "never",
        turkish: "asla",
        example: "I never smoke.",
        imgSrc: "https://source.unsplash.com/featured/?no",
      },
      {
        english: "always",
        turkish: "her zaman",
        example: "She always smiles.",
        imgSrc: "https://source.unsplash.com/featured/?smile",
      },
      {
        english: "bright",
        turkish: "parlak",
        example: "The sun is very bright today.",
        imgSrc: "https://source.unsplash.com/featured/?bright-light",
      },
      {
        english: "take",
        turkish: "almak",
        example: "Please take your bag with you.",
        imgSrc: "https://source.unsplash.com/featured/?taking",
      },
    ],
  }),
];

const mergeMissingSeedLessons = (lessons, seedLessons) => {
  const lessonNames = new Set((lessons || []).map((lesson) => lesson.name));
  const missingSeedLessons = seedLessons.filter(
    (lesson) => !lessonNames.has(lesson.name),
  );

  return [...(lessons || []), ...missingSeedLessons];
};

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
          ? mergeMissingSeedLessons(
              normalizeLessons(JSON.parse(storedLessons)),
              normalizedInitialLessons,
            )
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
