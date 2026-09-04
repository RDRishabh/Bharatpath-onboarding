/**
 * BharatPath — Home Hub Placeholder Route
 * Demonstrates navigation shell and Hub layout.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { House, Sparkle, Compass, TrendUp } from 'phosphor-react-native';
import { HubScreen } from '@/components/layouts/HubScreen';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Card } from '@/components/cards/Card';
import { EyebrowRow } from '@/components/cards/EyebrowRow';
import { NoteStrip } from '@/components/feedback/NoteStrip';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { Colors, Typography, Spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('home');

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    router.push(href as any);
  };

  return (
    <View style={styles.root}>
      <HubScreen>
        <View style={styles.content}>
          <TopBar title="BharatPath Home" />

          <View style={styles.section}>
            <EyebrowRow label="Home Hub" icon={<Compass size={14} color={Colors.indigo} weight="bold" />} />
            <Text style={styles.title}>Your Career Command Center</Text>
            <Text style={styles.subtitle}>
              This is the Home placeholder route. Built on the clean, scalable HubScreen layout primitive with centralized design tokens.
            </Text>
          </View>

          <Card style={styles.card}>
            <EyebrowRow label="Status" color={Colors.indigoSemantic.fg} />
            <Text style={styles.cardTitle}>Phase 1 Architecture Complete</Text>
            <Text style={styles.cardText}>
              Routing shell, brand design tokens, layout primitives, and component library are fully active.
            </Text>
            <PrimaryButton
              label="Back to System Preview"
              leftIcon={<Sparkle size={16} color={Colors.offWhite} weight="fill" />}
              onPress={() => router.push('/')}
              style={styles.button}
            />
          </Card>

          <NoteStrip
            text="The Home screen will display your personalized readiness feed, application deadlines, and top recommended roles."
            variant="info"
            style={styles.note}
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
    gap: Spacing.sm,
  },
  cardTitle: {
    ...Typography.cardTitle,
    color: Colors.navy,
  },
  cardText: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  button: {
    marginTop: Spacing.sm,
  },
  note: {
    marginTop: Spacing.sm,
  },
});
