import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Lightbulb,
  WarningCircle,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';
import {
  FeedbackLevel,
  InterviewReport,
  getInterviewReport,
  interviewErrorMessage,
} from '@/services/api/interview';

interface Props {
  sessionId: string;
}

export function InterviewReportScreen({ sessionId }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await getInterviewReport(sessionId));
    } catch (caught) {
      setError(interviewErrorMessage(caught, 'Could not load the interview report.'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (report?.status !== 'PENDING') return;
    const timer = setTimeout(load, 5000);
    return () => clearTimeout(timer);
  }, [load, report?.status]);

  const home = () => router.replace('/home');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={home}>
          <ArrowLeft size={18} color="#0A1931" weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>Interview feedback</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {loading && !report ? (
          <State icon={<ActivityIndicator size="large" color="#5F4DB2" />} title="Loading your report" body="Reading the latest session status…" />
        ) : error ? (
          <State icon={<WarningCircle size={42} color="#993A22" weight="fill" />} title="Report unavailable" body={error} action={load} actionLabel="Try again" />
        ) : report?.status === 'PENDING' ? (
          <State
            icon={<Clock size={44} color="#5F4DB2" weight="duotone" />}
            title="Your answers are stored"
            body="Feedback has not finished yet. You can leave this screen; we will keep checking when you return."
            action={home}
            actionLabel="Go home"
          />
        ) : report?.status === 'FAILED' ? (
          <State
            icon={<WarningCircle size={44} color="#7A5C0E" weight="fill" />}
            title="Feedback could not be prepared"
            body={failureCopy(report.failure_reason)}
            action={home}
            actionLabel="Go home"
          />
        ) : report?.status === 'READY' ? (
          <>
            <View style={styles.hero}>
              <CheckCircle size={34} color="#FFFFFF" weight="fill" />
              <Text style={styles.heroTitle}>Your practice feedback</Text>
              <Text style={styles.heroBody}>
                Levels describe this recording only. They do not change your score.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>FEEDBACK AREAS</Text>
            <View style={styles.card}>
              {report.dimensions.map((dimension, index) => (
                <View
                  key={dimension.code}
                  style={[styles.dimension, index < report.dimensions.length - 1 && styles.divider]}
                >
                  <View style={styles.dimensionHeader}>
                    <Text style={styles.dimensionLabel}>{dimension.label}</Text>
                    <LevelBadge level={dimension.level} />
                  </View>
                  <Text style={styles.goodLooks}>{dimension.what_good_looks_like}</Text>
                </View>
              ))}
            </View>

            {report.focus_areas.length > 0 && (
              <View style={styles.focus}>
                <Lightbulb size={20} color="#5F4DB2" weight="fill" />
                <View style={styles.focusCopy}>
                  <Text style={styles.focusTitle}>Focus next time</Text>
                  <Text style={styles.focusText}>
                    {report.dimensions
                      .filter((dimension) => report.focus_areas.includes(dimension.code))
                      .map((dimension) => dimension.label)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>ANSWER BY ANSWER</Text>
            <View style={styles.answers}>
              {report.questions.map((question) => (
                <View key={question.code} style={styles.answer}>
                  <Text style={styles.answerNumber}>Q{question.index + 1}</Text>
                  <View style={styles.answerCopy}>
                    <Text style={styles.answerPrompt}>{question.prompt}</Text>
                    <Text style={styles.answerMeta}>
                      {question.spoken ? 'Speech detected' : 'No speech detected'}
                    </Text>
                    {question.comment && <Text style={styles.answerComment}>{question.comment}</Text>}
                    <Text style={styles.lookingFor}>A strong answer includes: {question.looking_for}</Text>
                    {question.transcript ? (
                      <Text style={styles.transcript}>“{question.transcript}”</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            <Pressable style={styles.primary} onPress={() => router.push('/jobs')}>
              <Text style={styles.primaryText}>Find jobs</Text>
            </Pressable>
            <Pressable style={styles.outline} onPress={home}>
              <Text style={styles.outlineText}>Go home</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function State({
  icon,
  title,
  body,
  action,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.state}>
      {icon}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {action && actionLabel && (
        <Pressable style={styles.primary} onPress={action}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function LevelBadge({ level }: { level: FeedbackLevel }) {
  const label = {
    STRONG: 'Strong',
    DEVELOPING: 'Developing',
    FOCUS_AREA: 'Focus area',
  }[level];
  return (
    <View style={[styles.badge, level === 'STRONG' ? styles.strong : level === 'DEVELOPING' ? styles.developing : styles.focusBadge]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function failureCopy(reason: string | null): string {
  if (reason === 'no_speech') return 'The recordings did not contain enough speech to prepare feedback.';
  if (reason === 'evaluation_invalid') return 'The feedback provider returned an invalid report, so BharatPath did not show it.';
  return 'The feedback provider could not prepare a valid report. Your completed session remains recorded.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFCF7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#E7E0D4', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'GeneralSans-Semibold', fontSize: 16, color: '#0A1931' },
  content: { flexGrow: 1, padding: 20, paddingTop: 12, paddingBottom: 40, gap: 14 },
  state: { flex: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 10 },
  stateTitle: { fontFamily: 'GeneralSans-Bold', fontSize: 25, color: '#0A1931', textAlign: 'center' },
  stateBody: { fontFamily: 'GeneralSans-Regular', fontSize: 14, lineHeight: 21, color: '#3A4761', textAlign: 'center' },
  hero: { gap: 10, padding: 21, borderRadius: 22, backgroundColor: '#5F4DB2' },
  heroTitle: { fontFamily: 'GeneralSans-Bold', fontSize: 25, color: '#FFFFFF' },
  heroBody: { fontFamily: 'GeneralSans-Regular', fontSize: 14, lineHeight: 20, color: '#E8E3FA' },
  sectionLabel: { marginTop: 8, fontFamily: 'SpaceMono-Bold', fontSize: 11, letterSpacing: 1.1, color: '#5F6B80' },
  card: { borderWidth: 1, borderColor: '#E7E0D4', borderRadius: 20, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  dimension: { paddingVertical: 15, gap: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F0EBDF' },
  dimensionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dimensionLabel: { flex: 1, fontFamily: 'GeneralSans-Semibold', fontSize: 15, color: '#0A1931' },
  goodLooks: { fontFamily: 'GeneralSans-Regular', fontSize: 13, lineHeight: 19, color: '#3A4761' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.pill },
  strong: { backgroundColor: '#DFF2E6' },
  developing: { backgroundColor: '#F4EFD8' },
  focusBadge: { backgroundColor: '#F8E2DC' },
  badgeText: { fontFamily: 'GeneralSans-Semibold', fontSize: 11, color: '#26344D' },
  focus: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 18, backgroundColor: '#F2EFFB' },
  focusCopy: { flex: 1, gap: 4 },
  focusTitle: { fontFamily: 'GeneralSans-Semibold', fontSize: 14, color: '#0A1931' },
  focusText: { fontFamily: 'GeneralSans-Regular', fontSize: 13, color: '#3A4761' },
  answers: { gap: 10 },
  answer: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderColor: '#E7E0D4', borderRadius: 18, backgroundColor: '#FFFFFF' },
  answerNumber: { fontFamily: 'SpaceMono-Bold', fontSize: 12, color: '#5F4DB2' },
  answerCopy: { flex: 1, gap: 7 },
  answerPrompt: { fontFamily: 'GeneralSans-Semibold', fontSize: 14, lineHeight: 20, color: '#0A1931' },
  answerMeta: { fontFamily: 'GeneralSans-Regular', fontSize: 12, color: '#5F6B80' },
  answerComment: { fontFamily: 'GeneralSans-Regular', fontSize: 13, lineHeight: 19, color: '#3A4761' },
  lookingFor: { fontFamily: 'GeneralSans-Regular', fontSize: 13, lineHeight: 19, color: '#5F4DB2' },
  transcript: { fontFamily: 'GeneralSans-Regular', fontSize: 13, lineHeight: 19, color: '#5F6B80', fontStyle: 'italic' },
  primary: { alignItems: 'center', paddingVertical: 17, paddingHorizontal: 24, borderRadius: Radii.pill, backgroundColor: '#5F4DB2', alignSelf: 'stretch' },
  primaryText: { fontFamily: 'GeneralSans-Semibold', fontSize: 15, color: '#FFFFFF' },
  outline: { alignItems: 'center', paddingVertical: 15, borderRadius: Radii.pill, borderWidth: 1, borderColor: '#DDD6C7' },
  outlineText: { fontFamily: 'GeneralSans-Semibold', fontSize: 14, color: '#0A1931' },
});
