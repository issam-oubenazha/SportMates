
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    // Démonstration uniquement : pas encore de vraie authentification.
    router.replace('/');
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
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="Ton mot de passe"
          placeholderTextColor="#8B95A5"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => alert('La récupération du mot de passe sera ajoutée plus tard.')}
        >
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Se connecter</Text>
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#7CFF6B',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#7CFF6B',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
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
