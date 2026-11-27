
import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider,
  useSegments,
  type Href,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppNavbar from '@/components/app-navbar';
import { AuthProvider, useAuth } from '../contexts/auth-context';

SplashScreen.preventAutoHideAsync();

function AuthNavigation() {
  const {
    session,
    loading,
    athleteProfileState,
    athleteProfileError,
    refreshAthleteProfile,
  } = useAuth();
  const segments = useSegments();

  const currentPage = segments[0] as string | undefined;
  const isAuthPage =
    currentPage === 'login' ||
    currentPage === 'signup' ||
    currentPage === 'welcome';
  const isAthleteProfilePage = currentPage === 'athlete-profile';

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (
    loading ||
    (session &&
      (athleteProfileState === 'checking' || athleteProfileState === null))
  ) {
    return session ? (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F4F7F2',
        }}
      >
        <ActivityIndicator size="large" color="#20583D" />
      </View>
    ) : null;
  }

  if (!session && !isAuthPage) {
    return <Redirect href={'/welcome' as Href} />;
  }

  if (session && isAuthPage) {
    return <Redirect href="/" />;
  }

  if (session && athleteProfileState === 'error') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: '#F4F7F2',
        }}
      >
        <Text
          style={{
            color: '#183C2B',
            fontSize: 20,
            fontWeight: '800',
            textAlign: 'center',
          }}
        >
          Impossible de vérifier ton profil sportif
        </Text>
        <Text
          style={{
            color: '#66736A',
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          {athleteProfileError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refreshAthleteProfile()}
          style={{ marginTop: 18, padding: 12 }}
        >
          <Text style={{ color: '#20583D', fontWeight: '800' }}>
            Réessayer
          </Text>
        </Pressable>
      </View>
    );
  }

  if (
    session &&
    athleteProfileState === 'incomplete' &&
    !isAthleteProfilePage
  ) {
    return <Redirect href={'/athlete-profile' as Href} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {session && !isAuthPage && !isAthleteProfilePage ? <AppNavbar /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-profile" options={{ headerShown: false }} />
        <Stack.Screen name="activities" options={{ headerShown: false }} />
        <Stack.Screen name="activity-chat" options={{ headerShown: false }} />
        <Stack.Screen name="create-activity" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="racket-stats" options={{ headerShown: false }} />
        <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <AuthNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
}
