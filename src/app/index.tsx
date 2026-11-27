import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

const sports = [
  { emoji: '⚽', name: 'Football', hint: 'Trouve ton équipe' },
  { emoji: '🎾', name: 'Tennis', hint: 'Trouve un partenaire' },
  { emoji: '🎾', name: 'Padel', hint: 'Réserve un match' },
  { emoji: '🏃', name: 'Running', hint: 'Cours à plusieurs' },
  { emoji: '🏋️', name: 'Gym / Fitness', hint: 'Garde le rythme' },
  { emoji: '🏀', name: 'Basketball', hint: 'Trouve ton équipe' },
  { emoji: '🏊', name: 'Swimming', hint: 'Plonge dans une session' },
  { emoji: '🚴', name: 'Cycling', hint: 'Pars rouler à plusieurs' },
  { emoji: '🏐', name: 'Volleyball', hint: 'Rejoins un match' },
  { emoji: '🥋', name: 'Martial Arts', hint: 'Entraîne-toi avec ta team' },
  { emoji: '✨', name: 'Other', hint: 'Découvre de nouvelles activités' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const userId = session?.user.id;
  const [interestedSports, setInterestedSports] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [personalGoal, setPersonalGoal] = useState('');
  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileError, setProfileError] = useState('');
  const isWide = width >= 760;
  const fullName = session?.user.user_metadata?.full_name;
  const metadataFirstName =
    typeof fullName === 'string'
      ? fullName.trim().split(/\s+/)[0] || 'SportMate'
      : 'SportMate';
  const firstName = profileFirstName || metadataFirstName;
  const initial = firstName.charAt(0).toUpperCase();

  const goToActivities = () => router.push('/activities');
  const goToCreateActivity = () => router.push('/create-activity');
  const goToExplore = () => router.push('/explore');
  const goToProfile = () => router.push('/profile');
  const recommendedSports = interestedSports.length
    ? sports.filter((sport) => interestedSports.includes(sport.name)).slice(0, 4)
    : sports.slice(0, 4);
  const goalLabel = personalGoal || goals[0];

  useEffect(() => {
    let active = true;

    async function loadAthletePreferences() {
      if (!userId) return;
      const [athleteResult, profileResult] = await Promise.all([
        supabase
          .from('athlete_profiles')
          .select('profile_data')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      if (!active) return;
      if (athleteResult.error || profileResult.error) {
        setProfileError(
          athleteResult.error?.message ??
            profileResult.error?.message ??
            'Impossible de charger tes préférences.',
        );
        return;
      }

      setProfileError('');
      const profileName = profileResult.data?.full_name;
      setProfileFirstName(
        typeof profileName === 'string'
          ? profileName.trim().split(/\s+/)[0] ?? ''
          : '',
      );
      const profileData = athleteResult.data?.profile_data;
      if (typeof profileData !== 'object' || profileData === null) return;
      const preferences = profileData as {
        sports?: unknown;
        goals?: unknown;
        personalGoal?: unknown;
      };
      setInterestedSports(
        Array.isArray(preferences.sports)
          ? preferences.sports.filter(
              (sport): sport is string => typeof sport === 'string',
            )
          : [],
      );
      setGoals(
        Array.isArray(preferences.goals)
          ? preferences.goals.filter(
              (goal): goal is string => typeof goal === 'string',
            )
          : [],
      );
      setPersonalGoal(
        typeof preferences.personalGoal === 'string'
          ? preferences.personalGoal
          : '',
      );
    }

    void loadAthletePreferences();
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isWide && styles.wideContent]}
      >
        <View style={styles.welcomeRow}>
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>TA COMMUNAUTÉ SPORTIVE</Text>
            <Text style={styles.greeting}>Salam, {firstName} 👋</Text>
            <Text style={styles.subtitle}>
              Le sport est encore meilleur à plusieurs.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.pressed,
            ]}
            onPress={goToProfile}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mon profil"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            {isWide ? (
              <View>
                <Text style={styles.profileButtonTitle}>Mon profil</Text>
                <Text style={styles.profileButtonHint}>Voir mes infos</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={[styles.hero, isWide && styles.wideHero]}>
          <View style={[styles.heroCopy, isWide && styles.wideHeroCopy]}>
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>SPORT • AMIS • FUN</Text>
            </View>

            <Text style={styles.heroTitle}>
              Trouve ta team.{'\n'}Bouge plus.
            </Text>
            <Text style={styles.heroDescription}>
              Découvre des sportifs près de toi, rejoins une activité ou crée
              ton prochain match.
            </Text>

            <View style={[styles.heroActions, !isWide && styles.mobileHeroActions]}>
              <Pressable
                accessibilityRole="button"
                onPress={goToExplore}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Trouver des partenaires <Text>→</Text>
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={goToActivities}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryButtonPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Voir les activités</Text>
              </Pressable>
            </View>
          </View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.sportVisual, !isWide && styles.mobileSportVisual]}
          >
            <View style={styles.visualHalo} />
            <View style={[styles.sportBubble, styles.footballBubble]}>
              <Text style={styles.bubbleEmoji}>⚽</Text>
            </View>
            <View style={[styles.sportBubble, styles.tennisBubble]}>
              <Text style={styles.bubbleEmoji}>🎾</Text>
            </View>
            <View style={[styles.sportBubble, styles.runningBubble]}>
              <Text style={styles.bubbleEmoji}>🏃</Text>
            </View>
            <View style={styles.visualCaption}>
              <Text style={styles.visualCaptionTitle}>À plusieurs,</Text>
              <Text style={styles.visualCaptionText}>c’est mieux.</Text>
            </View>
          </View>
        </View>

        {goalLabel ? (
          <View style={styles.goalCard}>
            <Text style={styles.goalEyebrow}>TON CAP SPORTIF</Text>
            <Text style={styles.goalText}>{goalLabel}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={goToProfile}
              hitSlop={8}
            >
              <Text style={styles.goalLink}>Modifier mon profil →</Text>
            </Pressable>
          </View>
        ) : null}
        {profileError ? (
          <Text accessibilityRole="alert" style={styles.profileError}>
            Tes préférences ne sont pas disponibles : {profileError}
          </Text>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>PASSE À L’ACTION</Text>
            <Text style={styles.sectionTitle}>Commence ici</Text>
          </View>
        </View>

        <View style={[styles.actionGrid, isWide && styles.wideActionGrid]}>
          <Pressable
            accessibilityRole="button"
            onPress={goToActivities}
            style={({ pressed }) => [
              styles.actionCard,
              isWide && styles.wideActionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.actionIcon, styles.activityIcon]}>
              <Text style={styles.actionEmoji}>🏟️</Text>
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Rejoins une activité</Text>
              <Text style={styles.actionDescription}>
                Des matchs et des sessions à découvrir.
              </Text>
            </View>
            <Text style={styles.actionArrow}>↗</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={goToCreateActivity}
            style={({ pressed }) => [
              styles.actionCard,
              isWide && styles.wideActionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.actionIcon, styles.createIcon]}>
              <Text style={styles.actionEmoji}>＋</Text>
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Organise ton match</Text>
              <Text style={styles.actionDescription}>
                Choisis ton sport et invite la communauté.
              </Text>
            </View>
            <Text style={styles.actionArrow}>↗</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>CHOISIS TON TERRAIN</Text>
            <Text style={styles.sectionTitle}>
              {interestedSports.length ? 'Tes sports' : 'Quel sport te tente ?'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={goToExplore}
            hitSlop={8}
          >
            <Text style={styles.seeAll}>Tout explorer →</Text>
          </Pressable>
        </View>

        <View style={styles.sportsGrid}>
          {recommendedSports.map((sport) => (
            <Pressable
              key={sport.name}
              accessibilityRole="button"
              onPress={goToExplore}
              style={({ pressed }) => [
                styles.sportCard,
                isWide && styles.wideSportCard,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.sportCardTop}>
                <View style={styles.sportEmojiBox}>
                  <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                </View>
                <Text style={styles.sportCardArrow}>↗</Text>
              </View>
              <Text style={styles.sportName}>{sport.name}</Text>
              <Text style={styles.sportHint}>{sport.hint}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerMark}>SPORTMATES ⚡</Text>
          <Text style={styles.footerText}>Bouge avec ta communauté.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F2',
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 38,
  },
  wideContent: {
    maxWidth: 1180,
    paddingHorizontal: 32,
    paddingTop: 30,
    paddingBottom: 50,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  welcomeCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: '#66816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  greeting: {
    color: '#183C2B',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    color: '#788078',
    fontSize: 13,
    marginTop: 5,
  },
  profileButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DDEBDD',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#24543A',
    fontSize: 19,
    fontWeight: '900',
  },
  profileButtonTitle: {
    color: '#294333',
    fontSize: 12,
    fontWeight: '800',
  },
  profileButtonHint: {
    color: '#89938B',
    fontSize: 10,
    marginTop: 3,
  },
  hero: {
    minHeight: 300,
    flexDirection: 'row',
    backgroundColor: '#20583D',
    borderRadius: 28,
    padding: 24,
    marginBottom: 34,
    overflow: 'hidden',
  },
  wideHero: {
    minHeight: 350,
    paddingHorizontal: 42,
    paddingVertical: 35,
    alignItems: 'center',
    marginBottom: 44,
  },
  heroCopy: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  wideHeroCopy: {
    flex: 1.2,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  heroBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D7F379',
  },
  heroBadgeText: {
    color: '#E2F0E3',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 35,
    fontWeight: '900',
    lineHeight: 40,
    letterSpacing: -0.8,
    marginTop: 21,
  },
  heroDescription: {
    maxWidth: 440,
    color: '#E0EBE1',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  mobileHeroActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D7F379',
    paddingHorizontal: 17,
    borderRadius: 14,
  },
  primaryButtonPressed: {
    backgroundColor: '#C6E663',
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#1B3C29',
    fontSize: 12,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sportVisual: {
    width: 310,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSportVisual: {
    position: 'absolute',
    right: -82,
    bottom: -34,
    width: 225,
    height: 190,
    opacity: 0.42,
  },
  visualHalo: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(215,243,121,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(215,243,121,0.18)',
  },
  sportBubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.24)',
    elevation: 5,
  },
  footballBubble: {
    width: 82,
    height: 82,
    borderRadius: 41,
    top: 26,
    left: 30,
  },
  tennisBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    top: 55,
    right: 24,
  },
  runningBubble: {
    width: 78,
    height: 78,
    borderRadius: 39,
    bottom: 23,
    left: 68,
  },
  bubbleEmoji: {
    fontSize: 34,
  },
  visualCaption: {
    position: 'absolute',
    right: 5,
    bottom: 22,
    backgroundColor: '#D7F379',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    transform: [{ rotate: '4deg' }],
  },
  visualCaptionTitle: {
    color: '#1B3C29',
    fontSize: 11,
    fontWeight: '900',
  },
  visualCaptionText: {
    color: '#46603D',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: 2,
    marginBottom: 15,
  },
  sectionEyebrow: {
    color: '#829086',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  sectionTitle: {
    color: '#20392A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7ECE5',
    borderRadius: 18,
    padding: 16,
    marginTop: -14,
    marginBottom: 30,
  },
  goalEyebrow: {
    color: '#829086',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  goalText: {
    color: '#20392A',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  goalLink: {
    color: '#20583D',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 9,
  },
  profileError: {
    color: '#A22F2F',
    fontSize: 12,
    marginTop: -14,
    marginBottom: 22,
  },
  actionGrid: {
    gap: 12,
    marginBottom: 34,
  },
  wideActionGrid: {
    flexDirection: 'row',
    marginBottom: 42,
  },
  actionCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E7ECE5',
    gap: 13,
  },
  wideActionCard: {
    flex: 1,
    minHeight: 104,
    padding: 18,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    backgroundColor: '#E7F0E5',
  },
  createIcon: {
    backgroundColor: '#F1F4D9',
  },
  actionEmoji: {
    color: '#20583D',
    fontSize: 24,
    fontWeight: '800',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#20392A',
    fontSize: 14,
    fontWeight: '800',
  },
  actionDescription: {
    color: '#788078',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  actionArrow: {
    color: '#66806D',
    fontSize: 19,
    fontWeight: '700',
  },
  seeAll: {
    color: '#20583D',
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 6,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  sportCard: {
    width: '48.5%',
    minHeight: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E7ECE5',
  },
  wideSportCard: {
    width: '23.5%',
    minHeight: 166,
    padding: 19,
  },
  sportCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  sportEmojiBox: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F6F0',
    borderRadius: 15,
  },
  sportEmoji: {
    fontSize: 26,
  },
  sportCardArrow: {
    color: '#A0AAA1',
    fontSize: 18,
  },
  sportName: {
    color: '#294333',
    fontSize: 15,
    fontWeight: '800',
  },
  sportHint: {
    color: '#788078',
    fontSize: 10,
    marginTop: 5,
  },
  pressed: {
    opacity: 0.75,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E7ECE5',
    marginTop: 35,
    paddingTop: 20,
  },
  footerMark: {
    color: '#66816D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  footerText: {
    color: '#89938B',
    fontSize: 11,
    marginTop: 6,
  },
});
