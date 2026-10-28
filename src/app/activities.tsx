
import { useFocusEffect, useRouter } from 'expo-router';
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

import { useAuth } from '../contexts/auth-context';
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
  status: 'open' | 'cancelled' | 'completed';
};

type PlayerProfile = {
  id: string;
  full_name: string;
};

type ActivityParticipant = {
  activity_id: string;
  user_id: string;
};

type ActivityList = 'all' | 'mine';

function getJoinErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Impossible de rejoindre cette activité. Réessayez.';
  }

  const supabaseError = error as {
    code?: unknown;
    message?: unknown;
  };

  if (supabaseError.code === '23505') {
    return 'Vous êtes déjà inscrit à cette activité.';
  }

  if (supabaseError.code === '42501') {
    return 'Supabase a refusé cette inscription. Vérifiez la politique RLS autorisant chaque utilisateur à s’inscrire avec son propre user_id.';
  }

  return typeof supabaseError.message === 'string'
    ? supabaseError.message
    : 'Impossible de rejoindre cette activité. Réessayez.';
}

export default function ActivitiesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [activities, setActivities] = useState<SportActivity[]>([]);
  const [organizers, setOrganizers] = useState<Record<string, string>>({});
  const [participantCounts, setParticipantCounts] = useState<
    Record<string, number>
  >({});
  const [joinedActivities, setJoinedActivities] = useState<
    Record<string, boolean>
  >({});
  const [activityList, setActivityList] = useState<ActivityList>('all');
  const [updatingActivityId, setUpdatingActivityId] = useState<string | null>(
    null
  );
  const [joinFeedback, setJoinFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({});
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadActivities = useCallback(async () => {
    setErrorMessage('');

    try {
      const activityColumns =
        'id, organizer_id, title, sport, city, location, activity_date, max_participants, description, status';

      const { data, error } = await supabase
        .from('activities')
        .select(activityColumns)
        .gte('activity_date', new Date().toISOString())
        .eq('status', 'open')
        .order('activity_date', { ascending: true });

      if (error) throw error;

      const currentRows = (data ?? []) as SportActivity[];
      let joinedRows: SportActivity[] = [];
      let joined: Record<string, boolean> = {};

      if (userId) {
        const { data: memberships, error: membershipsError } =
          await supabase
            .from('activity_participants')
            .select('activity_id, user_id')
            .eq('user_id', userId);

        if (membershipsError) throw membershipsError;

        const ownMemberships = (memberships ?? []) as ActivityParticipant[];

        joined = Object.fromEntries(
          ownMemberships.map((membership) => [
            membership.activity_id,
            true,
          ])
        );

        const joinedActivityIds = [
          ...new Set(
            ownMemberships.map((membership) => membership.activity_id)
          ),
        ];

        if (joinedActivityIds.length > 0) {
          const {
            data: joinedActivityRows,
            error: joinedActivitiesError,
          } = await supabase
            .from('activities')
            .select(activityColumns)
            .in('id', joinedActivityIds)
            .order('activity_date', { ascending: true });

          if (joinedActivitiesError) throw joinedActivitiesError;

          joinedRows = (joinedActivityRows ?? []) as SportActivity[];
        }
      }

      const rowsById = new Map<string, SportActivity>();

      [...currentRows, ...joinedRows].forEach((activity) => {
        rowsById.set(activity.id, activity);
      });

      const rows = [...rowsById.values()];
      setActivities(rows);

      const activityIds = rows.map((activity) => activity.id);

      if (activityIds.length > 0) {
        const { data: participants, error: participantsError } =
          await supabase
            .from('activity_participants')
            .select('activity_id, user_id')
            .in('activity_id', activityIds);

        if (participantsError) throw participantsError;

        const participantIdsByActivity: Record<string, Set<string>> = {};

        rows.forEach((activity) => {
          participantIdsByActivity[activity.id] = new Set([
            activity.organizer_id,
          ]);
        });

        ((participants ?? []) as ActivityParticipant[]).forEach(
          (participant) => {
            participantIdsByActivity[participant.activity_id]?.add(
              participant.user_id
            );
          }
        );

        const counts: Record<string, number> = {};

        Object.entries(participantIdsByActivity).forEach(
          ([activityId, participantIds]) => {
            counts[activityId] = participantIds.size;
          }
        );

        setParticipantCounts(counts);
      } else {
        setParticipantCounts({});
      }

      setJoinedActivities(
        Object.fromEntries(
          Object.entries(joined).filter(([activityId]) => {
            const activity = rowsById.get(activityId);
            return activity && activity.organizer_id !== userId;
          })
        )
      );

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
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadActivities();
    }, [loadActivities])
  );

  const refresh = () => {
    setRefreshing(true);
    setNotice(null);
    void loadActivities();
  };

  const joinActivity = async (activity: SportActivity) => {
    if (!userId) {
      setJoinFeedback((current) => ({
        ...current,
        [activity.id]: {
          type: 'error',
          message: 'Connectez-vous pour rejoindre cette activité.',
        },
      }));
      return;
    }

    if (activity.organizer_id === userId) {
      setJoinFeedback((current) => ({
        ...current,
        [activity.id]: {
          type: 'error',
          message: 'Vous ne pouvez pas rejoindre votre propre activité.',
        },
      }));
      return;
    }

    setNotice(null);
    setUpdatingActivityId(activity.id);

    setJoinFeedback((current) => {
      const next = { ...current };
      delete next[activity.id];
      return next;
    });

    try {
      const { data: existingParticipation, error: existingError } =
        await supabase
          .from('activity_participants')
          .select('activity_id')
          .eq('activity_id', activity.id)
          .eq('user_id', userId)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingParticipation) {
        setJoinedActivities((current) => ({
          ...current,
          [activity.id]: true,
        }));

        setJoinFeedback((current) => ({
          ...current,
          [activity.id]: {
            type: 'success',
            message: 'Vous êtes déjà inscrit à cette activité.',
          },
        }));

        return;
      }

      const { count, error: countError } = await supabase
        .from('activity_participants')
        .select('user_id', { count: 'exact', head: true })
        .eq('activity_id', activity.id)
        .neq('user_id', activity.organizer_id);

      if (countError) throw countError;

      if (count === null) {
        throw new Error('Impossible de vérifier les places disponibles.');
      }

      if (count + 1 >= activity.max_participants) {
        throw new Error('Cette activité est complète.');
      }

      const { error: insertError } = await supabase
        .from('activity_participants')
        .insert({ activity_id: activity.id, user_id: userId });

      if (insertError) throw insertError;

      setParticipantCounts((current) => ({
        ...current,
        [activity.id]: count + 2,
      }));

      setJoinedActivities((current) => ({
        ...current,
        [activity.id]: true,
      }));

      setJoinFeedback((current) => ({
        ...current,
        [activity.id]: {
          type: 'success',
          message: 'Inscription réussie ! Vous avez rejoint cette activité.',
        },
      }));
    } catch (error) {
      console.error('JOIN ACTIVITY ERROR:', error);

      setJoinFeedback((current) => ({
        ...current,
        [activity.id]: {
          type: 'error',
          message: getJoinErrorMessage(error),
        },
      }));
    } finally {
      setUpdatingActivityId(null);
    }
  };

  const leaveActivity = async (activity: SportActivity) => {
    if (!userId) {
      setNotice({
        type: 'error',
        message: 'Connectez-vous pour gérer vos inscriptions.',
      });
      return;
    }

    if (activity.organizer_id === userId) {
      setNotice({
        type: 'error',
        message: 'L’organisateur ne peut pas quitter sa propre activité.',
      });
      return;
    }

    setNotice(null);
    setUpdatingActivityId(activity.id);

    setJoinFeedback((current) => {
      const next = { ...current };
      delete next[activity.id];
      return next;
    });

    try {
      const { data, error } = await supabase
        .from('activity_participants')
        .delete()
        .eq('activity_id', activity.id)
        .eq('user_id', userId)
        .select('activity_id');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          'Votre inscription est introuvable. Actualisez la liste et réessayez.'
        );
      }

      setParticipantCounts((current) => ({
        ...current,
        [activity.id]: Math.max(1, (current[activity.id] ?? 2) - 1),
      }));

      setJoinedActivities((current) => {
        const next = { ...current };
        delete next[activity.id];
        return next;
      });

      setNotice({
        type: 'success',
        message: `Vous avez quitté « ${activity.title} ».`,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Impossible de quitter cette activité. Réessayez.',
      });
    } finally {
      setUpdatingActivityId(null);
    }
  };

  const openActivityChat = (activity: SportActivity) => {
    router.push({
      pathname: '/activity-chat',
      params: {
        activityId: activity.id,
        title: activity.title,
      },
    });
  };

  const myActivities = activities.filter(
    (activity) => joinedActivities[activity.id]
  );

  const displayedActivities = (
    activityList === 'mine'
      ? myActivities
      : activities.filter(
          (activity) =>
            activity.status === 'open' &&
            new Date(`${activity.activity_date}T23:59:59`).getTime() >=
              Date.now()
        )
  ).sort(
    (first, second) =>
      new Date(first.activity_date).getTime() -
      new Date(second.activity_date).getTime()
  );

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
          <View style={styles.listSelector}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activityList === 'all' }}
              style={[
                styles.listSelectorButton,
                activityList === 'all' && styles.listSelectorButtonActive,
              ]}
              onPress={() => setActivityList('all')}
            >
              <Text
                style={[
                  styles.listSelectorText,
                  activityList === 'all' && styles.listSelectorTextActive,
                ]}
              >
                Toutes
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activityList === 'mine' }}
              style={[
                styles.listSelectorButton,
                activityList === 'mine' && styles.listSelectorButtonActive,
              ]}
              onPress={() => setActivityList('mine')}
            >
              <Text
                style={[
                  styles.listSelectorText,
                  activityList === 'mine' && styles.listSelectorTextActive,
                ]}
              >
                Mes activités ({myActivities.length})
              </Text>
            </Pressable>
          </View>

          {notice ? (
            <Text
              accessibilityRole="alert"
              style={[
                styles.notice,
                notice.type === 'error'
                  ? styles.joinError
                  : styles.joinSuccess,
              ]}
            >
              {notice.message}
            </Text>
          ) : null}

          {errorMessage ? (
            <View style={styles.emptyCard}>
              <Text style={styles.error}>{errorMessage}</Text>
              <Pressable style={styles.retryButton} onPress={refresh}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : displayedActivities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏟️</Text>
              <Text style={styles.emptyTitle}>
                {activityList === 'mine'
                  ? 'Aucune inscription pour le moment'
                  : 'Aucune activité pour le moment'}
              </Text>
              <Text style={styles.emptyText}>
                {activityList === 'mine'
                  ? 'Les activités que vous rejoignez apparaîtront ici.'
                  : 'Sois le premier à organiser un match et à réunir des joueurs !'}
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
            displayedActivities.map((activity) => {
              const isOrganizer = activity.organizer_id === userId;
              const hasJoined = !!joinedActivities[activity.id];
              const canOpenChat = !!userId && (isOrganizer || hasJoined);

              return (
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
                    👥 {participantCounts[activity.id] ?? 1} /{' '}
                    {activity.max_participants} participants
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

                  {hasJoined ? (
                    <>
                      <Text style={styles.joinedLabel}>Déjà inscrit</Text>

                      {activity.status === 'open' &&
                      new Date(
                        `${activity.activity_date}T23:59:59`
                      ).getTime() >= Date.now() ? (
                        <Pressable
                          style={[
                            styles.leaveButton,
                            updatingActivityId !== null &&
                              styles.joinButtonDisabled,
                          ]}
                          onPress={() => void leaveActivity(activity)}
                          disabled={updatingActivityId !== null}
                        >
                          {updatingActivityId === activity.id ? (
                            <ActivityIndicator color="#20583D" />
                          ) : (
                            <Text style={styles.leaveButtonText}>
                              Quitter l’activité
                            </Text>
                          )}
                        </Pressable>
                      ) : null}
                    </>
                  ) : (
                    <Pressable
                      style={[
                        styles.joinButton,
                        (isOrganizer ||
                          (participantCounts[activity.id] ?? 1) >=
                            activity.max_participants ||
                          updatingActivityId !== null) &&
                          styles.joinButtonDisabled,
                      ]}
                      onPress={() => void joinActivity(activity)}
                      disabled={
                        isOrganizer ||
                        (participantCounts[activity.id] ?? 1) >=
                          activity.max_participants ||
                        updatingActivityId !== null
                      }
                    >
                      {updatingActivityId === activity.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.joinButtonText}>
                          {isOrganizer
                            ? 'Votre activité'
                            : (participantCounts[activity.id] ?? 1) >=
                                activity.max_participants
                              ? 'Complet'
                              : 'Rejoindre'}
                        </Text>
                      )}
                    </Pressable>
                  )}

                  {canOpenChat ? (
                    <Pressable
                      accessibilityRole="button"
                      style={styles.chatButton}
                      onPress={() => openActivityChat(activity)}
                    >
                      <Text style={styles.chatButtonText}>
                        💬 Ouvrir le chat
                      </Text>
                    </Pressable>
                  ) : null}

                  {joinFeedback[activity.id] ? (
                    <Text
                      style={[
                        styles.joinFeedback,
                        joinFeedback[activity.id].type === 'error'
                          ? styles.joinError
                          : styles.joinSuccess,
                      ]}
                    >
                      {joinFeedback[activity.id].message}
                    </Text>
                  ) : null}
                </View>
              );
            })
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
  listSelector: {
    flexDirection: 'row',
    backgroundColor: '#E9EDE7',
    borderRadius: 13,
    padding: 4,
    marginBottom: 2,
  },
  listSelectorButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  listSelectorButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  listSelectorText: {
    color: '#66736A',
    fontSize: 12,
    fontWeight: '700',
  },
  listSelectorTextActive: {
    color: '#20583D',
    fontWeight: '800',
  },
  notice: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 6,
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
  joinButton: {
    backgroundColor: '#20583D',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  joinButtonDisabled: {
    backgroundColor: '#8A948D',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  joinedLabel: {
    color: '#20583D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 16,
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: '#20583D',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  leaveButtonText: {
    color: '#20583D',
    fontWeight: '800',
    fontSize: 13,
  },
  chatButton: {
    backgroundColor: '#E1EEE3',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#C9DCCB',
  },
  chatButtonText: {
    color: '#20583D',
    fontWeight: '800',
    fontSize: 13,
  },
  joinFeedback: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  joinSuccess: {
    color: '#20583D',
  },
  joinError: {
    color: '#B42318',
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
