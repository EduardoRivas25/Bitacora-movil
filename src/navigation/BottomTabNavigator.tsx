import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DeviceListScreen from '../screens/device/DeviceListScreen';
import NetworkListScreen from '../screens/network/NetworkListScreen';
import SearchScreen from '../screens/search/SearchScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Cálculos para que el círculo se mueva exactamente al centro de cada ícono
const TAB_MARGIN = 20;
const TAB_BAR_WIDTH = width - TAB_MARGIN * 2;
const TAB_COUNT = 4;
const TAB_WIDTH = TAB_BAR_WIDTH / TAB_COUNT;

function CustomTabBar({ state, descriptors, navigation }: any) {
  // Inicializamos el valor animado en el índice de la pantalla actual
  const animatedValue = useRef(new Animated.Value(state.index)).current;

  // Cada vez que cambias de pestaña, se dispara esta animación fluida
  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: state.index,
      tension: 15,  // Tensión baja = movimiento más lento y relajado
      friction: 6,  // Fricción ajustada para que el rebote sea suave (estilo líquido)
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  // Convertimos el índice (0, 1, 2, 3) en posición de píxeles (X)
  const indicatorPosition = animatedValue.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, TAB_WIDTH, TAB_WIDTH * 2, TAB_WIDTH * 3],
  });

  return (
    <View style={styles.tabBarContainer}>
      {/* Fondo de cristal oscuro */}
      <BlurView intensity={50} tint="dark" style={styles.blurBackground} />
      
      <View style={styles.contentContainer}>
        {/* Este es el círculo blanco que se desliza por detrás */}
        <Animated.View
          style={[
            styles.indicatorWrapper,
            { transform: [{ translateX: indicatorPosition }] }
          ]}
        >
          <View style={styles.circularIndicator} />
        </Animated.View>

        {/* Renderizamos los botones interactivos por encima del indicador */}
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Asignamos el ícono correspondiente según la pantalla
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'Inicio') iconName = 'home';
          else if (route.name === 'Dispositivos') iconName = 'cpu';
          else if (route.name === 'Redes') iconName = 'wifi';
          else if (route.name === 'Buscar') iconName = 'search';

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={1} // Evitamos el parpadeo nativo al tocar
              onPress={onPress}
              style={styles.tabItem}
            >
              <Feather 
                name={iconName} 
                size={22} 
                // Si el círculo blanco está detrás (isFocused), el ícono se vuelve negro
                color={isFocused ? '#000000' : 'rgba(255, 255, 255, 0.4)'} 
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Dispositivos" component={DeviceListScreen} />
      <Tab.Screen name="Redes" component={NetworkListScreen} />
      <Tab.Screen name="Buscar" component={SearchScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: TAB_MARGIN,
    right: TAB_MARGIN,
    height: 75,
    borderRadius: 38,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  blurBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 38,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2, // Asegura que los íconos estén por encima del círculo
  },
  indicatorWrapper: {
    position: 'absolute',
    height: '100%',
    width: TAB_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circularIndicator: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
});