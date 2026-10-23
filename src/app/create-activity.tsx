
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

const SPORTS = ['Football', 'Padel', 'Running', 'Gym'];

export default function CreateActivityScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Football');
  const [city, setCity] = useState('Fès');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async () => {
    setErrorMessage('');

    if (!session?.user?.id) {
      setErrorMessage('خاصك تسجّل الدخول قبل ما تنشئ نشاط.');
      return;
    }

    if (
      !title.trim() ||
      !city.trim() ||
      !location.trim() ||
      !date.trim() ||
      !time.trim()
    ) {
      setErrorMessage('عافاك عمّر جميع المعلومات الضرورية.');
      return;
    }

    const participantLimit = Number(maxParticipants);

    if (
      !Number.isInteger(participantLimit) ||
      participantLimit < 2 ||
      participantLimit > 100
    ) {
      setErrorMessage('عدد المشاركين خاصو يكون بين 2 و100.');
      return;
    }

    // Format attendu : date YYYY-MM-DD et heure HH:mm
    const dateTime = new Date(`${date.trim()}T${time.trim()}:00`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) ||
      !/^\d{2}:\d{2}$/.test(time.trim()) ||
      Number.isNaN(dateTime.getTime()) ||
      dateTime.getFullYear() !== Number(date.slice(0, 4)) ||
      dateTime.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      dateTime.getDate() !== Number(date.slice(8, 10)) ||
      dateTime.getHours() !== Number(time.slice(0, 2)) ||
      dateTime.getMinutes() !== Number(time.slice(3, 5))
    ) {
      setErrorMessage('دخل تاريخ صحيح بصيغة YYYY-MM-DD ووقت بصيغة HH:mm.');
      return;
    }

    if (dateTime.getTime() <= Date.now()) {
      setErrorMessage('اختار تاريخ ووقت فالمستقبل.');
      return;
    }

    setSaving(true);

    try {
        const { error } = await supabase
          .from('activities')
          .insert({
            organizer_id: session.user.id,
            title: title.trim(),
            sport,
            city: city.trim(),
            location: location.trim(),
            start_time: `${time.trim()}:00`,
            activity_date: dateTime.toISOString(),
            max_participants: participantLimit,
            description: description.trim(),
      });

      if (error) throw error;

      setErrorMessage('');
          Alert.alert('Bravo ! 🎉', 'النشاط الرياضي تخلق بنجاح.');

          router.replace('/activities');
    } catch (error: any) {
  console.error('CREATE ACTIVITY ERROR:', error);

  const message = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code ? `Code: ${error.code}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  setErrorMessage(
    message || 'Erreur inconnue. Vérifie la console.'
  );
} finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ Retour</Text>
        </Pressable>

        <Text style={styles.eyebrow}>SPORTMATES COMMUNITY</Text>
        <Text style={styles.title}>Créer une activité</Text>
        <Text style={styles.subtitle}>
          Organise un match et rassemble ta team 💚
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Nom de l'activité *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex. Match de football entre amis"
            placeholderTextColor="#8A948D"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Choisis ton sport *</Text>
          <View style={styles.sports}>
            {SPORTS.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles.sportOption,
                  sport === item && styles.sportSelected,
                ]}
                onPress={() => setSport(item)}
              >
                <Text
                  style={[
                    styles.sportText,
                    sport === item && styles.sportTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Ville *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex. Fès"
            placeholderTextColor="#8A948D"
            value={city}
            onChangeText={setCity}
            maxLength={80}
          />

          <Text style={styles.label}>Lieu précis *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex. Terrain de sport, quartier..."
            placeholderTextColor="#8A948D"
            value={location}
            onChangeText={setLocation}
            maxLength={200}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-10-25"
                placeholderTextColor="#8A948D"
                value={date}
                onChangeText={setDate}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Heure *</Text>
              <TextInput
                style={styles.input}
                placeholder="18:30"
                placeholderTextColor="#8A948D"
                value={time}
                onChangeText={setTime}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.hint}>
            Date : AAAA-MM-JJ • Heure : HH:mm (24h)
          </Text>

          <Text style={styles.label}>Nombre maximum de participants *</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            placeholderTextColor="#8A948D"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Description (facultatif)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Niveau, règles, détails supplémentaires..."
            placeholderTextColor="#8A948D"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          <Pressable
            style={[
              styles.submitButton,
              saving && styles.submitDisabled,
            ]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                Créer l'activité →
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },
  container: {
    padding: 22,
    paddingTop: 55,
    paddingBottom: 45,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 25,
  },
  backText: {
    color: '#20583D',
    fontSize: 15,
    fontWeight: '800',
  },
  eyebrow: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#183C2B',
    marginTop: 7,
  },
  subtitle: {
    fontSize: 13,
    color: '#788078',
    marginTop: 7,
    marginBottom: 25,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9EDE7',
  },
  label: {
    color: '#294333',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 9,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F7F8F4',
    borderWidth: 1,
    borderColor: '#E3E8E0',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 13,
    color: '#20392A',
  },
  sports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportOption: {
    borderWidth: 1,
    borderColor: '#DDE5DC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  sportSelected: {
    backgroundColor: '#20583D',
    borderColor: '#20583D',
  },
  sportText: {
    color: '#4D6253',
    fontSize: 12,
    fontWeight: '700',
  },
  sportTextSelected: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  hint: {
    fontSize: 11,
    color: '#788078',
    marginTop: 7,
  },
  textarea: {
    minHeight: 100,
  },
  error: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 15,
  },
  submitButton: {
    backgroundColor: '#20583D',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
