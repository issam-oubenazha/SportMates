
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert('Connexion impossible', error.message);
        return;
      }

      router.replace('/');
    } catch {
      Alert.alert(
        'Erreur',
        'Impossible de contacter le serveur. Vérifie ta connexion.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>SportMates ⚡</Text>

        <Text style={styles.title}>Bon retour !</Text>
        <Text style={styles.subtitle}>
          Connecte-toi et trouve tes partenaires sportifs.
        </Text>

        <Text style={styles.label}>Adresse e-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="exemple@email.com"
          placeholderTextColor="#8B95A5"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ton mot de passe"
          placeholderTextColor="#8B95A5"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0B1220" />
          ) : (
            <Text style={styles.loginButtonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Pas encore de compte ? </Text>
          <Text
            style={styles.signupLink}
            onPress={() => router.push('/signup')}
          >
            S'inscrire
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  logo: {
    color: '#7CFF6B',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 36,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A7B0C0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  loginButton: {
    backgroundColor: '#7CFF6B',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 28,
  },
  signupText: {
    color: '#A7B0C0',
    fontSize: 14,
  },
  signupLink: {
    color: '#7CFF6B',
    fontSize: 14,
    fontWeight: '700',
  },
});
