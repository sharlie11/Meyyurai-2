import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import {
  User,
  Phone,
  Shield,
  Globe,
  Plus,
  Trash2,
  LogOut,
  CheckCircle,
  KeyRound,
} from 'lucide-react-native';
import { useI18n, LANGUAGES, Lang } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export const ProfileScreen = ({ navigation }: any) => {
  const { lang, setLang, t } = useI18n();
  const [contacts, setContacts] = useState<string[]>([
    '+91 98765 43210 (Parent / Guardian)',
    '+91 91234 56789 (Emergency Contact)',
  ]);
  const [newContact, setNewContact] = useState('');
  const [safetyPin, setSafetyPin] = useState('1234');

  const addContact = () => {
    if (!newContact.trim()) return;
    setContacts([...contacts, newContact.trim()]);
    setNewContact('');
    Alert.alert('Contact Added', 'Emergency contact successfully saved.');
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigation.replace('Auth');
  };

  return (
    <View style={styles.container}>
      <Header title="Profile & Safety" subtitle="Emergency contacts & security settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* USER PROFILE CARD */}
        <View style={styles.userCard}>
          <View style={styles.avatarBg}>
            <User size={32} color={Colors.accentGold} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.userName}>Meyyurai Protected User</Text>
            <Text style={styles.userSub}>Verified Profile • Active Emergency Safety PIN</Text>
          </View>
        </View>

        {/* PREFERRED LANGUAGE */}
        <Text style={styles.sectionHeader}>{t('profile.section.language')}</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.langChip, lang === l.code && styles.langChipActive]}
              onPress={() => setLang(l.code as Lang)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langNative, lang === l.code && styles.langNativeActive]}>
                {l.native}
              </Text>
              <Text style={styles.langLabel}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* EMERGENCY CONTACTS */}
        <Text style={styles.sectionHeader}>{t('profile.section.contacts')}</Text>
        <View style={styles.card}>
          {contacts.map((c, idx) => (
            <View key={idx} style={styles.contactRow}>
              <Phone size={16} color={Colors.primaryLight} />
              <Text style={styles.contactText}>{c}</Text>
              <TouchableOpacity onPress={() => removeContact(idx)}>
                <Trash2 size={16} color={Colors.sosRed} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addContactRow}>
            <TextInput
              style={styles.addInput}
              placeholder="Enter phone number (+91...)"
              placeholderTextColor={Colors.textDim}
              value={newContact}
              onChangeText={setNewContact}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.addButton} onPress={addContact}>
              <Plus size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SAFETY PIN SETTINGS */}
        <Text style={styles.sectionHeader}>SAFETY PIN & SECURITY</Text>
        <View style={styles.card}>
          <View style={styles.pinRow}>
            <KeyRound size={20} color={Colors.accentGold} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.pinTitle}>Emergency Cancellation PIN</Text>
              <Text style={styles.pinSub}>PIN used to disarm false SOS alerts</Text>
            </View>
            <Text style={styles.pinValue}>****</Text>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={Colors.sosRed} />
          <Text style={styles.logoutText}>{t('profile.logout')}</Text>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentGold,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 10,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  langChip: {
    width: '31%',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  langNative: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  langNativeActive: {
    color: '#FFFFFF',
  },
  langLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBg,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 10,
  },
  addContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    marginRight: 8,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pinSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pinValue: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.accentGold,
    letterSpacing: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.sosRed,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.sosRed,
    marginLeft: 8,
  },
});
