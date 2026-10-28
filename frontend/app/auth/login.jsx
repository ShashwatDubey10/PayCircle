import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [focusedField, setFocusedField] = useState(null);

  // Staggered entrance animations
  const logoAnim   = useRef(new Animated.Value(0)).current;
  const formAnim   = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(110, [
      Animated.timing(logoAnim,   { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(formAnim,   { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(footerAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err?.message || String(err) || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const slideUp = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Corner accent lines ── */}
      <View style={styles.cornerTL}>
        <View style={styles.cornerLineH} />
        <View style={styles.cornerLineV} />
      </View>
      <View style={styles.cornerBR}>
        <View style={styles.cornerLineV} />
        <View style={styles.cornerLineH} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding">
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Logo ── */}
          <Animated.View style={[styles.logoBlock, slideUp(logoAnim)]}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <Image
                source={require('../../assets/images/PayCircleLogo.png-removebg-preview.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.taglineRow}>
              <View style={styles.taglineDot} />
              <Text style={styles.tagline}>Split smarter, together</Text>
              <View style={styles.taglineDot} />
            </View>
          </Animated.View>

          {/* ── Form Card ── */}
          <View style={styles.formGlow}>
          <Animated.View style={[styles.form, slideUp(formAnim)]}>
            {/* Mint accent line */}
            <View style={styles.accentBar} />

            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={PC.negative} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={[
                styles.inputBox,
                focusedField === 'email' && styles.inputBoxFocused,
                error && !email.trim() && styles.inputBoxError,
              ]}>
                <Ionicons
                  name="mail-outline"
                  size={15}
                  color={focusedField === 'email' ? PC.accent : PC.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={PC.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={[
                styles.inputBox,
                focusedField === 'password' && styles.inputBoxFocused,
                error && !password && styles.inputBoxError,
              ]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color={focusedField === 'password' ? PC.accent : PC.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Your password"
                  placeholderTextColor={PC.textMuted}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color={PC.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#060A09" size="small" />
              ) : (
                <View style={styles.primaryBtnContent}>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                  <View style={styles.primaryBtnArrow}>
                    <Ionicons name="arrow-forward" size={14} color="#060A09" />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Create Account */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.75}
              disabled={loading}>
              <Text style={styles.secondaryBtnText}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>
          </View>

          {/* Footer */}
          <Animated.Text style={[styles.footer, { opacity: footerAnim }]}>
            By continuing you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text>
            {' '}&{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Animated.Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },

  // Corner accent lines — architectural fintech aesthetic
  cornerTL: { position: 'absolute', top: 52, left: 20 },
  cornerBR: { position: 'absolute', bottom: 52, right: 20, alignItems: 'flex-end' },
  cornerLineH: { width: 44, height: 1.5, backgroundColor: PC.accent, opacity: 0.2 },
  cornerLineV: { width: 1.5, height: 44, backgroundColor: PC.accent, opacity: 0.2 },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 36,
    justifyContent: 'center',
  },

  // Logo section
  logoBlock: { alignItems: 'center', marginBottom: 44 },
  logoWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoGlow: {
    position: 'absolute',
    width: 240,
    height: 90,
    borderRadius: 45,
    backgroundColor: PC.accent,
    opacity: 0.07,
  },
  logoImage: { width: 228, height: 78 },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PC.accent,
    opacity: 0.55,
  },
  tagline: {
    color: PC.textSecondary,
    fontSize: 13,
    letterSpacing: 0.4,
  },

  // Form card
  formGlow: {
    borderRadius: 23,
    backgroundColor: 'rgba(0,229,190,0.06)',
    padding: 1,
    marginBottom: 24,
  },
  form: {
    backgroundColor: PC.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 24,
    overflow: 'hidden',
    marginBottom: 0,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PC.accent,
    opacity: 0.75,
  },
  formTitle: {
    color: PC.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  formSubtitle: { color: PC.textSecondary, fontSize: 13, marginBottom: 24 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,80,85,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,85,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  inputGroup: { marginBottom: 16 },
  inputLabel: {
    color: PC.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputBoxFocused: {
    borderColor: PC.accent,
    backgroundColor: 'rgba(0,229,190,0.04)',
  },
  inputBoxError: { borderColor: PC.negative },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: PC.textPrimary, fontSize: 15, height: '100%' },
  eyeBtn: { padding: 4 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 24, marginTop: -4 },
  forgotText: { color: PC.accent, fontSize: 12, opacity: 0.85 },

  // Primary CTA
  primaryBtn: {
    backgroundColor: PC.accent,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnText: {
    color: '#060A09',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  primaryBtnArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(6,10,9,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: PC.border },
  dividerText: { color: PC.textMuted, fontSize: 11, letterSpacing: 0.6 },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: PC.borderLight,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: PC.textPrimary, fontSize: 14, fontWeight: '500' },

  footer: {
    color: PC.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: { color: PC.textSecondary },
});
