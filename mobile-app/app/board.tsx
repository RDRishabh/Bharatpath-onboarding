/**
 * BharatPath — Board Placeholder Route
 * Demonstrates navigation shell and Hub layout.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ClipboardText, Sparkle } from 'phosphor-react-native';
import { HubScreen } from '@/components/layouts/HubScreen';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Card } from '@/components/cards/Card';
import { EyebrowRow } from '@/components/cards/EyebrowRow';
import { StatusChip } from '@/components/StatusChip';
import { NoteStrip } from '@/components/feedback/NoteStrip';
import { Colors, Typography, Spacing } from '@/theme/tokens';

export default function BoardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('board');

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    router.push(href as any);
  };

  return (
    <View style={styles.root}>
      <HubScreen>
        <View style={styles.content}>
          <TopBar title="Application Board" />

          <View style={styles.section}>
            <EyebrowRow label="Board Hub" icon={<ClipboardText size={14} color={Colors.indigo} weight="bold" />} />
            <Text style={styles.title}>Track Applications</Text>
            <Text style={styles.subtitle}>
              Application board placeholder route. Reusable design system tokens ready for kanban/status pipeline.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>Senior Backend Engineer</Text>
              <StatusChip type="INTERVIEW" />
            </View>
            <Text style={styles.company}>Razorpay · Applied 3 days ago</Text>
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>Product Designer</Text>
              <StatusChip type="SHORT" />
            </View>
            <Text style={styles.company}>Zerodha · 14-day window active</Text>
          </Card>

          <NoteStrip
            text="The Board will track application velocity, interview schedules, and referral response statuses."
            variant="warning"
          />
        </View>
      </HubScreen>
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.screenTitle,
    color: Colors.navy,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.muted,
  },
  card: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...Typography.cardTitle,
    color: Colors.navy,
  },
  company: {
    ...Typography.caption,
    color: Colors.text.muted,
  },
});
