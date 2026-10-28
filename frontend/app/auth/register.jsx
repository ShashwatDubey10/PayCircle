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

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASS_RE     = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName]                       = useState('');
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [focusedField, setFocusedField]       = useState(null);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(headerAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.timing(formAnim,   { toValue: 1, duration: 460, useNativeDriver: true }),
    ]).start();
  }, []);

  function validate() {
    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      return 'All fields are required.';
    }
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!USERNAME_RE.test(username.trim().toLowerCase())) {
      return 'Username: 3–20 chars, lowercase letters, numbers, underscore only.';
    }
    if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
    if (!PASS_RE.test(password)) return 'Password needs 8+ characters with letters and numbers.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleRegister() {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      await register(name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err?.message || String(err) || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function clearError() { setError(''); }

  const slideUp = (anim, offset = 22) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
  });

  function inputBox(field, hasError) {
    return [
      styles.inputBox,
      focusedField === field && styles.inputBoxFocused,
      hasError && styles.inputBoxError,
    ];
  }

  function iconColor(field) {
    return focusedField === field ? PC.accent : PC.textMuted;
  }

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

          {/* ── Back button ── */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            disabled={loading}>
            <Ionicons name="arrow-back" size={18} color={PC.textPrimary} />
          </TouchableOpacity>

          {/* ── Centered logo block ── */}
          <Animated.View style={[styles.logoBlock, slideUp(headerAnim, 16)]}>
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
              <Text style={styles.tagline}>Join PayCircle and split smarter</Text>
              <View style={styles.taglineDot} />
            </View>
          </Animated.View>

          {/* ── Form Card ── */}
          <View style={styles.formGlow}>
          <Animated.View style={[styles.form, slideUp(formAnim, 30)]}>
            <View style={styles.accentBar} />

            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSubtitle}>Fill in your details below</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={PC.negative} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View style={inputBox('name', false)}>
                <Ionicons name="person-outline" size={15} color={iconColor('name')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Arjun Sharma"
                  placeholderTextColor={PC.textMuted}
                  value={name}
                  onChangeText={(v) => { setName(v); clearError(); }}
                  autoCapitalize="words"
                  editable={!loading}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>USERNAME</Text>
              <View style={inputBox('username', false)}>
                <Ionicons name="at-outline" size={15} color={iconColor('username')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="arjun_sharma"
                  placeholderTextColor={PC.textMuted}
                  value={username}
                  onChangeText={(v) => { setUsername(v.toLowerCase()); clearError(); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View style={inputBox('email', false)}>
                <Ionicons name="mail-outline" size={15} color={iconColor('email')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={PC.textMuted}
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError(); }}
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
              <View style={inputBox('password', false)}>
                <Ionicons name="lock-closed-outline" size={15} color={iconColor('password')} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Create a password"
                  placeholderTextColor={PC.textMuted}
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearError(); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color={PC.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={[
                styles.inputBox,
                focusedField === 'confirm' && styles.inputBoxFocused,
                confirmPassword && password !== confirmPassword && styles.inputBoxError,
              ]}>
                <Ionicons name="lock-closed-outline" size={15} color={iconColor('confirm')} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={PC.textMuted}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {confirmPassword && password !== confirmPassword ? (
                <Text style={styles.fieldError}>Passwords do not match</Text>
              ) : null}
            </View>

            {/* Password hint */}
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={12} color={PC.textMuted} />
              <Text style={styles.hintText}>8+ characters with letters and numbers</Text>
            </View>

            {/* Create Account CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#060A09" size="small" />
              ) : (
                <View style={styles.primaryBtnContent}>
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                  <View style={styles.primaryBtnArrow}>
                    <Ionicons name="arrow-forward" size={14} color="#060A09" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          </View>

          {/* Sign in link */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()} disabled={loading}>
              <Text style={styles.signinLink}> Sign In</Text>
            </TouchableOpacity>
          </View>

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
    paddingTop: 20,
    paddingBottom: 44,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PC.bgCard,
    borderWidth: 1,
    borderColor: PC.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  // Logo section
  logoBlock: { alignItems: 'center', marginBottom: 36 },
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
  taglineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taglineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PC.accent, opacity: 0.55 },
  tagline: { color: PC.textSecondary, fontSize: 13, letterSpacing: 0.4 },

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
    padding: 22,
    overflow: 'hidden',
    marginBottom: 0,
  },
  formTitle: { color: PC.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  formSubtitle: { color: PC.textSecondary, fontSize: 13, marginBottom: 20 },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PC.accent,
    opacity: 0.75,
  },

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
    marginTop: 8,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  inputGroup: { marginBottom: 14 },
  inputLabel: {
    color: PC.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.3,
    marginBottom: 7,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputBoxFocused: {
    borderColor: PC.accent,
    backgroundColor: 'rgba(0,229,190,0.04)',
  },
  inputBoxError: { borderColor: PC.negative },
  fieldError: { color: PC.negative, fontSize: 11, marginTop: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: PC.textPrimary, fontSize: 15, height: '100%' },
  eyeBtn: { padding: 4 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
    marginTop: 2,
  },
  hintText: { color: PC.textMuted, fontSize: 11 },

  // Primary CTA
  primaryBtn: {
    backgroundColor: PC.accent,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
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

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: { color: PC.textSecondary, fontSize: 14 },
  signinLink: { color: PC.accent, fontSize: 14, fontWeight: '600' },
});
