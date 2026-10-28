import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Header } from '../components/Header';
import {
  AlertTriangle,
  PhoneCall,
  Shield,
  Heart,
  Users,
  CheckCircle,
  XCircle,
  Bell,
  MapPin,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import {
  startLiveTransitSharing,
  stopLiveTransitSharing,
  checkSessionExpiration,
  STORAGE_KEYS,
} from '../lib/backgroundTracking';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DispatchAlert {
  contact_name: string;
  phone_notified: string;
  status: 'dispatched' | 'failed' | 'failed_no_phone';
}

export const HomeScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosAlerts, setSosAlerts] = useState<DispatchAlert[]>([]);
  const [sosStatusMessage, setSosStatusMessage] = useState<string | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);
  const [locationSummary, setLocationSummary] = useState<string | null>(null);

  // Live Transit Sharing State
  const [trackingStatus, setTrackingStatus] = useState<'INACTIVE' | 'BACKGROUND' | 'FOREGROUND_ONLY'>('INACTIVE');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Check active session status on screen mount
  React.useEffect(() => {
    async function initTrackingState() {
      const isExpired = await checkSessionExpiration();
      if (!isExpired) {
        const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
        if (sessionId) {
          const bgPerm = await Location.getBackgroundPermissionsAsync();
          setTrackingStatus(bgPerm.status === 'granted' ? 'BACKGROUND' : 'FOREGROUND_ONLY');
        }
      }
    }
    initTrackingState();
  }, []);

  const handleToggleTracking = async () => {
    setTrackingLoading(true);
    try {
      if (trackingStatus !== 'INACTIVE') {
        const res = await stopLiveTransitSharing('USER_STOPPED');
        setTrackingStatus('INACTIVE');
        if (res.flushed) {
          Alert.alert('Transit Sharing Stopped', 'Live location sharing with trusted contacts has ended.');
        } else {
          Alert.alert(
            'Transit Sharing Stopped',
            `Live sharing ended. ${res.pendingCount} unsent location points saved locally for auto-sync when online.`
          );
        }
      } else {
        const res = await startLiveTransitSharing();
        if (res.status === 'BACKGROUND') {
          setTrackingStatus('BACKGROUND');
          Alert.alert('🟢 Live Transit Sharing Active', 'Sharing background GPS updates with trusted contacts while in transit.');
        } else if (res.status === 'FOREGROUND_ONLY') {
          setTrackingStatus('FOREGROUND_ONLY');
          Alert.alert(
            '📱 Foreground Sharing Active',
            'Background location permission was denied. Live tracking will run while app is visible on screen.'
          );
        } else {
          Alert.alert('Permission Required', res.error || 'Location permission denied.');
        }
      }
    } catch (err) {
      console.error('Toggle tracking error:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSOS = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Haptics fallback
    }

    setSosActive(true);
    setSosLoading(true);
    setSosError(null);
    setSosStatusMessage('Alerting emergency contacts...');
    setSosAlerts([]);
    setLocationSummary(null);

    // 1. Request Location (Non-blocking: if denied or fails, fallback gracefully)
    let coords: { latitude: number; longitude: number; accuracy: number | null } | null = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        };
        setLocationSummary(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      } else {
        setLocationSummary('Location Permission Denied');
      }
    } catch (err) {
      console.warn('Location retrieval warning:', err);
      setLocationSummary('Location Unavailable');
    }

    // 2. Call Real Backend POST /api/sos with 8-second Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const backendHost = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/sos';
      // Normalize endpoint URL
      const sosEndpoint = backendHost.endsWith('/api/sos')
        ? backendHost
        : backendHost.replace(/\/api\/(ai\/chat|contacts)\/?$/, '/api/sos');

      const response = await fetch(sosEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          latitude: coords ? coords.latitude : null,
          longitude: coords ? coords.longitude : null,
          accuracy: coords ? coords.accuracy : null,
          device_info: {
            os: Platform.OS,
            version: Platform.Version,
            app: 'Meyyurai Mobile Expo',
          },
          emergency_type: 'SOS',
          notes: 'Emergency assistance requested from Meyyurai Mobile App',
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status === 210) {
        const data = await response.json();
        const returnedAlerts: DispatchAlert[] = data.alerts || [];
        setSosAlerts(returnedAlerts);
        setSosStatusMessage(data.message || 'SOS event recorded.');

        const failedAlerts = returnedAlerts.filter((a) => a.status !== 'dispatched');
        if (failedAlerts.length > 0) {
          setSosError(
            `⚠️ Alert failed for ${failedAlerts.length} contact(s). Please call 112 directly!`
          );
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setSosError(errData.error || 'Failed to dispatch SOS alerts. Dial 112 directly!');
      }
    } catch (netErr: any) {
      clearTimeout(timeoutId);
      console.error('SOS Dispatch Exception:', netErr);
      if (netErr.name === 'AbortError') {
        setSosError('⏰ API request timed out (8s limit). Please dial 112 directly!');
      } else {
        setSosError('Network offline/error. Failed to dispatch SMS alerts — Dial 112 immediately!');
      }
    } finally {
      setSosLoading(false);

      // Open Immediate 112 Dial Confirmation Modal
      Alert.alert(
        '🚨 EMERGENCY SOS DISPATCHED',
        'Emergency incident logged. Do you want to dial Emergency Response 112 now?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'CALL 112 NOW',
            style: 'destructive',
            onPress: () => {
              Linking.openURL('tel:112');
            },
          },
        ]
      );
    }
  };

  const handleCallNumber = (num: string) => {
    Linking.openURL(`tel:${num}`);
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* LIVE TRANSIT SHARING PERSISTENT STATUS BANNER */}
        {trackingStatus !== 'INACTIVE' && (
          <View
            style={[
              styles.trackingBanner,
              trackingStatus === 'BACKGROUND' ? styles.trackingBannerGreen : styles.trackingBannerYellow,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MapPin
                size={16}
                color={trackingStatus === 'BACKGROUND' ? '#047857' : '#B45309'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.trackingBannerText,
                  trackingStatus === 'BACKGROUND' ? { color: '#065F46' } : { color: '#92400E' },
                ]}
              >
                {trackingStatus === 'BACKGROUND'
                  ? '🟢 Live Transit Sharing Active (Background)'
                  : '📱 Foreground Transit Sharing Active — Keep screen on'}
              </Text>
            </View>

            {trackingStatus === 'FOREGROUND_ONLY' && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.settingsButtonText}>Enable in Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* LIVE TRANSIT SHARING CONTROL CARD */}
        <View style={styles.transitControlCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Shield size={18} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.transitTitle}>Live Transit Sharing</Text>
          </View>
          <Text style={styles.transitSubtitle}>
            Share continuous GPS breadcrumbs with trusted contacts during night travel or transit. Auto-expires in 3 hours.
          </Text>
          <TouchableOpacity
            style={[
              styles.transitActionButton,
              trackingStatus !== 'INACTIVE' && styles.transitActionButtonActive,
            ]}
            onPress={handleToggleTracking}
            disabled={trackingLoading}
          >
            {trackingLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.transitActionButtonText}>
                {trackingStatus !== 'INACTIVE' ? 'Stop Live Transit Sharing' : 'Start Live Transit Sharing'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* SOS MAIN CARD */}
        <View style={styles.sosCardContainer}>
          {/* TOAST PILL STATE */}
          <View style={[styles.toastPill, sosError ? styles.toastPillError : null]}>
            {sosLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 6 }} />
            ) : sosError ? (
              <AlertTriangle size={14} color="#EF4444" style={{ marginRight: 6 }} />
            ) : (
              <CheckCircle size={14} color="#059669" style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.toastText, sosError ? { color: '#EF4444' } : null]}>
              {sosLoading
                ? 'Alerting emergency contacts...'
                : sosError
                ? 'Dispatch Issue'
                : sosAlerts.length > 0
                ? `${sosAlerts.filter((a) => a.status === 'dispatched').length} Contacts Alerted`
                : 'Emergency System Active'}
            </Text>
          </View>

          {/* CIRCULAR SOS BUTTON */}
          <TouchableOpacity
            style={[styles.sosButtonCircle, sosActive && styles.sosButtonActive]}
            onPress={handleSOS}
            activeOpacity={0.85}
            disabled={sosLoading}
          >
            {sosLoading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Bell size={32} color="#FFFFFF" style={{ marginBottom: 4 }} />
                <Text style={styles.sosCircleText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.sosInstruction}>
            {sosLoading ? 'Fetching location & dispatching alerts...' : 'Tap to trigger immediate SOS & alert contacts.'}
          </Text>

          {locationSummary && (
            <View style={styles.locationBadge}>
              <MapPin size={12} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>Location: {locationSummary}</Text>
            </View>
          )}

          {/* ERROR WARNING BANNER */}
          {sosError && (
            <View style={styles.errorBox}>
              <AlertTriangle size={16} color="#B91C1C" style={{ marginRight: 6 }} />
              <Text style={styles.errorBoxText}>{sosError}</Text>
            </View>
          )}

          {/* PER-CONTACT DISPATCH ALERTS LIST */}
          {sosAlerts.length > 0 && (
            <View style={styles.alertsContainer}>
              <Text style={styles.alertsHeader}>DISPATCH RESULTS:</Text>
              {sosAlerts.map((a, idx) => (
                <View key={idx} style={styles.alertRow}>
                  {a.status === 'dispatched' ? (
                    <CheckCircle size={14} color="#059669" />
                  ) : (
                    <XCircle size={14} color="#DC2626" />
                  )}
                  <Text style={styles.alertContactName}>{a.contact_name}</Text>
                  <Text style={styles.alertPhone}>({a.phone_notified})</Text>
                  <Text
                    style={[
                      styles.alertBadgeStatus,
                      a.status === 'dispatched' ? styles.statusSuccess : styles.statusFail,
                    ]}
                  >
                    {a.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ALWAYS-AVAILABLE 112 CALL BUTTON */}
        <TouchableOpacity
          style={styles.directCall112Btn}
          onPress={() => handleCallNumber('112')}
          activeOpacity={0.85}
        >
          <PhoneCall size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.directCall112Text}>CALL EMERGENCY 112 NOW</Text>
        </TouchableOpacity>

        {/* DIRECT HELPLINES GRID */}
        <View style={styles.contactsHeaderRow}>
          <Text style={styles.contactsSectionTitle}>Direct emergency helplines</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Resources')}>
            <Text style={styles.tapToCall}>View all resources</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {/* CARD 1: 112 */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleCallNumber('112')}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Bell size={20} color="#EF4444" />
            </View>
            <Text style={styles.cardLabel}>All-in-one Emergency</Text>
            <Text style={styles.cardNumber}>112</Text>
          </TouchableOpacity>

          {/* CARD 2: POLICE 100 */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleCallNumber('100')}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: '#CCFBF1' }]}>
              <Shield size={20} color="#0F766E" />
            </View>
            <Text style={styles.cardLabel}>Police</Text>
            <Text style={styles.cardNumber}>100</Text>
          </TouchableOpacity>

          {/* CARD 3: AMBULANCE 108 */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleCallNumber('108')}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: '#FCE7F3' }]}>
              <Heart size={20} color="#EC4899" />
            </View>
            <Text style={styles.cardLabel}>Ambulance</Text>
            <Text style={styles.cardNumber}>108</Text>
          </TouchableOpacity>

          {/* CARD 4: WOMEN HELPLINE 1091 */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => handleCallNumber('1091')}
            activeOpacity={0.75}
          >
            <View style={[styles.cardIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Users size={20} color="#059669" />
            </View>
            <Text style={styles.cardLabel}>Women Helpline</Text>
            <Text style={styles.cardNumber}>1091</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  topHeaderBox: {
    marginBottom: 16,
  },
  trackingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  trackingBannerGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  trackingBannerYellow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  trackingBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  settingsButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  settingsButtonText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  transitControlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  transitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  transitSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginBottom: 12,
  },
  transitActionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitActionButtonActive: {
    backgroundColor: '#DC2626',
  },
  transitActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  sosCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    position: 'relative',
  },
  toastPill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  toastPillError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  toastText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sosButtonCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
    shadowColor: Colors.sosRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#FEE2E2',
  },
  sosButtonActive: {
    backgroundColor: Colors.sosRedDark,
  },
  sosCircleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  sosInstruction: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    width: '100%',
  },
  errorBoxText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  alertsContainer: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertContactName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 6,
  },
  alertPhone: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
    flex: 1,
  },
  alertBadgeStatus: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
  },
  statusFail: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  },
  directCall112Btn: {
    backgroundColor: Colors.sosRed,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.sosRed,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  directCall112Text: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  contactsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  contactsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  tapToCall: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
});
