import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { validateEmail, validatePassword } from '../../utils/validators';
import { exchangePasswordResetCode, resetPasswordWithToken, sendPasswordResetEmail } from '../../services/auth';

type Step = 'email' | 'code' | 'password' | 'done';

export default function PasswordRecoveryScreen({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const sendCode = async () => {
    const validation = validateEmail(email);
    if (!validation.valid) { setError(validation.error || 'Ingresa un correo válido.'); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordResetEmail(validation.formatted!);
      setEmail(validation.formatted!);
      setCode('');
      setStep('code');
      setNotice('Si existe una cuenta con ese correo, recibirás un código de recuperación. Revisa también spam.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo solicitar el correo de recuperación.');
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) { setError('Introduce el código de seis dígitos enviado a tu correo.'); return; }
    setBusy(true);
    setError('');
    try {
      const token = await exchangePasswordResetCode(email, code);
      setResetToken(token);
      setStep('password');
      setNotice('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo verificar el código.');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    const validation = validatePassword(password, 6);
    if (!validation.valid) { setError(validation.error || 'Ingresa una contraseña válida.'); return; }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    setError('');
    try {
      await resetPasswordWithToken(resetToken, password);
      setResetToken('');
      setCode('');
      setPassword('');
      setConfirmation('');
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar la contraseña. Solicita un código nuevo si expiró.');
    } finally {
      setBusy(false);
    }
  };

  const title = step === 'done' ? 'Contraseña actualizada' : 'Recuperar contraseña';
  const description = step === 'email'
    ? 'Escribe el correo de tu cuenta y te enviaremos un código para cambiar tu contraseña.'
    : step === 'code'
      ? `Introduce el código enviado a ${email}.`
      : step === 'password'
        ? 'Elige una contraseña nueva para tu cuenta.'
        : 'Ya puedes iniciar sesión con tu contraseña nueva.';
  const action = step === 'email' ? sendCode : step === 'code' ? checkCode : step === 'password' ? changePassword : onBack;
  const actionLabel = step === 'email' ? 'Enviar código' : step === 'code' ? 'Verificar código' : step === 'password' ? 'Cambiar contraseña' : 'Volver al inicio de sesión';

  return (
    <LinearGradient colors={colors.gradient} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { width: Math.min(width - 32, 440), backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <View style={[styles.icon, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Feather name={step === 'done' ? 'check' : 'lock'} size={28} color={colors.text} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

          {notice ? <Text style={[styles.notice, { color: colors.textSecondary }]}>{notice}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          {step === 'email' && <TextInput
            accessibilityLabel="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="correo@dominio.com"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={email}
            onChangeText={(value) => { setEmail(value); setError(''); }}
            onSubmitEditing={sendCode}
          />}

          {step === 'code' && <TextInput
            accessibilityLabel="Código de recuperación"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            value={code}
            onChangeText={(value) => { setCode(value); setError(''); }}
            onSubmitEditing={checkCode}
          />}

          {step === 'password' && <>
            <TextInput
              accessibilityLabel="Nueva contraseña"
              autoComplete="new-password"
              secureTextEntry
              placeholder="Nueva contraseña (mínimo 6 caracteres)"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={password}
              onChangeText={(value) => { setPassword(value); setError(''); }}
            />
            <TextInput
              accessibilityLabel="Confirmar nueva contraseña"
              autoComplete="new-password"
              secureTextEntry
              placeholder="Confirmar nueva contraseña"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={confirmation}
              onChangeText={(value) => { setConfirmation(value); setError(''); }}
            />
          </>}

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonBg, opacity: busy ? 0.6 : 1 }]} disabled={busy} onPress={action}>
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>{busy ? 'Espera...' : actionLabel}</Text>
          </TouchableOpacity>

          {step === 'code' && <View style={styles.links}>
            <TouchableOpacity disabled={busy} onPress={sendCode}><Text style={[styles.link, { color: colors.text }]}>Reenviar código</Text></TouchableOpacity>
            <TouchableOpacity disabled={busy} onPress={() => { setStep('email'); setError(''); setNotice(''); }}><Text style={[styles.link, { color: colors.text }]}>Cambiar correo</Text></TouchableOpacity>
          </View>}
          {step === 'password' && <TouchableOpacity disabled={busy} onPress={() => { setStep('code'); setResetToken(''); setError(''); }}><Text style={[styles.link, { color: colors.text }]}>Usar otro código</Text></TouchableOpacity>}
          {step !== 'done' && <TouchableOpacity disabled={busy} onPress={onBack}><Text style={[styles.back, { color: colors.textSecondary }]}>Volver a iniciar sesión</Text></TouchableOpacity>}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  card: { borderWidth: 1, borderRadius: 30, padding: 28, alignItems: 'stretch' },
  icon: { width: 64, height: 64, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 25, lineHeight: 34, textAlign: 'center', marginBottom: 10 },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  notice: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 16, textAlign: 'center' },
  error: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: '#FF453A', marginBottom: 16 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, borderWidth: 1, borderRadius: 16, padding: 17, marginBottom: 14, ...Platform.select({ web: { outlineStyle: 'none' } }) as any },
  button: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  links: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  link: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, textAlign: 'center', marginTop: 20 },
  back: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 26 },
});
