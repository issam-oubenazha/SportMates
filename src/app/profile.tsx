import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.82;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ProfileData = {
  full_name: string | null;
  city: string | null;
  favorite_sport: string | null;
  bio: string | null;
  avatar_url: string | null;
};

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

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const { session, signOut } = useAuth();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!session?.user) {
        if (active) setLoading(false);
        return;
      }

      setEmail(session.user.email ?? '');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, city, favorite_sport, bio, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          showMessage('Erreur', error.message);
        } else if (data) {
          const profile = data as ProfileData;
          setName(profile.full_name ?? '');
          setCity(profile.city ?? '');
          setSport(profile.favorite_sport ?? '');
          setBio(profile.bio ?? '');
          setAvatarUrl(profile.avatar_url ?? null);
        } else {
          setName(session.user.user_metadata?.full_name ?? '');
        }
      } catch (error) {
        if (active) {
          showMessage(
            'Erreur',
            error instanceof Error
              ? error.message
              : 'Impossible de charger ton profil.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const updateAvatarUrl = async (url: string | null) => {
    if (!session?.user) {
      throw new Error('Connecte-toi pour modifier ta photo de profil.');
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        full_name: name.trim() || session.user.user_metadata?.full_name || '',
        city: city.trim(),
        favorite_sport: sport,
        bio: bio.trim(),
        avatar_url: url,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  };

  const choosePhoto = async () => {
    if (!session?.user) {
      router.replace('/login');
      return;
    }

    setPhotoError('');
    setPhotoBusy(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) {
        throw new Error('Aucune image n’a été sélectionnée.');
      }

      if (!ALLOWED_IMAGE_TYPES.includes(getImageMimeType(asset))) {
        throw new Error('Choisis une image au format JPG, PNG ou WEBP.');
      }

      if (!asset.width || !asset.height) {
        throw new Error('Les dimensions de cette image sont invalides.');
      }

      const sourceScale = Math.min(
        1,
        AVATAR_SIZE / Math.max(asset.width, asset.height)
      );
      const scaledWidth = Math.round(asset.width * sourceScale);
      const scaledHeight = Math.round(asset.height * sourceScale);
      const cropSize = Math.min(scaledWidth, scaledHeight);
      const originX = Math.floor((scaledWidth - cropSize) / 2);
      const originY = Math.floor((scaledHeight - cropSize) / 2);
      const context = ImageManipulator.manipulate(asset.uri, {
        maxWidth: AVATAR_SIZE,
        maxHeight: AVATAR_SIZE,
      });
      context
        .crop({ originX, originY, width: cropSize, height: cropSize })
        .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
      const rendered = await context.renderAsync();
      const optimized = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: AVATAR_QUALITY,
      });

      const response = await fetch(optimized.uri);
      if (!response.ok) {
        throw new Error('Impossible de préparer cette image.');
      }
      const imageBytes = await response.arrayBuffer();
      const avatarPath = `${session.user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, imageBytes, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(avatarPath);
      const url = `${data.publicUrl}?updated=${Date.now()}`;
      await updateAvatarUrl(url);
      setAvatarUrl(url);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'Impossible de mettre à jour ta photo de profil.'
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!session?.user || !avatarUrl) return;

    setPhotoError('');
    setPhotoBusy(true);

    try {
      await updateAvatarUrl(null);
      setAvatarUrl(null);

      const avatarPath = `${session.user.id}/avatar.jpg`;
      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(avatarPath);

      if (avatarUrl.split('?')[0] === data.publicUrl) {
        const { error } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([avatarPath]);

        if (error) {
          throw new Error(
            `La photo a été retirée du profil, mais le fichier n’a pas pu être supprimé : ${error.message}`
          );
        }
      }
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'Impossible de supprimer la photo de profil.'
      );
    } finally {
      setPhotoBusy(false);
    }
  };

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
    } catch (error) {
      showMessage(
        'Erreur',
        error instanceof Error
          ? error.message
          : 'Impossible de contacter Supabase.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      showMessage(
        'Erreur',
        error instanceof Error ? error.message : 'La déconnexion a échoué.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#20583D" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isWide && styles.wideContent]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInDown.duration(320)}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>

        <View style={styles.pageHeading}>
          <Text style={styles.eyebrow}>ESPACE PERSONNEL</Text>
          <Text style={styles.pageTitle}>Mon profil</Text>
          <Text style={styles.pageSubtitle}>
            Présente-toi et trouve tes prochains partenaires sportifs.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/racket-stats')}
          style={({ pressed }) => [
            styles.statsLink,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.statsLinkCopy}>
            <Text style={styles.statsLinkTitle}>Mes stats Tennis & Padel</Text>
            <Text style={styles.statsLinkSubtitle}>
              Enregistre tes matchs et suis tes résultats.
            </Text>
          </View>
          <Text style={styles.statsLinkArrow}>→</Text>
        </Pressable>

        <View style={[styles.profileLayout, isWide && styles.wideLayout]}>
          <View style={[styles.heroCard, isWide && styles.wideHeroCard]}>
            <View style={styles.heroAccent} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choisir une photo de profil"
              onPress={() => void choosePhoto()}
              disabled={photoBusy}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatarFrame}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                    <Text style={styles.placeholderHint}>SPORTMATES</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  {photoBusy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.cameraIcon}>✎</Text>
                  )}
                </View>
              </View>
            </Pressable>

            <Text style={styles.photoHint}>
              {avatarUrl ? 'Ta photo de profil' : 'Ajoute une photo de profil'}
            </Text>
            <View style={styles.photoActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void choosePhoto()}
                disabled={photoBusy}
                style={({ pressed }) => [
                  styles.photoButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.photoButtonText}>
                  {avatarUrl ? 'Changer la photo' : 'Ajouter une photo'}
                </Text>
              </Pressable>
              {avatarUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void removePhoto()}
                  disabled={photoBusy}
                  style={styles.removePhotoButton}
                >
                  <Text style={styles.removePhotoText}>Supprimer</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.photoFormats}>JPG, PNG ou WEBP · max. 512 px</Text>

            {photoError ? (
              <Text accessibilityRole="alert" style={styles.photoError}>
                {photoError}
              </Text>
            ) : null}

            <View style={styles.heroDivider} />
            <Text style={styles.profileName}>{name || 'Ton nom'}</Text>
            <Text style={styles.professionalTitle}>
              {sport ? `Passionné de ${sport}` : 'Membre de SportMates'}
            </Text>
            <Text style={styles.profileBio}>
              {bio.trim() ||
                'Ajoute quelques mots sur toi et tes objectifs sportifs.'}
            </Text>
            <View style={styles.profileDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⌖</Text>
                <Text style={styles.detailText}>
                  {city.trim() || 'Ville à renseigner'}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>✉</Text>
                <Text style={styles.detailText} numberOfLines={1}>
                  {email}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.formCard, isWide && styles.wideFormCard]}>
            <View style={styles.formHeading}>
              <Text style={styles.formTitle}>Informations personnelles</Text>
              <Text style={styles.formSubtitle}>
                Mets à jour les informations visibles par la communauté.
              </Text>
            </View>

            <Text style={styles.label}>Nom complet *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ton nom complet"
              placeholderTextColor="#8B958D"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Ex. Fès"
              placeholderTextColor="#8B958D"
            />

            <Text style={styles.label}>Mon sport préféré</Text>
            <View style={styles.sports}>
              {SPORTS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sport === item }}
                  style={({ pressed }) => [
                    styles.sportOption,
                    sport === item && styles.sportSelected,
                    pressed && styles.pressed,
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
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>À propos de moi</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Parle un peu de toi et de tes objectifs sportifs..."
              placeholderTextColor="#8B958D"
              multiline
              maxLength={300}
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                saving && styles.disabled,
                pressed && !saving && styles.saveButtonPressed,
              ]}
              onPress={() => void saveProfile()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Enregistrer mon profil</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={styles.logoutButton}
              onPress={() => void handleLogout()}
            >
              <Text style={styles.logoutIcon}>↗</Text>
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F2',
  },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 52,
  },
  wideContent: {
    maxWidth: 1180,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  center: {
    flex: 1,
    backgroundColor: '#F4F7F2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#66736A',
    fontSize: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 14,
  },
  back: {
    color: '#55705D',
    fontSize: 14,
    fontWeight: '700',
  },
  pageHeading: {
    marginBottom: 24,
  },
  eyebrow: {
    color: '#65816D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  pageTitle: {
    color: '#183C2B',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    color: '#788078',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  statsLink: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE3',
    borderRadius: 18,
    paddingHorizontal: 17,
    paddingVertical: 13,
    marginBottom: 18,
  },
  statsLinkCopy: {
    flex: 1,
    paddingRight: 12,
  },
  statsLinkTitle: {
    color: '#20392A',
    fontSize: 14,
    fontWeight: '800',
  },
  statsLinkSubtitle: {
    color: '#788078',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  statsLinkArrow: {
    color: '#20583D',
    fontSize: 22,
    fontWeight: '800',
  },
  profileLayout: {
    gap: 16,
  },
  wideLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5EBE3',
    overflow: 'hidden',
  },
  wideHeroCard: {
    flex: 0.82,
    padding: 28,
    marginTop: 0,
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#20583D',
  },
  avatarPressable: {
    marginTop: 8,
  },
  avatarFrame: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#E4F0E2',
    backgroundColor: '#E7F0E5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F0E5',
  },
  avatarInitial: {
    color: '#20583D',
    fontSize: 48,
    fontWeight: '900',
  },
  placeholderHint: {
    color: '#65816D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginTop: 2,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: 1,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#20583D',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: -2,
  },
  photoHint: {
    color: '#66736A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 11,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  photoButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#20583D',
    borderRadius: 12,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  removePhotoButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  removePhotoText: {
    color: '#A33E35',
    fontSize: 12,
    fontWeight: '700',
  },
  photoFormats: {
    color: '#89938B',
    fontSize: 10,
    marginTop: 8,
  },
  photoError: {
    color: '#B42318',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  heroDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#EDF1EB',
    marginTop: 20,
    marginBottom: 17,
  },
  profileName: {
    color: '#183C2B',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  professionalTitle: {
    color: '#4E7559',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  profileBio: {
    color: '#788078',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
  },
  profileDetails: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F8F5',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    gap: 10,
  },
  detailIcon: {
    width: 20,
    color: '#4E7559',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  detailText: {
    flex: 1,
    color: '#526056',
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 21,
    borderWidth: 1,
    borderColor: '#E5EBE3',
  },
  wideFormCard: {
    flex: 1.18,
    padding: 28,
  },
  formHeading: {
    marginBottom: 23,
  },
  formTitle: {
    color: '#20392A',
    fontSize: 18,
    fontWeight: '800',
  },
  formSubtitle: {
    color: '#879188',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  label: {
    color: '#34493A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAF7',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 13,
    color: '#20392A',
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 14,
    marginBottom: 19,
  },
  sports: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 21,
  },
  sportOption: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E9E0',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#F8FAF7',
  },
  sportSelected: {
    backgroundColor: '#20583D',
    borderColor: '#20583D',
  },
  sportText: {
    color: '#647166',
    fontSize: 12,
    fontWeight: '700',
  },
  sportTextSelected: {
    color: '#FFFFFF',
  },
  bioInput: {
    minHeight: 105,
  },
  saveButton: {
    minHeight: 50,
    backgroundColor: '#20583D',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveButtonPressed: {
    backgroundColor: '#17452F',
  },
  disabled: {
    opacity: 0.65,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  logoutIcon: {
    color: '#A33E35',
    fontSize: 17,
    fontWeight: '800',
  },
  logoutText: {
    color: '#A33E35',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
});
