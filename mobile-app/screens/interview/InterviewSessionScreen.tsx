import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  Timer,
  Lightbulb,
  Microphone,
  Record,
  StopCircle,
  Play,
  Pause,
  ArrowCounterClockwise,
  Waveform,
  WifiSlash,
  CircleNotch,
  CheckCircle,
} from 'phosphor-react-native';
import {
  INTERVIEW_QUESTIONS,
  InterviewQuestion,
} from '@/data/interviewQuestions';
import { Radii } from '@/theme/tokens';

export type SessionPhase = 'prep' | 'recording' | 'review' | 'queue' | 'processing';

export interface InterviewSessionScreenProps {
  initialQuestionIndex?: number;
  onFinishSession?: () => void;
}

export function InterviewSessionScreen({
  initialQuestionIndex = 1, // Start on Question 2 by default to match the user's screenshot, or Q1
  onFinishSession,
}: InterviewSessionScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(initialQuestionIndex);
  const [phase, setPhase] = useState<SessionPhase>('prep');
  const [prepCountdown, setPrepCountdown] = useState<number>(24);
  const [recordingElapsed, setRecordingElapsed] = useState<number>(42);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [retakesLeft, setRetakesLeft] = useState<Record<number, number>>({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });

  const totalQuestions = INTERVIEW_QUESTIONS.length;
  const question: InterviewQuestion =
    INTERVIEW_QUESTIONS[currentQuestionIndex] || INTERVIEW_QUESTIONS[0];

  // ─── ANIMATED AUDIO WAVEFORM BARS ──────────────────────────────────────────
  const barHeights = [
    useRef(new Animated.Value(24)).current,
    useRef(new Animated.Value(48)).current,
    useRef(new Animated.Value(32)).current,
    useRef(new Animated.Value(64)).current,
    useRef(new Animated.Value(52)).current,
    useRef(new Animated.Value(38)).current,
    useRef(new Animated.Value(58)).current,
    useRef(new Animated.Value(44)).current,
    useRef(new Animated.Value(28)).current,
  ];

  useEffect(() => {
    if (phase === 'recording') {
      const animations = barHeights.map((anim, idx) => {
        const minH = 16 + (idx % 3) * 6;
        const maxH = 50 + (idx % 4) * 8;
        const duration = 380 + (idx % 5) * 80;

        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxH,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: minH,
              duration,
              useNativeDriver: false,
            }),
          ])
        );
      });

      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    }
  }, [phase]);

  // ─── TIMERS ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: any;
    if (phase === 'prep') {
      timer = setInterval(() => {
        setPrepCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (phase === 'recording') {
      timer = setInterval(() => {
        setRecordingElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }
  };

  // ─── PHASE TRANSITIONS ─────────────────────────────────────────────────────
  const handleStartRecording = () => {
    triggerHaptic();
    setRecordingElapsed(0);
    setPhase('recording');
  };

  const handleStopRecording = () => {
    triggerHaptic();
    setPhase('review');
  };

  const handleKeepAnswer = () => {
    triggerHaptic();
    // After answering question 2, show the upload queue resilience screen (Screenshot 5)
    if (currentQuestionIndex === 1) {
      setPhase('queue');
    } else if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setPrepCountdown(30);
      setPhase('prep');
    } else {
      setPhase('processing');
    }
  };

  const handleRetakeAnswer = () => {
    triggerHaptic();
    setRetakesLeft((prev) => ({
      ...prev,
      [currentQuestionIndex]: Math.max(0, (prev[currentQuestionIndex] ?? 1) - 1),
    }));
    setPrepCountdown(30);
    setPhase('prep');
  };

  const handleQueueContinue = () => {
    triggerHaptic();
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setPrepCountdown(30);
      setPhase('prep');
    } else {
      setPhase('processing');
    }
  };

  // ─── PROCESSING PHASE (Matches Screen 30 in HTML) ──────────────────────────
  if (phase === 'processing') {
    return (
      <SafeAreaView style={styles.processingSafe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.processingContainer}>
          <View style={styles.processingHeader}>
            <Text style={styles.processingStep}>STEP 3 OF 4 · MARKING</Text>
            <Text style={styles.processingTitle}>Marking your answers</Text>
            <Text style={styles.processingDesc}>
              All six answers are in. This usually takes 6 to 8 minutes.
            </Text>
          </View>

          <View style={styles.processingCard}>
            <View style={[styles.processingRow, styles.processingRowBorder]}>
              <CheckCircle size={20} color="#1F6B45" weight="fill" />
              <Text style={styles.processingRowLabel}>All answers received</Text>
              <Text style={styles.processingDoneBadge}>DONE</Text>
            </View>

            <View style={[styles.processingRow, styles.processingRowBorder]}>
              <CheckCircle size={20} color="#1F6B45" weight="fill" />
              <Text style={styles.processingRowLabel}>Speech converted to text</Text>
              <Text style={styles.processingDoneBadge}>DONE</Text>
            </View>

            <View style={[styles.processingRowCol, styles.processingRowBorder]}>
              <View style={styles.processingRowActive}>
                <CircleNotch size={20} color="#0A1931" weight="bold" />
                <Text style={styles.processingRowLabelActive}>Marking against the rubric</Text>
                <Text style={styles.processingNowBadge}>NOW</Text>
              </View>
              <View style={styles.processingMeterTrack}>
                <View style={styles.processingMeterFill} />
              </View>
            </View>

            <View style={[styles.processingRow, { opacity: 0.55 }]}>
              <View style={styles.emptyCircle} />
              <Text style={styles.processingRowLabel}>Writing your report</Text>
            </View>
          </View>

          <View style={styles.processingNotice}>
            <Text style={styles.processingNoticeText}>
              Close the app if you like. We will message you the moment the report is ready.
            </Text>
          </View>

          <View style={styles.spacer} />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonNavy,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              if (onFinishSession) {
                onFinishSession();
              }
            }}
          >
            <Text style={styles.primaryButtonNavyText}>See my report</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── QUEUE / OFFLINE RESILIENCE PHASE (Screenshot 5) ────────────────────────
  if (phase === 'queue') {
    const nextQNum = currentQuestionIndex + 2;

    return (
      <SafeAreaView style={styles.darkSafe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.darkContainer}>
          {/* Top Amber Warning Banner */}
          <View style={styles.connectionBanner}>
            <WifiSlash size={18} color="#D4AF37" weight="bold" />
            <Text style={styles.connectionBannerText}>
              Connection dropped. Nothing is lost.
            </Text>
          </View>

          {/* Titles */}
          <View style={styles.queueTitleSection}>
            <Text style={styles.darkMainTitle}>Sending your answers</Text>
            <Text style={styles.darkSubtitle}>
              Answer {currentQuestionIndex + 1} is queued and will finish on its own. You can carry on with question {nextQNum}.
            </Text>
          </View>

          {/* Upload Status List */}
          <View style={styles.queueCardList}>
            {/* Answer 1: Sent */}
            <View style={styles.queueRow}>
              <CheckCircle size={20} color="#E7E3F6" weight="fill" />
              <Text style={styles.queueRowTitle}>Answer 1</Text>
              <Text style={styles.queueRowStatus}>1.2 MB sent</Text>
            </View>

            {/* Answer 2: Retrying */}
            <View style={styles.queueRetryCard}>
              <View style={styles.queueRetryHeader}>
                <CircleNotch size={20} color="#D4AF37" weight="bold" />
                <Text style={styles.queueRowTitle}>Answer 2</Text>
                <Text style={styles.queueRowStatus}>retry 3 of 5</Text>
              </View>
              <View style={styles.retryProgressTrack}>
                <View style={[styles.retryProgressFill, { width: '44%' }]} />
              </View>
            </View>

            {/* Answers 3-6: Pending */}
            <View style={[styles.queueRow, { opacity: 0.6 }]}>
              <View style={styles.emptyCircleWhite} />
              <Text style={styles.queueRowTitle}>Answers 3–6</Text>
              <Text style={styles.queueRowStatus}>not recorded</Text>
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Bottom Action */}
          <View style={styles.bottomSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonWhite,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleQueueContinue}
            >
              <Text style={styles.primaryButtonWhiteText}>
                Continue to question {nextQNum}
              </Text>
            </Pressable>

            <Text style={styles.darkDisclaimerText}>
              You can close the app — the session waits for you
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── REVIEW / KEEP OR RETAKE PHASE (Screenshot 4) ──────────────────────────
  if (phase === 'review') {
    const qNumber = currentQuestionIndex + 1;
    const remainingRetakes = retakesLeft[currentQuestionIndex] ?? 1;

    return (
      <SafeAreaView style={styles.darkSafe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.darkContainer}>
          {/* Eyebrow */}
          <Text style={styles.goldEyebrow}>ANSWER {qNumber} RECORDED</Text>

          {/* Title Section */}
          <View style={styles.titleSectionDark}>
            <Text style={styles.darkMainTitle}>Keep this answer?</Text>
            <Text style={styles.darkSubtitle}>
              You have {remainingRetakes === 1 ? 'one retake' : `${remainingRetakes} retakes`} left for this question.
            </Text>
          </View>

          {/* Audio Playback Card */}
          <View style={styles.playbackCard}>
            <View style={styles.playbackTopRow}>
              <Pressable
                style={styles.playButton}
                onPress={() => setIsPlayingAudio(!isPlayingAudio)}
              >
                {isPlayingAudio ? (
                  <Pause size={18} color="#D4AF37" weight="fill" />
                ) : (
                  <Play size={18} color="#D4AF37" weight="fill" />
                )}
              </Pressable>

              <View style={styles.waveformContainer}>
                {/* Static / interactive waveform preview bars */}
                <View style={styles.barsRow}>
                  {[40, 75, 55, 90, 62, 38, 80, 46, 68, 34].map((h, i) => (
                    <View
                      key={i}
                      style={[
                        styles.staticWaveBar,
                        { height: `${h}%`, opacity: isPlayingAudio ? 0.9 : 0.4 },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.waveformMeta}>1:04 · 1.4 MB</Text>
              </View>
            </View>

            <View style={styles.darkDivider} />

            <View style={styles.playbackFooter}>
              <Waveform size={18} color="#E7E3F6" weight="bold" />
              <Text style={styles.playbackFooterText}>
                Audio came through clearly
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          {/* Actions */}
          <View style={styles.bottomSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButtonWhite,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleKeepAnswer}
            >
              <Text style={styles.primaryButtonWhiteText}>
                Keep it — next question
              </Text>
            </Pressable>

            {remainingRetakes > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryOutlineButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleRetakeAnswer}
              >
                <ArrowCounterClockwise size={16} color="#FFFFFF" weight="bold" />
                <Text style={styles.secondaryOutlineButtonText}>
                  Record again ({remainingRetakes} left)
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── LIVE RECORDING PHASE (Screenshot 3) ───────────────────────────────────
  if (phase === 'recording') {
    const minutes = Math.floor(recordingElapsed / 60);
    const seconds = recordingElapsed % 60;
    const timeFormatted = `0${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    const percentOfTarget = Math.min(100, Math.round((recordingElapsed / 90) * 100));

    return (
      <SafeAreaView style={styles.darkSafe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.darkContainer}>
          {/* Top Bar: Question Counter & Pulsing Red Recording Badge */}
          <View style={styles.darkHeaderBar}>
            <Text style={styles.goldEyebrow}>
              QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
            </Text>

            <View style={styles.recordingBadge}>
              <View style={styles.recordingPulseDot} />
              <Text style={styles.recordingTimerText}>{timeFormatted}</Text>
            </View>
          </View>

          {/* Question Prompt */}
          <Text style={styles.recordingQuestionText}>
            {question.prompt}
          </Text>

          {/* Center Voice Waveform Animation & Length Gauge */}
          <View style={styles.recordingCenterArea}>
            <View style={styles.activeWaveContainer}>
              {barHeights.map((animHeight, i) => (
                <Animated.View
                  key={i}
                  style={[styles.animatedVoiceBar, { height: animHeight }]}
                />
              ))}
            </View>

            {/* Suggested Length Indicator */}
            <View style={styles.suggestedLengthContainer}>
              <Text style={styles.suggestedEyebrow}>SUGGESTED LENGTH</Text>
              <View style={styles.suggestedTrack}>
                <View style={[styles.suggestedFill, { width: `${percentOfTarget}%` as any }]} />
              </View>
              <Text style={styles.suggestedTimeMeta}>
                {timeFormatted} of about 1:30
              </Text>
            </View>
          </View>

          {/* Save Status Strip */}
          <View style={styles.saveStatusStrip}>
            <CheckCircle size={18} color="#E7E3F6" weight="fill" />
            <Text style={styles.saveStatusText}>
              {currentQuestionIndex === 0
                ? 'Each answer uploads as you finish it.'
                : `Answer ${currentQuestionIndex} already saved. Each answer uploads as you finish it.`}
            </Text>
          </View>

          {/* Stop Recording Button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonWhite,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleStopRecording}
          >
            <StopCircle size={18} color="#0A1931" weight="fill" />
            <Text style={styles.primaryButtonWhiteText}>Stop recording</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── PREP COUNTDOWN PHASE (Screenshot 2) ───────────────────────────────────
  const secondsFormatted = `0:${prepCountdown < 10 ? '0' : ''}${prepCountdown}`;

  return (
    <SafeAreaView style={styles.darkSafe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.darkContainer}>
        {/* Header Bar */}
        <View style={styles.darkHeaderBar}>
          <Text style={styles.goldEyebrow}>
            QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
          </Text>

          <View style={styles.prepTimerBadge}>
            <Timer size={14} color="#FFFFFF" weight="bold" />
            <Text style={styles.prepTimerText}>{secondsFormatted}</Text>
          </View>
        </View>

        {/* 6-Segment Progress Bar */}
        <View style={styles.segmentsRow}>
          {INTERVIEW_QUESTIONS.map((_, idx) => {
            const isCompletedOrActive = idx <= currentQuestionIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.segment,
                  isCompletedOrActive ? styles.segmentActive : styles.segmentInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Question Prompt */}
        <ScrollView
          style={styles.prepScroll}
          contentContainerStyle={styles.prepScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.prepQuestionTitle}>
            {question.prompt}
          </Text>

          {/* HOW TO ANSWER Guidance Card */}
          <View style={styles.guidanceCard}>
            <View style={styles.guidanceHeader}>
              <Lightbulb size={16} color="#E7E3F6" weight="bold" />
              <Text style={styles.guidanceHeaderText}>HOW TO ANSWER</Text>
            </View>

            <View style={styles.tipsList}>
              {question.tips.map((tip, idx) => (
                <Text key={idx} style={styles.tipText}>
                  {tip}
                </Text>
              ))}
            </View>
          </View>

          {/* Aim Duration Tip Card */}
          <View style={styles.durationCard}>
            <Microphone size={18} color="#E7E3F6" weight="bold" />
            <Text style={styles.durationCardText}>
              Aim for 60–90 seconds. Recording starts when you tap.
            </Text>
          </View>
        </ScrollView>

        {/* Start Recording CTA */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonWhite,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleStartRecording}
          >
            <Record size={18} color="#B23A1E" weight="fill" />
            <Text style={styles.primaryButtonWhiteText}>Start recording</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ─── DARK COMMON LAYOUT (Navy #0A1931) ─────────────────────────────────────
  darkSafe: {
    flex: 1,
    backgroundColor: '#0A1931',
  },
  darkContainer: {
    flex: 1,
    backgroundColor: '#0A1931',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  darkHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goldEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#D4AF37',
  },
  prepTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  prepTimerText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  segmentsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  segmentActive: {
    backgroundColor: '#FFFCF7',
  },
  segmentInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  prepScroll: {
    flex: 1,
  },
  prepScrollContent: {
    gap: 22,
    paddingBottom: 16,
  },
  prepQuestionTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  guidanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  guidanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidanceHeaderText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#E7E3F6',
  },
  tipsList: {
    gap: 8,
  },
  tipText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(214, 237, 220, 0.14)',
    borderRadius: 16,
    padding: 16,
  },
  durationCardText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // ─── RECORDING STATE STYLES ────────────────────────────────────────────────
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(178, 58, 30, 0.25)',
  },
  recordingPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2603F',
  },
  recordingTimerText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  recordingQuestionText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 18,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 6,
  },
  recordingCenterArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  activeWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    gap: 5,
  },
  animatedVoiceBar: {
    width: 4,
    backgroundColor: '#FFFCF7',
    borderRadius: 3,
  },
  suggestedLengthContainer: {
    alignItems: 'center',
    gap: 8,
  },
  suggestedEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#D4AF37',
  },
  suggestedTrack: {
    width: 180,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  suggestedFill: {
    height: '100%',
    backgroundColor: '#FFFCF7',
    borderRadius: 999,
  },
  suggestedTimeMeta: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  saveStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(214, 237, 220, 0.14)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  saveStatusText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // ─── REVIEW STATE STYLES ───────────────────────────────────────────────────
  titleSectionDark: {
    marginTop: 6,
    marginBottom: 20,
    gap: 6,
  },
  darkMainTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  darkSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.68)',
  },
  playbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  playbackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0A1931',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flex: 1,
    gap: 6,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    gap: 3,
  },
  staticWaveBar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  waveformMeta: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  darkDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playbackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playbackFooterText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  secondaryOutlineButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'transparent',
    borderRadius: Radii.pill,
    paddingVertical: 16,
  },
  secondaryOutlineButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
  },

  // ─── QUEUE STATE STYLES ────────────────────────────────────────────────────
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
    borderRadius: 16,
    marginBottom: 8,
  },
  connectionBannerText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#E6C79A',
  },
  queueTitleSection: {
    marginBottom: 20,
    gap: 6,
  },
  queueCardList: {
    gap: 10,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
  },
  queueRowTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  queueRowStatus: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  queueRetryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  queueRetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  retryProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  retryProgressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 999,
  },
  emptyCircleWhite: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  darkDisclaimerText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
  },

  // ─── BUTTONS ───────────────────────────────────────────────────────────────
  bottomSection: {
    gap: 10,
    marginTop: 12,
  },
  primaryButtonWhite: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.pill,
    paddingVertical: 17,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonWhiteText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 21,
    color: '#0A1931',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },

  // ─── PROCESSING STYLES ─────────────────────────────────────────────────────
  processingSafe: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  processingContainer: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  processingHeader: {
    marginBottom: 24,
    gap: 6,
  },
  processingStep: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  processingTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -0.4,
    color: '#0A1931',
  },
  processingDesc: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#3A4761',
  },
  processingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  processingRowCol: {
    paddingVertical: 14,
    gap: 10,
  },
  processingRowActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBDF',
  },
  processingRowLabel: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: '#3A4761',
  },
  processingRowLabelActive: {
    flex: 1,
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    color: '#0A1931',
  },
  processingDoneBadge: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    color: '#5F6B80',
  },
  processingNowBadge: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    color: '#0A1931',
  },
  processingMeterTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#F0EBDF',
    overflow: 'hidden',
    marginLeft: 32,
  },
  processingMeterFill: {
    height: '100%',
    width: '45%',
    backgroundColor: '#0A1931',
    borderRadius: 999,
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD6C7',
  },
  processingNotice: {
    backgroundColor: '#F4EFE4',
    borderRadius: 16,
    padding: 16,
  },
  processingNoticeText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },
  primaryButtonNavy: {
    width: '100%',
    backgroundColor: '#0A1931',
    borderRadius: Radii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonNavyText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
});
