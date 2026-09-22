import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, FilePdf } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { UploadedFileMeta } from './ResumeIntakeScreen';

interface ParsingScreenProps {
  fileMeta?: UploadedFileMeta;
  onReviewFound?: () => void;
}

export function ParsingScreen({ fileMeta, onReviewFound }: ParsingScreenProps) {
  const fileName = fileMeta?.fileName || 'Priya_Deshmukh_Resume.pdf';
  const fileSizeText = fileMeta?.fileSize ? `${fileMeta.fileSize} · uploaded` : '412 KB · uploaded';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Reading your resume</Text>
            <Text style={styles.subtitle}>
              This takes about ten seconds. Nothing is saved until you confirm it.
            </Text>
          </View>

          {/* Parsing Card Container */}
          <View style={styles.parsingCard}>
            {/* Header File Info */}
            <View style={styles.fileHeaderRow}>
              <View style={styles.pdfIconContainer}>
                <FilePdf size={18} color="#5E4DB2" weight="duotone" />
              </View>
              <View style={styles.fileMetaColumn}>
                <Text style={styles.fileNameText} numberOfLines={1}>
                  {fileName}
                </Text>
                <Text style={styles.fileSizeText}>{fileSizeText}</Text>
              </View>
              <Text style={styles.stepCounterText}>4 / 5</Text>
            </View>

            {/* Progress Track Line */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '80%' }]} />
            </View>

            {/* Step Items List */}
            <View style={styles.itemsList}>
              {/* Step 1: Contact details */}
              <View style={styles.itemRow}>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
                <Text style={styles.itemTitle}>Contact details</Text>
                <Text style={styles.itemMeta}>3 found</Text>
              </View>

              {/* Step 2: Education */}
              <View style={[styles.itemRow, styles.itemBorderTop]}>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
                <Text style={styles.itemTitle}>Education</Text>
                <Text style={styles.itemMeta}>2 found</Text>
              </View>

              {/* Step 3: Experience */}
              <View style={[styles.itemRow, styles.itemBorderTop]}>
                <CheckCircle size={20} color="#1F6B45" weight="fill" />
                <Text style={styles.itemTitle}>Experience</Text>
                <Text style={styles.itemMeta}>1 found</Text>
              </View>

              {/* Step 4: Skills and projects (Active Reading State) */}
              <View style={[styles.itemRow, styles.itemActiveReading]}>
                <ActivityIndicator size="small" color="#0A1931" style={styles.spinner} />
                <Text style={styles.itemTitle}>Skills and projects</Text>
                <Text style={styles.itemMetaReading}>reading</Text>
              </View>

              {/* Step 5: Certificates (Pending / Dimmed) */}
              <View style={[styles.itemRow, styles.itemBorderTop, styles.itemDimmed]}>
                <View style={styles.emptyCircleIcon} />
                <Text style={styles.itemTitle}>Certificates</Text>
              </View>
            </View>
          </View>

          {/* Puzzle Illustration */}
          <View style={styles.illustrationWrapper}>
            <Image
              source={require('../../assets/icons/parsing.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>
        </ScrollView>

        {/* Bottom CTA Button */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.reviewButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onReviewFound}
          >
            <Text style={styles.reviewButtonText}>Review what we found</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ACCENT_PURPLE = '#5F4DB2';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFCF7',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFCF7',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 20,
    gap: 20,
  },
  titleSection: {
    gap: 2,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: '#0A1931',
    margin: 0,
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#3A4761',
    margin: 0,
  },
  parsingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 20,
    overflow: 'hidden',
  },
  fileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  pdfIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E7E3F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMetaColumn: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  fileNameText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#0A1931',
  },
  fileSizeText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  stepCounterText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#0A1931',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#F0EBDF',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT_PURPLE, // #5F4DB2
  },
  itemsList: {
    flexDirection: 'column',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F7EFD6',
  },
  itemActiveReading: {
    borderTopWidth: 1,
    borderTopColor: '#E7E0D4',
    backgroundColor: '#F7EFD6',
  },
  itemDimmed: {
    opacity: 0.55,
  },
  spinner: {
    marginRight: 2,
  },
  emptyCircleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C6BFAF',
  },
  itemTitle: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  itemMeta: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  itemMetaReading: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  illustrationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  illustrationImage: {
    width: 280,
    height: 186,
  },
  bottomSection: {
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: '#FFFCF7',
  },
  reviewButton: {
    width: '100%',
    backgroundColor: ACCENT_PURPLE, // #5F4DB2
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  reviewButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
});
