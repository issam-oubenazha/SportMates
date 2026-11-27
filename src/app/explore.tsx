
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';
type Player = {
  id: string;
  full_name: string;
  city: string;
  favorite_sport: string;
  bio: string;
  avatar_url: string | null;
};

const SPORTS = [
  'Tous',
  'Football',
  'Tennis',
  'Padel',
  'Running',
  'Gym / Fitness',
  'Fitness',
  'Basketball',
  'Swimming',
  'Natation',
  'Cycling',
  'Cyclisme',
  'Volleyball',
  'Martial Arts',
  'Other',
];

export default function ExploreScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 820;
  const userId = session?.user.id;
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('Tous');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [preferenceError, setPreferenceError] = useState('');

  const loadPlayers = useCallback(async () => {
    if (!userId) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [playersResult, profileResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, city, favorite_sport, bio, avatar_url')
          .neq('id', userId)
          .order('full_name', { ascending: true }),
        supabase
          .from('profiles')
          .select('favorite_sport')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      if (playersResult.error) {
        throw playersResult.error;
      }

      setPlayers((playersResult.data ?? []) as Player[]);
      if (profileResult.error) {
        setPreferenceError(profileResult.error.message);
      } else {
        setPreferenceError('');
        const preferred = profileResult.data?.favorite_sport;
        if (preferred && SPORTS.includes(preferred)) {
          setSelectedSport((current) =>
            current === 'Tous' ? preferred : current,
          );
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les joueurs.',
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return players.filter((player) => {
      const matchesSearch =
        !query ||
        (player.full_name ?? '').toLowerCase().includes(query) ||
        (player.city ?? '').toLowerCase().includes(query) ||
        (player.favorite_sport ?? '').toLowerCase().includes(query);

      const matchesSport =
        selectedSport === 'Tous' ||
        player.favorite_sport === selectedSport;

      return matchesSearch && matchesSport;
    });
  }, [players, search, selectedSport]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.pageEyebrow}>SPORTMATES COMMUNITY</Text>
          <Text style={styles.pageTitle}>Explorer</Text>
          <Text style={styles.subtitle}>Trouve ton prochain partenaire.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualiser les joueurs"
          onPress={loadPlayers}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>LA COMMUNAUTÉ SPORTIVE</Text>
        <Text style={styles.heroTitle}>
          Le sport, c’est mieux{'\n'}à plusieurs.
        </Text>
        <Text style={styles.heroDescription}>
          Découvre des sportifs, trouve des partenaires et partage ta passion.
        </Text>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Trouver des sportifs</Text>
        <Text style={styles.sectionHint}>Cherche par nom, ville ou sport</Text>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Nom, ville ou sport..."
          placeholderTextColor="#8994A7"
          style={styles.searchInput}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.filterLabel}>SPORT PRÉFÉRÉ</Text>
      {preferenceError ? (
        <Text style={{ color: '#A22F2F', fontSize: 11, marginBottom: 8 }}>
          Ton sport favori n’a pas pu être chargé : {preferenceError}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportList}
      >
        {SPORTS.map((sport) => {
          const active = selectedSport === sport;

          return (
            <Pressable
              key={sport}
              onPress={() => setSelectedSport(sport)}
              style={[styles.sportChip, active && styles.activeSportChip]}
            >
              <Text
                style={[
                  styles.sportChipText,
                  active && styles.activeSportChipText,
                ]}
              >
                {sport}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>Partenaires sportifs</Text>
        {!loading && (
          <Text style={styles.resultCount}>
            {filteredPlayers.length} résultat(s)
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#7CFF6B" />
          <Text style={styles.stateText}>Chargement des sportifs...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={styles.stateTitle}>Chargement impossible</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={loadPlayers}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : filteredPlayers.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateEmoji}>🏃</Text>
          <Text style={styles.stateTitle}>
            {players.length === 0
              ? 'La communauté démarre !'
              : 'Aucun résultat'}
          </Text>
          <Text style={styles.stateText}>
            {players.length === 0
              ? 'Aucun autre profil disponible pour le moment. Invite tes amis à rejoindre SportMates !'
              : 'Essaie un autre nom, une autre ville ou un autre sport.'}
          </Text>
          {(search.length > 0 || selectedSport !== 'Tous') && (
            <Pressable
              onPress={() => {
                setSearch('');
                setSelectedSport('Tous');
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Effacer les filtres</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.playerList}>
          {filteredPlayers.map((player) => {
            const initial = (player.full_name || '?')
              .trim()
              .charAt(0)
              .toUpperCase();

            return (
              <Pressable
                key={player.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/player/[id]',
                    params: { id: player.id },
                  })
                }
                style={({ pressed }) => [
                  styles.playerCard,
                  isWide && styles.widePlayerCard,
                  pressed && styles.playerCardPressed,
                ]}
              >
                <View style={styles.playerTop}>
                  <View style={styles.avatar}>
                    {player.avatar_url ? (
                      <Image
                        source={{ uri: player.avatar_url }}
                        style={styles.avatarImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <Text style={styles.avatarText}>{initial || '?'}</Text>
                    )}
                  </View>

                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.full_name || 'Sportif'}
                    </Text>
                    <Text style={styles.playerCity}>
                      📍 {player.city?.trim() || 'Ville non renseignée'}
                    </Text>
                  </View>

                  <Text style={styles.playerArrow}>›</Text>
                </View>

                <View style={styles.sportBadge}>
                  <Text style={styles.sportBadgeText}>
                    ⚡ {player.favorite_sport || 'Sport non renseigné'}
                  </Text>
                </View>

                <Text style={styles.playerBio} numberOfLines={3}>
                  {player.bio?.trim() ||
                    'Ce sportif n’a pas encore ajouté de description.'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.footer}>
        SPORTMATES ⚡ · Bouge ensemble.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F2',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 120,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  pageEyebrow: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  pageTitle: {
    color: '#183C2B',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: '#788078',
    fontSize: 13,
    marginTop: 5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAE2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  refreshText: {
    color: '#20583D',
    fontSize: 27,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: '#20583D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#2A6649',
    overflow: 'hidden',
  },
  eyebrow: {
    color: '#D7F379',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 36,
  },
  heroDescription: {
    color: '#E0EBE1',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  sectionHeading: {
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#20392A',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionHint: {
    color: '#879188',
    fontSize: 12,
    marginTop: 5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
    marginTop: 14,
    marginBottom: 22,
  },
  searchIcon: {
    color: '#66816D',
    fontSize: 25,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#20392A',
    fontSize: 14,
  },
  clearText: {
    color: '#788078',
    padding: 6,
  },
  filterLabel: {
    color: '#78867B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  sportList: {
    gap: 8,
    paddingBottom: 24,
  },
  sportChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7DE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeSportChip: {
    backgroundColor: '#20583D',
    borderColor: '#20583D',
  },
  sportChipText: {
    color: '#647166',
    fontSize: 12,
    fontWeight: '700',
  },
  activeSportChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultCount: {
    color: '#66816D',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#E8F0E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  playerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  playerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAE2',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#183C2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },
  widePlayerCard: {
    width: '48.5%',
  },
  playerCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: '#E7F0E5',
    borderWidth: 2,
    borderColor: '#F4F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#20583D',
    fontSize: 22,
    fontWeight: '900',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 13,
  },
  playerName: {
    color: '#20392A',
    fontSize: 16,
    fontWeight: '900',
  },
  playerCity: {
    color: '#788078',
    fontSize: 12,
    marginTop: 6,
  },
  playerArrow: {
    color: '#77907D',
    fontSize: 27,
    fontWeight: '500',
    marginLeft: 8,
  },
  sportBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#EAF2E8',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  sportBadgeText: {
    color: '#2C6847',
    fontSize: 11,
    fontWeight: '800',
  },
  playerBio: {
    color: '#69766C',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 13,
  },
  stateContainer: {
    paddingVertical: 35,
    alignItems: 'center',
    gap: 13,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#E4EAE2',
  },
  stateEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  stateTitle: {
    color: '#20392A',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#788078',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#20583D',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  footer: {
    color: '#89938B',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 35,
    letterSpacing: 1.2,
  },
});
