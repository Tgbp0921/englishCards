import React, { useContext, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DataContext } from "../../../context/DataContext";
import DirectionComparison from "./DirectionComparison";
import FocusWords from "./FocusWords";
import LessonReport from "./LessonReport";
import OverviewStats from "./OverviewStats";
import ScoreDistribution from "./ScoreDistribution";
import TimeSummary from "./TimeSummary";
import { buildHomeReport } from "./homeStats";

export default function HomeScreen({ navigation }) {
  const { ascncData, palette } = useContext(DataContext);
  const lessons = ascncData.lessons || [];
  const report = useMemo(() => buildHomeReport(lessons), [lessons]);

  const startPracticeWithCards = (mixedCardRefs) => {
    if (!mixedCardRefs.length) {
      return;
    }

    navigation.navigate("Exam", {
      direction: "enToTr",
      returnRoute: "Home",
      returnIcon: "home-outline",
      isPracticeMode: true,
      mixedCardRefs,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.app.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: palette.app.text }]}>ANASAYFA</Text>
        <OverviewStats data={report.overview} palette={palette} />
        <TimeSummary data={report.timeSummary} palette={palette} />
        <LessonReport data={report.lessonReport} palette={palette} />
        <ScoreDistribution data={report.scoreDistribution} palette={palette} />
        <FocusWords
          forgottenWords={report.forgottenWords}
          weakWords={report.weakWords}
          palette={palette}
          onStart={startPracticeWithCards}
        />
        <DirectionComparison data={report.direction} palette={palette} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
