import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as yup from "yup";
import { DataContext } from "../../../context/DataContext";

const tabs = [
  { key: "words", label: "Kelimeler" },
  { key: "addLesson", label: "Ders ekle" },
];

const allowedCardKeys = ["english", "turkish", "example", "imgSrc"];

const normalizeSearch = (value) =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .trim();

const averagePoints = (points = []) => {
  if (!Array.isArray(points) || !points.length) {
    return 0;
  }

  return Math.round(
    points.reduce((total, item) => total + (item.point || 0), 0) /
      points.length,
  );
};

const formatPointDate = (date) =>
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

const cardSchema = yup
  .object({
    english: yup
      .string()
      .typeError("english metin olmali.")
      .required("english zorunlu.")
      .max(20, "english en fazla 20 karakter olmali."),
    turkish: yup
      .string()
      .typeError("turkish metin olmali.")
      .required("turkish zorunlu.")
      .max(20, "turkish en fazla 20 karakter olmali."),
    example: yup
      .string()
      .typeError("example metin olmali.")
      .max(50, "example en fazla 50 karakter olmali.")
      .optional(),
    imgSrc: yup
      .string()
      .typeError("imgSrc metin olmali.")
      .max(150, "imgSrc en fazla 150 karakter olmali.")
      .optional(),
  })
  .test("known-keys", "Key hatasi: sadece english, turkish, example, imgSrc kullan.", (value) =>
    Object.keys(value || {}).every((key) => allowedCardKeys.includes(key)),
  );

const cardsSchema = yup
  .array()
  .typeError("Cards array JSON formatinda olmali.")
  .of(cardSchema)
  .min(1, "En az 1 kart girmelisin.")
  .required("Cards array zorunlu.");

const lessonNameSchema = yup
  .string()
  .typeError("Ders adi metin olmali.")
  .required("Ders adi zorunlu.")
  .max(20, "Ders adi en fazla 20 karakter olmali.");

const createLessonFromCards = (lessonName, cards) => ({
  id: Math.random(),
  name: lessonName,
  date: Date.now(),
  enToTrExams: [],
  trToEnExams: [],
  cards: cards.map((card) => ({
    id: Math.random(),
    english: card.english.trim(),
    turkish: card.turkish.trim(),
    example: String(card.example || "").trim(),
    imgSrc: String(card.imgSrc || "").trim(),
    fromEnToTrPoints: [],
    fromTrToEnPoints: [],
  })),
});

export default function ListScreen() {
  const {
    addLesson,
    ascncData,
    deleteCard,
    deleteLesson,
    loading,
    palette,
    updateCard,
    updateLesson,
  } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState("words");
  const [searchText, setSearchText] = useState("");
  const [openLessonIds, setOpenLessonIds] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editTurkish, setEditTurkish] = useState("");
  const [cardsInput, setCardsInput] = useState("");
  const [cardsError, setCardsError] = useState("");
  const [pendingCards, setPendingCards] = useState([]);
  const [lessonNameModal, setLessonNameModal] = useState(null);
  const [lessonNameInput, setLessonNameInput] = useState("");
  const [lessonNameError, setLessonNameError] = useState("");

  const lessons = useMemo(
    () => [...(ascncData.lessons || [])].sort((a, b) => a.date - b.date),
    [ascncData.lessons],
  );

  const filteredLessons = useMemo(() => {
    const query = normalizeSearch(searchText);

    return lessons
      .map((lesson) => {
        const cards = (lesson.cards || []).filter((card) => {
          if (!query) {
            return true;
          }

          return `${card.english || ""} ${card.turkish || ""} ${lesson.name || ""}`
            .toLocaleLowerCase("tr-TR")
            .includes(query);
        });

        return { ...lesson, cards };
      })
      .filter((lesson) => (lesson.cards || []).length || !query);
  }, [lessons, searchText]);

  const toggleLesson = (lessonId) => {
    setOpenLessonIds((previousIds) =>
      previousIds.includes(lessonId)
        ? previousIds.filter((id) => id !== lessonId)
        : [...previousIds, lessonId],
    );
  };

  const openHistory = (lesson, card, direction) => {
    const pointsKey =
      direction === "tr" ? "fromTrToEnPoints" : "fromEnToTrPoints";
    const points = [...(card[pointsKey] || [])].sort(
      (left, right) => right.date - left.date,
    );

    setHistoryModal({
      lessonName: lesson.name,
      word: direction === "tr" ? card.turkish : card.english,
      title: direction === "tr" ? "Tr puani" : "En puani",
      points,
    });
  };

  const openEdit = (lesson, card) => {
    setEditModal({ lessonId: lesson.id, cardId: card.id });
    setEditEnglish(card.english || "");
    setEditTurkish(card.turkish || "");
  };

  const closeEdit = () => {
    setEditModal(null);
    setEditEnglish("");
    setEditTurkish("");
  };

  const saveEdit = () => {
    if (!editModal) {
      return;
    }

    updateCard(editModal.lessonId, editModal.cardId, (card) => ({
      ...card,
      english: editEnglish.trim(),
      turkish: editTurkish.trim(),
    }));
    closeEdit();
  };

  const openLessonNameEdit = (lesson) => {
    setLessonNameInput(lesson.name || "");
    setLessonNameError("");
    setLessonNameModal({ mode: "edit", lessonId: lesson.id });
  };

  const openLessonNameCreate = async () => {
    setCardsError("");

    let parsedCards;
    try {
      parsedCards = JSON.parse(cardsInput);
    } catch (_error) {
      setCardsError("Cards array gecerli JSON olmali.");
      return;
    }

    try {
      const validatedCards = await cardsSchema.validate(parsedCards, {
        abortEarly: false,
        strict: true,
      });
      setPendingCards(validatedCards);
      setLessonNameInput("");
      setLessonNameError("");
      setLessonNameModal({ mode: "create" });
    } catch (error) {
      const message = error.inner?.length
        ? error.inner.map((item) => item.message).join("\n")
        : error.message;
      setCardsError(message);
    }
  };

  const closeLessonNameModal = () => {
    setLessonNameModal(null);
    setLessonNameInput("");
    setLessonNameError("");
  };

  const saveLessonNameModal = async () => {
    if (!lessonNameModal) {
      return;
    }

    try {
      const lessonName = await lessonNameSchema.validate(
        lessonNameInput.trim(),
        { strict: true },
      );

      if (lessonNameModal.mode === "create") {
        addLesson(createLessonFromCards(lessonName, pendingCards));
        setCardsInput("");
        setPendingCards([]);
        setActiveTab("words");
      } else {
        updateLesson(lessonNameModal.lessonId, (lesson) => ({
          ...lesson,
          name: lessonName,
        }));
      }

      closeLessonNameModal();
    } catch (error) {
      setLessonNameError(error.message);
    }
  };

  const confirmDelete = () => {
    if (!deleteModal) {
      return;
    }

    if (deleteModal.type === "lesson") {
      deleteLesson(deleteModal.lessonId);
      setOpenLessonIds((previousIds) =>
        previousIds.filter((lessonId) => lessonId !== deleteModal.lessonId),
      );
    } else {
      deleteCard(deleteModal.lessonId, deleteModal.cardId);
    }

    setDeleteModal(null);
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

  return (
    <View
      style={[styles.container, { backgroundColor: palette.app.background }]}
    >
      <Text style={[styles.title, { color: palette.app.text }]}>AYARLAR</Text>

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

      {activeTab === "words" ? (
        <>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: palette.app.surface,
                borderColor: palette.app.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={palette.app.mutedText}
            />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Kelime ara"
              placeholderTextColor={palette.app.mutedText}
              style={[styles.searchInput, { color: palette.app.text }]}
            />
          </View>

          <ScrollView style={styles.lessonList}>
            {filteredLessons.map((lesson) => {
              const isOpen = openLessonIds.includes(lesson.id);
              const cards = lesson.cards || [];

              return (
                <View
                  key={lesson.id}
                  style={[
                    styles.accordion,
                    {
                      backgroundColor: palette.app.surface,
                      borderColor: palette.app.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.accordionHeader,
                      { backgroundColor: palette.app.surfaceSoft },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.lessonHeaderMain}
                      onPress={() => toggleLesson(lesson.id)}
                    >
                      <Ionicons
                        name={isOpen ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color={palette.app.primary}
                      />
                      <Text
                        style={[styles.lessonName, { color: palette.app.text }]}
                      >
                        {lesson.name}
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.lessonCount,
                        { color: palette.app.mutedText },
                      ]}
                    >
                      {cards.length}
                    </Text>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openLessonNameEdit(lesson)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={19}
                        color={palette.app.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() =>
                        setDeleteModal({
                          type: "lesson",
                          lessonId: lesson.id,
                          word: lesson.name,
                        })
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={19}
                        color={palette.score.low}
                      />
                    </TouchableOpacity>
                  </View>

                  {isOpen ? (
                    <View style={styles.accordionBody}>
                      <View
                        style={[
                          styles.tableHeader,
                          { borderBottomColor: palette.app.border },
                        ]}
                      >
                        <Text
                          style={[styles.wordHeader, { color: palette.app.text }]}
                        >
                          English
                        </Text>
                        <Text
                          style={[styles.wordHeader, { color: palette.app.text }]}
                        >
                          Turkish
                        </Text>
                        <Text
                          style={[styles.scoreHeader, { color: palette.app.text }]}
                        >
                          Tr
                        </Text>
                        <Text
                          style={[styles.scoreHeader, { color: palette.app.text }]}
                        >
                          En
                        </Text>
                        <View style={styles.actionHeader} />
                      </View>

                      {cards.length ? (
                        cards.map((card, index) => {
                          const trScore = averagePoints(card.fromTrToEnPoints);
                          const enScore = averagePoints(card.fromEnToTrPoints);

                          return (
                            <View key={card.id}>
                              <View style={styles.wordRow}>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.wordText,
                                    { color: palette.app.text },
                                  ]}
                                >
                                  {card.english}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  style={[
                                    styles.wordText,
                                    { color: palette.app.text },
                                  ]}
                                >
                                  {card.turkish}
                                </Text>
                                <TouchableOpacity
                                  style={styles.scoreButton}
                                  onPress={() => openHistory(lesson, card, "tr")}
                                >
                                  <Text
                                    style={[
                                      styles.scoreText,
                                      {
                                        color: getScoreColor(trScore, palette),
                                      },
                                    ]}
                                  >
                                    {trScore}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.scoreButton}
                                  onPress={() => openHistory(lesson, card, "en")}
                                >
                                  <Text
                                    style={[
                                      styles.scoreText,
                                      {
                                        color: getScoreColor(enScore, palette),
                                      },
                                    ]}
                                  >
                                    {enScore}
                                  </Text>
                                </TouchableOpacity>
                                <View style={styles.actionCell}>
                                  <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => openEdit(lesson, card)}
                                  >
                                    <Ionicons
                                      name="create-outline"
                                      size={20}
                                      color={palette.app.primary}
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() =>
                                      setDeleteModal({
                                        type: "card",
                                        lessonId: lesson.id,
                                        cardId: card.id,
                                        word: card.english,
                                      })
                                    }
                                  >
                                    <Ionicons
                                      name="trash-outline"
                                      size={20}
                                      color={palette.score.low}
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              {index < cards.length - 1 ? (
                                <View
                                  style={[
                                    styles.wordSeparator,
                                    { backgroundColor: palette.app.border },
                                  ]}
                                />
                              ) : null}
                            </View>
                          );
                        })
                      ) : (
                        <Text
                          style={[styles.empty, { color: palette.app.mutedText }]}
                        >
                          Kelime yok.
                        </Text>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          style={[
            styles.addPanel,
            {
              backgroundColor: palette.app.surface,
              borderColor: palette.app.border,
            },
          ]}
        >
          <Text style={[styles.helpTitle, { color: palette.app.text }]}>
            Cards array yapistir
          </Text>
          <Text style={[styles.helpText, { color: palette.app.mutedText }]}>
            JSON array gir. Sadece english, turkish, example ve imgSrc keyleri
            kabul edilir. english ve turkish zorunlu; example ve imgSrc
            opsiyonel. id, fromEnToTrPoints ve fromTrToEnPoints alanlarini sen
            girme, uygulama olusturur.
          </Text>
          <Text style={[styles.helpCode, { color: palette.app.text }]}>
            {`[
  {
    "english": "Hello",
    "turkish": "Merhaba",
    "example": "Hello, how are you?",
    "imgSrc": "https://images.unsplash.com/photo.jpg"
  }
]`}
          </Text>
          <TextInput
            multiline
            value={cardsInput}
            onChangeText={(value) => {
              setCardsInput(value);
              setCardsError("");
            }}
            placeholder="Cards arrayini buraya yapistir"
            placeholderTextColor={palette.app.mutedText}
            style={[
              styles.cardsInput,
              {
                borderColor: cardsError ? palette.score.low : palette.app.border,
                color: palette.app.text,
              },
            ]}
          />
          {cardsError ? (
            <Text style={[styles.errorText, { color: palette.score.low }]}>
              {cardsError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: palette.app.primary },
            ]}
            onPress={openLessonNameCreate}
          >
            <Text style={styles.primaryText}>Olustur</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={Boolean(historyModal)} transparent animationType="fade">
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
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: palette.app.text }]}>
                  {historyModal?.title}
                </Text>
                <Text
                  style={[styles.modalSubtitle, { color: palette.app.mutedText }]}
                >
                  {historyModal?.lessonName} / {historyModal?.word}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setHistoryModal(null)}
              >
                <Ionicons
                  name="close-outline"
                  size={28}
                  color={palette.app.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.historyList}>
              {historyModal?.points.length ? (
                historyModal.points.map((point) => (
                  <View
                    key={`${point.date}-${point.point}`}
                    style={[
                      styles.historyRow,
                      { borderColor: palette.app.border },
                    ]}
                  >
                    <Text
                      style={[styles.historyDate, { color: palette.app.text }]}
                    >
                      {formatPointDate(point.date)}
                    </Text>
                    <Text
                      style={[
                        styles.historyPoint,
                        { color: getScoreColor(point.point || 0, palette) },
                      ]}
                    >
                      {point.point || 0}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.empty, { color: palette.app.mutedText }]}>
                  Puan gecmisi yok.
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(deleteModal)} transparent animationType="fade">
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
              Silinsin mi?
            </Text>
            <Text style={[styles.confirmText, { color: palette.app.mutedText }]}>
              {deleteModal?.word}{" "}
              {deleteModal?.type === "lesson" ? "dersini" : "kelimesini"} silmek
              istediginden emin misin?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.app.border },
                ]}
                onPress={() => setDeleteModal(null)}
              >
                <Text
                  style={[styles.secondaryText, { color: palette.app.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: palette.score.low }]}
                onPress={confirmDelete}
              >
                <Text style={styles.primaryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(editModal)} transparent animationType="fade">
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
              Kelime duzenle
            </Text>
            <Text style={[styles.inputLabel, { color: palette.app.mutedText }]}>
              English
            </Text>
            <TextInput
              value={editEnglish}
              onChangeText={setEditEnglish}
              maxLength={20}
              style={[
                styles.editInput,
                {
                  borderColor: palette.app.border,
                  color: palette.app.text,
                },
              ]}
            />
            <Text style={[styles.inputLabel, { color: palette.app.mutedText }]}>
              Turkish
            </Text>
            <TextInput
              value={editTurkish}
              onChangeText={setEditTurkish}
              maxLength={20}
              style={[
                styles.editInput,
                {
                  borderColor: palette.app.border,
                  color: palette.app.text,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.app.border },
                ]}
                onPress={closeEdit}
              >
                <Text
                  style={[styles.secondaryText, { color: palette.app.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: palette.app.primary },
                ]}
                onPress={saveEdit}
              >
                <Text style={styles.primaryText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(lessonNameModal)} transparent animationType="fade">
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
              Ders adi
            </Text>
            <TextInput
              value={lessonNameInput}
              onChangeText={(value) => {
                setLessonNameInput(value);
                setLessonNameError("");
              }}
              maxLength={20}
              placeholder="Ders adi"
              placeholderTextColor={palette.app.mutedText}
              style={[
                styles.editInput,
                {
                  borderColor: lessonNameError
                    ? palette.score.low
                    : palette.app.border,
                  color: palette.app.text,
                },
              ]}
            />
            {lessonNameError ? (
              <Text style={[styles.errorText, { color: palette.score.low }]}>
                {lessonNameError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { borderColor: palette.app.border },
                ]}
                onPress={closeLessonNameModal}
              >
                <Text
                  style={[styles.secondaryText, { color: palette.app.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: palette.app.primary },
                ]}
                onPress={saveLessonNameModal}
              >
                <Text style={styles.primaryText}>OK</Text>
              </TouchableOpacity>
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
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tabs: {
    maxWidth: 240,
    minHeight: 38,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 4,
  },
  tabButton: {
    flex: 1,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    outlineStyle: "none",
  },
  lessonList: {
    flex: 1,
  },
  accordion: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  accordionHeader: {
    minHeight: 48,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lessonHeaderMain: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lessonName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  lessonCount: {
    fontSize: 13,
    fontWeight: "900",
  },
  accordionBody: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  tableHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  wordHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  scoreHeader: {
    width: 42,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  actionHeader: {
    width: 72,
  },
  wordRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  wordText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  scoreButton: {
    width: 42,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "900",
  },
  actionCell: {
    width: 72,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  wordSeparator: {
    width: "30%",
    height: 1,
    alignSelf: "center",
    opacity: 0.55,
  },
  addPanel: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginBottom: 10,
  },
  helpCode: {
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 10,
  },
  cardsInput: {
    minHeight: 180,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontWeight: "800",
    textAlignVertical: "top",
    outlineStyle: "none",
  },
  createButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  empty: {
    padding: 18,
    textAlign: "center",
    fontWeight: "800",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
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
    minHeight: 42,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  historyList: {
    gap: 8,
  },
  historyRow: {
    minHeight: 46,
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
    fontSize: 14,
    fontWeight: "800",
  },
  historyPoint: {
    fontSize: 19,
    fontWeight: "900",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
  },
  editInput: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
    outlineStyle: "none",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
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
  dangerButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
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
});
