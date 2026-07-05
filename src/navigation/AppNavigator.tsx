import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import CourseListScreen from '../screens/courses/CourseListScreen';
import CreateCourseScreen from '../screens/courses/CreateCourseScreen';
import CourseScreen from '../screens/courses/CourseScreen';
import CreateFlashcardScreen from '../screens/flashcards/CreateFlashcardScreen';
import ReviewScreen from '../screens/review/ReviewScreen';
import ReviewCompleteScreen from '../screens/review/ReviewCompleteScreen';
import { colors, fontFamily } from '../theme/tokens';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  CourseList: undefined;
  CreateCourse: undefined;
  Course: { courseId: string; courseName: string };
  CreateFlashcard: { courseId: string; cardId?: string };
  Review: { courseId: string; courseName: string };
  ReviewComplete: { count: number; streakDays: number };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fontFamily.bodySemiBold },
  headerShadowVisible: false,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={screenOptions}>
      <AppStack.Screen name="CourseList" component={CourseListScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="CreateCourse" component={CreateCourseScreen} options={{ title: 'Ny kurs' }} />
      <AppStack.Screen
        name="Course"
        component={CourseScreen}
        options={({ route }) => ({ title: route.params.courseName })}
      />
      <AppStack.Screen
        name="CreateFlashcard"
        component={CreateFlashcardScreen}
        options={({ route }) => ({ title: route.params.cardId ? 'Redigera kort' : 'Nytt kort' })}
      />
      <AppStack.Screen name="Review" component={ReviewScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="ReviewComplete" component={ReviewCompleteScreen} options={{ headerShown: false }} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper }}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
