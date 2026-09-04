/**
 * BharatPath — Jobs Hub Placeholder Route
 * Demonstrates navigation shell and Hub layout.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Briefcase, Sparkle, MagnifyingGlass } from 'phosphor-react-native';
import { HubScreen } from '@/components/layouts/HubScreen';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { SearchInput } from '@/components/inputs/SearchInput';
import { Card } from '@/components/cards/Card';
import { EyebrowRow } from '@/components/cards/EyebrowRow';
import { StatusChip } from '@/components/StatusChip';
import { NoteStrip } from '@/components/feedback/NoteStrip';
import { Colors, Typography, Spacing } from '@/theme/tokens';

export default function JobsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('jobs');
  const [search, setSearch] = useState('');

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    router.push(href as any);
  };

  return (
    <View style={styles.root}>
      <HubScreen>
        <View style={styles.content}>
          <TopBar title="Jobs Hub" />

          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search high-growth engineering & product roles…"
          />

          <View style={styles.section}>
            <EyebrowRow label="Jobs Hub" icon={<Briefcase size={14} color={Colors.indigo} weight="bold" />} />
            <Text style={styles.title}>Curated Opportunities</Text>
            <Text style={styles.subtitle}>
              Jobs hub placeholder route. Demonstrating real-time search input styling and card integration.
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>Backend Architect</Text>
              <StatusChip type="MATCH" />
            </View>
            <Text style={styles.company}>Cred · Bengaluru</Text>
            <Text style={styles.salary}>₹35–50 LPA</Text>
          </Card>

          <NoteStrip
            text="High-match jobs (score > 750) will feature direct referral badges and accelerated response times."
            variant="info"
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
  salary: {
    ...Typography.monoNumber,
    color: Colors.navy,
    marginTop: Spacing.xs,
  },
});
