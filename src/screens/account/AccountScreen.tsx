import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAccountRole } from '../../services/auth';
import * as api from '../../services/api';
import { validateRequired } from '../../utils/validators';
import ThemeToggle from '../../components/ThemeToggle';
import PasswordRecoveryScreen from '../auth/PasswordRecoveryScreen';

export default function AccountScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const { user, authMethod, updateProfile, authorizationError } = useAuth();
  const [profileName, setProfileName] = useState(user?.profile?.name || '');
  const [profileArea, setProfileArea] = useState(typeof user?.profile?.area === 'string' ? user.profile.area : '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  useEffect(() => {
    setProfileName(user?.profile?.name || '');
    setProfileArea(typeof user?.profile?.area === 'string' ? user.profile.area : '');
  }, [user?.id, user?.profile?.name, user?.profile?.area]);

  const handleSaveProfile = async () => {
    const name = validateRequired(profileName.trim(), 2, 'El nombre');
    if (!name.valid) {
      setFeedback({ text: name.error || 'Ingresa tu nombre.', type: 'error' });
      return;
    }
    try {
      setSavingProfile(true);
      setFeedback(null);
      await updateProfile({ name: profileName, area: profileArea });
      api.invalidateCache('incidents');
      setFeedback({ text: 'Perfil actualizado correctamente.', type: 'success' });
    } catch (error) {
      console.error('No se pudo actualizar el perfil:', error);
      setFeedback({
        text: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.',
        type: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (showPasswordRecovery) {
    return <PasswordRecoveryScreen initialEmail={user?.email || ''} onBack={() => setShowPasswordRecovery(false)} />;
  }

  const providerLabel = authMethod === 'google'
    ? 'Google'
    : authMethod === 'apple'
      ? 'Apple'
      : authMethod === 'email'
        ? 'Correo y contraseña'
        : 'No disponible';
  const accountName = profileName.trim() || user?.email?.split('@')[0] || 'Usuario';
  const isExternalProvider = authMethod === 'google' || authMethod === 'apple';
  const accountRole = getAccountRole(user);

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('Inicio')}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="arrow-left" size={15} color={colors.textPrimary} />
          <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Volver al inicio</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="user" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Mi cuenta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Administra tu información personal y las opciones de acceso en un solo lugar.
          </Text>
        </View>

        <LinearGradient
          colors={['#087CF0', '#0752B8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityCard}>
          <View style={styles.identityTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{accountName.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.identityEyebrow}>SESIÓN ACTIVA</Text>
              <Text style={styles.name} numberOfLines={1}>{accountName}</Text>
              <Text style={styles.email} numberOfLines={1}>{user?.email || 'Correo no disponible'}</Text>
            </View>
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          </View>
          <View style={styles.badges}>
            <View style={styles.identityBadge}>
              <Feather name="shield" size={13} color="#FFFFFF" />
              <Text style={styles.identityBadgeText}>{accountRole || 'Rol pendiente'}</Text>
            </View>
            <View style={styles.identityBadge}>
              <Feather name={authMethod === 'google' ? 'globe' : authMethod === 'apple' ? 'smartphone' : 'mail'} size={13} color="#FFFFFF" />
              <Text style={styles.identityBadgeText}>{providerLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        {(authorizationError || !accountRole) && (
          <View style={[styles.authorizationNotice, { backgroundColor: authorizationError ? 'rgba(255,69,58,0.1)' : 'rgba(255,159,10,0.12)' }]}>
            <Feather name={authorizationError ? 'alert-circle' : 'alert-triangle'} size={15} color={authorizationError ? '#FF453A' : '#FF9F0A'} />
            <Text style={[styles.authorizationNoticeText, { color: authorizationError ? '#FF453A' : '#FF9F0A' }]}>
              {authorizationError || 'Tu cuenta todavía no tiene un rol asignado. Contacta a un administrador para solicitar acceso.'}
            </Text>
          </View>
        )}

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(10,132,255,0.12)' }]}>
              <Feather name="user" size={17} color="#0A84FF" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Perfil</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Actualiza tus datos personales.</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nombre completo</Text>
          <TextInput
            accessibilityLabel="Nombre completo"
            placeholder="Nombre completo"
            placeholderTextColor={colors.placeholder}
            value={profileName}
            onChangeText={setProfileName}
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Área de trabajo</Text>
          <TextInput
            accessibilityLabel="Área de trabajo"
            placeholder="Área de trabajo (opcional)"
            placeholderTextColor={colors.placeholder}
            value={profileArea}
            onChangeText={setProfileArea}
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
          />
          {feedback ? (
            <View style={[styles.feedback, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
              <Feather name={feedback.type === 'error' ? 'alert-circle' : 'check-circle'} size={15} color={feedback.type === 'error' ? '#FF453A' : '#30D158'} />
              <Text style={[styles.feedbackText, { color: feedback.type === 'error' ? '#FF453A' : '#30D158' }]}>{feedback.text}</Text>
            </View>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={savingProfile}
            onPress={() => void handleSaveProfile()}
            style={[styles.primaryButton, savingProfile && styles.disabledButton]}>
            {savingProfile
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Feather name="save" size={16} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{savingProfile ? 'Guardando...' : 'Guardar perfil'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(191,90,242,0.12)' }]}>
              <Feather name="sliders" size={17} color="#BF5AF2" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferencias</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Personaliza la apariencia de la aplicación.</Text>
            </View>
          </View>
          <View style={[styles.preferenceRow, { borderColor: colors.divider }]}>
            <View style={styles.securityIcon}>
              <Feather name={isDark ? 'moon' : 'sun'} size={16} color="#0A84FF" />
            </View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Tema visual</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>{isDark ? 'Oscuro' : 'Claro'}</Text>
            </View>
            <ThemeToggle style={styles.accountThemeToggle} size={19} />
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(10,132,255,0.12)' }]}>
              <Feather name="info" size={17} color="#0A84FF" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acerca de</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Información de Bitácora Digital.</Text>
            </View>
          </View>
          <Text style={[styles.aboutName, { color: colors.textPrimary }]}>Bitácora Digital</Text>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Sistema para registrar cambios, incidentes, infraestructura, usuarios y reportes administrativos.
          </Text>
          <Text style={[styles.aboutVersion, { color: colors.textTertiary }]}>Versión 1.0.0 · Expo · InsForge</Text>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(48,209,88,0.12)' }]}>
              <Feather name="lock" size={17} color="#30D158" />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Seguridad</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Método de acceso y contraseña.</Text>
            </View>
          </View>

          <View style={[styles.securityRow, { borderColor: colors.divider }]}>
            <View style={styles.securityIcon}><Feather name="log-in" size={16} color="#0A84FF" /></View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Método de inicio de sesión</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>{providerLabel}</Text>
            </View>
          </View>
          <View style={[styles.securityRow, { borderColor: colors.divider }]}>
            <View style={styles.securityIcon}><Feather name="mail" size={16} color="#0A84FF" /></View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Correo de la cuenta</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>{user?.email || 'No disponible'}</Text>
            </View>
          </View>

          {isExternalProvider ? (
            <View style={[styles.providerNotice, { backgroundColor: colors.inputBg }]}>
              <Feather name="info" size={16} color="#0A84FF" />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Esta cuenta usa {providerLabel}. Administra su contraseña y seguridad desde ese proveedor.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Puedes solicitar un código para cambiar la contraseña asociada a tu correo.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setShowPasswordRecovery(true)}
                style={[styles.secondaryButton, { borderColor: colors.cardBorder, backgroundColor: colors.inputBg }]}>
                <Feather name="key" size={16} color="#0A84FF" />
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Cambiar contraseña</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 34, paddingBottom: 120 },
  header: { marginBottom: 20 },
  backButton: { alignSelf: 'flex-start', minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, marginBottom: 18 },
  backButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  headerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 19, marginTop: 4, maxWidth: 520 },
  identityCard: { borderRadius: 20, padding: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#087CF0', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontFamily: 'Poppins_700Bold', fontSize: 22 },
  identityDetails: { flex: 1 },
  identityEyebrow: { color: 'rgba(255,255,255,0.72)', fontFamily: 'Poppins_600SemiBold', fontSize: 9, letterSpacing: 1.1, marginBottom: 2 },
  name: { color: '#FFFFFF', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  email: { color: 'rgba(255,255,255,0.78)', fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  onlineIndicator: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(48,209,88,0.18)', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#30D158' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  identityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  identityBadgeText: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  authorizationNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12, borderRadius: 12, marginBottom: 14 },
  authorizationNoticeText: { flex: 1, color: '#FF9F0A', fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 16 },
  sectionCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  sectionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  sectionDescription: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 1 },
  fieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, marginTop: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 13, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, marginTop: 6 },
  feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 12 },
  feedbackError: { backgroundColor: 'rgba(255,69,58,0.1)' },
  feedbackSuccess: { backgroundColor: 'rgba(48,209,88,0.1)' },
  feedbackText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 17 },
  primaryButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0A84FF', borderRadius: 11, paddingHorizontal: 16, marginTop: 14 },
  primaryButtonText: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  disabledButton: { opacity: 0.65 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  accountThemeToggle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,132,255,0.1)' },
  aboutName: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginBottom: 5 },
  aboutVersion: { fontFamily: 'Poppins_400Regular', fontSize: 10, marginTop: 8 },
  securityIcon: { width: 30, alignItems: 'center' },
  securityCopy: { flex: 1 },
  securityLabel: { fontFamily: 'Poppins_400Regular', fontSize: 10 },
  securityValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginTop: 2 },
  providerNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 11, borderRadius: 11, marginTop: 13 },
  noticeText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 11, lineHeight: 17 },
  secondaryButton: { alignSelf: 'flex-start', minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, marginTop: 12 },
  secondaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
});
