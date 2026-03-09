import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
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

  const [name, setName]                   = useState('');
  const [username, setUsername]           = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  function validate() {
    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      return 'All fields are required.';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters.';
    }
    if (!USERNAME_RE.test(username.trim().toLowerCase())) {
      return 'Username must be 3–20 chars: lowercase letters, numbers, underscore only.';
    }
    if (!EMAIL_RE.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (!PASS_RE.test(password)) {
      return 'Password must be 8+ characters with letters and numbers.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  }

  async function handleRegister() {
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), password);
      // RootGuard in _layout.jsx detects the new user state and
      // redirects to /(tabs) automatically — no router.replace needed here.
    } catch (err) {
      setError(err?.message || String(err) || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Back Button ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={loading}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headBlock}>
            <Image
              source={require('../../assets/images/PayCircleIcon.png')}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join PayCircle and split smarter</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>

            {/* ── Error banner ── */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Arjun Sharma"
                  placeholderTextColor={PC.textMuted}
                  value={name}
                  onChangeText={(v) => { setName(v); clearError(); }}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.inputBox}>
                <Ionicons name="at-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="arjun_sharma"
                  placeholderTextColor={PC.textMuted}
                  value={username}
                  onChangeText={(v) => { setUsername(v.toLowerCase()); clearError(); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
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
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Create a password"
                  placeholderTextColor={PC.textMuted}
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearError(); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={PC.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[
                styles.inputBox,
                confirmPassword && password !== confirmPassword ? styles.inputError : null,
              ]}>
                <Ionicons name="lock-closed-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={PC.textMuted}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
              {confirmPassword && password !== confirmPassword ? (
                <Text style={styles.fieldError}>Passwords do not match</Text>
              ) : null}
            </View>

            {/* Password hint */}
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color={PC.textMuted} />
              <Text style={styles.hintText}>
                Use 8+ characters with letters and numbers
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.85}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color={PC.bg} size="small" />
                : <Text style={styles.primaryBtnText}>Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Sign in link ── */}
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
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
    marginBottom: 28,
  },

  headBlock: { marginBottom: 28 },
  logoSmall: { width: 52, height: 52, marginBottom: 14 },
  heading: { color: PC.textPrimary, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subheading: { color: PC.textSecondary, fontSize: 14 },

  form: {
    backgroundColor: PC.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 24,
    marginBottom: 24,
  },

  // Error banner
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224,90,90,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,90,90,0.30)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 7 },
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
  inputError: { borderColor: PC.negative },
  fieldError: { color: PC.negative, fontSize: 11, marginTop: 5 },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: PC.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: { padding: 4 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 24,
    marginTop: 2,
  },
  hintText: { color: PC.textMuted, fontSize: 12 },

  primaryBtn: {
    backgroundColor: PC.textPrimary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: PC.bg, fontSize: 15, fontWeight: '700' },

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: { color: PC.textSecondary, fontSize: 14 },
  signinLink: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },
});
