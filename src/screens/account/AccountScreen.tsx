import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  const [focusedField, setFocusedField] = useState<'name' | 'area' | null>(null);

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

  // Paleta neutra acorde a la aplicación: sin tonos morados en modo oscuro
  const primaryBtnGradient = isDark
    ? (['#FFFFFF', '#F3F4F6'] as const)
    : (['#0F172A', '#1E293B'] as const);

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Botón de regreso */}
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Inicio')}
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <Feather name="arrow-left" size={14} color={colors.textPrimary} />
          <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Volver al inicio</Text>
        </TouchableOpacity>

        {/* Encabezado */}
        <View style={styles.header}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                borderColor: isDark ? colors.cardBorder : '#CBD5E1',
              },
            ]}>
            <Feather name="user" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Mi cuenta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Administra tu información personal y las opciones de acceso en un solo lugar.
          </Text>
        </View>

        {/* Tarjeta de identidad */}
        <View
          style={[
            styles.identityCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <View style={styles.identityTop}>
            <LinearGradient
              colors={isDark ? ['#242424', '#161616'] : ['#0F172A', '#1E293B']}
              style={[
                styles.avatar,
                { borderColor: isDark ? 'rgba(255,255,255,0.18)' : '#CBD5E1' },
              ]}>
              <Text style={styles.avatarText}>{accountName.slice(0, 1).toUpperCase()}</Text>
            </LinearGradient>

            <View style={styles.identityDetails}>
              <Text style={[styles.identityEyebrow, { color: isDark ? 'rgba(255, 255, 255, 0.55)' : '#64748B' }]}>
                SESIÓN ACTIVA
              </Text>
              <Text style={[styles.name, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
                {accountName}
              </Text>
              <Text style={[styles.email, { color: isDark ? 'rgba(255, 255, 255, 0.70)' : '#475569' }]} numberOfLines={1}>
                {user?.email || 'Correo no disponible'}
              </Text>
            </View>

            <View
              style={[
                styles.onlineIndicator,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#10B981',
                },
              ]}>
              <View style={styles.onlineDot} />
            </View>
          </View>

          <View style={styles.badges}>
            {/* Badge de Rol */}
            <View
              style={[
                styles.identityBadge,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#059669',
                },
              ]}>
              <Feather name="shield" size={13} color={isDark ? '#34D399' : '#047857'} />
              <Text style={[styles.identityBadgeText, { color: isDark ? '#34D399' : '#047857' }]}>
                {accountRole || 'Rol pendiente'}
              </Text>
            </View>

            {/* Badge de Proveedor */}
            <View
              style={[
                styles.identityBadge,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Feather
                name={authMethod === 'google' ? 'globe' : authMethod === 'apple' ? 'smartphone' : 'mail'}
                size={13}
                color={isDark ? '#94A3B8' : '#334155'}
              />
              <Text style={[styles.identityBadgeText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                {providerLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Notificación de autorización si falta rol */}
        {(authorizationError || !accountRole) && (
          <View
            style={[
              styles.authorizationNotice,
              {
                backgroundColor: authorizationError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                borderColor: authorizationError ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.4)',
              },
            ]}>
            <Feather
              name={authorizationError ? 'alert-circle' : 'alert-triangle'}
              size={16}
              color={authorizationError ? '#EF4444' : '#F59E0B'}
            />
            <Text
              style={[
                styles.authorizationNoticeText,
                { color: authorizationError ? '#EF4444' : (isDark ? '#FBBF24' : '#B45309') },
              ]}>
              {authorizationError || 'Tu cuenta todavía no tiene un rol asignado. Contacta a un administrador para solicitar acceso.'}
            </Text>
          </View>
        )}

        {/* Sección: Perfil */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <View style={[styles.sectionHeading, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }]}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Feather name="user" size={17} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Perfil</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Actualiza tus datos personales.
              </Text>
            </View>
          </View>

          {/* Input: Nombre completo */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.90)' : '#1E293B' }]}>
              Nombre completo
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.inputBg : (focusedField === 'name' ? '#FFFFFF' : '#F8FAFC'),
                  borderColor: focusedField === 'name'
                    ? (isDark ? '#FFFFFF' : '#0F172A')
                    : (isDark ? colors.inputBorder : '#CBD5E1'),
                  ...(focusedField === 'name' && Platform.select({
                    web: { boxShadow: isDark ? '0 0 0 2px rgba(255, 255, 255, 0.2)' : '0 0 0 3px rgba(15, 23, 42, 0.1)' } as any,
                  })),
                },
              ]}>
              <Feather
                name="user"
                size={16}
                color={focusedField === 'name' ? colors.textPrimary : colors.textTertiary}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                accessibilityLabel="Nombre completo"
                placeholder="Nombre completo"
                placeholderTextColor={colors.placeholder}
                value={profileName}
                onChangeText={setProfileName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Input: Área de trabajo */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.90)' : '#1E293B' }]}>
              Área de trabajo
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? colors.inputBg : (focusedField === 'area' ? '#FFFFFF' : '#F8FAFC'),
                  borderColor: focusedField === 'area'
                    ? (isDark ? '#FFFFFF' : '#0F172A')
                    : (isDark ? colors.inputBorder : '#CBD5E1'),
                  ...(focusedField === 'area' && Platform.select({
                    web: { boxShadow: isDark ? '0 0 0 2px rgba(255, 255, 255, 0.2)' : '0 0 0 3px rgba(15, 23, 42, 0.1)' } as any,
                  })),
                },
              ]}>
              <Feather
                name="briefcase"
                size={16}
                color={focusedField === 'area' ? colors.textPrimary : colors.textTertiary}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                accessibilityLabel="Área de trabajo"
                placeholder="Área de trabajo (ej. Sistemas, Soporte)"
                placeholderTextColor={colors.placeholder}
                value={profileArea}
                onChangeText={setProfileArea}
                onFocus={() => setFocusedField('area')}
                onBlur={() => setFocusedField(null)}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Rol asignado (con permisos completos indicados, sin texto de solo lectura) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: isDark ? 'rgba(255, 255, 255, 0.90)' : '#1E293B' }]}>
              Rol asignado
            </Text>
            <View
              style={[
                styles.readOnlyInputWrapper,
                {
                  backgroundColor: isDark ? colors.inputBg : '#F1F5F9',
                  borderColor: isDark ? colors.inputBorder : '#CBD5E1',
                },
              ]}>
              <View
                style={[
                  styles.roleFieldIconBox,
                  {
                    backgroundColor: accountRole === 'Administrador'
                      ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5')
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#EEF2FF'),
                  },
                ]}>
                <Feather
                  name="shield"
                  size={15}
                  color={accountRole === 'Administrador' ? '#10B981' : (isDark ? '#E2E8F0' : '#475569')}
                />
              </View>
              <Text style={[styles.readOnlyRoleText, { color: colors.textPrimary }]}>
                {accountRole || 'Administrador'}
              </Text>
              <View
                style={[
                  styles.roleScopeBadge,
                  {
                    backgroundColor: accountRole === 'Administrador'
                      ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5')
                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9'),
                    borderColor: accountRole === 'Administrador'
                      ? (isDark ? 'rgba(16, 185, 129, 0.35)' : '#059669')
                      : (isDark ? colors.cardBorder : '#CBD5E1'),
                  },
                ]}>
                <Text
                  style={[
                    styles.roleScopeBadgeText,
                    {
                      color: accountRole === 'Administrador'
                        ? (isDark ? '#34D399' : '#047857')
                        : (isDark ? '#E2E8F0' : '#334155'),
                    },
                  ]}>
                  {accountRole === 'Administrador' ? 'Control total' : 'Operativo'}
                </Text>
              </View>
            </View>
            <Text style={[styles.fieldHelpText, { color: colors.textTertiary }]}>
              {accountRole === 'Administrador'
                ? 'Tu cuenta tiene permisos totales de administración, gestión de usuarios e infraestructura.'
                : 'Permisos activos para la gestión de infraestructura y bitácora.'}
            </Text>
          </View>

          {/* Feedback */}
          {feedback ? (
            <View
              style={[
                styles.feedback,
                feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
              ]}>
              <Feather
                name={feedback.type === 'error' ? 'alert-circle' : 'check-circle'}
                size={15}
                color={feedback.type === 'error' ? '#EF4444' : '#10B981'}
              />
              <Text
                style={[
                  styles.feedbackText,
                  { color: feedback.type === 'error' ? '#EF4444' : (isDark ? '#34D399' : '#047857') },
                ]}>
                {feedback.text}
              </Text>
            </View>
          ) : null}

          {/* Botón Guardar */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={savingProfile}
            onPress={() => void handleSaveProfile()}
            style={[styles.primaryButtonTouchable, savingProfile && styles.disabledButton]}>
            <LinearGradient
              colors={primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}>
              {savingProfile ? (
                <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
              ) : (
                <Feather name="save" size={15} color={isDark ? '#000000' : '#FFFFFF'} />
              )}
              <Text style={[styles.primaryButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                {savingProfile ? 'Guardando...' : 'Guardar perfil'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Sección: Preferencias */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <View style={[styles.sectionHeading, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }]}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
                },
              ]}>
              <Feather name="sliders" size={17} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferencias</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Personaliza la apariencia de la aplicación.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.subItemCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                borderColor: isDark ? colors.cardBorder : '#E2E8F0',
              },
            ]}>
            <View
              style={[
                styles.securityIconBox,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : '#FDE68A',
                },
              ]}>
              <Feather name={isDark ? 'moon' : 'sun'} size={15} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Tema visual</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>
                {isDark ? 'Modo Oscuro' : 'Modo Claro'}
              </Text>
            </View>
            <ThemeToggle style={styles.accountThemeToggle} size={18} />
          </View>
        </View>

        {/* Sección: Seguridad */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <View style={[styles.sectionHeading, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }]}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                },
              ]}>
              <Feather name="lock" size={17} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Seguridad</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Método de acceso y credenciales.
              </Text>
            </View>
          </View>

          {/* Subtarjeta: Nivel de acceso */}
          <View
            style={[
              styles.subItemCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                borderColor: isDark ? colors.cardBorder : '#E2E8F0',
              },
            ]}>
            <View
              style={[
                styles.securityIconBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}>
              <Feather name="shield" size={14} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Nivel de acceso y permisos</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>
                {accountRole || 'Administrador'} (Control total)
              </Text>
            </View>
          </View>

          {/* Subtarjeta: Método de acceso */}
          <View
            style={[
              styles.subItemCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                borderColor: isDark ? colors.cardBorder : '#E2E8F0',
              },
            ]}>
            <View
              style={[
                styles.securityIconBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}>
              <Feather name="log-in" size={14} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Método de inicio de sesión</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>{providerLabel}</Text>
            </View>
          </View>

          {/* Subtarjeta: Correo de la cuenta */}
          <View
            style={[
              styles.subItemCard,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                borderColor: isDark ? colors.cardBorder : '#E2E8F0',
              },
            ]}>
            <View
              style={[
                styles.securityIconBox,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Feather name="mail" size={14} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </View>
            <View style={styles.securityCopy}>
              <Text style={[styles.securityLabel, { color: colors.textSecondary }]}>Correo de la cuenta</Text>
              <Text style={[styles.securityValue, { color: colors.textPrimary }]}>{user?.email || 'No disponible'}</Text>
            </View>
          </View>

          {/* Cambio de contraseña siempre disponible desde mi cuenta */}
          <View style={styles.passwordRecoveryContainer}>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {isExternalProvider
                ? `Tu sesión actual usa ${providerLabel}. Puedes establecer o cambiar una contraseña de acceso directo para tu correo electrónico.`
                : 'Puedes solicitar un código de verificación para cambiar o actualizar tu contraseña de acceso.'}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => setShowPasswordRecovery(true)}
              style={[
                styles.secondaryButton,
                {
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                },
              ]}>
              <Feather name="key" size={15} color={isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                Cambiar contraseña
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección: Acerca de */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              borderColor: isDark ? colors.cardBorder : '#CBD5E1',
            },
          ]}>
          <View style={[styles.sectionHeading, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' }]}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Feather name="info" size={17} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </View>
            <View style={styles.sectionHeadingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acerca de</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Información de Bitácora Digital.
              </Text>
            </View>
          </View>

          <Text style={[styles.aboutName, { color: colors.textPrimary }]}>Bitácora Digital</Text>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Sistema para registrar cambios, incidentes, infraestructura de red, usuarios y reportes administrativos.
          </Text>

          <View style={styles.aboutTags}>
            <View
              style={[
                styles.aboutTag,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Text style={[styles.aboutTagText, { color: isDark ? '#E2E8F0' : '#334155' }]}>v1.0.0</Text>
            </View>
            <View
              style={[
                styles.aboutTag,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Text style={[styles.aboutTagText, { color: isDark ? '#E2E8F0' : '#334155' }]}>Expo v57</Text>
            </View>
            <View
              style={[
                styles.aboutTag,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                  borderColor: isDark ? colors.cardBorder : '#CBD5E1',
                },
              ]}>
              <Text style={[styles.aboutTagText, { color: isDark ? '#E2E8F0' : '#334155' }]}>InsForge Cloud</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 120,
  },
  header: { marginBottom: 22 },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' } as any,
    }),
  },
  backButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11.5 },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' } as any,
    }),
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26, letterSpacing: -0.3 },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 540,
  },
  identityCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
      } as any,
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontFamily: 'Poppins_700Bold', fontSize: 22 },
  identityDetails: { flex: 1 },
  identityEyebrow: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  name: { fontFamily: 'Poppins_700Bold', fontSize: 17, letterSpacing: -0.2 },
  email: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  onlineIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
  },
  identityBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  authorizationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    borderWidth: 1.5,
  },
  authorizationNoticeText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 18,
  },
  sectionCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
      } as any,
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  sectionDescription: { fontFamily: 'Poppins_400Regular', fontSize: 11.5, marginTop: 1 },
  inputGroup: { marginTop: 14 },
  fieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 7 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  readOnlyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    ...Platform.select({
      web: { cursor: 'default' } as any,
    }),
  },
  roleFieldIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  readOnlyRoleText: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
  roleScopeBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  roleScopeBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10.5,
  },
  fieldHelpText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  inputLeadingIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    paddingVertical: 10,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1.5,
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  feedbackText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 11.5, lineHeight: 18 },
  primaryButtonTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)' } as any,
    }),
  },
  primaryButtonGradient: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  primaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  disabledButton: { opacity: 0.65 },
  subItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  accountThemeToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginBottom: 6 },
  aboutTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  aboutTag: {
    borderWidth: 1.5,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  aboutTagText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10.5 },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCopy: { flex: 1 },
  securityLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  securityValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginTop: 1 },
  passwordRecoveryContainer: { marginTop: 10 },
  noticeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11.5,
    lineHeight: 18,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 11,
    paddingHorizontal: 16,
    marginTop: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)' } as any,
    }),
  },
  secondaryButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
});
