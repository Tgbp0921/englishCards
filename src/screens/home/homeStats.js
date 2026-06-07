const DAY_MS = 24 * 60 * 60 * 1000;

export const timeRanges = [
  { key: "day", label: "Son 1 gun", days: 1 },
  { key: "week", label: "Son 1 hafta", days: 7 },
  { key: "month", label: "Son 1 ay", days: 30 },
];

export const scoreBuckets = [
  { key: "low", label: "0-49", min: 0, max: 50 },
  { key: "medium", label: "50-69", min: 50, max: 70 },
  { key: "good", label: "70-84", min: 70, max: 85 },
  { key: "excellent", label: "85-100", min: 85, max: 101 },
];

const average = (values = []) => {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (!validValues.length) {
    return 0;
  }

  return Math.round(
    validValues.reduce((total, value) => total + value, 0) / validValues.length,
  );
};

const averagePoints = (points = []) =>
  average((points || []).map((item) => item.point || 0));

const latestDate = (points = []) =>
  (points || []).reduce((latest, item) => Math.max(latest, item.date || 0), 0);

const formatLastDate = (date) => {
  if (!date) {
    return "-";
  }

  const now = Date.now();
  const diffDays = Math.floor((now - date) / DAY_MS);

  if (diffDays <= 0) {
    return "Bugun";
  }

  if (diffDays === 1) {
    return "Dun";
  }

  return `${diffDays} gun`;
};

const formatForgottenAge = (date) => {
  if (!date) {
    return "hic";
  }

  const diffDays = Math.max(0, Math.floor((Date.now() - date) / DAY_MS));

  if (diffDays === 0) {
    return "bugun";
  }

  return `${diffDays} gun`;
};

const getLessonAttempts = (lesson, direction) =>
  (lesson.cards || []).flatMap((card) =>
    direction === "enToTr"
      ? card.fromEnToTrPoints || []
      : card.fromTrToEnPoints || [],
  );

const getAllCardRows = (lessons = []) =>
  lessons.flatMap((lesson) =>
    (lesson.cards || []).map((card) => {
      const enPoints = card.fromEnToTrPoints || [];
      const trPoints = card.fromTrToEnPoints || [];
      const enAverage = averagePoints(enPoints);
      const trAverage = averagePoints(trPoints);

      return {
        lessonId: lesson.id,
        lessonName: lesson.name,
        cardId: card.id,
        english: card.english,
        turkish: card.turkish,
        enAverage,
        trAverage,
        overallAverage: average([enAverage, trAverage]),
        lastEnDate: latestDate(enPoints),
        lastAnyDate: Math.max(latestDate(enPoints), latestDate(trPoints)),
      };
    }),
  );

export const getScoreColor = (score, palette) => {
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

export const buildHomeReport = (lessons = []) => {
  const cards = getAllCardRows(lessons);
  const allAttempts = lessons.flatMap((lesson) =>
    (lesson.cards || []).flatMap((card) => [
      ...(card.fromEnToTrPoints || []),
      ...(card.fromTrToEnPoints || []),
    ]),
  );
  const enAttempts = lessons.flatMap((lesson) =>
    getLessonAttempts(lesson, "enToTr"),
  );
  const trAttempts = lessons.flatMap((lesson) =>
    getLessonAttempts(lesson, "trToEn"),
  );
  const latestAttemptDate = allAttempts.reduce(
    (latest, item) => Math.max(latest, item.date || 0),
    0,
  );

  return {
    overview: {
      totalWords: cards.length,
      totalLessons: lessons.length,
      totalAttempts: allAttempts.length,
      overallAverage: average(allAttempts.map((item) => item.point || 0)),
      lastStudy: formatLastDate(latestAttemptDate),
    },
    timeSummary: timeRanges.map((range) => {
      const threshold = Date.now() - range.days * DAY_MS;
      const attempts = allAttempts.filter((item) => (item.date || 0) >= threshold);
      const correct = attempts.filter((item) => (item.point || 0) > 0).length;

      return {
        ...range,
        total: attempts.length,
        correct,
        wrong: attempts.length - correct,
        average: average(attempts.map((item) => item.point || 0)),
      };
    }),
    lessonReport: lessons.map((lesson) => {
      const enAverage = average(getLessonAttempts(lesson, "enToTr").map((item) => item.point || 0));
      const trAverage = average(getLessonAttempts(lesson, "trToEn").map((item) => item.point || 0));

      return {
        id: lesson.id,
        name: lesson.name,
        wordCount: lesson.cards?.length || 0,
        enAverage,
        trAverage,
        average: average([enAverage, trAverage]),
        weakCount: (lesson.cards || []).filter(
          (card) => averagePoints(card.fromEnToTrPoints || []) < 50,
        ).length,
      };
    }),
    scoreDistribution: scoreBuckets.map((bucket) => ({
      ...bucket,
      count: cards.filter(
        (card) =>
          card.overallAverage >= bucket.min && card.overallAverage < bucket.max,
      ).length,
    })),
    weakWords: [...cards]
      .sort(
        (left, right) =>
          left.enAverage - right.enAverage || left.lastEnDate - right.lastEnDate,
      )
      .slice(0, 5),
    forgottenWords: [...cards]
      .sort(
        (left, right) =>
          left.lastEnDate - right.lastEnDate || left.enAverage - right.enAverage,
      )
      .slice(0, 5)
      .map((card) => ({
        ...card,
        ageLabel: formatForgottenAge(card.lastEnDate),
      })),
    direction: {
      enAverage: average(enAttempts.map((item) => item.point || 0)),
      trAverage: average(trAttempts.map((item) => item.point || 0)),
    },
  };
};
