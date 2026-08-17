import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
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
  RefreshCw,
} from 'lucide-react-native';
import { useI18n, LANGUAGES, Lang } from '../lib/i18n';
import { supabase } from '../lib/supabase';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  is_primary?: boolean;
}

export const ProfileScreen = ({ navigation }: any) => {
  const { lang, setLang, t } = useI18n();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmergencyContacts();
  }, []);

  const fetchEmergencyContacts = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const user = sessionData?.session?.user;

      if (!user || !token) {
        setContacts([]);
        return;
      }

      // Hit REST API /api/contacts (triggers select_emergency_contacts RPC with pgcrypto decryption)
      const backendHost = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/contacts';
      const contactsEndpoint = backendHost.includes('/api/')
        ? backendHost.replace(/\/api\/(ai\/chat|sos)\/?$/, '/api/contacts')
        : 'http://localhost:8080/api/contacts';

      const res = await fetch(contactsEndpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const list: EmergencyContact[] = (data.emergency_contacts || []).map((c: any) => ({
          id: c.id,
          name: c.name || 'Emergency Contact',
          phone: c.phone || '',
          relationship: c.relationship,
          is_primary: c.is_primary,
        }));
        setContacts(list);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Failed to load contacts:', errData.error);
      }
    } catch (err) {
      console.warn('Error fetching emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!contactPhone.trim()) {
      Alert.alert('Missing Number', 'Please enter a phone number (+91...)');
      return;
    }

    const name = contactName.trim() || 'Emergency Contact';
    const phone = contactPhone.trim();

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        Alert.alert('Authentication Error', 'Please sign in to save emergency contacts.');
        return;
      }

      // Hit REST API POST /api/contacts (triggers insert_emergency_contact RPC with pgcrypto encryption)
      const backendHost = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/contacts';
      const contactsEndpoint = backendHost.includes('/api/')
        ? backendHost.replace(/\/api\/(ai\/chat|sos)\/?$/, '/api/contacts')
        : 'http://localhost:8080/api/contacts';

      const res = await fetch(contactsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'emergency',
          name,
          phone,
          relationship: 'Family/Friend',
          priority_order: contacts.length + 1,
          is_primary: contacts.length === 0,
        }),
      });

      if (res.ok || res.status === 210) {
        setContactName('');
        setContactPhone('');
        Alert.alert('Contact Added', 'Emergency contact successfully saved with pgcrypto encryption.');
        fetchEmergencyContacts();
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Save Error', errData.error || 'Failed to save emergency contact.');
      }
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save emergency contact.');
    } finally {
      setSubmitting(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) return;

      // Hit REST API DELETE /api/contacts/:id
      const backendHost = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/contacts';
      const deleteEndpoint = `${backendHost.replace(/\/api\/(ai\/chat|sos)\/?$/, '/api/contacts')}/${id}`;

      const res = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        Alert.alert('Contact Removed', 'Emergency contact deleted.');
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert('Delete Error', errData.error || 'Failed to delete contact.');
      }
    } catch (err: any) {
      Alert.alert('Delete Error', err.message || 'Failed to delete contact.');
    }
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
            <Text style={styles.userSub}>Verified Profile • Encrypted Contact Storage Active</Text>
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
        <View style={styles.contactHeaderRow}>
          <Text style={styles.sectionHeader}>{t('profile.section.contacts')}</Text>
          <TouchableOpacity onPress={fetchEmergencyContacts} disabled={loading}>
            <RefreshCw size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : contacts.length === 0 ? (
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 10, fontStyle: 'italic' }}>
              No emergency contacts added yet. Enter contact details below to link with SOS dispatch.
            </Text>
          ) : (
            contacts.map((c) => (
              <View key={c.id} style={styles.contactRow}>
                <Phone size={16} color={Colors.primaryLight} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactText}>{c.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => removeContact(c.id)}>
                  <Trash2 size={16} color={Colors.sosRed} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={styles.addSectionTitle}>ADD NEW EMERGENCY CONTACT</Text>
          <View style={styles.addInputsColumn}>
            <TextInput
              style={styles.addInput}
              placeholder="Contact Name (e.g. Father, Sister)"
              placeholderTextColor={Colors.textDim}
              value={contactName}
              onChangeText={setContactName}
            />
            <View style={styles.addContactRow}>
              <TextInput
                style={[styles.addInput, { flex: 1, marginRight: 8 }]}
                placeholder="Phone (+91 9876543210)"
                placeholderTextColor={Colors.textDim}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={addContact}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Plus size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
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
    paddingBottom: 90,
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
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  addSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  addInputsColumn: {
    width: '100%',
  },
  addInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    marginBottom: 8,
  },
  addContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
