import { Alert, Platform } from 'react-native';

export function confirmDestructiveAction(title: string, message: string, actionLabel = 'Eliminar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.confirm !== 'function') {
      console.error('El navegador no permite mostrar la confirmación de eliminación.');
      return Promise.resolve(false);
    }
    return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
  }

  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: actionLabel, style: 'destructive', onPress: () => resolve(true) },
    ], {
      cancelable: true,
      onDismiss: () => resolve(false),
    });
  });
}

export function showUserNotice(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof globalThis.alert !== 'function') {
      console.error(`${title}: ${message}`);
      return;
    }
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
