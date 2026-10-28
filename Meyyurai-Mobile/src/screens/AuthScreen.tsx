import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

export const AuthScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        Alert.alert('Success', 'Account created! Logging you in...');
        navigation.replace('Main');
      } else {
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          });
          if (error) {
            console.warn('Supabase sign-in note:', error.message);
          }
        } catch (sbErr) {
          console.warn('Supabase network offline, proceeding with local access:', sbErr);
        }
        navigation.replace('Main');
      }
    } catch (error: any) {
      // Fallback navigation in case of error
      navigation.replace('Main');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <View style={styles.iconCircle}>
          <Shield size={36} color={Colors.accentGold} />
        </View>
        <Text style={styles.title}>Meyyurai</Text>
        <Text style={styles.subtitle}>{t('app.tagline')}</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{isSignUp ? t('auth.signUp') : t('auth.signIn')}</Text>

        {isSignUp && (
          <View style={styles.inputBox}>
            <User size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.fullName')}
              placeholderTextColor={Colors.textDim}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
        )}

        <View style={styles.inputBox}>
          <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor={Colors.textDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputBox}>
          <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor={Colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleAuth} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>
                {isSignUp ? t('auth.signUp') : t('auth.signIn')}
              </Text>
              <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.toggleText}>
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.guestBtn} onPress={handleGuestMode}>
        <Text style={styles.guestText}>Continue as Guest (Instant Emergency Access)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accentGold,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  guestBtn: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
  },
  guestText: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
