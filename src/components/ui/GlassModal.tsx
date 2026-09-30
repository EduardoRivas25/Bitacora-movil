import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  useWindowDimensions 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function GlassModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: GlassModalProps) {
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const isTablet = width >= 768;
  const isSmallMobile = width < 380;
  const modalWidth = isTablet ? 560 : isSmallMobile ? '96%' : '92%';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        {/* Fondo clickeable para cerrar */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.modalWrapper, 
            { 
              width: modalWidth, 
              maxWidth: 580, 
              maxHeight: height * 0.88,
              backgroundColor: colors.modalBg,
              borderColor: colors.cardBorder,
            }
          ]}
        >
          <BlurView intensity={isDark ? 70 : 80} tint={colors.blurTint} style={styles.modalContent}>
            {/* Header fijo */}
            <View style={[styles.header, { borderColor: colors.divider }, isSmallMobile && { paddingHorizontal: 16, paddingTop: 18 }]}>
              <View style={styles.headerTitles}>
                <Text style={[styles.title, { color: colors.textPrimary }, isSmallMobile && { fontSize: 18 }]}>{title}</Text>
                {subtitle && <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.chipBg }]} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView 
              style={[styles.scrollView, isSmallMobile && { paddingHorizontal: 16 }]}
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {children}
            </ScrollView>
          </BlurView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalWrapper: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  modalContent: {
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    paddingHorizontal: 22,
    paddingTop: 16,
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollBody: {
    paddingBottom: 28,
  },
});
