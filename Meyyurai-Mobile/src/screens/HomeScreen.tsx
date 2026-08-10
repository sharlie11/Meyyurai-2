import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import {
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  Scale,
  Bot,
  UserCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../lib/i18n';
import { HELPLINES } from '../lib/resources-data';

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const [sosActive, setSosActive] = useState(false);

  const handleSOS = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Fallback if haptics unavailable
    }
    setSosActive(true);

    Alert.alert(
      '🚨 EMERGENCY SOS ACTIVATED',
      'Do you want to dial Emergency Response 112 now?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSosActive(false),
        },
        {
          text: 'CALL 112 NOW',
          style: 'destructive',
          onPress: () => {
            setSosActive(false);
            Linking.openURL('tel:112');
          },
        },
      ]
    );
  };

  const handleCallNumber = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* EMERGENCY SOS BANNER */}
        <View style={styles.sosCard}>
          <TouchableOpacity
            style={[styles.sosButton, sosActive && styles.sosButtonActive]}
            onPress={handleSOS}
            activeOpacity={0.8}
          >
            <AlertTriangle size={36} color="#FFFFFF" />
            <Text style={styles.sosButtonText}>SOS EMERGENCY</Text>
            <Text style={styles.sosSubtext}>Tap to Trigger Immediate Alert & Call 112</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTION GRID */}
        <Text style={styles.sectionHeader}>QUICK SERVICES</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Rights')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: '#064E3B' }]}>
              <Scale size={24} color={Colors.primaryLight} />
            </View>
            <Text style={styles.cardTitle}>{t('nav.rights')}</Text>
            <Text style={styles.cardDesc}>Know legal laws & rights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('AI')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: '#312E81' }]}>
              <Bot size={24} color="#818CF8" />
            </View>
            <Text style={styles.cardTitle}>{t('nav.ai')}</Text>
            <Text style={styles.cardDesc}>Instant legal chat guidance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Resources')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: '#78350F' }]}>
              <PhoneCall size={24} color={Colors.accentGold} />
            </View>
            <Text style={styles.cardTitle}>{t('nav.resources')}</Text>
            <Text style={styles.cardDesc}>24x7 Helplines & Centers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBg, { backgroundColor: '#1F2937' }]}>
              <UserCheck size={24} color="#9CA3AF" />
            </View>
            <Text style={styles.cardTitle}>{t('nav.profile')}</Text>
            <Text style={styles.cardDesc}>Emergency Contacts & PIN</Text>
          </TouchableOpacity>
        </View>

        {/* EMERGENCY HELPLINES QUICK LIST */}
        <View style={styles.helplinesHeader}>
          <Text style={styles.sectionHeader}>DIRECT EMERGENCY HELPLINES</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Resources')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {HELPLINES.slice(0, 4).map((h) => (
          <TouchableOpacity
            key={h.id}
            style={styles.helplineCard}
            onPress={() => handleCallNumber(h.number)}
            activeOpacity={0.7}
          >
            <View style={styles.helplineLeft}>
              <View style={styles.helplineIconBg}>
                <ShieldAlert size={20} color={Colors.accentGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helplineName}>{h.name}</Text>
                <Text style={styles.helplineHours}>{h.availableHours}</Text>
              </View>
            </View>

            <View style={styles.callBadge}>
              <PhoneCall size={14} color="#FFFFFF" />
              <Text style={styles.callBadgeText}>{h.number}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* AI BANNER FOOTER */}
        <TouchableOpacity
          style={styles.aiBanner}
          onPress={() => navigation.navigate('AI')}
          activeOpacity={0.8}
        >
          <View style={styles.aiBannerLeft}>
            <Sparkles size={24} color={Colors.accentGold} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.aiBannerTitle}>Have a Legal Question?</Text>
              <Text style={styles.aiBannerSub}>Ask Meyyurai AI for immediate plain-language advice</Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sosCard: {
    marginBottom: 20,
  },
  sosButton: {
    backgroundColor: Colors.sosRed,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.sosRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  sosButtonActive: {
    backgroundColor: Colors.sosRedDark,
  },
  sosButtonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
    letterSpacing: 1,
  },
  sosSubtext: {
    fontSize: 12,
    color: '#FEE2E2',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  helplinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryLight,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helplineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  helplineIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  helplineName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  helplineHours: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  callBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardHover,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primaryDark,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  aiBannerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
