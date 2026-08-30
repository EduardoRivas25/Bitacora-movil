import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated, Platform, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DeviceListScreen from '../screens/device/DeviceListScreen';
import NetworkListScreen from '../screens/network/NetworkListScreen';
import MapScreen from '../screens/map/MapScreen';
import IncidentScreen from '../screens/incident/IncidentScreen';
import ConfigScreen from '../screens/config/ConfigScreen';
import SearchScreen from '../screens/search/SearchScreen';

const Tab = createBottomTabNavigator();

const TAB_COUNT = 7;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { width } = useWindowDimensions();
  // Ancho responsivo centrado: en móvil toma el ancho disponible con margen, en escritorio se expande hasta 580px
  const effectiveWidth = Math.min(width - 20, 580);
  const TAB_WIDTH = effectiveWidth / TAB_COUNT;

  // Inicializamos el valor animado en el índice de la pantalla actual
  const animatedValue = useRef(new Animated.Value(state.index)).current;

  // Cada vez que cambias de pestaña, se dispara la animación hacia la posición exacta
  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: state.index,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  // Convertimos el índice (0..6) en posición de píxeles (X) exacta
  const indicatorPosition = animatedValue.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, TAB_WIDTH, TAB_WIDTH * 2, TAB_WIDTH * 3, TAB_WIDTH * 4, TAB_WIDTH * 5, TAB_WIDTH * 6],
  });

  return (
    <View style={[styles.tabBarContainer, { width: effectiveWidth, left: (width - effectiveWidth) / 2 }]}>
      {/* Fondo de cristal oscuro */}
      <BlurView intensity={50} tint="dark" style={styles.blurBackground} />
      
      <View style={styles.contentContainer}>
        {/* Círculo blanco animado exactamente centrado */}
        <Animated.View
          style={[
            styles.indicatorWrapper,
            { width: TAB_WIDTH, transform: [{ translateX: indicatorPosition }] }
          ]}
        >
          <View style={styles.circularIndicator} />
        </Animated.View>

        {/* Botones interactivos */}
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

          // Íconos según la pantalla
          let iconName: keyof typeof Feather.glyphMap = 'home';
          if (route.name === 'Inicio') iconName = 'home';
          else if (route.name === 'Dispositivos') iconName = 'cpu';
          else if (route.name === 'Redes') iconName = 'wifi';
          else if (route.name === 'Mapa') iconName = 'map-pin';
          else if (route.name === 'Incidentes') iconName = 'alert-triangle';
          else if (route.name === 'Configuraciones') iconName = 'terminal';
          else if (route.name === 'Buscar') iconName = 'search';

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={1}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Feather 
                name={iconName} 
                size={19} 
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
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Incidentes" component={IncidentScreen} />
      <Tab.Screen name="Configuraciones" component={ConfigScreen} />
      <Tab.Screen name="Buscar" component={SearchScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  blurBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    zIndex: 2,
  },
  indicatorWrapper: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circularIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
});