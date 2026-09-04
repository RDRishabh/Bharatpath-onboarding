/**
 * BharatPath — You / Profile Placeholder Route
 * Demonstrates navigation shell and Hub layout.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { UserCircle, Sparkle } from 'phosphor-react-native';
import { HubScreen } from '@/components/layouts/HubScreen';
import { TopBar } from '@/components/navigation/TopBar';
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { Card } from '@/components/cards/Card';
import { EyebrowRow } from '@/components/cards/EyebrowRow';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { StatusChip } from '@/components/StatusChip';
import { SkillChip } from '@/components/chips/SkillChip';
import { mockSkills, mockCareerScore } from '@/mocks/mockData';
import { Colors, Typography, Spacing } from '@/theme/tokens';

export default function YouScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'preview' | 'home' | 'jobs' | 'board' | 'you'>('you');

  const handleTabPress = (tab: string, href: string) => {
    setActiveTab(tab as typeof activeTab);
    router.push(href as any);
  };

  return (
    <View style={styles.root}>
      <HubScreen>
        <View style={styles.content}>
          <TopBar title="Your Profile" />

          <View style={styles.section}>
            <EyebrowRow label="Candidate Profile" icon={<UserCircle size={14} color={Colors.indigo} weight="bold" />} />
            <Text style={styles.title}>Candidate Hub</Text>
            <Text style={styles.subtitle}>
              Profile placeholder route. Demonstrates readiness score, skills taxonomy, and readiness band.
            </Text>
          </View>

          <Card style={styles.card}>
            <EyebrowRow label="Readiness Score" color={Colors.text.muted} />
            <ScoreDisplay
              current={mockCareerScore.current}
              max={mockCareerScore.max}
              delta={mockCareerScore.delta}
            />
            <View style={styles.chipRow}>
              <StatusChip type="BAND" bandCurrent={1} bandTotal={4} />
              <StatusChip type="PAID" />
            </View>
          </Card>

          <Card style={styles.card}>
            <EyebrowRow label="Verified Skills" color={Colors.text.muted} />
            <View style={styles.skillsRow}>
              {mockSkills.slice(0, 6).map((skill) => (
                <SkillChip key={skill} label={skill} />
              ))}
            </View>
          </Card>
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
    gap: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
