import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { FontSize, FontWeight } from '../theme/spacing';
import type { BottomTabParamList } from '../types';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import NetworkListScreen from '../screens/network/NetworkListScreen';
import DeviceListScreen from '../screens/device/DeviceListScreen';
import SearchScreen from '../screens/search/SearchScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Redes"
        component={NetworkListScreen}
        options={{
          tabBarLabel: 'Redes',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'git-network' : 'git-network-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Inventario"
        component={DeviceListScreen}
        options={{
          tabBarLabel: 'Inventario',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'hardware-chip' : 'hardware-chip-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Buscar"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Buscar',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'search' : 'search-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 0.5,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    elevation: 0,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  tabItem: {
    gap: 2,
  },
  activeIconContainer: {
    // Glow sutil detrás del ícono activo
  },
});
