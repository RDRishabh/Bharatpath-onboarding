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
import { ArrowLeft, Compass } from 'phosphor-react-native';
import { AttributeResult } from '@/data/attributeQuestions';
import { Radii } from '@/theme/tokens';

export interface AttributeReportScreenProps {
  result: AttributeResult;
  onDone?: () => void;
  onTryInterview?: () => void;
  onRetake?: () => void;
}

export function AttributeReportScreen({
  result,
  onDone,
  onTryInterview,
  onRetake,
}: AttributeReportScreenProps) {
  const router = useRouter();

  const handleDone = () => {
    if (onDone) {
      onDone();
    } else {
      router.replace('/home');
    }
  };

  const handleTryInterview = () => {
    if (onTryInterview) {
      onTryInterview();
    } else {
      router.push('/mock-interview' as any);
    }
  };

  const { dimensions } = result;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Dark Navy Header Section */}
      <View style={styles.heroSection}>
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.heroHeaderRow}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleDone}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <ArrowLeft size={16} color="#FFFFFF" weight="bold" />
            </Pressable>

            <Text style={styles.heroTitle}>Attribute report</Text>
            <Text style={styles.dateText}>{result.date}</Text>
          </View>

          <View style={styles.typeSection}>
            <View style={styles.typeEyebrowRow}>
              <Compass size={14} color="#FFFCF7" weight="duotone" />
              <Text style={styles.typeEyebrowText}>YOUR TYPE</Text>
            </View>
            <Text style={styles.typeTitle}>{result.typeTitle}</Text>
            <Text style={styles.typeDescription}>{result.description}</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* White/Offwhite Content Sheet */}
      <View style={styles.contentSheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionLabel}>FROM 24 ANSWERS</Text>

          {/* Dimension Scores Card */}
          <View style={styles.scoresCard}>
            {/* 1. Consistency */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Consistency</Text>
                <Text
                  style={[
                    styles.scoreLevel,
                    dimensions.consistency.level === 'HIGH'
                      ? styles.levelHigh
                      : styles.levelMedium,
                  ]}
                >
                  {dimensions.consistency.level}
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${dimensions.consistency.percentage}%` as any,
                      backgroundColor: '#5E4DB2',
                    },
                  ]}
                />
              </View>
            </View>

            {/* 2. Attention to Detail */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Attention to detail</Text>
                <Text
                  style={[
                    styles.scoreLevel,
                    dimensions.detail.level === 'HIGH'
                      ? styles.levelHigh
                      : styles.levelMedium,
                  ]}
                >
                  {dimensions.detail.level}
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${dimensions.detail.percentage}%` as any,
                      backgroundColor: '#5E4DB2',
                    },
                  ]}
                />
              </View>
            </View>

            {/* 3. Working with People */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Working with people</Text>
                <Text
                  style={[
                    styles.scoreLevel,
                    dimensions.people.level === 'HIGH'
                      ? styles.levelHigh
                      : styles.levelMedium,
                  ]}
                >
                  {dimensions.people.level}
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${dimensions.people.percentage}%` as any,
                      backgroundColor: '#7E6FBF',
                    },
                  ]}
                />
              </View>
            </View>

            {/* 4. Comfort with Ambiguity */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreName}>Comfort with ambiguity</Text>
                <Text
                  style={[
                    styles.scoreLevel,
                    dimensions.ambiguity.level === 'HIGH'
                      ? styles.levelHigh
                      : dimensions.ambiguity.level === 'MEDIUM'
                      ? styles.levelMedium
                      : styles.levelLow,
                  ]}
                >
                  {dimensions.ambiguity.level}
                </Text>
              </View>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${dimensions.ambiguity.percentage}%` as any,
                      backgroundColor: '#7E6FBF',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Roles Recommendation Card */}
          <View style={styles.rolesCard}>
            <Text style={styles.rolesCardTitle}>Roles that suit this profile</Text>
            <View style={styles.rolePillsRow}>
              {result.recommendedRoles.map((role) => (
                <View key={role} style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.doneButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleDone}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.retakeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleTryInterview}
              accessibilityRole="button"
              accessibilityLabel="Try interview"
            >
              <Text style={styles.retakeButtonText}>Try interview</Text>
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
    backgroundColor: '#5F4DB2',
  },
  heroSection: {
    backgroundColor: '#5F4DB2',
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
  dateText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#9DA9BE',
  },
  typeSection: {
    gap: 8,
  },
  typeEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeEyebrowText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#9DA9BE',
  },
  typeTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  typeDescription: {
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
    gap: 16,
  },
  sectionLabel: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  scoresCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  scoreRow: {
    gap: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreName: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    color: '#0A1931',
  },
  scoreLevel: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  levelHigh: {
    color: '#5E4DB2',
  },
  levelMedium: {
    color: '#5F6B80',
  },
  levelLow: {
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
    borderRadius: 999,
  },
  rolesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  rolesCardTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: '#0A1931',
  },
  rolePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: '#F1EAF7',
  },
  rolePillText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#4A3E8F',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#0A1931',
  },
  retakeButton: {
    flex: 1.4,
    backgroundColor: '#5F4DB2',
    borderRadius: Radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
