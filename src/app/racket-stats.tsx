import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  formatMatchScore,
  getDateRange,
  getTodayDateString,
  isValidDateString,
  RACKET_SPORTS,
  validateMatchSets,
  type MatchSetScore,
  type RacketMatch,
  type RacketSport,
  type SetDraft,
  type SportFilter,
  type TimeFilter,
} from '../lib/racket-matches';
import { supabase } from '../lib/supabase';

const TIME_FILTERS: TimeFilter[] = [
  'All time',
  'This week',
  'This month',
  'This year',
];
const PAGE_SIZE = 25;

type RacketStats = {
  matches_played: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  minutes_played: number;
};

const EMPTY_STATS: RacketStats = {
  matches_played: 0,
  wins: 0,
  losses: 0,
  sets_won: 0,
  sets_lost: 0,
  games_won: 0,
  games_lost: 0,
  minutes_played: 0,
};

const EMPTY_SET: SetDraft = {
  playerGames: '',
  opponentGames: '',
  isMatchTiebreak: false,
};

function getMatchResult(sets: MatchSetScore[]) {
  const wins = sets.filter(
    (set) => set.player_games > set.opponent_games
  ).length;
  const losses = sets.length - wins;
  return wins > losses ? 'Victoire' : 'Défaite';
}

function formatMatchDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function RacketStatsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [sportFilter, setSportFilter] = useState<SportFilter>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All time');
  const [stats, setStats] = useState<RacketStats>(EMPTY_STATS);
  const [matches, setMatches] = useState<RacketMatch[]>([]);
  const [historyLimit, setHistoryLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  const [sport, setSport] = useState<RacketSport>('Tennis');
  const [opponentName, setOpponentName] = useState('');
  const [playedOn, setPlayedOn] = useState(getTodayDateString());
  const [duration, setDuration] = useState('60');
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  const [sets, setSets] = useState<SetDraft[]>([
    { ...EMPTY_SET },
    { ...EMPTY_SET },
  ]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { from, to } = getDateRange(timeFilter);
      const statsRequest = supabase.rpc('get_racket_match_stats', {
        p_sport: sportFilter === 'All' ? null : sportFilter,
        p_from: from,
        p_to: to,
      });

      let historyRequest = supabase
        .from('racket_matches')
        .select(
          'id, sport, opponent_name, played_on, duration_minutes, best_of, racket_match_sets(set_number, player_games, opponent_games, is_match_tiebreak)'
        )
        .eq('user_id', userId)
        .order('played_on', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, historyLimit - 1);

      if (sportFilter !== 'All') {
        historyRequest = historyRequest.eq('sport', sportFilter);
      }
      if (from) {
        historyRequest = historyRequest.gte('played_on', from);
      }
      if (to) {
        historyRequest = historyRequest.lte('played_on', to);
      }

      const [statsResult, historyResult] = await Promise.all([
        statsRequest,
        historyRequest,
      ]);

      if (statsResult.error) throw statsResult.error;
      if (historyResult.error) throw historyResult.error;

      setStats(
        ((statsResult.data ?? [])[0] as RacketStats | undefined) ?? EMPTY_STATS
      );
      setMatches((historyResult.data ?? []) as RacketMatch[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger tes statistiques.'
      );
    } finally {
      setLoading(false);
    }
  }, [historyLimit, sportFilter, timeFilter, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const saveMatch = async () => {
    setErrorMessage('');
    setNotice('');

    if (!userId) {
      setErrorMessage('Connecte-toi pour enregistrer un match.');
      return;
    }

    if (!opponentName.trim() || opponentName.trim().length > 100) {
      setErrorMessage('Entre le nom de ton adversaire (100 caractères max).');
      return;
    }

    if (
      !isValidDateString(playedOn) ||
      playedOn > getTodayDateString()
    ) {
      setErrorMessage('Entre une date valide qui ne soit pas dans le futur.');
      return;
    }

    const durationMinutes = Number(duration);
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 720
    ) {
      setErrorMessage('La durée doit être comprise entre 1 et 720 minutes.');
      return;
    }

    let matchSets: MatchSetScore[];
    try {
      matchSets = validateMatchSets(sets, bestOf);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Vérifie les scores saisis.'
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.rpc('save_racket_match', {
        p_sport: sport,
        p_opponent_name: opponentName.trim(),
        p_played_on: playedOn,
        p_duration_minutes: durationMinutes,
        p_best_of: bestOf,
        p_sets: matchSets,
      });

      if (error) throw error;

      setNotice('Match enregistré dans ton historique.');
      setOpponentName('');
      setPlayedOn(getTodayDateString());
      setDuration('60');
      setBestOf(3);
      setSets([{ ...EMPTY_SET }, { ...EMPTY_SET }]);
      setFormOpen(false);
      setHistoryLimit(PAGE_SIZE);
      await loadData();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible d’enregistrer ce match.'
      );
    } finally {
      setSaving(false);
    }
  };

  const setSportForForm = (value: RacketSport) => {
    setSport(value);
  };

  const setBestOfFormat = (value: 3 | 5) => {
    setBestOf(value);
    if (sets.length > value) {
      setSets((current) => current.slice(0, value));
    }
  };

  const updateSet = (index: number, patch: Partial<SetDraft>) => {
    setSets((current) =>
      current.map((set, setIndex) =>
        setIndex === index ? { ...set, ...patch } : set
      )
    );
  };

  const addSet = () => {
    setSets((current) =>
      current.length < bestOf ? [...current, { ...EMPTY_SET }] : current
    );
  };

  const removeSet = (index: number) => {
    setSets((current) =>
      current.length > 2
        ? current.filter((_, setIndex) => setIndex !== index)
        : current
    );
  };

  const winRate =
    stats.matches_played > 0
      ? Math.round((stats.wins / stats.matches_played) * 100)
      : 0;
  const hasMoreMatches = matches.length === historyLimit;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>← Retour au profil</Text>
      </Pressable>

      <View style={styles.heading}>
        <Text style={styles.eyebrow}>PERFORMANCE PERSONNELLE</Text>
        <Text style={styles.title}>Tennis & Padel</Text>
        <Text style={styles.subtitle}>
          Tes résultats et ton évolution, calculés à partir de tes matchs.
        </Text>
      </View>

      <View style={styles.filters}>
        <Text style={styles.sectionLabel}>Sport</Text>
        <View style={styles.chips}>
          {(['All', ...RACKET_SPORTS] as SportFilter[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: sportFilter === value }}
              onPress={() => {
                setSportFilter(value);
                setHistoryLimit(PAGE_SIZE);
              }}
              style={[
                styles.chip,
                sportFilter === value && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  sportFilter === value && styles.chipTextSelected,
                ]}
              >
                {value === 'All' ? 'Tous' : value}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Période</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodChips}
        >
          {TIME_FILTERS.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: timeFilter === value }}
              onPress={() => {
                setTimeFilter(value);
                setHistoryLimit(PAGE_SIZE);
              }}
              style={[
                styles.chip,
                timeFilter === value && styles.chipSelected,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  timeFilter === value && styles.chipTextSelected,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {errorMessage ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#20583D" />
          <Text style={styles.mutedText}>Chargement des statistiques...</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.matches_played}</Text>
              <Text style={styles.statLabel}>Matchs joués</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{winRate}%</Text>
              <Text style={styles.statLabel}>Victoires</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.wins}–{stats.losses}
              </Text>
              <Text style={styles.statLabel}>Victoires / défaites</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {stats.sets_won}–{stats.sets_lost}
              </Text>
              <Text style={styles.statLabel}>Sets gagnés / perdus</Text>
            </View>
            <View style={[styles.statCard, styles.wideStatCard]}>
              <Text style={styles.statValue}>
                {stats.games_won}–{stats.games_lost}
              </Text>
              <Text style={styles.statLabel}>Jeux gagnés / perdus</Text>
            </View>
            <View style={[styles.statCard, styles.wideStatCard]}>
              <Text style={styles.statValue}>
                {Math.floor(stats.minutes_played / 60)} h{' '}
                {stats.minutes_played % 60} min
              </Text>
              <Text style={styles.statLabel}>Temps total sur le court</Text>
            </View>
          </View>

          <View style={styles.historyHeading}>
            <View>
              <Text style={styles.sectionTitle}>Historique des matchs</Text>
              <Text style={styles.mutedText}>
                Les scores sont privés et visibles uniquement par toi.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setErrorMessage('');
                setNotice('');
                setFormOpen((open) => !open);
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {formOpen ? 'Fermer' : '+ Ajouter'}
              </Text>
            </Pressable>
          </View>

          {formOpen ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Enregistrer un match</Text>
              <Text style={styles.label}>Sport</Text>
              <View style={styles.chips}>
                {RACKET_SPORTS.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: sport === value }}
                    onPress={() => setSportForForm(value)}
                    style={[
                      styles.chip,
                      sport === value && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        sport === value && styles.chipTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Adversaire</Text>
              <TextInput
                accessibilityLabel="Nom de l’adversaire"
                style={styles.input}
                value={opponentName}
                onChangeText={setOpponentName}
                placeholder="Nom de ton adversaire"
                placeholderTextColor="#89938B"
                maxLength={100}
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Date (AAAA-MM-JJ)</Text>
                  <TextInput
                    accessibilityLabel="Date du match"
                    style={styles.input}
                    value={playedOn}
                    onChangeText={setPlayedOn}
                    placeholder="2026-11-25"
                    placeholderTextColor="#89938B"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Durée (minutes)</Text>
                  <TextInput
                    accessibilityLabel="Durée du match en minutes"
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="number-pad"
                    placeholder="60"
                    placeholderTextColor="#89938B"
                  />
                </View>
              </View>

              <Text style={styles.label}>Format</Text>
              <View style={styles.chips}>
                {([3, 5] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: bestOf === value }}
                    onPress={() => setBestOfFormat(value)}
                    style={[
                      styles.chip,
                      bestOf === value && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        bestOf === value && styles.chipTextSelected,
                      ]}
                    >
                      Meilleur de {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Score de chaque set</Text>
              {sets.map((set, index) => (
                <View key={index} style={styles.setCard}>
                  <View style={styles.setHeading}>
                    <Text style={styles.setTitle}>Set {index + 1}</Text>
                    {sets.length > 2 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer le set ${index + 1}`}
                        onPress={() => removeSet(index)}
                        hitSlop={8}
                      >
                        <Text style={styles.removeSetText}>Retirer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={styles.scoreRow}>
                    <TextInput
                      accessibilityLabel={`Jeux du joueur, set ${index + 1}`}
                      style={styles.scoreInput}
                      value={set.playerGames}
                      onChangeText={(value) =>
                        updateSet(index, { playerGames: value })
                      }
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="6"
                      placeholderTextColor="#89938B"
                    />
                    <Text style={styles.scoreSeparator}>–</Text>
                    <TextInput
                      accessibilityLabel={`Jeux de l’adversaire, set ${index + 1}`}
                      style={styles.scoreInput}
                      value={set.opponentGames}
                      onChangeText={(value) =>
                        updateSet(index, { opponentGames: value })
                      }
                      keyboardType="number-pad"
                      maxLength={2}
                      placeholder="4"
                      placeholderTextColor="#89938B"
                    />
                  </View>
                  {index === sets.length - 1 ? (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: set.isMatchTiebreak }}
                      onPress={() =>
                        updateSet(index, {
                          isMatchTiebreak: !set.isMatchTiebreak,
                        })
                      }
                      style={styles.checkboxRow}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          set.isMatchTiebreak && styles.checkboxChecked,
                        ]}
                      >
                        {set.isMatchTiebreak ? (
                          <Text style={styles.checkboxMark}>✓</Text>
                        ) : null}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        Ce set est un super tie-break (10 points)
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              {sets.length < bestOf ? (
                <Pressable onPress={addSet} style={styles.addSetButton}>
                  <Text style={styles.addSetText}>+ Ajouter un set</Text>
                </Pressable>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => void saveMatch()}
                disabled={saving}
                style={[styles.saveButton, saving && styles.disabled]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Enregistrer le match</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {matches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aucun match pour le moment</Text>
              <Text style={styles.mutedText}>
                Ajoute un résultat pour commencer à suivre tes performances.
              </Text>
            </View>
          ) : (
            <View style={styles.matchList}>
              {matches.map((match) => {
                const matchSets = [...(match.racket_match_sets ?? [])].sort(
                  (left, right) => left.set_number - right.set_number
                );
                const result = getMatchResult(matchSets);

                return (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchTopRow}>
                      <View style={styles.matchInfo}>
                        <Text style={styles.matchSport}>
                          {match.sport} · {formatMatchDate(match.played_on)}
                        </Text>
                        <Text style={styles.matchOpponent}>
                          vs {match.opponent_name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.resultBadge,
                          result === 'Victoire'
                            ? styles.winBadge
                            : styles.lossBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.resultText,
                            result === 'Victoire'
                              ? styles.winText
                              : styles.lossText,
                          ]}
                        >
                          {result}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.matchBottomRow}>
                      <Text style={styles.matchScore}>
                        {formatMatchScore(matchSets)}
                      </Text>
                      <Text style={styles.matchDuration}>
                        {match.duration_minutes} min
                      </Text>
                    </View>
                  </View>
                );
              })}

              {hasMoreMatches ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setHistoryLimit((limit) => limit + PAGE_SIZE)}
                  style={styles.loadMoreButton}
                >
                  <Text style={styles.loadMoreText}>Charger plus de matchs</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },
  content: {
    width: '100%',
    maxWidth: 850,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 52,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 14,
  },
  backText: {
    color: '#55705D',
    fontSize: 14,
    fontWeight: '700',
  },
  heading: {
    marginBottom: 22,
  },
  eyebrow: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  title: {
    color: '#183C2B',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#788078',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  filters: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5EBE3',
    padding: 15,
    marginBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#34493A',
    fontSize: 12,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChips: {
    gap: 8,
  },
  chip: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#F8FAF7',
  },
  chipSelected: {
    backgroundColor: '#20583D',
    borderColor: '#20583D',
  },
  chipText: {
    color: '#647166',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 98,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5EBE3',
    padding: 15,
  },
  wideStatCard: {
    flexBasis: '100%',
  },
  statValue: {
    color: '#183C2B',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#788078',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 13,
  },
  sectionTitle: {
    color: '#20392A',
    fontSize: 19,
    fontWeight: '900',
  },
  mutedText: {
    color: '#788078',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20583D',
    borderRadius: 13,
    paddingHorizontal: 15,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5EBE3',
    padding: 17,
    marginBottom: 16,
  },
  formTitle: {
    color: '#20392A',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 16,
  },
  label: {
    color: '#34493A',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    minHeight: 46,
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 13,
    color: '#20392A',
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formHalf: {
    flex: 1,
  },
  setCard: {
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 15,
    padding: 13,
    marginTop: 9,
  },
  setHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  setTitle: {
    color: '#34493A',
    fontSize: 12,
    fontWeight: '800',
  },
  removeSetText: {
    color: '#A33E35',
    fontSize: 11,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scoreInput: {
    width: 76,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5DC',
    borderRadius: 12,
    color: '#20392A',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreSeparator: {
    color: '#788078',
    fontSize: 19,
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#AAB7AA',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#20583D',
    borderColor: '#20583D',
  },
  checkboxMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: '#647166',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  addSetButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginTop: 3,
  },
  addSetText: {
    color: '#20583D',
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20583D',
    borderRadius: 14,
    marginTop: 17,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.65,
  },
  error: {
    color: '#B42318',
    backgroundColor: '#FFF5F4',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  notice: {
    color: '#20583D',
    backgroundColor: '#E9F3E8',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE3',
    borderRadius: 17,
    padding: 22,
    marginTop: 2,
  },
  emptyTitle: {
    color: '#20392A',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  matchList: {
    gap: 10,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE3',
    borderRadius: 17,
    padding: 15,
  },
  matchTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  matchInfo: {
    flex: 1,
  },
  matchSport: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchOpponent: {
    color: '#20392A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },
  resultBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  winBadge: {
    backgroundColor: '#E9F3E8',
  },
  lossBadge: {
    backgroundColor: '#FFF1EF',
  },
  resultText: {
    fontSize: 10,
    fontWeight: '800',
  },
  winText: {
    color: '#20583D',
  },
  lossText: {
    color: '#A33E35',
  },
  matchBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDF1EB',
    paddingTop: 10,
    marginTop: 11,
  },
  matchScore: {
    color: '#34493A',
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  matchDuration: {
    color: '#788078',
    fontSize: 11,
    fontWeight: '700',
  },
  loadMoreButton: {
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE5DC',
    borderRadius: 14,
    marginTop: 3,
  },
  loadMoreText: {
    color: '#20583D',
    fontSize: 12,
    fontWeight: '800',
  },
});
