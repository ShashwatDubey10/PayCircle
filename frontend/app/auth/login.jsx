import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleLogin() {
    // TODO: connect to POST /api/auth/login
    router.replace('/(tabs)');
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

          {/* ── Logo ── */}
          <View style={styles.logoBlock}>
            <View style={styles.logoIcon}>
              <Ionicons name="swap-horizontal" size={28} color={PC.textPrimary} />
            </View>
            <Text style={styles.appName}>PayCircle</Text>
            <Text style={styles.tagline}>Split smarter together</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to your account</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={PC.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Your password"
                  placeholderTextColor={PC.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Sign In</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.75}>
              <Text style={styles.secondaryBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            By continuing you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text> &{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
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
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: 'center',
  },

  logoBlock: { alignItems: 'center', marginBottom: 48 },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: PC.bgCard,
    borderWidth: 1,
    borderColor: PC.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: {
    color: PC.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: { color: PC.textSecondary, fontSize: 14 },

  form: {
    backgroundColor: PC.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 24,
    marginBottom: 24,
  },
  formTitle: { color: PC.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  formSubtitle: { color: PC.textSecondary, fontSize: 14, marginBottom: 24 },

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
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: PC.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: { padding: 4 },

  forgotRow: { alignItems: 'flex-end', marginBottom: 24, marginTop: 4 },
  forgotText: { color: PC.textSecondary, fontSize: 13 },

  primaryBtn: {
    backgroundColor: PC.textPrimary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryBtnText: { color: PC.bg, fontSize: 15, fontWeight: '700' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: PC.border },
  dividerText: { color: PC.textMuted, fontSize: 13 },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: PC.textPrimary, fontSize: 15, fontWeight: '500' },

  footer: { color: PC.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footerLink: { color: PC.textSecondary },
});
