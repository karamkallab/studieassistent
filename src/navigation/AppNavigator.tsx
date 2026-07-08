import React from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import CourseListScreen from '../screens/courses/CourseListScreen';
import CreateCourseScreen from '../screens/courses/CreateCourseScreen';
import CourseScreen from '../screens/courses/CourseScreen';
import CreateFlashcardScreen from '../screens/flashcards/CreateFlashcardScreen';
import ReviewScreen from '../screens/review/ReviewScreen';
import ReviewCompleteScreen from '../screens/review/ReviewCompleteScreen';
import QuizScreen from '../screens/quiz/QuizScreen';
import QuizResultScreen from '../screens/quiz/QuizResultScreen';
import MindmapScreen from '../screens/mindmap/MindmapScreen';
import UpgradeScreen from '../screens/upgrade/UpgradeScreen';
import SummaryScreen from '../screens/summary/SummaryScreen';
import EditCourseScreen from '../screens/courses/EditCourseScreen';
import WriteScreen from '../screens/study/WriteScreen';
import MatchScreen from '../screens/study/MatchScreen';
import FocusScreen from '../screens/focus/FocusScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PlanScreen from '../screens/plan/PlanScreen';
import CreatePlanScreen from '../screens/plan/CreatePlanScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { SunIcon } from '../components/icons/SunIcon';
import { BookIcon } from '../components/icons/BookIcon';
import { TargetIcon } from '../components/icons/TargetIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { PersonIcon } from '../components/icons/PersonIcon';
import { colors, fontFamily, fontSize } from '../theme/tokens';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Main: undefined;
  CreateCourse: undefined;
  Course: { courseId: string; courseName: string };
  CreateFlashcard: { courseId: string; cardId?: string };
  Review: { courseId: string; courseName: string };
  ReviewComplete: { count: number; streakDays: number };
  Write: { courseId: string; courseName: string };
  Match: { courseId: string; courseName: string };
  Quiz: { courseId: string; courseName: string };
  QuizResult: { score: number; total: number; courseId: string; courseName: string };
  Mindmap: { courseId: string; courseName: string; documentId?: string };
  Upgrade: undefined;
  Summary: { documentId?: string; courseId: string };
  EditCourse: { courseId: string; courseName: string; description: string; color: string };
  CreatePlan: { planId?: string };
};

export type TabParamList = {
  Home: undefined;
  Kurser: undefined;
  Fokus: undefined;
  Planera: undefined;
  Profil: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const stackOptions = {
  headerStyle: { backgroundColor: colors.paper },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fontFamily.bodySemiBold },
  headerShadowVisible: false,
};

const TAB_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Home: SunIcon,
  Kurser: BookIcon,
  Fokus: TargetIcon,
  Planera: CalendarIcon,
  Profil: PersonIcon,
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 0.5 },
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon size={20} color={color} strokeWidth={1.75} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Idag' }} />
      <Tab.Screen name="Kurser" component={CourseListScreen} options={{ tabBarLabel: 'Kurser' }} />
      <Tab.Screen name="Fokus" component={FocusScreen} options={{ tabBarLabel: 'Fokus' }} />
      <Tab.Screen name="Planera" component={PlanScreen} options={{ tabBarLabel: 'Planera' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: 'Profil' }} />
    </Tab.Navigator>
  );
}

function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={stackOptions}>
      <AppStack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
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
      <AppStack.Screen name="Write" component={WriteScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Match" component={MatchScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Quiz" component={QuizScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="QuizResult" component={QuizResultScreen} options={{ headerShown: false }} />
      <AppStack.Screen name="Mindmap" component={MindmapScreen} options={{ title: 'Tankekarta' }} />
      <AppStack.Screen name="Upgrade" component={UpgradeScreen} options={{ title: 'Premium' }} />
      <AppStack.Screen name="Summary" component={SummaryScreen} options={{ title: 'Sammanfattning' }} />
      <AppStack.Screen name="EditCourse" component={EditCourseScreen} options={{ title: 'Redigera kurs' }} />
      <AppStack.Screen
        name="CreatePlan"
        component={CreatePlanScreen}
        options={({ route }) => ({ title: route.params?.planId ? 'Redigera pass' : 'Nytt studiepass' })}
      />
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
