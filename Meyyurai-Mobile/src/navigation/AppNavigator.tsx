import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '../screens/HomeScreen';
import { RightsScreen } from '../screens/RightsScreen';
import { AIScreen } from '../screens/AIScreen';
import { ResourcesScreen } from '../screens/ResourcesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';

import { Colors } from '../theme/colors';
import { AlertTriangle, Sparkles, Scale, BookOpen, User } from 'lucide-react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 14,
          right: 14,
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Emergency"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Emergency',
          tabBarIcon: ({ color, size }) => <AlertTriangle size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIScreen}
        options={{
          tabBarLabel: 'Meyyurai AI',
          tabBarIcon: ({ color, size }) => <Sparkles size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Rights"
        component={RightsScreen}
        options={{
          tabBarLabel: 'Rights',
          tabBarIcon: ({ color, size }) => <Scale size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{
          tabBarLabel: 'Resources',
          tabBarIcon: ({ color, size }) => <BookOpen size={20} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={20} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
