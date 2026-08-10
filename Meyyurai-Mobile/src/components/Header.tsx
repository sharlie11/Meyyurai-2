import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.iconContainer}>
          <Shield size={24} color={Colors.accentGold} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      {showLangPicker && (
        <TouchableOpacity style={styles.langButton} onPress={cycleLanguage} activeOpacity={0.7}>
          <Globe size={16} color={Colors.primaryLight} />
          <Text style={styles.langText}>{currentNative}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  langText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 6,
  },
});
