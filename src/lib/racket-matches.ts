export const RACKET_SPORTS = ['Tennis', 'Padel'] as const;

export type RacketSport = (typeof RACKET_SPORTS)[number];
export type SportFilter = 'All' | RacketSport;
export type TimeFilter = 'All time' | 'This week' | 'This month' | 'This year';

export type SetDraft = {
  playerGames: string;
  opponentGames: string;
  isMatchTiebreak: boolean;
};

export type MatchSetScore = {
  set_number: number;
  player_games: number;
  opponent_games: number;
  is_match_tiebreak: boolean;
};

export type RacketMatch = {
  id: string;
  sport: RacketSport;
  opponent_name: string;
  played_on: string;
  duration_minutes: number;
  best_of: number;
  racket_match_sets: MatchSetScore[];
};

export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRange(filter: TimeFilter, now = new Date()) {
  if (filter === 'All time') {
    return { from: null, to: null };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (filter === 'This week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setDate(start.getDate() + 6);
  } else if (filter === 'This month') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return { from: toDateString(start), to: toDateString(end) };
}

export function validateMatchSets(drafts: SetDraft[], bestOf: number) {
  if (bestOf !== 3 && bestOf !== 5) {
    throw new Error('Choisis un match en 3 ou en 5 sets.');
  }

  if (drafts.length < 2 || drafts.length > bestOf) {
    throw new Error('Ajoute au moins 2 sets et respecte le format choisi.');
  }

  const sets = drafts.map((draft, index): MatchSetScore => {
    if (!/^\d{1,2}$/.test(draft.playerGames) ||
        !/^\d{1,2}$/.test(draft.opponentGames)) {
      throw new Error(`Entre les deux scores du set ${index + 1}.`);
    }

    const playerGames = Number(draft.playerGames);
    const opponentGames = Number(draft.opponentGames);
    const high = Math.max(playerGames, opponentGames);
    const low = Math.min(playerGames, opponentGames);

    if (playerGames === opponentGames) {
      throw new Error(`Le set ${index + 1} doit avoir un vainqueur.`);
    }

    if (draft.isMatchTiebreak) {
      if (index !== drafts.length - 1 || high < 10 || high - low < 2) {
        throw new Error(
          'Le super tie-break final doit être gagné avec au moins 10 points et 2 points d’écart.'
        );
      }
    } else if (high < 6 || (high - low < 2 && !(high === 7 && low === 6))) {
      throw new Error(
        `Le score du set ${index + 1} doit correspondre à un set terminé.`
      );
    }

    return {
      set_number: index + 1,
      player_games: playerGames,
      opponent_games: opponentGames,
      is_match_tiebreak: draft.isMatchTiebreak,
    };
  });

  const targetWins = Math.floor(bestOf / 2) + 1;
  const playerSets = sets.filter(
    (set) => set.player_games > set.opponent_games
  ).length;
  const opponentSets = sets.length - playerSets;

  if (
    Math.max(playerSets, opponentSets) !== targetWins ||
    Math.min(playerSets, opponentSets) >= targetWins
  ) {
    throw new Error('Le score saisi ne désigne pas de vainqueur.');
  }

  const setsBeforeFinal = sets.slice(0, -1);
  if (
    setsBeforeFinal.filter((set) => set.player_games > set.opponent_games)
      .length >= targetWins ||
    setsBeforeFinal.filter((set) => set.player_games < set.opponent_games)
      .length >= targetWins
  ) {
    throw new Error('Retire les sets saisis après la fin du match.');
  }

  return sets;
}

export function formatMatchScore(sets: MatchSetScore[]) {
  return [...sets]
    .sort((left, right) => left.set_number - right.set_number)
    .map(
      (set) =>
        `${set.player_games}-${set.opponent_games}${set.is_match_tiebreak ? ' (STB)' : ''}`
    )
    .join(', ');
}
