import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useContext } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DataContext } from "../../context/DataContext";
import ExamScreen from "../screens/exam/ExamScreen";
import HomeScreen from "../screens/home/HomeScreen";
import LessonsScreen from "../screens/lessons/LessonsScreen";
import ListScreen from "../screens/list/ListScreen";
import StudyScreen from "../screens/study/StudyScreen";

const Stack = createNativeStackNavigator();

const HeaderButton = ({
  navigation,
  navigate,
  icon,
  text,
  palette,
  isActive,
}) => (
  <TouchableOpacity
    activeOpacity={0.82}
    onPress={() => navigation.navigate(navigate)}
    style={styles.headerButton}
  >
    <View style={[styles.headerIconBox, isActive && styles.headerIconBoxActive]}>
      <Ionicons name={icon} size={20} color={palette.white.base} />
    </View>
    <Text
      style={[
        styles.headerButtonText,
        {
          color: palette.white.base,
        },
      ]}
    >
      {text}
    </Text>
  </TouchableOpacity>
);

const AppHeader = ({ navigation, palette, routeName }) => (
  <ImageBackground
    source={require("../../assets/ui-nav-gradient.png")}
    resizeMode="cover"
    style={styles.customHeader}
  >
    <View style={styles.headerNav}>
      <HeaderButton
        navigation={navigation}
        navigate="Home"
        icon="home-outline"
        text="Anasayfa"
        palette={palette}
        isActive={routeName === "Home"}
      />
      <HeaderButton
        navigation={navigation}
        navigate="lessons"
        icon="book-outline"
        text="Dersler"
        palette={palette}
        isActive={routeName === "lessons"}
      />
      <HeaderButton
        navigation={navigation}
        navigate="study"
        icon="bar-chart-outline"
        text="İlerleme"
        palette={palette}
        isActive={routeName === "study"}
      />
      <HeaderButton
        navigation={navigation}
        navigate="list"
        icon="settings-outline"
        text="Ayarlar"
        palette={palette}
        isActive={routeName === "list"}
      />
    </View>
  </ImageBackground>
);

export default function AppNavigator() {
  const { palette } = useContext(DataContext);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          header: () => (
            <AppHeader
              navigation={navigation}
              palette={palette}
              routeName={route.name}
            />
          ),
        })}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: "",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="lessons"
          component={LessonsScreen}
          options={{
            title: "",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="Exam"
          component={ExamScreen}
          options={{
            headerShown: false,
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="study"
          component={StudyScreen}
          options={{
            title: "",
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="list"
          component={ListScreen}
          options={{
            title: "",
            animation: "fade",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    width: "100%",
    height: 54,
    overflow: "hidden",
    boxSizing: "border-box",
  },
  headerNav: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    boxSizing: "border-box",
  },
  headerButton: {
    flex: 1,
    minWidth: 0,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  headerIconBox: {
    width: 34,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  headerButtonText: {
    fontSize: 7,
    fontWeight: "900",
    maxWidth: "100%",
    textAlign: "center",
  },
});
