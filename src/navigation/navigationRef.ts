import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../types';

/**
 * Referencia global al contenedor de navegación.
 * El onboarding la usa para abrir detrás del tutorial la sección que explica,
 * y así el usuario ve la pantalla real mientras lee la explicación.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Lleva la app a la sección indicada de la barra inferior (navegación anidada
 * Stack -> Tab) para que la pantalla real quede detrás del tutorial.
 * Devuelve false si el contenedor aún no está listo (se puede reintentar).
 */
export function navigateToSection(section: string): boolean {
  if (!navigationRef.isReady()) return false;
  try {
    navigationRef.dispatch(CommonActions.navigate({ name: 'Main', params: { screen: section } }));
    return true;
  } catch (error) {
    // Navegar es un extra del tutorial: si falla, el onboarding sigue funcionando.
    console.warn(`No se pudo abrir la sección "${section}" durante el tutorial`, error);
    return true;
  }
}
