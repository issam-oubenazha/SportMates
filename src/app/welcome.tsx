import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.mark}>SportMates ⚡</Text>
        <Text style={styles.eyebrow}>SPORT • AMIS • FUN</Text>
        <Text style={styles.title}>Le sport est meilleur à plusieurs.</Text>
        <Text style={styles.description}>
          Trouve des partenaires, rejoins des activités et construis une
          expérience sportive à ton image.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/signup')}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Créer mon compte</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>J’ai déjà un compte</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F4F7F2',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  mark: {
    color: '#20583D',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 56,
  },
  eyebrow: {
    color: '#66816D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#183C2B',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 44,
    marginTop: 14,
  },
  description: {
    color: '#788078',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    marginBottom: 32,
  },
  primary: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20583D',
    borderRadius: 16,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondary: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD8CB',
    borderRadius: 16,
    marginTop: 12,
  },
  secondaryText: {
    color: '#20583D',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
