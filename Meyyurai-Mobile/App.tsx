import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { I18nProvider } from './src/lib/i18n';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" backgroundColor="#091E1C" />
        <AppNavigator />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
