import { useRouter, useSegments } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

const navigationLinks = [
  { label: 'Accueil', href: '/', segment: 'index' },
  { label: 'Activités', href: '/activities', segment: 'activities' },
  { label: 'Explorer', href: '/explore', segment: 'explore' },
  { label: 'Profil', href: '/profile', segment: 'profile' },
] as const;

type NavigationLink = (typeof navigationLinks)[number];
type AppRoute = NavigationLink['href'] | '/create-activity';

export default function AppNavbar() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = width < 820;
  const isCompact = width < 1050;
  const currentSegment = segments[0];

  const navigate = (href: AppRoute) => {
    setMenuOpen(false);
    router.push(href);
  };

  const renderLink = (
    link: NavigationLink,
    mobile = false,
    compact = false
  ) => {
    const isActive =
      link.segment === 'index'
        ? !currentSegment || currentSegment === 'index'
        : currentSegment === link.segment;

    return (
      <Pressable
        key={link.href}
        accessibilityRole="link"
        accessibilityState={{ selected: isActive }}
        onPress={() => navigate(link.href)}
        style={({ pressed }) => [
          styles.navLink,
          mobile && styles.mobileNavLink,
          compact && styles.compactNavLink,
          isActive && styles.navLinkActive,
          pressed && styles.navLinkPressed,
        ]}
      >
        <Text
          style={[
            styles.navLinkText,
            compact && styles.compactNavLinkText,
            isActive && styles.navLinkTextActive,
          ]}
        >
          {link.label}
        </Text>
      </Pressable>
    );
  };

  const renderCreateButton = (mobile = false, compact = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => navigate('/create-activity')}
      style={({ pressed }) => [
        styles.createButton,
        mobile && styles.mobileCreateButton,
        compact && styles.compactCreateButton,
        pressed && styles.createButtonPressed,
      ]}
    >
      <Text style={styles.createButtonText}>＋ Créer une activité</Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.navbar}>
        <View style={styles.navbarRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="SportMates, accueil"
            onPress={() => navigate('/')}
            style={styles.brand}
          >
            <Text
              style={[styles.brandText, isMobile && styles.mobileBrandText]}
            >
              SportMates
            </Text>
            <Text style={styles.brandAccent}>⚡</Text>
          </Pressable>

          {isMobile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'
              }
              accessibilityState={{ expanded: menuOpen }}
              onPress={() => setMenuOpen((open) => !open)}
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.navLinkPressed,
              ]}
            >
              <Text style={styles.menuIcon}>{menuOpen ? '×' : '☰'}</Text>
            </Pressable>
          ) : (
            <>
              <View style={styles.desktopLinks}>
                {navigationLinks.map((link) =>
                  renderLink(link, false, isCompact)
                )}
              </View>
              {renderCreateButton(false, isCompact)}
            </>
          )}
        </View>

        {isMobile && menuOpen ? (
          <Animated.View
            entering={FadeInDown.duration(180)}
            exiting={FadeOutUp.duration(140)}
            style={styles.mobileMenu}
          >
            {navigationLinks.map((link) => renderLink(link, true))}
            {renderCreateButton(true)}
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDE7',
    zIndex: 10,
  },
  navbar: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  navbarRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandText: {
    color: '#183C2B',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  mobileBrandText: {
    fontSize: 19,
  },
  brandAccent: {
    color: '#8EB34A',
    fontSize: 19,
    fontWeight: '900',
    marginLeft: 2,
  },
  desktopLinks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  navLink: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 13,
  },
  compactNavLink: {
    paddingHorizontal: 9,
  },
  navLinkActive: {
    backgroundColor: '#F0F5EF',
  },
  navLinkPressed: {
    opacity: 0.72,
  },
  navLinkText: {
    color: '#66736A',
    fontSize: 13,
    fontWeight: '700',
  },
  compactNavLinkText: {
    fontSize: 12,
  },
  navLinkTextActive: {
    color: '#20583D',
    fontWeight: '800',
  },
  createButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20583D',
    paddingHorizontal: 17,
    borderRadius: 13,
    flexShrink: 0,
  },
  compactCreateButton: {
    paddingHorizontal: 12,
  },
  createButtonPressed: {
    opacity: 0.82,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    backgroundColor: '#F0F5EF',
    borderRadius: 14,
  },
  menuIcon: {
    color: '#20583D',
    fontSize: 23,
    fontWeight: '700',
  },
  mobileMenu: {
    paddingTop: 2,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F2EF',
  },
  mobileNavLink: {
    minHeight: 48,
    paddingHorizontal: 14,
  },
  mobileCreateButton: {
    marginTop: 8,
  },
});
