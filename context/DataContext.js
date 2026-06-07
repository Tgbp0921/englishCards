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
  say: {
    imgSrc:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop",
  },
  think: {
    imgSrc:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=900&auto=format&fit=crop",
  },
  "my week": {
    imgSrc:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900&auto=format&fit=crop",
  },
  early: {
    imgSrc:
      "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=900&auto=format&fit=crop",
  },
  often: {
    imgSrc:
      "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=900&auto=format&fit=crop",
  },
  grew: {
    imgSrc:
      "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&auto=format&fit=crop",
  },
  before: {
    imgSrc:
      "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=900&auto=format&fit=crop",
  },
  keep: {
    imgSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
  },
  prediction: {
    imgSrc:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  survey: {
    imgSrc:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&auto=format&fit=crop",
  },
  environment: {
    imgSrc:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6?w=900&auto=format&fit=crop",
  },
  box: {
    imgSrc:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=900&auto=format&fit=crop",
  },
  vegetable: {
    imgSrc:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&auto=format&fit=crop",
  },
  bowl: {
    imgSrc:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=900&auto=format&fit=crop",
  },
  bottle: {
    imgSrc:
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900&auto=format&fit=crop",
  },
  cheese: {
    imgSrc:
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=900&auto=format&fit=crop",
  },
  "what kind": {
    imgSrc:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=900&auto=format&fit=crop",
  },
  pear: {
    imgSrc:
      "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=900&auto=format&fit=crop",
  },
  sauce: {
    imgSrc:
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&auto=format&fit=crop",
  },
  sweet: {
    imgSrc:
      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&auto=format&fit=crop",
  },
  sack: {
    imgSrc:
      "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=900&auto=format&fit=crop",
  },
  big: {
    imgSrc:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&auto=format&fit=crop",
  },
  "the biggest": {
    imgSrc:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&auto=format&fit=crop",
  },
  mistake: {
    imgSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
  },
  poetry: {
    imgSrc:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&auto=format&fit=crop",
  },
  rhyme: {
    imgSrc:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&auto=format&fit=crop",
  },
  competition: {
    imgSrc:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&auto=format&fit=crop",
  },
  acrostic: {
    imgSrc:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&auto=format&fit=crop",
  },
  wing: {
    imgSrc:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop",
  },
  letter: {
    imgSrc:
      "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=900&auto=format&fit=crop",
  },
  line: {
    imgSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
  },
  spell: {
    imgSrc:
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=900&auto=format&fit=crop",
  },
  "connected to": {
    imgSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop",
  },
  "a bag of": {
    imgSrc:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&auto=format&fit=crop",
  },
  "want to": {
    imgSrc:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=900&auto=format&fit=crop",
  },
  stack: {
    imgSrc:
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&auto=format&fit=crop",
  },
  last: {
    imgSrc:
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&auto=format&fit=crop",
  },
  sometimes: {
    imgSrc:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=900&auto=format&fit=crop",
  },
  never: {
    imgSrc:
      "https://images.unsplash.com/photo-1516962126636-27ad087061cc?w=900&auto=format&fit=crop",
  },
  always: {
    imgSrc:
      "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=900&auto=format&fit=crop",
  },
  bright: {
    imgSrc:
      "https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=900&auto=format&fit=crop",
  },
  take: {
    imgSrc:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&fit=crop",
  },
};

const normalizePointHistory = (points) =>
  Array.isArray(points) && points.length
    ? points
    : [{ date: Date.now(), point: 0 }];

const isBrokenSeedUrl = (url) =>
  typeof url === "string" &&
  (url.includes("your-cdn.com") || url.includes("source.unsplash.com"));

const getFallbackMedia = (english) =>
  fallbackMediaByEnglish[String(english || "").toLocaleLowerCase("en-US")] || {};

const normalizeCard = (card) => {
  const {
    englishSound,
    exampleSound,
    fromEnToTr,
    fromTrToEn,
    ...cardWithoutOldStats
  } = card;
  const fallbackMedia = getFallbackMedia(card.english);

  return {
    ...cardWithoutOldStats,
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
        imgSrc: fallbackMediaByEnglish.hello.imgSrc,
        fromEnToTrPoints: [], //{ date: Date.now, point: 0 }
        fromTrToEnPoints: [], //{ date: Date.now, point: 0 }
      },
      {
        id: Math.random(),
        english: "Goodbye",
        turkish: "Hoşçakal",
        example: "Goodbye, see you later!",
        imgSrc: fallbackMediaByEnglish.goodbye.imgSrc,
        fromEnToTrPoints: [], //{ date: Date.now, point: 0 }
        fromTrToEnPoints: [], //{ date: Date.now, point: 0 }
      },
      {
        id: Math.random(),
        english: "Thank you",
        turkish: "Teşekkür ederim",
        example: "Thank you for your help!",
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
  updateCard: () => {},
  deleteCard: () => {},
  deleteLesson: () => {},
  addLesson: () => {},
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

  const updateCard = useCallback((lessonId, cardId, updater) => {
    setAscncData((previousData) => ({
      ...previousData,
      lessons: (previousData.lessons || []).map((lesson) => {
        if (lesson.id !== lessonId) {
          return lesson;
        }

        return {
          ...lesson,
          cards: (lesson.cards || []).map((card) => {
            if (card.id !== cardId) {
              return card;
            }

            return typeof updater === "function" ? updater(card) : updater;
          }),
        };
      }),
    }));
  }, []);

  const deleteCard = useCallback((lessonId, cardId) => {
    setAscncData((previousData) => ({
      ...previousData,
      lessons: (previousData.lessons || []).map((lesson) => {
        if (lesson.id !== lessonId) {
          return lesson;
        }

        return {
          ...lesson,
          cards: (lesson.cards || []).filter((card) => card.id !== cardId),
        };
      }),
    }));
  }, []);

  const deleteLesson = useCallback((lessonId) => {
    setAscncData((previousData) => ({
      ...previousData,
      lessons: (previousData.lessons || []).filter(
        (lesson) => lesson.id !== lessonId,
      ),
    }));
  }, []);

  const addLesson = useCallback((lesson) => {
    setAscncData((previousData) => ({
      ...previousData,
      lessons: [...(previousData.lessons || []), normalizeLesson(lesson)],
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
      updateCard,
      deleteCard,
      deleteLesson,
      addLesson,
    }),
    [
      addLesson,
      ascncData,
      deleteCard,
      deleteLesson,
      loading,
      updateCard,
      updateLesson,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
