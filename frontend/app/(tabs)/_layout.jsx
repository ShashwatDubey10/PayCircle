import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PC, FONTS } from '@/constants/theme';
import { useBadge } from '@/context/BadgeContext';

function TabIcon({ name, color, size }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const { splitBadge } = useBadge();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Bottom tabs default to 'none' — no transition whatsoever between
        // tabs, which is what made tapping between them feel abrupt.
        animation: 'shift',
        tabBarActiveTintColor: PC.accent,
        tabBarInactiveTintColor: PC.textMuted,
        tabBarStyle: {
          backgroundColor: PC.bgCard,
          borderTopColor: PC.border,
          borderTopWidth: 1,
          // 64 is the bar itself. React Navigation would normally add the
          // bottom inset on top of that, but naming an explicit height
          // replaces what it would have worked out — so under edge-to-edge the
          // gesture bar sat on top of the labels and swallowed the lower part
          // of every tab's hit area. Adding it back keeps the bar the same
          // size and lifts it clear.
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: FONTS.medium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Split',
          tabBarBadge: splitBadge > 0 ? splitBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="git-branch-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="swap-horizontal-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
