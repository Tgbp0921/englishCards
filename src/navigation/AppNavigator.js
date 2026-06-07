import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useContext } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DataContext } from "../../context/DataContext";
import ExamScreen from "../screens/exam/ExamScreen";
import HomeScreen from "../screens/home/HomeScreen";
import LessonsScreen from "../screens/lessons/LessonsScreen";
import ListScreen from "../screens/list/ListScreen";
import StudyScreen from "../screens/study/StudyScreen";

const Stack = createNativeStackNavigator();
const LESSONS_STORAGE_KEY = "lessons";

const HeaderButton = ({
  navigation,
  navigate,
  icon,
  text,
  palette,
  isActive,
  side = "left",
}) => (
  <View
    style={{
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
      marginRight: side === "right" ? 10 : 0,
      gap: 2,
      transform: [{ translateY: isActive ? 3 : 0 }],
    }}
  >
    <TouchableOpacity onPress={() => navigation.navigate(navigate)}>
      <Ionicons name={icon} size={24} color={palette.white.base} />
    </TouchableOpacity>
    <Text
      style={{
        color: palette.white.base,
        fontSize: 10,
        fontWeight: "900",
      }}
    >
      {text}
    </Text>
  </View>
);

export default function AppNavigator() {
  const { ascncData, palette } = useContext(DataContext);

  const logDataSources = async () => {
    try {
      const asyncLessons = await AsyncStorage.getItem(LESSONS_STORAGE_KEY);

      console.log("CONTEXT DATA:", ascncData);
      console.log(
        "ASYNC STORAGE DATA:",
        asyncLessons ? JSON.parse(asyncLessons) : null,
      );
    } catch (error) {
      console.log("CONTEXT DATA:", ascncData);
      console.warn("ASYNC STORAGE DATA could not be read:", error);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation, route }) => ({
          headerStyle: {
            backgroundColor: palette.app.primary,
          },
          headerTintColor: palette.white.base,
          headerTitle: () => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={logDataSources}
              style={{
                width: 220,
                height: 48,
              }}
            />
          ),
          headerLeft: () => (
            <>
              <HeaderButton
                navigation={navigation}
                navigate="Home"
                icon="home-outline"
                text="Anasayfa"
                palette={palette}
                isActive={route.name === "Home"}
              />
              <HeaderButton
                navigation={navigation}
                navigate="lessons"
                icon="book-outline"
                text="Sinav"
                palette={palette}
                isActive={route.name === "lessons"}
              />
              <HeaderButton
                navigation={navigation}
                navigate="study"
                icon="create-outline"
                text="Calisma"
                palette={palette}
                isActive={route.name === "study"}
              />
            </>
          ),
          headerRight: () => (
            <HeaderButton
              navigation={navigation}
              navigate="list"
              icon="settings-outline"
              text="Ayarlar"
              palette={palette}
              isActive={route.name === "list"}
              side="right"
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
