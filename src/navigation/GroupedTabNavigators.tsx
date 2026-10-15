import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import DeviceListScreen from '../screens/device/DeviceListScreen';
import NetworkListScreen from '../screens/network/NetworkListScreen';
import IncidentScreen from '../screens/incident/IncidentScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import SearchScreen from '../screens/search/SearchScreen';

const Tab = createBottomTabNavigator();
const sectionIcons: Record<string, keyof typeof Feather.glyphMap> = {
  InventarioDispositivos: 'cpu',
  RedesInternas: 'wifi',
  SeguimientoIncidentes: 'alert-triangle',
  ReportesInternos: 'file-text',
  DocumentosInternos: 'folder',
};

function SectionTabBar({ state, descriptors, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 380;

  return (
    <View style={[
      styles.sectionBar,
      isSmallMobile && styles.sectionBarSmall,
      { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
    ]}>
      {state.routes.map((route: any, index: number) => {
        const options = descriptors[route.key]?.options;
        const focused = state.index === index;
        const icon = sectionIcons[route.name];
        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? options?.title}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={[
              styles.sectionTab,
              isSmallMobile && styles.sectionTabSmall,
              focused && {
                backgroundColor: isDark ? '#FFFFFF' : '#111827',
                shadowColor: isDark ? '#FFFFFF' : '#000000',
              },
            ]}>
            {icon ? <Feather name={icon} size={isSmallMobile ? 13 : 14} color={focused ? (isDark ? '#111827' : '#FFFFFF') : colors.textSecondary} /> : null}
            <Text style={[
              styles.sectionTabText,
              isSmallMobile && styles.sectionTabTextSmall,
              { color: focused ? (isDark ? '#111827' : '#FFFFFF') : colors.textSecondary },
            ]} numberOfLines={1}>
              {options?.title ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function InfrastructureNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <SectionTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true, tabBarPosition: 'top' }}>
      <Tab.Screen
        name="InventarioDispositivos"
        component={DeviceListScreen}
        options={{ title: 'Dispositivos' }}
      />
      <Tab.Screen
        name="RedesInternas"
        component={NetworkListScreen}
        options={{ title: 'Redes' }}
      />
    </Tab.Navigator>
  );
}

export function ControlCenterNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <SectionTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true, tabBarPosition: 'top' }}>
      <Tab.Screen
        name="SeguimientoIncidentes"
        component={IncidentScreen}
        options={{ title: 'Incidentes', tabBarAccessibilityLabel: 'Incidentes y seguimiento' }}
      />
      <Tab.Screen
        name="ReportesInternos"
        component={ReportsScreen}
        options={{ title: 'Reportes' }}
      />
      <Tab.Screen
        name="DocumentosInternos"
        options={{ title: 'Documentos' }}>
        {() => <SearchScreen documentsOnly />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  sectionBar: {
    width: '100%',
    maxWidth: 660,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    marginBottom: 0,
    padding: 4,
    borderWidth: 1,
    borderRadius: 15,
  },
  sectionBarSmall: {
    gap: 3,
    marginTop: 8,
    padding: 3,
  },
  sectionTab: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 11,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTabText: {
    flexShrink: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  sectionTabSmall: {
    minHeight: 38,
    gap: 4,
    paddingHorizontal: 3,
  },
  sectionTabTextSmall: {
    fontSize: 9.5,
  },
});
