
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { supabase } from '../lib/supabase';

type SportActivity = {
  id: string;
  organizer_id: string;
  title: string;
  sport: string;
  city: string;
  location: string;
  activity_date: string;
  max_participants: number;
  description: string;
};

type PlayerProfile = {
  id: string;
  full_name: string;
};

export default function ActivitiesScreen() {
  const router = useRouter();

  const [activities, setActivities] = useState<SportActivity[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadActivities = useCallback(async () => {
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('activities')
        .select(
          'id, organizer_id, title, sport, city, location, activity_date, max_participants, description'
        )
        .gte('activity_date', new Date().toISOString())
        .order('activity_date', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as SportActivity[];
      setActivities(rows);

      const organizerIds = [
        ...new Set(rows.map((activity) => activity.organizer_id)),
      ];

      if (organizerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', organizerIds);

        if (profilesError) throw profilesError;

        const names: Record<string, string> = {};
        ((profiles ?? []) as PlayerProfile[]).forEach((profile) => {
          names[profile.id] = profile.full_name;
        });

        setOrganizers(names);
      } else {
        setOrganizers({});
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Ma قدرناش نجيبو الأنشطة.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadActivities();
    }, [loadActivities])
  );

  const refresh = () => {
    setRefreshing(true);
    void loadActivities();
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SPORTMATES COMMUNITY</Text>
          <Text style={styles.title}>Activités sportives</Text>
          <Text style={styles.subtitle}>
            L9a match wla activité qriba lik.
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/create-activity')}
        >
          <Text style={styles.addButtonText}>＋ Créer</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#20583D"
          style={styles.loader}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#20583D"
            />
          }
        >
          {errorMessage ? (
            <View style={styles.emptyCard}>
              <Text style={styles.error}>{errorMessage}</Text>
              <Pressable style={styles.retryButton} onPress={refresh}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏟️</Text>
              <Text style={styles.emptyTitle}>
                Aucune activité pour le moment
              </Text>
              <Text style={styles.emptyText}>
                Sois le premier à organiser un match et à réunir des joueurs !
              </Text>
              <Pressable
                style={styles.createButton}
                onPress={() => router.push('/create-activity')}
              >
                <Text style={styles.createButtonText}>
                  Créer une activité
                </Text>
              </Pressable>
            </View>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.sport}>{activity.sport}</Text>
                  <Text style={styles.city}>📍 {activity.city}</Text>
                </View>

                <Text style={styles.activityTitle}>
                  {activity.title}
                </Text>

                <Text style={styles.detail}>
                  📅 {formatDate(activity.activity_date)}
                </Text>

                <Text style={styles.detail}>
                  📍 {activity.location}
                </Text>

                <Text style={styles.detail}>
                  👥 Maximum {activity.max_participants} participants
                </Text>

                {activity.description ? (
                  <Text style={styles.description}>
                    {activity.description}
                  </Text>
                ) : null}

                <View style={styles.organizerRow}>
                  <Text style={styles.organizer}>
                    Organisé par{' '}
                    {organizers[activity.organizer_id] || 'SportMate'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F4',
    paddingTop: 55,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  eyebrow: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#183C2B',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
  subtitle: {
    color: '#788078',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#20583D',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 13,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  loader: {
    marginTop: 50,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 35,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9EDE7',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sport: {
    color: '#20583D',
    backgroundColor: '#DDEBDD',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    fontWeight: '800',
    fontSize: 12,
  },
  city: {
    color: '#66736A',
    fontSize: 12,
  },
  activityTitle: {
    color: '#20392A',
    fontWeight: '800',
    fontSize: 19,
    marginTop: 14,
    marginBottom: 12,
  },
  detail: {
    color: '#5E6B61',
    fontSize: 12,
    marginTop: 7,
  },
  description: {
    color: '#68736B',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  organizerRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEF0EB',
    marginTop: 15,
    paddingTop: 12,
  },
  organizer: {
    color: '#20583D',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9EDE7',
    marginTop: 10,
  },
  emptyEmoji: {
    fontSize: 35,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#20392A',
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#788078',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#20583D',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  error: {
    color: '#B42318',
    textAlign: 'center',
  },
  retryButton: {
    padding: 12,
    marginTop: 8,
  },
  retryText: {
    color: '#20583D',
    fontWeight: '800',
  },
});
