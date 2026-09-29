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
  Microphone,
  ShieldCheck,
  WarningCircle,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';
import {
  InterviewOffer,
  getInterviewOffer,
  interviewErrorMessage,
  startInterviewSession,
} from '@/services/api/interview';

interface Props {
  onBack?: () => void;
}

export function MockInterviewIntroScreen({ onBack }: Props) {
  const router = useRouter();
  const [offer, setOffer] = useState<InterviewOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOffer(await getInterviewOffer());
    } catch (caught) {
      setError(interviewErrorMessage(caught, 'Could not load the interview offer.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const continueFlow = async () => {
    if (!offer) return;
    if (offer.open_session_id) {
      router.push({
        pathname: '/interview-session',
        params: { sessionId: offer.open_session_id },
      });
      return;
    }
    if (!offer.device_check_passed) {
      router.push('/device-check');
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const session = await startInterviewSession();
      router.push({
        pathname: '/interview-session',
        params: { sessionId: session.id },
      });
    } catch (caught) {
      setError(interviewErrorMessage(caught, 'Could not start the interview.'));
    } finally {
      setStarting(false);
    }
  };

  const cta = offer?.open_session_id
    ? 'Resume interview'
    : offer?.device_check_passed
      ? 'Start interview'
      : 'Test before interview';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={goBack}>
          <ArrowLeft size={18} color="#0A1931" weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>Mock interview</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {loading && !offer ? (
          <View style={styles.center}>
            <ActivityIndicator color="#5F4DB2" />
            <Text style={styles.muted}>Checking your interview access…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <WarningCircle size={22} color="#993A22" weight="fill" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.smallButton} onPress={load}>
              <Text style={styles.smallButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : offer ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Microphone size={38} color="#FFFFFF" weight="fill" />
              </View>
              <Text style={styles.title}>Practise six interview answers</Text>
              <Text style={styles.subtitle}>
                Record audio on this device. Each answer is saved before you move on.
              </Text>
            </View>

            <>
                <View style={styles.card}>
                  <InfoRow icon={<Microphone size={19} color="#5F4DB2" />} label="Format" value="Audio only" />
                  <InfoRow icon={<Clock size={19} color="#5F4DB2" />} label="Questions" value="6 · about 15 min" />
                  <InfoRow
                    icon={<ShieldCheck size={19} color="#5F4DB2" />}
                    label="Device check"
                    value={offer.device_check_passed ? 'Passed' : 'Required before interview'}
                    last
                  />
                </View>

                <View style={offer.will_increase_score ? styles.scoreYes : styles.scoreNo}>
                  {offer.will_increase_score ? (
                    <CheckCircle size={21} color="#1F6B45" weight="fill" />
                  ) : (
                    <WarningCircle size={21} color="#7A5C0E" weight="fill" />
                  )}
                  <Text style={styles.scoreText}>
                    {offer.will_increase_score
                      ? 'Completing this session adds points to your score.'
                      : 'You have reached the three-session score cap. This session is practice only and will not increase your score.'}
                  </Text>
                </View>

                {offer.open_session_id && (
                  <Text style={styles.resumeNote}>
                    Your unfinished session is safe. You will return to the first answer that is not stored.
                  </Text>
                )}

                <Pressable
                  style={[styles.primary, starting && styles.disabled]}
                  onPress={continueFlow}
                  disabled={starting}
                >
                  {starting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{cta}</Text>}
                </Pressable>
                <Text style={styles.footnote}>
                  Mock interviews are included in your active subscription.
                </Text>
              </>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      {icon}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFCF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7E0D4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { flex: 1, fontFamily: 'GeneralSans-Semibold', fontSize: 16, color: '#0A1931' },
  content: { padding: 20, paddingTop: 12, paddingBottom: 36, gap: 18 },
  center: { minHeight: 350, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { fontFamily: 'GeneralSans-Regular', fontSize: 14, color: '#5F6B80' },
  hero: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: '#E6EAF5',
    gap: 10,
  },
  heroIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#5F4DB2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontFamily: 'GeneralSans-Bold', fontSize: 27, lineHeight: 33, color: '#0A1931' },
  subtitle: { fontFamily: 'GeneralSans-Regular', fontSize: 15, lineHeight: 22, color: '#3A4761' },
  card: {
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EBDF' },
  rowLabel: { flex: 1, fontFamily: 'GeneralSans-Regular', fontSize: 14, color: '#3A4761' },
  rowValue: {
    maxWidth: '52%',
    textAlign: 'right',
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    color: '#0A1931',
  },
  scoreYes: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 16, backgroundColor: '#EAF5EE' },
  scoreNo: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 16, backgroundColor: '#FCF3DE' },
  scoreText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#26344D',
  },
  resumeNote: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#5F6B80',
  },
  primary: {
    marginTop: 4,
    borderRadius: Radii.pill,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#5F4DB2',
  },
  primaryText: { fontFamily: 'GeneralSans-Semibold', fontSize: 16, color: '#FFFFFF' },
  disabled: { opacity: 0.5 },
  footnote: { textAlign: 'center', fontFamily: 'GeneralSans-Regular', fontSize: 12, color: '#5F6B80' },
  errorCard: { alignItems: 'center', gap: 12, borderRadius: 20, padding: 22, backgroundColor: '#FCEBE6' },
  errorText: { fontFamily: 'GeneralSans-Regular', fontSize: 14, color: '#993A22', textAlign: 'center' },
  smallButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radii.pill, backgroundColor: '#0A1931' },
  smallButtonText: { fontFamily: 'GeneralSans-Semibold', fontSize: 13, color: '#FFFFFF' },
});
