
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
  'Basketball',
  'Tennis',
  'Running',
  'Fitness',
  'Natation',
  'Cyclisme',
  'Volleyball',
];

export default function ExploreScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState('Tous');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPlayers = useCallback(async () => {
    if (!session?.user) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, city, favorite_sport, bio, avatar_url')
        .neq('id', session.user.id)
        .order('full_name', { ascending: true });

      if (error) {
        throw error;
      }

      setPlayers((data ?? []) as Player[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les joueurs.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

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
          <Text style={styles.logo}>
            SportMates <Text style={styles.lightning}>⚡</Text>
          </Text>
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

      <Text style={styles.sectionTitle}>Trouver des sportifs</Text>

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
                      style={styles.playerCard}
                      onPress={() =>
                      router.push({
                        pathname: '/player/[id]',
                        params: { id: player.id },
                      })
                    }
                  >
                <View style={styles.playerTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initial || '?'}</Text>
                  </View>

                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.full_name || 'Sportif'}
                    </Text>
                    <Text style={styles.playerCity}>
                      📍 {player.city?.trim() || 'Ville non renseignée'}
                    </Text>
                  </View>

                  <View style={styles.onlineDot} />
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
    backgroundColor: '#0B1220',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 120,
    maxWidth: 850,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  lightning: {
    color: '#7CFF6B',
  },
  subtitle: {
    color: '#9BA7BA',
    fontSize: 13,
    marginTop: 5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#172235',
    borderWidth: 1,
    borderColor: '#29364A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: '#7CFF6B',
    fontSize: 30,
  },
  hero: {
    backgroundColor: '#152638',
    borderRadius: 24,
    padding: 23,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#294238',
  },
  eyebrow: {
    color: '#7CFF6B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 37,
  },
  heroDescription: {
    color: '#B5C0CE',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141F30',
    borderWidth: 1,
    borderColor: '#29364A',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 54,
    marginTop: 16,
    marginBottom: 23,
  },
  searchIcon: {
    color: '#7CFF6B',
    fontSize: 27,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    outlineStyle: 'none',
  } as any,
  clearText: {
    color: '#A7B2C2',
    padding: 6,
  },
  filterLabel: {
    color: '#8997AA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  sportList: {
    gap: 8,
    paddingBottom: 26,
  },
  sportChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#344156',
    backgroundColor: '#141F30',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  activeSportChip: {
    backgroundColor: '#7CFF6B',
    borderColor: '#7CFF6B',
  },
  sportChipText: {
    color: '#C1CBD8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeSportChipText: {
    color: '#0B1220',
    fontWeight: '900',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    color: '#9BA7BA',
    fontSize: 11,
  },
  playerList: {
    gap: 14,
  },
  playerCard: {
    backgroundColor: '#141F30',
    borderWidth: 1,
    borderColor: '#263449',
    borderRadius: 20,
    padding: 17,
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#263D34',
    borderWidth: 1,
    borderColor: '#456B4B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#7CFF6B',
    fontSize: 22,
    fontWeight: '900',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 13,
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  playerCity: {
    color: '#9BA7BA',
    fontSize: 12,
    marginTop: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7CFF6B',
  },
  sportBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    backgroundColor: '#20372E',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  sportBadgeText: {
    color: '#7CFF6B',
    fontSize: 11,
    fontWeight: '800',
  },
  playerBio: {
    color: '#AEB9C9',
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
    backgroundColor: '#141F30',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#263449',
  },
  stateEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  stateTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#AEB9C9',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#7CFF6B',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  retryText: {
    color: '#0B1220',
    fontWeight: '800',
    fontSize: 12,
  },
  footer: {
    color: '#68778C',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 35,
    letterSpacing: 1.2,
  },
});
