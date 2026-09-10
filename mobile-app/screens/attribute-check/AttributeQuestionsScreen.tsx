import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Compass,
  CheckCircle,
  Info,
} from 'phosphor-react-native';
import {
  ATTRIBUTE_QUESTIONS,
  LIKERT_OPTIONS,
  AttributeQuestion,
} from '@/data/attributeQuestions';
import { Radii } from '@/theme/tokens';

export interface AttributeQuestionsScreenProps {
  initialIndex?: number;
  onBack?: () => void;
  onComplete?: (answers: Record<number, number>) => void;
}

export function AttributeQuestionsScreen({
  initialIndex = 0,
  onBack,
  onComplete,
}: AttributeQuestionsScreenProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const totalQuestions = ATTRIBUTE_QUESTIONS.length;
  const currentQuestion: AttributeQuestion =
    ATTRIBUTE_QUESTIONS[currentIndex] || ATTRIBUTE_QUESTIONS[0];

  const selectedScore = answers[currentQuestion.id];

  const handleBackPress = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSelectOption = (score: number) => {
    if (isTransitioning) return;

    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore if haptics unavailable
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: score,
    };
    setAnswers(updatedAnswers);
    setIsTransitioning(true);

    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => prev + 1);
        setIsTransitioning(false);
      } else {
        setIsTransitioning(false);
        if (onComplete) {
          onComplete(updatedAnswers);
        }
      }
    }, 240);
  };

  const progressPercent = `${Math.round(((currentIndex + 1) / totalQuestions) * 100)}%`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go to previous question"
          >
            <ArrowLeft size={18} color="#0A1931" weight="bold" />
          </Pressable>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: progressPercent as any },
              ]}
            />
          </View>

          {/* Progress Counter */}
          <Text style={styles.counterText}>
            {currentIndex + 1}/{totalQuestions}
          </Text>
        </View>

        {/* Question & Options Scrollable View */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Tag Pill */}
          <View style={styles.categoryBadge}>
            <Compass size={13} color="#0A1931" weight="fill" />
            <Text style={styles.categoryBadgeText}>
              {currentQuestion.category}
            </Text>
          </View>

          {/* Question Prompt */}
          <Text style={styles.questionPrompt}>
            {currentQuestion.prompt}
          </Text>

          {/* Likert Scale Options */}
          <View style={styles.optionsList}>
            {LIKERT_OPTIONS.map((option) => {
              const isSelected = selectedScore === option.score;

              return (
                <Pressable
                  key={option.id}
                  style={({ pressed }) => [
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleSelectOption(option.score)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                >
                  {isSelected ? (
                    <CheckCircle size={20} color="#FFFFFF" weight="fill" />
                  ) : (
                    <View style={styles.radioOutline} />
                  )}

                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Bottom Reassurance / Note Strip */}
          <View style={styles.reassuranceCard}>
            <Info size={18} color="#3A4761" weight="bold" />
            <Text style={styles.reassuranceText}>
              There are no right answers here, and none of this affects your resume score.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E0D4',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5F4DB2',
    borderRadius: 999,
  },
  counterText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    color: '#3A4761',
    minWidth: 38,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    marginBottom: 16,
  },
  categoryBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#0A1931',
  },
  questionPrompt: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: '#0A1931',
    marginBottom: 24,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  optionCardSelected: {
    backgroundColor: '#5F4DB2',
    borderColor: '#5F4DB2',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD6C7',
  },
  optionLabel: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
    flex: 1,
  },
  optionLabelSelected: {
    fontFamily: 'GeneralSans-Semibold',
    color: '#FFFFFF',
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  reassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7EFD6',
    borderRadius: 18,
    padding: 16,
  },
  reassuranceText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },
});
