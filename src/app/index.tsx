
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const sports = [
  { emoji: '⚽', name: 'Football' },
  { emoji: '🎾', name: 'Padel' },
  { emoji: '🏃', name: 'Running' },
  { emoji: '🏋️', name: 'Gym' },
];

export default function HomeScreen() {
  const router = useRouter();
  const goToActivities = () => router.push('/activities');
  const goToCreateActivity = () => router.push('/create-activity');
  const goToExplore = () => router.push('/explore');
  const goToProfile = () => router.push('/profile');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>SALAM 👋</Text>
            <Text style={styles.title}>SportMates</Text>
            <Text style={styles.subtitle}>
              L9a les partenaires dyal sport !
            </Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={goToProfile}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mon profil"
          >
            <Text style={styles.avatarText}>S</Text>
          </Pressable>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>
            SPORT • FRIENDS • FUN
          </Text>

          <Text style={styles.bannerTitle}>
            Ma tl3bch بوحدك !
          </Text>

          <Text style={styles.bannerText}>
            L9a chi wa7d ypartagi m3ak nafs passion.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={goToExplore}
          >
            <Text style={styles.primaryButtonText}>
              Découvrir les sportifs →
            </Text>
          </Pressable>
        </View>

        {/* Sports */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choisis ton sport</Text>

          <Pressable onPress={goToExplore}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </Pressable>

        </View>

        <View style={styles.sportsGrid}>
          {sports.map((sport) => (
            <Pressable
              key={sport.name}
              style={styles.sportCard}
              onPress={goToExplore}
            >
              <Text style={styles.sportEmoji}>{sport.emoji}</Text>
              <Text style={styles.sportName}>{sport.name}</Text>
              <Text style={styles.sportHint}>
                Découvrir les sportifs →
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.profileButton}
          onPress={goToActivities}
          accessibilityRole="button"
        >
          <Text style={styles.profileIcon}>🏟️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Toutes les activités</Text>
            <Text style={styles.cardSubtitle}>
              Découvre les matchs disponibles
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        <Pressable
          style={styles.profileButton}
          onPress={goToCreateActivity}
          accessibilityRole="button"
        >
          <Text style={styles.profileIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Créer une activité</Text>
            <Text style={styles.cardSubtitle}>
              Organise un match près de chez toi
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>

        {/* Activités à proximité */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Près de chez toi</Text>
        </View>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📍</Text>

          <Text style={styles.emptyTitle}>Sport à Fès</Text>



          <Text style={styles.emptyText}>
            Découvre les matchs et les activités organisés dans ta ville.
          </Text>


          <Pressable
            style={styles.discoverButton}
            onPress={goToExplore}
          >
            <Text style={styles.discoverButtonText}>
              Trouver des partenaires
            </Text>
          </Pressable>

        </View>

        <Text style={styles.footer}>
          SportMates • Bouge avec ta communauté 💚
        </Text>
      </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 25,
  },

  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: '#65816D',
    letterSpacing: 2,
  },

  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#183C2B',
    marginTop: 4,
  },

  subtitle: {
    fontSize: 13,
    color: '#788078',
    marginTop: 5,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DDEBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#24543A',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EDE7',
  },
  profileIcon: {
    fontSize: 26,
    width: 44,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#20392A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#788078',
    marginTop: 4,
  },
  arrow: {
    fontSize: 28,
    color: '#20583D',
    marginLeft: 8,
  },
  banner: {
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 25,
    backgroundColor: '#20583D',
    marginBottom: 30,
  },

  bannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C5E8C8',
    letterSpacing: 2,
  },

  bannerTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 13,
  },

  bannerText: {
    color: '#E1EDE3',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },

  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#D7F379',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    marginTop: 20,
  },

  primaryButtonText: {
    color: '#1B3C29',
    fontSize: 12,
    fontWeight: '800',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#20392A',
  },

  seeAll: {
    fontSize: 12,
    color: '#66806D',
    fontWeight: '600',
  },

  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 28,
  },

  sportCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9EDE7',
  },
  sportEmoji: {
    fontSize: 30,
    marginBottom: 12,
  },


  sportName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#294333',
  },
  sportHint: {
    fontSize: 10,
    color: '#66806D',
    marginTop: 8,
  },


  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E9EDE7',
  },
  emptyEmoji: {
    fontSize: 27,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#294333',
    marginTop: 10,
  },

  emptyText: {
    color: '#7A837C',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  discoverButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDEBDD',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 16,
  },
  discoverButtonText: {
    color: '#20583D',
    fontWeight: '800',
    fontSize: 12,
  },


  footer: {
    textAlign: 'center',
    color: '#89938B',
    fontSize: 11,
    marginTop: 25,
    marginBottom: 100,
  },
});
