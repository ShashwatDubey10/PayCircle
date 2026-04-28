import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PC } from '@/constants/theme';

const TYPE_CONFIG = {
  success: {
    icon:   'checkmark-circle',
    color:  PC.positive,
    bg:     'rgba(0,229,190,0.11)',
    border: 'rgba(0,229,190,0.28)',
  },
  error: {
    icon:   'alert-circle',
    color:  PC.negative,
    bg:     'rgba(255,80,85,0.11)',
    border: 'rgba(255,80,85,0.28)',
  },
  info: {
    icon:   'information-circle',
    color:  PC.textSecondary,
    bg:     PC.bgCardElevated,
    border: PC.border,
  },
  warning: {
    icon:   'warning',
    color:  PC.warning,
    bg:     'rgba(255,176,32,0.11)',
    border: 'rgba(255,176,32,0.28)',
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useToast() — manage toast state in any component.
 *
 * Returns: { toast, showToast }
 *   showToast(message, type?)  — type: 'success' | 'error' | 'info' | 'warning'
 */
export function useToast() {
  const [toast, setToast]   = useState(null);
  const timerRef            = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, key: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { toast, showToast };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AppToast — floating pill notification.
 * Render inside your screen's root container (absolute-positioned).
 *
 * Usage:
 *   const { toast, showToast } = useToast();
 *   // inside JSX:
 *   <AppToast toast={toast} />
 *
 * Position it at the end of your root SafeAreaView / View.
 */
export default function AppToast({ toast, bottomOffset = 96 }) {
  const [current, setCurrent] = useState(null);
  const slideAnim   = useRef(new Animated.Value(70)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      // New toast arriving — update content immediately, then animate in
      setCurrent(toast);
      slideAnim.setValue(70);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue:    0,
          tension:    80,
          friction:   11,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue:  1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then clear
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue:  70,
          duration: 230,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue:  0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setCurrent(null);
      });
    }
  }, [toast]);

  if (!current) return null;

  const cfg = TYPE_CONFIG[current.type] || TYPE_CONFIG.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { backgroundColor: cfg.bg, borderColor: cfg.border, bottom: bottomOffset },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}>
      <View style={[styles.iconDot, { backgroundColor: cfg.color + '22' }]}>
        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <Text style={[styles.text, { color: cfg.color }]} numberOfLines={2}>
        {current.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:   'absolute',
    left:        20,
    right:       20,
    flexDirection: 'row',
    alignItems:  'center',
    gap:          10,
    paddingHorizontal: 14,
    paddingVertical:   12,
    borderRadius: 14,
    borderWidth:   1,
    zIndex:        9999,
    // Shadow
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius:  14,
    elevation:     12,
  },
  iconDot: {
    width:  30,
    height: 30,
    borderRadius: 10,
    alignItems:    'center',
    justifyContent: 'center',
  },
  text: {
    flex:       1,
    fontSize:   13,
    fontWeight: '500',
    lineHeight: 19,
  },
});
