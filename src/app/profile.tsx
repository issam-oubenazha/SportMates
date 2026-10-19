
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../contexts/auth-context';
import { supabase } from '../lib/supabase';

const SPORTS = [
  'Football',
  'Basketball',
  'Tennis',
  'Running',
  'Fitness',
  'Natation',
  'Cyclisme',
  'Volleyball',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!session?.user) {
        if (active) setLoading(false);
        return;
      }

      setEmail(session.user.email ?? '');

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, city, favorite_sport, bio')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        showMessage('Erreur', error.message);
      } else if (data) {
        setName(data.full_name ?? '');
        setCity(data.city ?? '');
        setSport(data.favorite_sport ?? '');
        setBio(data.bio ?? '');
      } else {
        setName(
          session.user.user_metadata?.full_name ?? ''
        );
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const saveProfile = async () => {
    if (!session?.user) {
      showMessage('Connexion requise', 'Connecte-toi pour modifier ton profil.');
      router.replace('/login');
      return;
    }

    if (!name.trim()) {
      showMessage('Nom obligatoire', 'Entre ton nom complet.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: name.trim(),
        city: city.trim(),
        favorite_sport: sport,
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showMessage('Erreur de sauvegarde', error.message);
        return;
      }

      showMessage('Succès', 'Ton profil a été enregistré !');
    } catch {
      showMessage('Erreur', 'Impossible de contacter Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch {
      showMessage('Erreur', 'La déconnexion a échoué.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7CFF6B" />
        <Text style={styles.muted}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>SportMates ⚡</Text>
      <Text style={styles.title}>Mon profil</Text>
      <Text style={styles.subtitle}>
        Présente-toi et trouve tes prochains partenaires sportifs.
      </Text>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
        </Text>
      </View>

      <Text style={styles.email}>{email}</Text>

      <Text style={styles.label}>Nom complet *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ton nom complet"
        placeholderTextColor="#8B95A5"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Ville</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        placeholder="Ex. Fès"
        placeholderTextColor="#8B95A5"
      />

      <Text style={styles.label}>Ma sport préféré</Text>
      <View style={styles.sports}>
        {SPORTS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.sportOption,
              sport === item && styles.sportSelected,
            ]}
            onPress={() => setSport(sport === item ? '' : item)}
          >
            <Text
              style={[
                styles.sportText,
                sport === item && styles.sportTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>À propos de moi</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="Parle un peu de toi et de tes objectifs sportifs..."
        placeholderTextColor="#8B95A5"
        multiline
        maxLength={300}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabled]}
        onPress={saveProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#0B1220" />
        ) : (
          <Text style={styles.saveText}>Enregistrer mon profil</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  content: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 50,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  back: {
    color: '#A7B0C0',
    fontSize: 15,
    marginBottom: 24,
  },
  logo: {
    color: '#7CFF6B',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#A7B0C0',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#172235',
    borderWidth: 2,
    borderColor: '#7CFF6B',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#7CFF6B',
    fontSize: 36,
    fontWeight: '800',
  },
  email: {
    color: '#A7B0C0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 9,
  },
  input: {
    backgroundColor: '#172235',
    borderWidth: 1,
    borderColor: '#2B3A50',
    borderRadius: 14,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    marginBottom: 20,
  },
  sports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 24,
  },
  sportOption: {
    borderWidth: 1,
    borderColor: '#2B3A50',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#172235',
  },
  sportSelected: {
    backgroundColor: '#7CFF6B',
    borderColor: '#7CFF6B',
  },
  sportText: {
    color: '#D5DCE7',
    fontSize: 13,
    fontWeight: '600',
  },
  sportTextSelected: {
    color: '#0B1220',
  },
  bioInput: {
    minHeight: 110,
  },
  saveButton: {
    backgroundColor: '#7CFF6B',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '800',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 14,
  },
  logoutText: {
    color: '#F87171',
    fontSize: 15,
    fontWeight: '700',
  },
  muted: {
    color: '#A7B0C0',
  },
});
