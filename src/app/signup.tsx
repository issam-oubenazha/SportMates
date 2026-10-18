
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Champs obligatoires', 'Veuillez remplir tous les champs.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('E-mail invalide', 'Veuillez vérifier votre adresse e-mail.');
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Mot de passe faible',
        'Le mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    Alert.alert(
      'Interface prête',
      'Le formulaire fonctionne, mais la création du compte nécessite encore un backend.',
      [{ text: 'OK', onPress: () => router.replace('/login') }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.logo}>SportMates ⚡</Text>

          <Text style={styles.title}>Rejoins la communauté !</Text>
          <Text style={styles.subtitle}>
            Crée ton compte et trouve tes prochains partenaires sportifs.
          </Text>

          <Text style={styles.label}>Nom complet</Text>
          <TextInput
            style={styles.input}
            placeholder="Ton nom complet"
            placeholderTextColor="#8B95A5"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Adresse e-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@email.com"
            placeholderTextColor="#8B95A5"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 8 caractères"
            placeholderTextColor="#8B95A5"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Confirmer le mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Retape ton mot de passe"
            placeholderTextColor="#8B95A5"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
          >
            <Text style={styles.signupButtonText}>Créer mon compte</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Tu as déjà un compte ? </Text>
            <Text
              style={styles.loginLink}
              onPress={() => router.push('/login')}
            >
              Se connecter
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingVertical: 24,
  },
  logo: {
    color: '#7CFF6B',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A7B0C0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
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
    marginBottom: 18,
  },
  signupButton: {
    backgroundColor: '#7CFF6B',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 26,
  },
  loginText: {
    color: '#A7B0C0',
    fontSize: 14,
  },
  loginLink: {
    color: '#7CFF6B',
    fontSize: 14,
    fontWeight: '700',
  },
});
