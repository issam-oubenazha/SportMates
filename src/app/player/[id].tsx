
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Player = {
  id: string;
  full_name: string;
  city: string;
  favorite_sport: string;
  bio: string;
  avatar_url: string | null;
};

export default function PublicPlayerProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPlayer() {
      if (!id || Array.isArray(id)) {
        setErrorMessage('Identifiant du joueur invalide.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, city, favorite_sport, bio, avatar_url')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;

        if (!active) return;

        if (!data) {
          setPlayer(null);
          setErrorMessage('Ce profil est introuvable ou inaccessible.');
        } else {
          setPlayer(data as Player);
        }
      } catch (error) {
        if (!active) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de charger ce profil.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPlayer();

    return () => {
      active = false;
    };
  }, [id]);

  const initial = player?.full_name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Retour à Explorer</Text>
      </Pressable>

      <Text style={styles.logo}>
        SportMates <Text style={styles.green}>⚡</Text>
      </Text>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color="#7CFF6B" />
          <Text style={styles.muted}>Chargement du profil...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.emoji}>🔎</Text>
          <Text style={styles.title}>Profil indisponible</Text>
          <Text style={styles.muted}>{errorMessage}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Retour à Explorer</Text>
          </Pressable>
        </View>
      ) : player ? (
        <>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <Text style={styles.name}>
              {player.full_name || 'Sportif'}
            </Text>

            <Text style={styles.location}>
              📍 {player.city?.trim() || 'Ville non renseignée'}
            </Text>

            <View style={styles.sportBadge}>
              <Text style={styles.sportText}>
                ⚡ {player.favorite_sport || 'Sport non renseigné'}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.bio}>
              {player.bio?.trim() ||
                'Ce sportif n’a pas encore ajouté de description.'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Profil sportif</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ville</Text>
              <Text style={styles.infoValue}>
                {player.city?.trim() || 'Non renseignée'}
              </Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sport préféré</Text>
              <Text style={styles.infoValue}>
                {player.favorite_sport || 'Non renseigné'}
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            SPORTMATES · Le sport, c’est mieux ensemble.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 24,
  },
  backText: {
    color: '#7CFF6B',
    fontSize: 14,
    fontWeight: '700',
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 28,
  },
  green: {
    color: '#7CFF6B',
  },
  hero: {
    backgroundColor: '#141F30',
    borderColor: '#29394A',
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    padding: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: '#263D34',
    borderColor: '#7CFF6B',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarText: {
    color: '#7CFF6B',
    fontSize: 42,
    fontWeight: '900',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
  },
  location: {
    color: '#AEB9C9',
    fontSize: 14,
    marginTop: 9,
  },
  sportBadge: {
    backgroundColor: '#20372E',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
  },
  sportText: {
    color: '#7CFF6B',
    fontWeight: '800',
    fontSize: 13,
  },
  infoCard: {
    backgroundColor: '#141F30',
    borderColor: '#29394A',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  bio: {
    color: '#B5C0CE',
    fontSize: 14,
    lineHeight: 23,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  infoLabel: {
    color: '#9BA7BA',
    fontSize: 13,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#29394A',
  },
  state: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: '#141F30',
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  emoji: {
    fontSize: 36,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  muted: {
    color: '#AEB9C9',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#7CFF6B',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#0B1220',
    fontWeight: '800',
  },
  footer: {
    color: '#68778C',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 30,
  },
});
