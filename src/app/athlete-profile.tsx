import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

const SPORTS = [
  'Football',
  'Tennis',
  'Padel',
  'Running',
  'Gym / Fitness',
  'Basketball',
  'Swimming',
  'Cycling',
  'Volleyball',
  'Martial Arts',
  'Other',
];

const GOALS = [
  'Build muscle',
  'Lose weight',
  'Improve endurance',
  'Improve speed',
  'Increase strength',
  'Improve cardiovascular fitness',
  'Become more active',
  'Improve football performance',
  'Improve tennis performance',
  'Prepare for competitions',
  'Find sports partners',
  'Maintain a healthy lifestyle',
];

const WEEK_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type SportFields = Record<string, string>;

type FormValues = {
  firstName: string;
  lastName: string;
  username: string;
  birthDate: string;
  gender: string;
  country: string;
  city: string;
  bio: string;
  avatarUrl: string;
  heightCm: string;
  weightKg: string;
  measurements: SportFields;
  fitnessLevel: string;
  activityLevel: string;
  practicedSports: string;
  trainingDuration: string;
  currentlyTraining: string;
  trainingFrequency: string;
  sports: string[];
  favoriteSport: string;
  primarySport: string;
  goals: string[];
  targetWeightKg: string;
  targetDays: string;
  personalGoal: string;
  running: SportFields;
  football: SportFields;
  tennis: SportFields;
  padel: SportFields;
  gym: SportFields;
  availabilityDays: string[];
  preferredTime: string;
  preferredLocation: string;
  maxDistanceKm: string;
};

type Step = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
};

type PublicProfile = {
  full_name: string | null;
  city: string | null;
  favorite_sport: string | null;
  bio: string | null;
  avatar_url: string | null;
};

const EMPTY_FIELDS: SportFields = {};

const DEFAULT_FORM: FormValues = {
  firstName: '',
  lastName: '',
  username: '',
  birthDate: '',
  gender: '',
  country: '',
  city: '',
  bio: '',
  avatarUrl: '',
  heightCm: '',
  weightKg: '',
  measurements: {
    chest: '',
    waist: '',
    hips: '',
    arm: '',
    leg: '',
  },
  fitnessLevel: '',
  activityLevel: '',
  practicedSports: '',
  trainingDuration: '',
  currentlyTraining: '',
  trainingFrequency: '',
  sports: [],
  favoriteSport: '',
  primarySport: '',
  goals: [],
  targetWeightKg: '',
  targetDays: '',
  personalGoal: '',
  running: { ...EMPTY_FIELDS },
  football: { ...EMPTY_FIELDS },
  tennis: { ...EMPTY_FIELDS },
  padel: { ...EMPTY_FIELDS },
  gym: { ...EMPTY_FIELDS },
  availabilityDays: [],
  preferredTime: '',
  preferredLocation: '',
  maxDistanceKm: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(source: Record<string, unknown>, key: string) {
  const value = source[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function readFields(source: Record<string, unknown>, key: string): SportFields {
  const value = source[key];
  if (!isRecord(value)) return { ...EMPTY_FIELDS };
  const fields: SportFields = {};
  for (const [name, field] of Object.entries(value)) {
    if (typeof field === 'string' || typeof field === 'number') {
      fields[name] = String(field);
    }
  }
  return fields;
}

function readList(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toFormValues(
  storedData: unknown,
  profile: PublicProfile | null,
  metadataName: unknown,
): FormValues {
  const stored = isRecord(storedData) ? storedData : {};
  const fullName =
    profile?.full_name ??
    (typeof metadataName === 'string' ? metadataName : '');
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    ...DEFAULT_FORM,
    firstName: nameParts[0] ?? '',
    lastName: nameParts.slice(1).join(' '),
    username: readText(stored, 'username'),
    birthDate: readText(stored, 'birthDate'),
    gender: readText(stored, 'gender'),
    country: readText(stored, 'country'),
    city: profile?.city ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatar_url ?? '',
    heightCm: readText(stored, 'heightCm'),
    weightKg: readText(stored, 'weightKg'),
    measurements: readFields(stored, 'measurements'),
    fitnessLevel: readText(stored, 'fitnessLevel'),
    activityLevel: readText(stored, 'activityLevel'),
    practicedSports: readText(stored, 'practicedSports'),
    trainingDuration: readText(stored, 'trainingDuration'),
    currentlyTraining: readText(stored, 'currentlyTraining'),
    trainingFrequency: readText(stored, 'trainingFrequency'),
    sports: readList(stored, 'sports'),
    favoriteSport:
      profile?.favorite_sport || readText(stored, 'primarySport'),
    primarySport: readText(stored, 'primarySport'),
    goals: readList(stored, 'goals'),
    targetWeightKg: readText(stored, 'targetWeightKg'),
    targetDays: readText(stored, 'targetDays'),
    personalGoal: readText(stored, 'personalGoal'),
    running: readFields(stored, 'running'),
    football: readFields(stored, 'football'),
    tennis: readFields(stored, 'tennis'),
    padel: readFields(stored, 'padel'),
    gym: readFields(stored, 'gym'),
    availabilityDays: readList(stored, 'availabilityDays'),
    preferredTime: readText(stored, 'preferredTime'),
    preferredLocation: readText(stored, 'preferredLocation'),
    maxDistanceKm: readText(stored, 'maxDistanceKm'),
  };
}

function ageFromBirthDate(birthDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getTime() > Date.now()
  ) {
    return null;
  }

  const today = new Date();
  return (
    today.getFullYear() -
    year -
    (today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day)
      ? 1
      : 0)
  );
}

function getImageMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) {
    const mimeType = asset.mimeType.toLowerCase();
    return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  }
  const extension = asset.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return '';
}

export default function AthleteProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const {
    session,
    athleteProfileState,
    refreshAthleteProfile,
  } = useAuth();
  const isEditing = athleteProfileState === 'complete';
  const userId = session?.user.id;
  const userMetadataName = session?.user.user_metadata?.full_name;

  const [form, setForm] = useState<FormValues>(DEFAULT_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [validationError, setValidationError] = useState('');

  const steps = useMemo<Step[]>(() => {
    const result: Step[] = [
      {
        key: 'personal',
        title: 'Commençons par toi',
        subtitle: 'Quelques infos pour créer ton identité SportMates.',
        icon: '👋',
      },
      {
        key: 'body',
        title: 'Your Body',
        subtitle: 'Ces informations sont privées et tu peux les laisser vides.',
        icon: '📏',
      },
      {
        key: 'athletic',
        title: 'Ton expérience sportive',
        subtitle: 'On adapte les suggestions à ton rythme.',
        icon: '🏃',
      },
      {
        key: 'sports',
        title: 'Quels sports te ressemblent ?',
        subtitle: 'Choisis tes sports, puis indique tes favoris.',
        icon: '⚽',
      },
      {
        key: 'goals',
        title: 'Tes objectifs',
        subtitle: 'Qu’aimerais-tu accomplir ? Plusieurs réponses possibles.',
        icon: '🎯',
      },
    ];

    if (form.sports.includes('Running')) {
      result.push({
        key: 'running',
        title: 'Ton profil running',
        subtitle: 'Facultatif — tes records restent ceux que tu renseignes.',
        icon: '👟',
      });
    }
    if (form.sports.includes('Football')) {
      result.push({
        key: 'football',
        title: 'Ton profil football',
        subtitle: 'Indique tes préférences pour trouver de bons matchs.',
        icon: '⚽',
      });
    }
    if (form.sports.includes('Tennis')) {
      result.push({
        key: 'tennis',
        title: 'Ton profil tennis',
        subtitle: 'Tes préférences de jeu, sans classement inventé.',
        icon: '🎾',
      });
    }
    if (form.sports.includes('Padel')) {
      result.push({
        key: 'padel',
        title: 'Ton profil padel',
        subtitle: 'Tes préférences de jeu, sans classement inventé.',
        icon: '🎾',
      });
    }
    if (form.sports.includes('Gym / Fitness')) {
      result.push({
        key: 'gym',
        title: 'Ton profil fitness',
        subtitle: 'Tes habitudes aident à proposer des séances adaptées.',
        icon: '🏋️',
      });
    }
    result.push({
      key: 'availability',
      title: 'Quand es-tu disponible ?',
      subtitle: 'Pour te proposer des partenaires et activités compatibles.',
      icon: '📍',
    });
    return result;
  }, [form.sports]);

  const currentStep = steps[stepIndex] ?? steps[0];

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!userId) return;

      const [athleteResult, profileResult] = await Promise.all([
        supabase
          .from('athlete_profiles')
          .select('profile_data, current_step, completed_at')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name, city, favorite_sport, bio, avatar_url')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      if (!active) return;
      if (athleteResult.error || profileResult.error) {
        setLoadError(
          athleteResult.error?.message ??
            profileResult.error?.message ??
            'Impossible de charger ton profil.',
        );
        setLoading(false);
        return;
      }

      const publicProfile = profileResult.data as PublicProfile | null;
      setLoadError('');
      setForm(
        toFormValues(
          athleteResult.data?.profile_data,
          publicProfile,
          userMetadataName,
        ),
      );
      setCompletedAt(athleteResult.data?.completed_at ?? null);
      setStepIndex(
        typeof athleteResult.data?.current_step === 'number'
          ? athleteResult.data.current_step
          : 0,
      );
      setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [loadAttempt, userId, userMetadataName]);

  const persist = useCallback(
    async (savedStep = stepIndex, complete = false) => {
      if (!userId) {
        throw new Error('Connecte-toi pour enregistrer ton profil sportif.');
      }

      const now = new Date().toISOString();
      const fullName = [form.firstName.trim(), form.lastName.trim()]
        .filter(Boolean)
        .join(' ');
      const privateData = {
        username: form.username.trim(),
        birthDate: form.birthDate.trim() || null,
        gender: form.gender || null,
        country: form.country.trim() || null,
        heightCm: toOptionalNumber(form.heightCm),
        weightKg: toOptionalNumber(form.weightKg),
        measurements: Object.fromEntries(
          Object.entries(form.measurements).map(([key, value]) => [
            key,
            toOptionalNumber(value),
          ]),
        ),
        fitnessLevel: form.fitnessLevel || null,
        activityLevel: form.activityLevel || null,
        practicedSports: form.practicedSports || null,
        trainingDuration: form.trainingDuration.trim() || null,
        currentlyTraining: form.currentlyTraining || null,
        trainingFrequency: form.trainingFrequency || null,
        sports: form.sports,
        primarySport: form.primarySport || null,
        goals: form.goals,
        targetWeightKg: toOptionalNumber(form.targetWeightKg),
        targetDays: toOptionalNumber(form.targetDays),
        personalGoal: form.personalGoal.trim() || null,
        running: Object.fromEntries(
          Object.entries(form.running).map(([key, value]) => [
            key,
            value.trim() || null,
          ]),
        ),
        football: Object.fromEntries(
          Object.entries(form.football).map(([key, value]) => [
            key,
            value.trim() || null,
          ]),
        ),
        tennis: Object.fromEntries(
          Object.entries(form.tennis).map(([key, value]) => [
            key,
            value.trim() || null,
          ]),
        ),
        padel: Object.fromEntries(
          Object.entries(form.padel).map(([key, value]) => [
            key,
            value.trim() || null,
          ]),
        ),
        gym: Object.fromEntries(
          Object.entries(form.gym).map(([key, value]) => [
            key,
            value.trim() || null,
          ]),
        ),
        availabilityDays: form.availabilityDays,
        preferredTime: form.preferredTime || null,
        preferredLocation: form.preferredLocation.trim() || null,
        maxDistanceKm: toOptionalNumber(form.maxDistanceKm),
      };

      setSaving(true);
      setSaveError('');
      try {
        const { error: publicError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: fullName,
          city: form.city.trim(),
          favorite_sport: form.favoriteSport || form.primarySport || '',
          bio: form.bio.trim(),
          avatar_url: form.avatarUrl || null,
          updated_at: now,
        });
        if (publicError) throw publicError;

        const athleteRow: Record<string, unknown> = {
          user_id: userId,
          profile_data: privateData,
          current_step: savedStep,
          completed_at: complete ? now : completedAt,
          updated_at: now,
        };

        const { error: athleteError } = await supabase
          .from('athlete_profiles')
          .upsert(athleteRow, { onConflict: 'user_id' });
        if (athleteError) throw athleteError;
        if (complete) setCompletedAt(now);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Impossible d’enregistrer ton profil.';
        setSaveError(message);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [completedAt, form, userId, stepIndex],
  );

  useEffect(() => {
    if (!userId || loading || loadError) return;
    const timeout = setTimeout(() => {
      void persist().catch(() => undefined);
    }, 900);
    return () => clearTimeout(timeout);
  }, [form, loadError, loading, persist, userId]);

  const updateForm = <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError('');
  };

  const updateSportField = (
    sport: 'running' | 'football' | 'tennis' | 'padel' | 'gym',
    key: string,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [sport]: { ...current[sport], [key]: value },
    }));
    setValidationError('');
  };

  const updateMeasurement = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      measurements: { ...current.measurements, [key]: value },
    }));
    setValidationError('');
  };

  const toggleItem = (
    key: 'sports' | 'goals' | 'availabilityDays',
    value: string,
  ) => {
    setForm((current) => {
      const currentItems = current[key];
      const nextItems = currentItems.includes(value)
        ? currentItems.filter((item) => item !== value)
        : [...currentItems, value];
      const nextForm = { ...current, [key]: nextItems };

      if (key === 'sports') {
        if (!nextItems.includes(current.favoriteSport)) {
          nextForm.favoriteSport = '';
        }
        if (!nextItems.includes(current.primarySport)) {
          nextForm.primarySport = '';
        }
      }
      return nextForm;
    });
    setValidationError('');
  };

  const choosePhoto = async () => {
    if (!userId) {
      setSaveError('Connecte-toi pour ajouter une photo de profil.');
      return;
    }
    setPhotoBusy(true);
    setSaveError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) throw new Error('Aucune image n’a été sélectionnée.');
      const mimeType = getImageMimeType(asset);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('Choisis une image au format JPG, PNG ou WEBP.');
      }
      if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
        throw new Error('La photo doit faire 3 Mo ou moins.');
      }

      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Impossible de lire cette image.');
      const bytes = await response.arrayBuffer();
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, {
          cacheControl: '3600',
          contentType: mimeType,
          upsert: true,
        });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      updateForm('avatarUrl', `${data.publicUrl}?updated=${Date.now()}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Impossible de mettre à jour ta photo de profil.',
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const validateStep = (step: Step = currentStep) => {
    if (step.key === 'personal') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setValidationError('Indique ton prénom et ton nom pour continuer.');
        return false;
      }
      if (
        form.username &&
        !/^[a-zA-Z0-9._]{3,30}$/.test(form.username)
      ) {
        setValidationError(
          'Le nom d’utilisateur doit contenir 3 à 30 lettres, chiffres, points ou tirets bas.',
        );
        return false;
      }
      if (form.birthDate.trim() && ageFromBirthDate(form.birthDate) === null) {
        setValidationError('Vérifie ta date de naissance (format AAAA-MM-JJ).');
        return false;
      }
    }
    const numericChecks: [string, string, number, number][] = [];
    if (step.key === 'body') {
      numericChecks.push(
        ['Taille', form.heightCm, 40, 260],
        ['Poids', form.weightKg, 20, 500],
      );
    }
    if (step.key === 'goals') {
      numericChecks.push(
        ['Nombre de jours souhaités', form.targetDays, 1, 7],
        ['Poids cible', form.targetWeightKg, 20, 500],
      );
    }
    if (step.key === 'availability') {
      numericChecks.push(['Distance maximale', form.maxDistanceKm, 0, 1000]);
    }
    if (step.key === 'running') {
      numericChecks.push(
        ['Distance running habituelle', form.running.averageDistanceKm ?? '', 0, 500],
        ['Plus longue distance running', form.running.longestDistanceKm ?? '', 0, 1000],
        ['Distance running visée', form.running.targetDistanceKm ?? '', 0, 1000],
      );
    }
    if (step.key === 'football') {
      numericChecks.push([
        'Années d’expérience football',
        form.football.yearsExperience ?? '',
        0,
        100,
      ]);
    }
    if (step.key === 'tennis') {
      numericChecks.push([
        'Années d’expérience tennis',
        form.tennis.yearsExperience ?? '',
        0,
        100,
      ]);
    }
    if (step.key === 'padel') {
      numericChecks.push([
        'Années d’expérience padel',
        form.padel.yearsExperience ?? '',
        0,
        100,
      ]);
    }
    if (step.key === 'gym') {
      numericChecks.push([
        'Durée de séance',
        form.gym.workoutDuration ?? '',
        1,
        600,
      ]);
    }
    for (const [label, rawValue, minimum, maximum] of numericChecks) {
      if (!rawValue.trim()) continue;
      const value = Number(rawValue);
      if (
        !Number.isFinite(value) ||
        value < minimum ||
        value > maximum
      ) {
        setValidationError(
          `${label} doit être compris entre ${minimum} et ${maximum}.`,
        );
        return false;
      }
    }
    if (step.key === 'body') {
      for (const [label, rawValue] of Object.entries(form.measurements)) {
        if (!rawValue.trim()) continue;
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value < 10 || value > 300) {
          setValidationError(
            `La mesure ${label} doit être comprise entre 10 et 300 cm.`,
          );
          return false;
        }
      }
    }
    if (step.key === 'running' && form.running.best5kTime) {
      const match = /^(\d{1,2}):([0-5]\d)$/.exec(form.running.best5kTime);
      if (!match) {
        setValidationError('Le temps sur 5 km doit être au format MM:SS.');
        return false;
      }
    }
    if (step.key === 'sports' && form.sports.length === 0) {
      setValidationError('Choisis au moins un sport pour continuer.');
      return false;
    }
    return true;
  };

  const goToStep = async (nextIndex: number) => {
    setValidationError('');
    if (nextIndex > stepIndex && !validateStep()) return;
    try {
      await persist(nextIndex);
      setStepIndex(nextIndex);
    } catch {
      // The visible save error explains why this step was not advanced.
    }
  };

  const finish = async () => {
    setValidationError('');
    if (form.birthDate.trim() && ageFromBirthDate(form.birthDate) === null) {
      setStepIndex(0);
      setValidationError('Vérifie ta date de naissance (format AAAA-MM-JJ).');
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setStepIndex(0);
      setValidationError('Indique ton prénom et ton nom pour terminer.');
      return;
    }
    if (form.username && !/^[a-zA-Z0-9._]{3,30}$/.test(form.username)) {
      setStepIndex(0);
      setValidationError(
        'Le nom d’utilisateur doit contenir 3 à 30 lettres, chiffres, points ou tirets bas.',
      );
      return;
    }
    if (form.sports.length === 0) {
      const sportsIndex = steps.findIndex((step) => step.key === 'sports');
      setStepIndex(Math.max(0, sportsIndex));
      setValidationError('Choisis au moins un sport pour terminer.');
      return;
    }
    for (let index = 0; index < steps.length; index += 1) {
      if (!validateStep(steps[index])) {
        setStepIndex(index);
        return;
      }
    }

    try {
      await persist(stepIndex, true);
      await refreshAthleteProfile();
      router.replace(isEditing ? '/profile' : ('/' as Href));
    } catch {
      // Keep the user on the final step so the save can be retried.
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options: {
      key?: string;
      placeholder?: string;
      keyboardType?: TextInputProps['keyboardType'];
      multiline?: boolean;
      maxLength?: number;
    } = {},
  ) => (
    <View key={options.key} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, options.multiline && styles.multilineInput]}
        placeholder={options.placeholder ?? ''}
        placeholderTextColor="#8B958D"
        value={value}
        onChangeText={onChangeText}
        keyboardType={options.keyboardType}
        multiline={options.multiline}
        maxLength={options.maxLength}
        textAlignVertical={options.multiline ? 'top' : 'center'}
        autoCapitalize={options.keyboardType === 'email-address' ? 'none' : 'sentences'}
      />
    </View>
  );

  const renderOptions = (
    label: string,
    options: string[],
    selected: string,
    onSelect: (value: string) => void,
    key?: string,
  ) => (
    <View key={key} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option }}
            onPress={() => onSelect(selected === option ? '' : option)}
            style={({ pressed }) => [
              styles.option,
              selected === option && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                selected === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderMultiOptions = (
    label: string,
    options: string[],
    selected: string[],
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: selected.includes(option) }}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.option,
              selected.includes(option) && styles.optionSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                selected.includes(option) && styles.optionTextSelected,
              ]}
            >
              {selected.includes(option) ? '✓ ' : ''}
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderSportFields = (
    sport: 'running' | 'football' | 'tennis' | 'padel' | 'gym',
    fields: {
      key: string;
      label: string;
      options?: string[];
      keyboardType?: TextInputProps['keyboardType'];
      placeholder?: string;
    }[],
  ) =>
    fields.map((field) =>
      field.options
        ? renderOptions(
            field.label,
            field.options,
            form[sport][field.key] ?? '',
            (value) => updateSportField(sport, field.key, value),
            field.key,
          )
        : renderInput(
            field.label,
            form[sport][field.key] ?? '',
            (value) => updateSportField(sport, field.key, value),
            {
              key: field.key,
              keyboardType: field.keyboardType,
              placeholder: field.placeholder,
            },
          ),
    );

  const renderStep = () => {
    switch (currentStep.key) {
      case 'personal': {
        const age = ageFromBirthDate(form.birthDate);
        return (
          <>
            <View style={styles.photoRow}>
              <View style={styles.photo}>
                {form.avatarUrl ? (
                  <Image
                    source={{ uri: form.avatarUrl }}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.photoPlaceholder}>👤</Text>
                )}
              </View>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Ta photo de profil</Text>
                <Text style={styles.photoSubtitle}>Optionnelle, modifiable plus tard.</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void choosePhoto()}
                  disabled={photoBusy}
                  style={styles.photoButton}
                >
                  <Text style={styles.photoButtonText}>
                    {photoBusy ? 'Chargement…' : 'Ajouter une photo'}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.twoColumns}>
              {renderInput('Prénom *', form.firstName, (value) =>
                updateForm('firstName', value),
                { key: 'first-name' },
              )}
              {renderInput('Nom *', form.lastName, (value) =>
                updateForm('lastName', value),
                { key: 'last-name' },
              )}
            </View>
            {renderInput('Nom d’utilisateur', form.username, (value) =>
              updateForm('username', value.replace(/\s+/g, '').slice(0, 30)),
              { placeholder: 'Ex. alex.sport' },
            )}
            {renderInput('Date de naissance', form.birthDate, (value) =>
              updateForm('birthDate', value),
              { placeholder: 'AAAA-MM-JJ', keyboardType: 'numbers-and-punctuation' },
            )}
            {age !== null ? (
              <Text style={styles.helper}>Âge calculé : {age} ans</Text>
            ) : null}
            {renderOptions(
              'Genre (facultatif)',
              ['Femme', 'Homme', 'Non-binaire', 'Je préfère ne pas préciser'],
              form.gender,
              (value) => updateForm('gender', value),
            )}
            <View style={styles.twoColumns}>
              {renderInput('Pays', form.country, (value) =>
                updateForm('country', value),
                { key: 'country' },
              )}
              {renderInput('Ville', form.city, (value) =>
                updateForm('city', value),
                { key: 'city' },
              )}
            </View>
            {renderInput('Quelques mots sur toi', form.bio, (value) =>
              updateForm('bio', value),
              {
                multiline: true,
                maxLength: 300,
                placeholder: 'Tes passions, ton style ou ce que tu recherches…',
              },
            )}
          </>
        );
      }
      case 'body': {
        const heightInches = Number(form.heightCm) / 2.54;
        const roundedHeightInches = Math.round(heightInches);
        const feet = Number.isFinite(heightInches)
          ? Math.floor(roundedHeightInches / 12)
          : 0;
        const inches = Number.isFinite(heightInches)
          ? roundedHeightInches % 12
          : 0;
        const weightValue =
          weightUnit === 'kg'
            ? form.weightKg
            : form.weightKg
              ? String(Math.round(Number(form.weightKg) * 2.20462 * 10) / 10)
              : '';
        return (
          <>
            <Text style={styles.privateNote}>
              🔒 Tes mesures restent privées et ne sont partagées avec personne.
            </Text>
            <View style={styles.unitHeader}>
              <Text style={styles.label}>Taille</Text>
              {renderOptions(
                '',
                ['cm', 'ft / in'],
                heightUnit === 'cm' ? 'cm' : 'ft / in',
                (value) => setHeightUnit(value === 'cm' ? 'cm' : 'ft'),
              )}
            </View>
            {heightUnit === 'cm'
              ? renderInput(
                  'Ta taille en centimètres',
                  form.heightCm,
                  (value) => updateForm('heightCm', value),
                  { keyboardType: 'decimal-pad', placeholder: 'Ex. 180' },
                )
              : (
                  <View style={styles.twoColumns}>
                          {renderInput(
                            'Pieds',
                            String(feet || ''),
                            (value) => {
                              const nextInches = inches;
                              const nextCm =
                                (Number(value || 0) * 12 + nextInches) * 2.54;
                              updateForm('heightCm', nextCm ? String(nextCm) : '');
                            },
                            { key: 'height-feet', keyboardType: 'number-pad' },
                          )}
                          {renderInput(
                            'Pouces',
                            String(inches || ''),
                            (value) => {
                              const nextCm =
                                (feet * 12 + Number(value || 0)) * 2.54;
                              updateForm('heightCm', nextCm ? String(nextCm) : '');
                            },
                            { key: 'height-inches', keyboardType: 'number-pad' },
                          )}
                  </View>
                )}
            {renderOptions(
              'Poids — unité',
              ['kg', 'lb'],
              weightUnit,
              (value) => setWeightUnit(value === 'lb' ? 'lb' : 'kg'),
            )}
            {renderInput(
              `Ton poids actuel (${weightUnit})`,
              weightValue,
              (value) =>
                updateForm(
                  'weightKg',
                  weightUnit === 'kg'
                    ? value
                    : value
                      ? String(Number(value) / 2.20462)
                      : '',
                ),
              { keyboardType: 'decimal-pad', placeholder: 'Facultatif' },
            )}
            <Text style={styles.sectionLabel}>Mesures corporelles (facultatif, cm)</Text>
            <View style={styles.twoColumns}>
              {(['chest', 'waist', 'hips', 'arm', 'leg'] as const).map((key) =>
                renderInput(
                  {
                    chest: 'Poitrine',
                    waist: 'Taille',
                    hips: 'Hanches',
                    arm: 'Bras',
                    leg: 'Jambe',
                  }[key],
                  form.measurements[key] ?? '',
                  (value) => updateMeasurement(key, value),
                  { key, keyboardType: 'decimal-pad' },
                ),
              )}
            </View>
          </>
        );
      }
      case 'athletic':
        return (
          <>
            {renderOptions(
              'Ton niveau',
              ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
              form.fitnessLevel,
              (value) => updateForm('fitnessLevel', value),
            )}
            {renderOptions(
              'Ton activité au quotidien',
              [
                'Sedentary',
                'Lightly active',
                'Moderately active',
                'Very active',
                'Extremely active',
              ],
              form.activityLevel,
              (value) => updateForm('activityLevel', value),
            )}
            {renderOptions(
              'As-tu déjà pratiqué un sport ?',
              ['Oui', 'Non'],
              form.practicedSports,
              (value) => updateForm('practicedSports', value),
            )}
            {renderInput('Depuis combien de temps t’entraînes-tu ?', form.trainingDuration, (value) =>
              updateForm('trainingDuration', value),
              { placeholder: 'Ex. 2 ans' },
            )}
            {renderOptions(
              'T’entraînes-tu actuellement ?',
              ['Oui', 'Non'],
              form.currentlyTraining,
              (value) => updateForm('currentlyTraining', value),
            )}
            {renderOptions(
              'Fréquence actuelle',
              ['1–2 jours / semaine', '3–4 jours / semaine', '5–6 jours / semaine', 'Tous les jours'],
              form.trainingFrequency,
              (value) => updateForm('trainingFrequency', value),
            )}
          </>
        );
      case 'sports':
        return (
          <>
            {renderMultiOptions('Sélectionne tes sports', SPORTS, form.sports, (value) =>
              toggleItem('sports', value),
            )}
            {form.sports.length > 0 ? (
              <>
                {renderOptions(
                  'Ton sport préféré',
                  form.sports,
                  form.favoriteSport,
                  (value) => updateForm('favoriteSport', value),
                )}
                {renderOptions(
                  'Ton sport principal',
                  form.sports,
                  form.primarySport,
                  (value) => updateForm('primarySport', value),
                )}
              </>
            ) : null}
          </>
        );
      case 'goals':
        {
          const targetWeightValue =
            weightUnit === 'kg'
              ? form.targetWeightKg
              : form.targetWeightKg
                ? String(
                    Math.round(Number(form.targetWeightKg) * 2.20462 * 10) /
                      10,
                  )
                : '';
        return (
          <>
            {renderMultiOptions('Tes objectifs', GOALS, form.goals, (value) =>
              toggleItem('goals', value),
            )}
            {renderOptions(
              'Combien de jours souhaites-tu t’entraîner ?',
              ['1 jour', '2 jours', '3 jours', '4 jours', '5 jours', '6 jours', '7 jours'],
              form.targetDays ? `${form.targetDays} jour${form.targetDays === '1' ? '' : 's'}` : '',
              (value) =>
                updateForm(
                  'targetDays',
                  value.match(/^\d+/)?.[0] ?? '',
                ),
            )}
            {renderInput(
              `Poids cible (${weightUnit}, facultatif)`,
              targetWeightValue,
              (value) =>
                updateForm(
                  'targetWeightKg',
                  weightUnit === 'kg'
                    ? value
                    : value
                      ? String(Number(value) / 2.20462)
                      : '',
                ),
              { keyboardType: 'decimal-pad' },
            )}
            {renderInput(
              'Ton objectif sportif personnel',
              form.personalGoal,
              (value) => updateForm('personalGoal', value),
              { multiline: true, maxLength: 300 },
            )}
          </>
        );
        }
      case 'running':
        return (
          <>
            {renderOptions(
              'As-tu déjà couru ?',
              ['Oui', 'Non'],
              form.running.hasRun ?? '',
              (value) => updateSportField('running', 'hasRun', value),
            )}
            {renderSportFields('running', [
              { key: 'level', label: 'Ton niveau running', options: ['Beginner', 'Intermediate', 'Advanced'] },
              { key: 'averageDistanceKm', label: 'Distance habituelle (km)', keyboardType: 'decimal-pad' },
              { key: 'best5kTime', label: 'Meilleur temps sur 5 km', placeholder: 'MM:SS, facultatif' },
              { key: 'longestDistanceKm', label: 'Plus longue distance (km)', keyboardType: 'decimal-pad' },
              { key: 'targetDistanceKm', label: 'Distance visée (km)', keyboardType: 'decimal-pad' },
              { key: 'environment', label: 'Environnement préféré', options: ['Road', 'Track', 'Trail'] },
            ])}
          </>
        );
      case 'football':
        return renderSportFields('football', [
          { key: 'position', label: 'Position préférée', options: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any'] },
          { key: 'level', label: 'Niveau de jeu', options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
          { key: 'dominantFoot', label: 'Pied dominant', options: ['Left', 'Right', 'Both'] },
          { key: 'matchFormat', label: 'Format préféré', options: ['5v5', '7v7', '11v11'] },
          { key: 'yearsExperience', label: 'Années d’expérience', keyboardType: 'decimal-pad' },
          { key: 'frequency', label: 'Fréquence souhaitée', options: ['1–2 jours / semaine', '3–4 jours / semaine', '5–6 jours / semaine', 'Tous les jours'] },
        ]);
      case 'tennis':
      case 'padel':
        return renderSportFields(currentStep.key, [
          { key: 'level', label: 'Niveau de jeu', options: ['Beginner', 'Intermediate', 'Advanced', 'Professional'] },
          { key: 'yearsExperience', label: 'Années d’expérience', keyboardType: 'decimal-pad' },
          { key: 'style', label: 'Style de jeu préféré', options: ['Offensive', 'Defensive', 'All-court', 'No preference'] },
          { key: 'matchFormat', label: 'Format préféré', options: currentStep.key === 'tennis' ? ['Singles', 'Doubles'] : ['Doubles', 'Singles'] },
          { key: 'frequency', label: 'Fréquence de jeu', options: ['1–2 jours / semaine', '3–4 jours / semaine', '5–6 jours / semaine', 'Tous les jours'] },
          { key: 'ranking', label: 'Classement ou records (facultatif)' },
        ]);
      case 'gym':
        return renderSportFields('gym', [
          { key: 'experience', label: 'Expérience', options: ['Beginner', 'Intermediate', 'Advanced'] },
          { key: 'trainingType', label: 'Type d’entraînement préféré', options: ['Strength', 'Cardio', 'Cross-training', 'Bodybuilding', 'Mobility'] },
          { key: 'objective', label: 'Objectif principal', options: ['Build muscle', 'Lose weight', 'Increase strength', 'Improve endurance'] },
          { key: 'frequency', label: 'Fréquence hebdomadaire', options: ['1–2 jours', '3–4 jours', '5–6 jours', 'Tous les jours'] },
          { key: 'workoutDuration', label: 'Durée préférée (minutes)', keyboardType: 'number-pad' },
          { key: 'favoriteExercises', label: 'Exercices favoris', placeholder: 'Ex. squats, natation…' },
        ]);
      case 'availability':
        return (
          <>
            {renderMultiOptions(
              'Jours disponibles',
              WEEK_DAYS,
              form.availabilityDays,
              (value) => toggleItem('availabilityDays', value),
            )}
            {renderOptions(
              'Moment préféré',
              ['Morning', 'Afternoon', 'Evening'],
              form.preferredTime,
              (value) => updateForm('preferredTime', value),
            )}
            {renderInput(
              'Lieu d’entraînement préféré',
              form.preferredLocation,
              (value) => updateForm('preferredLocation', value),
              { placeholder: 'Parc, salle, quartier…' },
            )}
            {renderInput(
              'Distance maximale de déplacement (km)',
              form.maxDistanceKm,
              (value) => updateForm('maxDistanceKm', value),
              { keyboardType: 'decimal-pad' },
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (loading || !currentStep) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#20583D" />
        <Text style={styles.loadingText}>Chargement de ton profil…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loading}>
        <Text accessibilityRole="alert" style={styles.error}>
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setLoading(true);
            setLoadAttempt((attempt) => attempt + 1);
          }}
          style={styles.continueButton}
        >
          <Text style={styles.continueText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const progress = ((stepIndex + 1) / steps.length) * 100;
  const isLastStep = stepIndex === steps.length - 1;
  const age = ageFromBirthDate(form.birthDate);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        key={currentStep.key}
        contentContainerStyle={[styles.content, isWide && styles.wideContent]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          key={currentStep.key}
          entering={FadeInDown.duration(240)}
        >
          <View style={styles.topRow}>
            {stepIndex > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void goToStep(stepIndex - 1)}
                disabled={saving || photoBusy}
                style={styles.backButton}
              >
                <Text style={styles.backText}>‹ Retour</Text>
              </Pressable>
            ) : (
              <Text style={styles.brand}>SportMates ⚡</Text>
            )}
            {isEditing ? (
              <Text style={styles.editLabel}>MODIFIER</Text>
            ) : (
              <Text style={styles.stepCount}>
                {stepIndex + 1} / {steps.length}
              </Text>
            )}
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
            style={styles.progressTrack}
          >
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <View style={styles.heading}>
            <View style={styles.iconBox}>
              <Text style={styles.stepIcon}>{currentStep.icon}</Text>
            </View>
            <Text style={styles.eyebrow}>TON PROFIL ATHLÈTE</Text>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
            {currentStep.key === 'body' && age !== null ? (
              <Text style={styles.helper}>Ton âge : {age} ans</Text>
            ) : null}
          </View>

          {saveError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {saveError}
            </Text>
          ) : null}
          {validationError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {validationError}
            </Text>
          ) : null}

          <View style={styles.card}>{renderStep()}</View>

          <View style={styles.footer}>
            {currentStep.key !== 'personal' &&
            currentStep.key !== 'sports' &&
            !isLastStep ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void goToStep(stepIndex + 1)}
                style={styles.skipButton}
                disabled={saving || photoBusy}
              >
                <Text style={styles.skipText}>Passer cette étape</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                isLastStep ? void finish() : void goToStep(stepIndex + 1)
              }
              disabled={saving || photoBusy}
              style={({ pressed }) => [
                styles.continueButton,
                saving && styles.disabled,
                pressed && !saving && styles.pressedButton,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueText}>
                  {isLastStep
                    ? isEditing
                      ? 'Enregistrer mon profil'
                      : 'Terminer mon profil'
                    : 'Continuer'}
                </Text>
              )}
            </Pressable>
            <Text style={styles.footerHint}>
              Tu pourras modifier ces informations à tout moment.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },
  content: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
  },
  wideContent: {
    paddingTop: 28,
    paddingHorizontal: 32,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F4F7F2',
  },
  loadingText: {
    color: '#66736A',
    fontSize: 14,
  },
  topRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: '#20583D',
    fontSize: 18,
    fontWeight: '900',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: '#55705D',
    fontSize: 14,
    fontWeight: '700',
  },
  stepCount: {
    color: '#66816D',
    fontSize: 12,
    fontWeight: '800',
  },
  editLabel: {
    color: '#66816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    backgroundColor: '#E1E9E0',
    borderRadius: 4,
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#79A95B',
    borderRadius: 4,
  },
  heading: {
    alignItems: 'center',
    marginTop: 27,
    marginBottom: 22,
  },
  iconBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5EEDF',
    borderRadius: 18,
    marginBottom: 13,
  },
  stepIcon: {
    fontSize: 27,
  },
  eyebrow: {
    color: '#78907C',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    color: '#183C2B',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 7,
  },
  subtitle: {
    maxWidth: 480,
    color: '#788078',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  helper: {
    color: '#66816D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6ECE4',
    shadowColor: '#1C3B27',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#E7F0E5',
    borderRadius: 32,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    fontSize: 28,
  },
  photoCopy: {
    flex: 1,
    marginLeft: 13,
  },
  photoTitle: {
    color: '#294333',
    fontSize: 13,
    fontWeight: '800',
  },
  photoSubtitle: {
    color: '#89938B',
    fontSize: 11,
    marginTop: 3,
  },
  photoButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  photoButtonText: {
    color: '#20583D',
    fontSize: 12,
    fontWeight: '800',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    minWidth: 0,
    marginBottom: 15,
  },
  label: {
    color: '#405A47',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },
  sectionLabel: {
    color: '#405A47',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  input: {
    minHeight: 47,
    color: '#26372B',
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#E1E8DF',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 92,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    minHeight: 38,
    justifyContent: 'center',
    backgroundColor: '#F7F9F6',
    borderWidth: 1,
    borderColor: '#E3E9E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSelected: {
    backgroundColor: '#E9F2E3',
    borderColor: '#8AB273',
  },
  optionText: {
    color: '#65736A',
    fontSize: 11,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#24543A',
    fontWeight: '900',
  },
  unitHeader: {
    gap: 8,
  },
  privateNote: {
    color: '#55705D',
    backgroundColor: '#F0F6ED',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 17,
  },
  error: {
    color: '#A22F2F',
    backgroundColor: '#FCEEEE',
    borderRadius: 12,
    padding: 12,
    fontSize: 12,
    marginBottom: 12,
  },
  footer: {
    marginTop: 18,
  },
  skipButton: {
    minHeight: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  skipText: {
    color: '#66816D',
    fontSize: 13,
    fontWeight: '700',
  },
  continueButton: {
    minHeight: 53,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20583D',
    borderRadius: 15,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.75,
  },
  pressedButton: {
    backgroundColor: '#16482F',
    transform: [{ scale: 0.99 }],
  },
  footerHint: {
    color: '#8A948D',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 13,
  },
});
