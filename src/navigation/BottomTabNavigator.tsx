import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, type BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MapScreen from '../screens/map/MapScreen';
import ConfigScreen from '../screens/config/ConfigScreen';
import AccountScreen from '../screens/account/AccountScreen';
import SearchScreen from '../screens/search/SearchScreen';
import PortInventoryRouteScreen from '../screens/ports/PortInventoryRouteScreen';
import { ControlCenterNavigator, InfrastructureNavigator } from './GroupedTabNavigators';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();
const LOGO_DARK = require('../../assets/logobitacoraredes.png');
const LOGO_LIGHT = require('../../assets/logobitacoraredesmodoclaro.png');

const visibleItems = [
  { route: 'Inicio', label: 'Inicio', icon: 'home' },
  { route: 'Infraestructura', label: 'Infraestructura', icon: 'server' },
  { route: 'Mapa', label: 'Mapa', icon: 'map-pin' },
  { route: 'CentroControl', label: 'Centro de control', icon: 'activity' },
  { route: 'Configuraciones', label: 'Configuraciones de equipos', icon: 'terminal' },
  { route: 'Buscar', label: 'Buscar', icon: 'search' },
] as const;

function AccountIdentityHeader({ navigation }: BottomTabHeaderProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const accountName = user?.profile?.name?.trim() || user?.email?.split('@')[0] || 'Mi cuenta';

  return (
    <View style={[styles.identityHeader, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
      <View style={styles.identityContent}>
        <View style={styles.brandIdentity}>
          <Image source={isDark ? LOGO_DARK : LOGO_LIGHT} style={styles.brandLogo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>Bitácora Digital</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Abrir mi cuenta, ${accountName}`}
          onPress={() => navigation.navigate('Cuenta')}
          style={[
            styles.accountBubble,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#D8D8D8',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : '#7A7A7A',
            },
          ]}>
          <Text style={[styles.accountInitial, { color: isDark ? '#FFFFFF' : '#171717' }]}>
            {accountName.slice(0, 1).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const isSmallMobile = width < 380;
  const horizontalMargin = isSmallMobile ? 12 : 20;
  const effectiveWidth = Math.min(width - horizontalMargin, 620);
  const itemWidth = effectiveWidth / visibleItems.length;
  const indicatorSize = Math.min(42, Math.max(32, itemWidth - 6));
  const iconSize = itemWidth < 45 ? 16 : 19;
  const bottomInset = Platform.OS === 'ios' ? insets.bottom + 8 : 18;
  const currentRoute = state.routes[state.index]?.name;
  const selectedVisibleIndex = visibleItems.findIndex(item =>
    item.route === currentRoute || (currentRoute === 'InventarioPuertos' && item.route === 'Infraestructura'),
  );
  const indicatorValue = useRef(new Animated.Value(Math.max(0, selectedVisibleIndex))).current;

  useEffect(() => {
    if (selectedVisibleIndex >= 0) {
      Animated.spring(indicatorValue, {
        toValue: selectedVisibleIndex,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedVisibleIndex]);

  const indicatorPosition = indicatorValue.interpolate({
    inputRange: visibleItems.map((_, index) => index),
    outputRange: visibleItems.map((_, index) => itemWidth * index),
  });

  return (
    <View
      style={[
        styles.tabBarContainer,
        { width: effectiveWidth, left: (width - effectiveWidth) / 2, bottom: bottomInset },
      ]}>
      <BlurView
        intensity={isDark ? 50 : 70}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurBackground,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(232, 232, 232, 0.70)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(80, 80, 80, 0.38)',
          },
        ]}
      />
      <View style={styles.contentContainer}>
        {selectedVisibleIndex >= 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicatorWrapper,
              { width: itemWidth, transform: [{ translateX: indicatorPosition }] },
            ]}>
            <View
              style={[
                styles.circularIndicator,
                {
                  width: indicatorSize,
                  height: indicatorSize,
                  borderRadius: indicatorSize / 2,
                  backgroundColor: isDark ? '#FFFFFF' : '#D2D2D2',
                  shadowColor: isDark ? '#FFFFFF' : '#000000',
                },
              ]}
            />
          </Animated.View>
        )}

        {visibleItems.map(item => {
          const route = state.routes.find((entry: any) => entry.name === item.route);
          const options = route ? descriptors[route.key]?.options : undefined;
          const isFocused = currentRoute === item.route;
          return (
            <TouchableOpacity
              key={item.route}
              activeOpacity={0.75}
              onPress={() => {
                if (!route) return;
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(item.route);
              }}
              accessibilityRole="tab"
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? item.label}
              accessibilityState={{ selected: isFocused }}
              style={styles.tabItem}>
              <Feather
                name={item.icon as keyof typeof Feather.glyphMap}
                size={iconSize}
                color={isFocused ? (isDark ? '#000000' : '#171717') : 'rgba(95, 95, 95, 0.8)'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function BottomTabNavigator() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        header: (props) => <AccountIdentityHeader {...props} />,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.cardBg },
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Infraestructura" component={InfrastructureNavigator} />
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="CentroControl" component={ControlCenterNavigator} />
      <Tab.Screen name="Configuraciones" component={ConfigScreen} />
      <Tab.Screen name="Buscar" component={SearchScreen} />
      <Tab.Screen name="InventarioPuertos" component={PortInventoryRouteScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Cuenta" component={AccountScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  identityHeader: {
    width: '100%',
    height: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  identityContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 32, height: 32 },
  brandName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },
  accountBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  accountInitial: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },
  tabBarContainer: {
    position: 'absolute',
    height: 68,
    borderRadius: 34,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  blurBackground: {
    ...StyleSheet.absoluteFill,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
});
