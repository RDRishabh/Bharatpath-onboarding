import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MicrophoneStage,
  ChatCircleText,
  TreeStructure,
  Flask,
  HandHeart,
  Target,
  CaretRight,
  DownloadSimple,
} from 'phosphor-react-native';
import {
  DEFAULT_INTERVIEW_REPORT,
  InterviewReportData,
} from '@/data/interviewQuestions';
import { Radii } from '@/theme/tokens';

export interface InterviewReportScreenProps {
  data?: InterviewReportData;
  onGoHome?: () => void;
  onFindJobs?: () => void;
}

export function InterviewReportScreen({
  data = DEFAULT_INTERVIEW_REPORT,
  onGoHome,
  onFindJobs,
}: InterviewReportScreenProps) {
  const router = useRouter();

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.replace('/home');
    }
  };

  const handleJobs = () => {
    if (onFindJobs) {
      onFindJobs();
    } else {
      router.push('/jobs' as any);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Hero Dark Header Section */}
      <View style={styles.heroSection}>
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.heroHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleHome}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={16} color="#FFFFFF" weight="bold" />
            </Pressable>

            <Text style={styles.heroTitle}>Interview report</Text>
            <Text style={styles.heroDate}>{data.date}</Text>
          </View>

          <View style={styles.scoreSummary}>
            <View style={styles.eyebrowRow}>
              <MicrophoneStage size={14} color="#F4D685" weight="duotone" />
              <Text style={styles.eyebrowText}>OVERALL, OUT OF 10</Text>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreLarge}>{data.overallScore}</Text>
              <Text style={styles.verdictBadge}>{data.overallVerdict}</Text>
            </View>

            <Text style={styles.scoreDesc}>{data.summary}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Light Content Sheet */}
      <View style={styles.contentSheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section: Marked on four things */}
          <Text style={styles.sectionLabel}>MARKED ON FOUR THINGS</Text>
          <View style={styles.rubricCard}>
            {/* Communication */}
            <View style={[styles.rubricRow, styles.rubricRowBorder]}>
              <View style={styles.rubricHeader}>
                <ChatCircleText size={17} color="#5E4DB2" weight="duotone" />
                <Text style={styles.rubricName}>Communication</Text>
                <Text style={styles.rubricScore}>
                  {data.dimensions.communication.score}
                  <Text style={styles.rubricScoreMax}>/10</Text>
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${data.dimensions.communication.percentage}%` as any },
                  ]}
                />
              </View>
            </View>

            {/* Structure */}
            <View style={[styles.rubricRow, styles.rubricRowBorder]}>
              <View style={styles.rubricHeader}>
                <TreeStructure size={17} color="#5E4DB2" weight="duotone" />
                <Text style={styles.rubricName}>Structure</Text>
                <Text style={styles.rubricScore}>
                  {data.dimensions.structure.score}
                  <Text style={styles.rubricScoreMax}>/10</Text>
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${data.dimensions.structure.percentage}%` as any },
                  ]}
                />
              </View>
            </View>

            {/* Role Knowledge */}
            <View style={[styles.rubricRow, styles.rubricRowBorder]}>
              <View style={styles.rubricHeader}>
                <Flask size={17} color="#5E4DB2" weight="duotone" />
                <Text style={styles.rubricName}>Role knowledge</Text>
                <Text style={styles.rubricScore}>
                  {data.dimensions.roleKnowledge.score}
                  <Text style={styles.rubricScoreMax}>/10</Text>
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${data.dimensions.roleKnowledge.percentage}%` as any },
                  ]}
                />
              </View>
            </View>

            {/* Confidence */}
            <View style={styles.rubricRow}>
              <View style={styles.rubricHeader}>
                <HandHeart size={17} color="#5E4DB2" weight="duotone" />
                <Text style={styles.rubricName}>Confidence</Text>
                <Text style={styles.rubricScore}>
                  {data.dimensions.confidence.score}
                  <Text style={styles.rubricScoreMax}>/10</Text>
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${data.dimensions.confidence.percentage}%` as any },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* One thing to change Card */}
          <View style={styles.adviceCard}>
            <View style={styles.adviceHeader}>
              <Target size={15} color="#D4AF37" weight="fill" />
              <Text style={styles.adviceEyebrow}>ONE THING TO CHANGE</Text>
            </View>
            <Text style={styles.adviceText}>{data.oneThingToChange}</Text>
          </View>

          {/* Answer by answer breakdown */}
          <Text style={styles.sectionLabel}>ANSWER BY ANSWER</Text>
          <View style={styles.answersCard}>
            {data.questionScores.map((q, idx) => {
              const isLast = idx === data.questionScores.length - 1;
              return (
                <View
                  key={q.id}
                  style={[styles.answerRow, !isLast && styles.rubricRowBorder]}
                >
                  <Text style={styles.answerQTag}>Q{q.id}</Text>
                  <Text style={styles.answerTitle}>{q.shortTitle}</Text>
                  <Text style={styles.answerScore}>{q.score}</Text>
                  <CaretRight size={14} color="#5F6B80" />
                </View>
              );
            })}
          </View>

          {/* Sticky Bottom Actions */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.pdfButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleHome}
            >
              <DownloadSimple size={16} color="#0A1931" weight="bold" />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.findJobsButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleJobs}
            >
              <Text style={styles.findJobsButtonText}>Find jobs</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1931',
  },
  heroSection: {
    backgroundColor: '#0A1931',
    paddingBottom: 24,
  },
  heroSafe: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 247, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  heroTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  heroDate: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#9DA9BE',
  },
  scoreSummary: {
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#9DA9BE',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  scoreLarge: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 54,
    lineHeight: 52,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  verdictBadge: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#F4D685',
    marginBottom: 6,
  },
  scoreDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#9DA9BE',
  },
  contentSheet: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 14,
  },
  sectionLabel: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
    marginTop: 4,
  },
  rubricCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  rubricRow: {
    paddingVertical: 14,
    gap: 8,
  },
  rubricRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBDF',
  },
  rubricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rubricName: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: '#0A1931',
  },
  rubricScore: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: '#0A1931',
  },
  rubricScoreMax: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    color: '#5F6B80',
  },
  meterTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#F0EBDF',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: '#5E4DB2',
    borderRadius: 999,
  },
  adviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adviceEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  adviceText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#3A4761',
  },
  answersCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  answerQTag: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: '#5F6B80',
    width: 26,
  },
  answerTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: '#0A1931',
  },
  answerScore: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 13,
    color: '#0A1931',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    borderRadius: Radii.pill,
    paddingVertical: 16,
  },
  pdfButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#0A1931',
  },
  findJobsButton: {
    flex: 1.5,
    backgroundColor: '#0A1931',
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findJobsButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
