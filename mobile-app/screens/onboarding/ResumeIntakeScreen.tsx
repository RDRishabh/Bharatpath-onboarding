import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { UploadSimple, ArrowRight, ClipboardText, NotePencil, LockSimple } from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';

export interface UploadedFileMeta {
  fileName: string;
  fileSize: string;
}

interface ResumeIntakeScreenProps {
  onSelectOption?: (option: 'upload' | 'paste' | 'form', fileMeta?: UploadedFileMeta) => void;
  onBack?: () => void;
}

export function ResumeIntakeScreen({ onSelectOption, onBack }: ResumeIntakeScreenProps) {
  const handleUploadPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.name || 'Priya_Deshmukh_Resume.pdf';
        const fileSize = asset.size ? `${(asset.size / 1024).toFixed(0)} KB` : '412 KB';
        onSelectOption && onSelectOption('upload', { fileName, fileSize });
      } else {
        // Fallback for preview/testing if cancelled
        onSelectOption && onSelectOption('upload', { fileName: 'Priya_Deshmukh_Resume.pdf', fileSize: '412 KB' });
      }
    } catch {
      onSelectOption && onSelectOption('upload', { fileName: 'Priya_Deshmukh_Resume.pdf', fileSize: '412 KB' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" animated />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step Progress Header */}
          <View style={styles.headerProgressSection}>
            <Text style={styles.stepEyebrow}>STEP 3 OF 3</Text>
            <View style={styles.progressSegmentsRow}>
              <View style={[styles.progressSegment, styles.segmentActive]} />
              <View style={[styles.progressSegment, styles.segmentActive]} />
              <View style={[styles.progressSegment, styles.segmentActive]} />
            </View>
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>How would you{'\n'}like to start?</Text>
            <Text style={styles.subtitle}>Pick whichever is fastest for you.</Text>
          </View>

          {/* Options Section */}
          <View style={styles.optionsSection}>
            {/* Primary Featured Option: Upload a file */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryUploadCard,
                pressed && styles.cardPressed,
              ]}
              onPress={handleUploadPress}
            >
              <View style={styles.uploadCardTopRow}>
                <View style={styles.uploadIconCircle}>
                  <UploadSimple size={21} color="#D4AF37" weight="bold" />
                </View>
                <View style={styles.fastestBadge}>
                  <Text style={styles.fastestBadgeText}>FASTEST</Text>
                </View>
              </View>

              <View style={styles.uploadCardContent}>
                <Text style={styles.uploadCardTitle}>Upload a file</Text>
                <Text style={styles.uploadCardSubtitle}>
                  We read it in about 20 seconds.
                </Text>
              </View>

              <View style={styles.uploadCardFooter}>
                <Text style={styles.uploadCardMeta}>PDF · DOCX · UP TO 5 MB</Text>
                <ArrowRight size={18} color="#D4AF37" weight="bold" />
              </View>
            </Pressable>

            {/* Secondary Options Row (2 columns) */}
            <View style={styles.secondaryRow}>
              {/* Option 2: Paste text */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onSelectOption && onSelectOption('paste')}
              >
                <View style={styles.secondaryIconSquare}>
                  <ClipboardText size={18} color="#D4AF37" weight="bold" />
                </View>
                <View style={styles.secondaryCardContent}>
                  <Text style={styles.secondaryCardTitle}>Paste text</Text>
                  <Text style={styles.secondaryCardSubtitle}>From email or notes</Text>
                </View>
              </Pressable>

              {/* Option 3: Fill a form */}
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => onSelectOption && onSelectOption('form')}
              >
                <View style={styles.secondaryIconSquare}>
                  <NotePencil size={18} color="#D4AF37" weight="bold" />
                </View>
                <View style={styles.secondaryCardContent}>
                  <Text style={styles.secondaryCardTitle}>Fill a form</Text>
                  <Text style={styles.secondaryCardSubtitle}>No resume yet</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Actions Section */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <View style={styles.privacyNoteRow}>
            <LockSimple size={13} color="#5F6B80" weight="bold" />
            <Text style={styles.privacyNoteText}>Only used to build your profile</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.offWhite, // #FFFCF7
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg, // 20px
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingTop: Spacing.xl, // 24px
    paddingBottom: Spacing.xl, // 24px
    gap: Spacing.xl, // 24px
  },
  headerProgressSection: {
    gap: Spacing.sm, // 8px
  },
  stepEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.3,
    color: '#5F6B80',
  },
  progressSegmentsRow: {
    flexDirection: 'row',
    gap: Spacing.opt6, // 6px
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radii.pill, // 999
  },
  segmentActive: {
    backgroundColor: Colors.navy, // #0A1931
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.75,
    color: Colors.navy, // #0A1931
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
  },
  optionsSection: {
    gap: Spacing.md, // 12px
  },
  primaryUploadCard: {
    backgroundColor: Colors.indigo, // #5E4DB2
    borderRadius: Radii.cardLg, // 20px
    padding: Spacing.lg, // 20px
    gap: Spacing.base, // 16px
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  uploadCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  fastestBadge: {
    paddingHorizontal: Spacing.md, // 12px
    paddingVertical: 6,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  fastestBadgeText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.9,
    color: Colors.navy, // #0A1931
  },
  uploadCardContent: {
    gap: 4,
  },
  uploadCardTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  uploadCardSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#E0DBF4',
  },
  uploadCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.4)',
    paddingTop: 14,
    marginTop: 4,
  },
  uploadCardMeta: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: '#E0DBF4',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.md, // 12px
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    padding: Spacing.base, // 16px
    gap: Spacing.base, // 16px
  },
  secondaryIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.navy, // #0A1931
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCardContent: {
    gap: 4,
  },
  secondaryCardTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  secondaryCardSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
  bottomSection: {
    gap: Spacing.md, // 12px
    paddingBottom: Spacing.base, // 16px
    paddingTop: Spacing.sm, // 8px
  },
  backButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6C7',
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  backButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  privacyNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  privacyNoteText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
  },
});
