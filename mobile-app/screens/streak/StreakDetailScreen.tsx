/**
 * BharatPath - StreakDetailScreen
 *
 * Full streak view: a hero with the current streak and engagement-points
 * balance, weekly activity heatmap, milestone ladder, and points history.
 *
 * Engagement points are a SEPARATE balance from the 700–990 candidate score
 * and must never be rendered beside it (`docs/streaks.md` §2). This screen
 * uses "points", never "score".
 *
 * All colours match the BharatPath design system:
 * - OffWhite canvas: #FFFCF7
 * - Card surfaces: #FFFFFF
 * - Card borders: #E7E0D4
 * - Dividers: #F0EBDF
 * - Navy headlines: #0A1931
 * - Muted text: #5F6B80
 * - Brand Purple: #5F4DB2
 * - Brand Gold: #B9891A
 * - Fire Orange: #FF6B00
 */
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Flame,
  Trophy,
  Medal,
  Lightning,
  Check,
  CheckCircle,
} from 'phosphor-react-native';
import { Colors, Spacing, Radii, Typography } from '@/theme/tokens';
import { useStreak } from '@/hooks/useStreak';
import {
  getStreakPointHistory,
  streakStatusLabel,
  streakSubtitle,
  pointsChangeLabel,
  checkIn,
} from '@/services/api/streak';
import {
  StreakPointsChange,
  StreakMilestone,
  StreakStatus,
} from '@/types/streak';

export interface StreakDetailScreenProps {
  onBack?: () => void;
}

/** Visual styling for the flame emblem based on status */
function getHeroFlameConfig(status: StreakStatus | undefined) {
  if (status === 'ACTIVE_TODAY') {
    return {
      color: '#FF6B00',
      bg: '#FFF3E8',
      border: '#FFE0C2',
    };
  }
  if (status === 'AT_RISK') {
    return {
      color: '#D97706',
      bg: '#FEF3C7',
      border: '#FDE68A',
    };
  }
  return {
    color: '#94A3B8',
    bg: '#F1F5F9',
    border: '#E2E8F0',
  };
}

/** Visual styling for the status pill */
function getStatusTheme(status: StreakStatus | undefined) {
  if (status === 'ACTIVE_TODAY') {
    return {
      bg: Colors.green.bg,
      text: Colors.green.fg,
      dot: Colors.green.fg,
      border: 'rgba(31, 107, 69, 0.2)',
    };
  }
  if (status === 'AT_RISK') {
    return {
      bg: Colors.amber.bg,
      text: Colors.amber.fg,
      dot: Colors.amber.fg,
      border: 'rgba(122, 92, 14, 0.2)',
    };
  }
  if (status === 'BROKEN') {
    return {
      bg: Colors.red.bg,
      text: Colors.red.fg,
      dot: Colors.red.fg,
      border: 'rgba(153, 58, 34, 0.2)',
    };
  }
  return {
    bg: Colors.surface.tint,
    text: Colors.text.muted,
    dot: Colors.text.muted,
    border: Colors.surface.border,
  };
}

interface WeekActivityDay {
  dayLabel: string;
  dayNum: number;
  dateStr: string;
  isToday: boolean;
  isActive: boolean;
  isFuture: boolean;
}

/** Computes the 7 days of the current week (Mon-Sun) and their activity status */
function getWeekActivityDays(
  todayStr: string | undefined,
  currentStreak: number,
  status: StreakStatus | undefined,
  history: StreakPointsChange[] = [],
): WeekActivityDay[] {
  let todayDate = new Date();
  if (todayStr) {
    const parts = todayStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(Number.isNaN)) {
      todayDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }

  // Get Monday of the current ISO week (Mon = 1, Sun = 0)
  const dayOfWeek = todayDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() + mondayOffset);

  const days: WeekActivityDay[] = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const historyActiveDates = new Set<string>();
  for (const item of history) {
    if (item.activity_on) {
      historyActiveDates.add(item.activity_on);
    }
  }

  const todayIso = todayStr || todayDate.toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    const isToday = dateStr === todayIso;
    const isFuture = dateStr > todayIso;

    let isActive = false;
    if (isToday) {
      isActive = status === 'ACTIVE_TODAY';
    } else if (!isFuture) {
      const diffMs = todayDate.getTime() - d.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (status === 'ACTIVE_TODAY') {
        isActive = (diffDays > 0 && diffDays < currentStreak) || historyActiveDates.has(dateStr);
      } else {
        isActive = (diffDays > 0 && diffDays <= currentStreak) || historyActiveDates.has(dateStr);
      }
    }

    days.push({
      dayLabel: dayLabels[i],
      dayNum: d.getDate(),
      dateStr,
      isToday,
      isActive,
      isFuture,
    });
  }

  return days;
}

export function StreakDetailScreen({ onBack }: StreakDetailScreenProps) {
  const { streak, loading, refreshing, error, refresh } = useStreak();
  const [history, setHistory] = useState<StreakPointsChange[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const items = await getStreakPointHistory(100);
      setHistory(items);
    } catch {
      // Silent - the streak card is the primary content.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(() => {
    refresh();
    loadHistory();
  }, [refresh, loadHistory]);

  const handleManualCheckIn = useCallback(async () => {
    if (checkingIn) return;
    setCheckingIn(true);
    try {
      await checkIn();
      refresh();
      loadHistory();
    } catch {
      // Non-fatal transient error
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, refresh, loadHistory]);

  const status = streak?.status;
  const current = streak?.current_streak ?? 0;
  const points = streak?.points_balance ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const next = streak?.next_milestone;
  const milestones = streak?.milestones ?? [];
  const breakPenalty = streak?.break_penalty ?? 0;

  const flameConfig = getHeroFlameConfig(status);
  const statusTheme = getStatusTheme(status);

  const weekDays = useMemo(() => {
    return getWeekActivityDays(streak?.today, current, status, history);
  }, [streak?.today, current, status, history]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" animated />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={18} color={Colors.navy} weight="bold" />
          </Pressable>
          <Text style={styles.topBarTitle}>Daily Streak</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.navy}
            />
          }
        >
          {/* Hero Card - clean white card matching BharatPath theme */}
          <View style={styles.heroCard}>
            {loading && !streak ? (
              <View style={styles.heroLoading}>
                <ActivityIndicator size="large" color={Colors.navy} />
              </View>
            ) : (
              <>
                {/* Header: Eyebrow + Status Pill */}
                <View style={styles.heroTopRow}>
                  <View style={styles.heroEyebrowGroup}>
                    <Flame size={14} color={flameConfig.color} weight="fill" />
                    <Text style={styles.heroEyebrow}>YOUR STREAK</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: statusTheme.bg,
                        borderColor: statusTheme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusTheme.dot },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: statusTheme.text },
                      ]}
                    >
                      {streak ? streakStatusLabel(status) : '-'}
                    </Text>
                  </View>
                </View>

                {/* Centerpiece: Flame Emblem + Streak Count */}
                <View style={styles.heroMainRow}>
                  <View
                    style={[
                      styles.flameEmblem,
                      {
                        backgroundColor: flameConfig.bg,
                        borderColor: flameConfig.border,
                      },
                    ]}
                  >
                    <Flame size={38} color={flameConfig.color} weight="fill" />
                  </View>

                  <View style={styles.heroCounterGroup}>
                    <View style={styles.heroNumberRow}>
                      <Text style={styles.heroNumber}>{current}</Text>
                      <Text style={styles.heroUnit}>
                        {current === 1 ? 'day streak' : 'days streak'}
                      </Text>
                    </View>
                    <Text style={styles.heroSubtitle}>
                      {streak
                        ? streakSubtitle(status, current)
                        : 'Open the app daily to build your streak and earn points.'}
                    </Text>
                  </View>
                </View>

                {/* Dual Stats Tiles */}
                <View style={styles.heroStatsGrid}>
                  <View style={styles.heroStatTile}>
                    <View style={styles.heroStatHeader}>
                      <Lightning size={13} color={Colors.gold} weight="fill" />
                      <Text style={styles.heroStatEyebrow}>POINTS</Text>
                    </View>
                    <Text style={styles.heroStatValue}>
                      {points.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.heroStatSub}>Engagement balance</Text>
                  </View>

                  <View style={styles.heroStatTile}>
                    <View style={styles.heroStatHeader}>
                      <Trophy size={13} color={Colors.gold} weight="fill" />
                      <Text style={styles.heroStatEyebrow}>LONGEST</Text>
                    </View>
                    <Text style={styles.heroStatValue}>
                      {longest} {longest === 1 ? 'day' : 'days'}
                    </Text>
                    <Text style={styles.heroStatSub}>Personal best</Text>
                  </View>
                </View>

                {/* Manual check-in - only when not already active today */}
                {status && status !== 'ACTIVE_TODAY' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.checkInButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleManualCheckIn}
                    disabled={checkingIn}
                    accessibilityRole="button"
                    accessibilityLabel="Check in today"
                  >
                    {checkingIn ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Lightning size={16} color="#FFFFFF" weight="fill" />
                        <Text style={styles.checkInText}>Check in today</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </>
            )}
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* 7-Day Activity Heatmap Section */}
          <View style={styles.section}>
            <View style={styles.sectionEyebrowRow}>
              <Flame size={13} color="#FF6B00" weight="fill" />
              <Text style={styles.sectionEyebrow}>THIS WEEK'S ACTIVITY</Text>
            </View>
            <View style={styles.heatmapCard}>
              <View style={styles.heatmapWeekRow}>
                {weekDays.map((day) => (
                  <View
                    key={day.dateStr}
                    style={[styles.dayCol, day.isToday && styles.dayColToday]}
                  >
                    <Text
                      style={[
                        styles.dayLabelText,
                        day.isToday && styles.dayLabelTextToday,
                      ]}
                    >
                      {day.dayLabel}
                    </Text>
                    <View
                      style={[
                        styles.dayCircle,
                        day.isActive && styles.dayCircleActive,
                        day.isToday &&
                          !day.isActive &&
                          styles.dayCircleTodayPending,
                        day.isFuture && styles.dayCircleFuture,
                      ]}
                    >
                      {day.isActive ? (
                        <Flame size={14} color="#FFFFFF" weight="fill" />
                      ) : day.isToday ? (
                        <View style={styles.todayPulseDot} />
                      ) : (
                        <View
                          style={[
                            styles.dayDot,
                            day.isFuture && styles.dayDotFuture,
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.dayDateText,
                        day.isToday && styles.dayDateTextToday,
                      ]}
                      numberOfLines={1}
                    >
                      {day.dayNum}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.heatmapFooter}>
                <Text style={styles.heatmapFooterText}>
                  {status === 'ACTIVE_TODAY'
                    ? '✓ Today completed! Keep up the daily momentum.'
                    : 'Check in before 11:59 PM IST to keep your streak alive.'}
                </Text>
              </View>
            </View>
          </View>

          {/* Next milestone progress */}
          {next ? (
            <View style={styles.section}>
              <View style={styles.sectionEyebrowRow}>
                <Trophy size={13} color={Colors.gold} weight="fill" />
                <Text style={styles.sectionEyebrow}>NEXT MILESTONE</Text>
              </View>
              <View style={styles.nextMilestoneCard}>
                <View style={styles.nextMilestoneTop}>
                  <View>
                    <Text style={styles.nextMilestoneDays}>{next.days} days</Text>
                    <Text style={styles.nextMilestoneSub}>Milestone target</Text>
                  </View>
                  <View style={styles.nextMilestonePointsBadge}>
                    <Text style={styles.nextMilestonePointsText}>
                      +{next.points} pts
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, (current / next.days) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>
                    {current >= next.days
                      ? 'Milestone reached! 🎉'
                      : `${next.days - current} day${next.days - current === 1 ? '' : 's'} to go`}
                  </Text>
                  <Text style={styles.progressPercentText}>
                    {Math.min(100, Math.round((current / next.days) * 100))}%
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Milestone ladder */}
          {milestones.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionEyebrowRow}>
                <Medal size={13} color={Colors.gold} weight="fill" />
                <Text style={styles.sectionEyebrow}>MILESTONES LADDER</Text>
              </View>
              <View style={styles.milestoneLadder}>
                {milestones.map((m, i) => (
                  <MilestoneRow
                    key={m.days}
                    milestone={m}
                    reached={current >= m.days}
                    isLast={i === milestones.length - 1}
                  />
                ))}
              </View>
              {breakPenalty > 0 ? (
                <View style={styles.breakPenaltyBox}>
                  <Flame size={15} color="#993A22" weight="fill" />
                  <Text style={styles.breakPenaltyNote}>
                    Missing a day resets your streak and costs {breakPenalty} points.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Points history */}
          <View style={styles.section}>
            <View style={styles.sectionEyebrowRow}>
              <Lightning size={13} color={Colors.gold} weight="fill" />
              <Text style={styles.sectionEyebrow}>POINTS HISTORY</Text>
            </View>
            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="small" color={Colors.text.muted} />
              </View>
            ) : history.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Trophy size={32} color={Colors.text.muted} weight="duotone" />
                <Text style={styles.historyEmptyTitle}>No points yet</Text>
                <Text style={styles.historyEmptyBody}>
                  Earn points by reaching streak milestones. Check in daily so you don't miss a day.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.map((item, i) => (
                  <HistoryRow key={`${item.activity_on}-${i}`} item={item} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** A single milestone row in the ladder, with a reached indicator. */
function MilestoneRow({
  milestone,
  reached,
  isLast,
}: {
  milestone: StreakMilestone;
  reached: boolean;
  isLast: boolean;
}) {
  return (
    <View
      style={[
        styles.milestoneRow,
        reached && styles.milestoneRowReached,
        isLast && styles.milestoneRowLast,
      ]}
    >
      <View
        style={[
          styles.milestoneDot,
          reached ? styles.milestoneDotReached : styles.milestoneDotPending,
        ]}
      >
        {reached ? (
          <Check size={18} color="#FFFFFF" weight="bold" />
        ) : (
          <Text style={styles.milestoneDotDays}>{milestone.days}</Text>
        )}
      </View>
      <View style={styles.milestoneContent}>
        <View style={styles.milestoneTitleRow}>
          <Text
            style={[
              styles.milestoneTitle,
              reached && styles.milestoneTitleReached,
            ]}
          >
            {milestone.days}-day streak
          </Text>
          {reached && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.milestonePoints,
            reached && styles.milestonePointsReached,
          ]}
        >
          {reached
            ? `+${milestone.points} pts earned`
            : `+${milestone.points} points reward`}
        </Text>
      </View>
      {reached ? (
        <View style={styles.milestoneBadgeReached}>
          <CheckCircle size={22} color={Colors.green.fg} weight="fill" />
        </View>
      ) : null}
    </View>
  );
}

/** A single points-history row. */
function HistoryRow({ item }: { item: StreakPointsChange }) {
  const isAward = item.kind === 'MILESTONE_AWARD';
  const sign = item.points >= 0 ? '+' : '';
  return (
    <View style={styles.historyRow}>
      <View
        style={[
          styles.historyIcon,
          isAward ? styles.historyIconAward : styles.historyIconPenalty,
        ]}
      >
        {isAward ? (
          <Trophy size={15} color={Colors.gold} weight="fill" />
        ) : (
          <Flame size={15} color={Colors.red.fg} weight="fill" />
        )}
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle}>{pointsChangeLabel(item.kind)}</Text>
        <Text style={styles.historyMeta}>
          {item.milestone_days
            ? `${item.milestone_days}-day milestone`
            : `${item.streak_length}-day streak`}{' '}
          · {formatDate(item.activity_on)}
        </Text>
      </View>
      <View
        style={[
          styles.historyPointsPill,
          isAward ? styles.historyPointsPillAward : styles.historyPointsPillPenalty,
        ]}
      >
        <Text
          style={[
            styles.historyPoints,
            isAward ? styles.historyPointsAward : styles.historyPointsPenalty,
          ]}
        >
          {sign}{item.points} pts
        </Text>
      </View>
    </View>
  );
}

/** Formats an ISO date (YYYY-MM-DD) as a short readable date. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.offWhite, // #FFFCF7
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 17,
    lineHeight: 22,
    color: Colors.navy,
  },
  topBarSpacer: {
    width: 40,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + Spacing.xl,
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: Spacing.xl,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroEyebrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    ...Typography.monoEyebrow,
    color: Colors.text.muted,
    fontSize: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  flameEmblem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  heroCounterGroup: {
    flex: 1,
    gap: 4,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  heroNumber: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 44,
    lineHeight: 48,
    color: Colors.navy,
    includeFontPadding: false,
  },
  heroUnit: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text.muted,
  },
  heroSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.muted,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroStatTile: {
    flex: 1,
    backgroundColor: Colors.surface.tint, // #F7F4EC
    borderRadius: 16,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  heroStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroStatEyebrow: {
    ...Typography.monoEyebrow,
    color: Colors.text.muted,
    fontSize: 10,
  },
  heroStatValue: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 22,
    lineHeight: 26,
    color: Colors.navy,
    includeFontPadding: false,
  },
  heroStatSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    lineHeight: 14,
    color: Colors.text.muted,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.purple, // #5F4DB2
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radii.pill,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  checkInText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: Colors.red.bg,
    borderRadius: Radii.tile,
    padding: Spacing.base,
  },
  errorText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.red.fg,
  },
  section: {
    gap: Spacing.sm + 2,
  },
  sectionEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    ...Typography.monoEyebrow,
    color: Colors.text.muted,
    fontSize: 11,
  },
  heatmapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm + 2,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  heatmapWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 1,
    borderRadius: 10,
    minWidth: 0,
  },
  dayColToday: {
    backgroundColor: '#FFF8F0',
  },
  dayLabelText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: Colors.text.muted,
  },
  dayLabelTextToday: {
    color: '#FF6B00',
    fontFamily: 'GeneralSans-Bold',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  dayCircleActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF8A33',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  dayCircleTodayPending: {
    borderColor: '#FF6B00',
    borderWidth: 1.5,
    backgroundColor: '#FFF3E8',
  },
  dayCircleFuture: {
    backgroundColor: '#FAF7F0',
    borderColor: '#EFEAE0',
    opacity: 0.6,
  },
  todayPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6B00',
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C5CBD6',
  },
  dayDotFuture: {
    backgroundColor: '#E2E5EA',
  },
  dayDateText: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: Colors.text.muted,
  },
  dayDateTextToday: {
    color: Colors.navy,
    fontFamily: 'SpaceMono-Bold',
  },
  heatmapFooter: {
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.hairline,
  },
  heatmapFooterText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  nextMilestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  nextMilestoneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextMilestoneDays: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    lineHeight: 24,
    color: Colors.navy,
  },
  nextMilestoneSub: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
  },
  nextMilestonePointsBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  nextMilestonePointsText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    lineHeight: 15,
    color: '#92400E',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surface.hairline,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: Radii.pill,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
  },
  progressPercentText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gold,
  },
  milestoneLadder: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.hairline,
  },
  milestoneRowReached: {
    backgroundColor: '#F3FAF6',
    borderRadius: 14,
    borderBottomColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D4EBDC',
    marginVertical: 2,
  },
  milestoneRowLast: {
    borderBottomWidth: 0,
  },
  milestoneDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneDotReached: {
    backgroundColor: Colors.green.fg, // #1F6B45
    shadowColor: Colors.green.fg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  milestoneDotPending: {
    backgroundColor: Colors.surface.tint,
    borderWidth: 1,
    borderColor: Colors.surface.borderSecondary,
  },
  milestoneDotDays: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    color: Colors.text.muted,
  },
  milestoneContent: {
    flex: 1,
    gap: 2,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
  },
  milestoneTitleReached: {
    color: Colors.green.fg,
    fontFamily: 'GeneralSans-Bold',
  },
  completedBadge: {
    backgroundColor: Colors.green.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: '#C6E3D1',
  },
  completedBadgeText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 11,
    color: Colors.green.fg,
  },
  milestonePoints: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
  },
  milestonePointsReached: {
    color: Colors.green.fg,
    fontFamily: 'GeneralSans-Medium',
  },
  milestoneBadgeReached: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.green.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakPenaltyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.red.bg,
    borderWidth: 1,
    borderColor: 'rgba(153, 58, 34, 0.2)',
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  breakPenaltyNote: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.red.fg,
  },
  historyLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  historyEmpty: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  historyEmptyTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy,
  },
  historyEmptyBody: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text.muted,
    textAlign: 'center',
  },
  historyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.card,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.hairline,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconAward: {
    backgroundColor: '#FEF3C7',
  },
  historyIconPenalty: {
    backgroundColor: Colors.red.bg,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.navy,
  },
  historyMeta: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: Colors.text.muted,
  },
  historyPointsPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  historyPointsPillAward: {
    backgroundColor: '#FEF3C7',
  },
  historyPointsPillPenalty: {
    backgroundColor: Colors.red.bg,
  },
  historyPoints: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
  },
  historyPointsAward: {
    color: '#92400E',
  },
  historyPointsPenalty: {
    color: Colors.red.fg,
  },
});
