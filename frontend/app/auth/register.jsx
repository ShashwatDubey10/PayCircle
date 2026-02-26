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

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleRegister() {
    // TODO: connect to POST /api/auth/register
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

          {/* ── Back Button + Header ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headBlock}>
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subheading}>Join PayCircle and split smarter</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>

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
                  onChangeText={setName}
                  autoCapitalize="words"
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
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={17} color={PC.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repeat your password"
                  placeholderTextColor={PC.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password strength hint */}
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color={PC.textMuted} />
              <Text style={styles.hintText}>
                Use 8+ characters with letters and numbers
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleRegister}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* ── Sign in link ── */}
          <View style={styles.signinRow}>
            <Text style={styles.signinText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.back()}>
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
  primaryBtnText: { color: PC.bg, fontSize: 15, fontWeight: '700' },

  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: { color: PC.textSecondary, fontSize: 14 },
  signinLink: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },
});
