
import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider,
  useSegments,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppNavbar from '@/components/app-navbar';
import { AuthProvider, useAuth } from '../contexts/auth-context';

SplashScreen.preventAutoHideAsync();

function AuthNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  const currentPage = segments[0];
  const isAuthPage =
    currentPage === 'login' || currentPage === 'signup';

  useEffect(() => {
    if (loading) return;

    if (session) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [session, loading]);

  if (loading) {
    return null;
  }

  if (!session && !isAuthPage) {
    return <Redirect href="/login" />;
  }

  if (session && isAuthPage) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1 }}>
      {session && !isAuthPage ? <AppNavbar /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="activities" options={{ headerShown: false }} />
        <Stack.Screen name="activity-chat" options={{ headerShown: false }} />
        <Stack.Screen name="create-activity" options={{ headerShown: false }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
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
