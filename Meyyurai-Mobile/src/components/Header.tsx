import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Shield, Globe } from 'lucide-react-native';
import { useI18n, LANGUAGES, Lang } from '../lib/i18n';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLangPicker?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Meyyurai',
  subtitle = 'Safety, Rights & Guidance',
  showLangPicker = true,
}) => {
  const { lang, setLang } = useI18n();

  const cycleLanguage = () => {
    const currentIndex = LANGUAGES.findIndex((l) => l.code === lang);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    setLang(LANGUAGES[nextIndex].code as Lang);
  };

  const currentNative = LANGUAGES.find((l) => l.code === lang)?.native || 'English';

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.background }}>
      <View style={styles.container}>
        <View style={styles.leftRow}>
          <View style={styles.iconContainer}>
            <Shield size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {showLangPicker && (
          <TouchableOpacity style={styles.langButton} onPress={cycleLanguage} activeOpacity={0.7}>
            <Globe size={14} color={Colors.primary} />
            <Text style={styles.langText}>{currentNative}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 6,
  },
});

