import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  User,
  GraduationCap,
  Wrench,
  Flask,
  CheckCircle,
  WarningCircle,
  PencilLine,
  ClipboardText,
} from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { ManualResumeData } from './ManualResumeModal';
import { ManualResumeModal } from './ManualResumeModal';
import { PasteTextModal } from './PasteTextModal';
import {
  confirmResumeVersion,
  editResumeVersion,
  getResumeVersionDetails,
  ResumeVersionDetailResponse,
} from '@/services/api/resume';
import { ApiError } from '@/services/api/client';

interface ReviewDetailsScreenProps {
  onConfirm?: (confirmedVersionId?: string) => void;
  onFixField?: (field: string) => void;
  candidateName?: string;
  candidateEmail?: string;
  manualData?: ManualResumeData;
  versionId?: string;
  versionDetails?: ResumeVersionDetailResponse | null;
  onVersionUpdated?: (
    versionId: string,
    versionDetails: ResumeVersionDetailResponse
  ) => void;
}

export function ReviewDetailsScreen({
  onConfirm,
  onFixField,
  candidateName = 'Priya Sharma',
  candidateEmail = 'priya.sharma@example.com',
  manualData,
  versionId,
  versionDetails,
  onVersionUpdated,
}: ReviewDetailsScreenProps) {
  const [activeVersionId, setActiveVersionId] = useState(versionId);
  const [details, setDetails] = useState(versionDetails);
  const [isStructuredEditorOpen, setIsStructuredEditorOpen] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    setActiveVersionId(versionId);
    setDetails(versionDetails);
  }, [versionDetails, versionId]);

  const parsed = details?.parsed;
  const rawText = typeof parsed?.raw_text === 'string' ? parsed.raw_text : '';
  const hasStructuredContent =
    typeof parsed?.full_name === 'string' ||
    Array.isArray(parsed?.education) ||
    Array.isArray(parsed?.experience) ||
    Array.isArray(parsed?.skills);

  const structuredData = useMemo<ManualResumeData>(
    () => ({
      full_name: parsed?.full_name?.trim() || manualData?.full_name || candidateName,
      headline: parsed?.headline || manualData?.headline,
      experience: Array.isArray(parsed?.experience)
        ? parsed.experience
        : manualData?.experience || [],
      education: Array.isArray(parsed?.education)
        ? parsed.education
        : manualData?.education || [],
      skills: Array.isArray(parsed?.skills) ? parsed.skills : manualData?.skills || [],
    }),
    [candidateName, manualData, parsed]
  );

  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError
      ? error.problem?.params?.detail || error.problem?.title || error.message
      : error instanceof Error
      ? error.message
      : fallback;

  const adoptEditedVersion = async (newVersionId: string) => {
    const newDetails = await getResumeVersionDetails(newVersionId);
    setActiveVersionId(newVersionId);
    setDetails(newDetails);
    onVersionUpdated?.(newVersionId, newDetails);
  };

  const handleStructuredEdit = async (data: ManualResumeData) => {
    if (!activeVersionId) return;
    setConfirmError(null);
    setIsSavingEdit(true);
    try {
      const created = await editResumeVersion(activeVersionId, { structured: data });
      await adoptEditedVersion(created.resume_version_id);
      setIsStructuredEditorOpen(false);
    } catch (error) {
      setConfirmError(errorMessage(error, 'Could not save your resume changes.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTextEdit = async (text: string) => {
    if (!activeVersionId) return;
    setConfirmError(null);
    setIsSavingEdit(true);
    try {
      const created = await editResumeVersion(activeVersionId, { text });
      await adoptEditedVersion(created.resume_version_id);
      setIsTextEditorOpen(false);
    } catch (error) {
      setConfirmError(errorMessage(error, 'Could not save your resume changes.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmCurrentVersion = async () => {
    setConfirmError(null);
    if (activeVersionId) {
      try {
        setIsConfirming(true);
        await confirmResumeVersion(activeVersionId);
        onConfirm?.(activeVersionId);
      } catch (error) {
        setConfirmError(errorMessage(error, 'Could not confirm this resume version.'));
      } finally {
        setIsConfirming(false);
      }
    } else {
      setConfirmError('Resume version is missing. Please return and submit your resume again.');
    }
  };

  const handleConfirmClick = () => {
    Alert.alert(
      'Confirm this resume?',
      'Your score will be calculated from exactly these details. Updating your resume later creates a new version and a new score.',
      [
        { text: 'Keep reviewing', style: 'cancel' },
        { text: 'Confirm and score', onPress: confirmCurrentVersion },
      ]
    );
  };

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
            <View style={styles.titleRow}>
              <Text style={styles.title}>Review details</Text>
              <View style={styles.allFixedBadge}>
                <CheckCircle size={14} color="#1F6B45" weight="fill" />
                <Text style={styles.allFixedBadgeText}>
                  {details?.source === 'EDIT' ? 'New version' : 'Ready to review'}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Nothing is scored until you confirm.</Text>
          </View>

          {confirmError ? (
            <View style={styles.errorBanner}>
              <WarningCircle size={17} color="#8F3B3B" weight="fill" />
              <Text style={styles.errorBannerText}>{confirmError}</Text>
            </View>
          ) : null}

          {/* Cards List */}
          <View style={styles.cardsList}>
            {rawText && !hasStructuredContent ? (
              <View style={styles.detailCard}>
                <View style={styles.cardHeaderRow}>
                  <ClipboardText size={16} color="#5F6B80" weight="bold" />
                  <Text style={styles.cardEyebrow}>EXTRACTED RESUME TEXT</Text>
                  <CheckCircle size={18} color="#1F6B45" weight="fill" />
                </View>
                <Text style={styles.rawText}>{rawText}</Text>
                <Text style={styles.rawTextHint}>
                  The backend returned plain text. You can correct it or replace it with reviewed
                  fields for education, experience, and skills.
                </Text>
                <View style={styles.rawActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryEditButton,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => setIsTextEditorOpen(true)}
                  >
                    <PencilLine size={14} color="#5E4DB2" weight="bold" />
                    <Text style={styles.secondaryEditButtonText}>Correct text</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryEditButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setIsStructuredEditorOpen(true)}
                  >
                    <Text style={styles.primaryEditButtonText}>Edit as fields</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                {/* Card 1: BASICS */}
                <Pressable
                  style={({ pressed }) => [styles.detailCard, pressed && styles.cardPressed]}
                  onPress={() => setIsStructuredEditorOpen(true)}
                >
                  <View style={styles.cardHeaderRow}>
                    <User size={16} color="#5F6B80" weight="bold" />
                    <Text style={styles.cardEyebrow}>BASICS</Text>
                    <CheckCircle size={18} color="#1F6B45" weight="fill" />
                    <View style={styles.pencilRight}>
                      <PencilLine size={15} color="#566073" weight="bold" />
                    </View>
                  </View>
                  <View style={styles.keyValueList}>
                    <View style={styles.keyValueRow}>
                      <Text style={styles.keyText}>Name</Text>
                      <Text style={styles.valueText}>{structuredData.full_name}</Text>
                    </View>
                    {structuredData.headline ? (
                      <View style={styles.keyValueRow}>
                        <Text style={styles.keyText}>Headline</Text>
                        <Text style={styles.valueText}>{structuredData.headline}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                {/* Card 2: EDUCATION */}
                <Pressable
                  style={({ pressed }) => [styles.detailCard, pressed && styles.cardPressed]}
                  onPress={() => setIsStructuredEditorOpen(true)}
                >
                  <View style={styles.cardHeaderRow}>
                    <GraduationCap size={16} color="#5F6B80" weight="bold" />
                    <Text style={styles.cardEyebrow}>EDUCATION</Text>
                    <View style={styles.pencilRight}>
                      <PencilLine size={15} color="#566073" weight="bold" />
                    </View>
                  </View>
                  <View style={styles.eduList}>
                    {structuredData.education.length ? (
                      structuredData.education.map((edu, idx) => (
                        <React.Fragment key={`edu-${idx}`}>
                          {idx > 0 && <View style={styles.hairlineDivider} />}
                          <View style={styles.eduItem}>
                            <Text style={styles.eduTitle}>{edu.qualification}</Text>
                            <Text style={styles.eduSubtitle}>
                              {edu.institution}
                              {edu.completed_year ? ` · ${edu.completed_year}` : ''}
                            </Text>
                          </View>
                        </React.Fragment>
                      ))
                    ) : (
                      <View style={styles.eduItem}>
                        <Text style={styles.eduTitle}>No education added</Text>
                        <Text style={styles.eduSubtitle}>Tap to add your qualification</Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Card 3: SKILLS */}
                <Pressable
                  style={({ pressed }) => [styles.detailCard, pressed && styles.cardPressed]}
                  onPress={() => setIsStructuredEditorOpen(true)}
                >
                  <View style={styles.cardHeaderRow}>
                    <Wrench size={16} color="#5F6B80" weight="bold" />
                    <Text style={styles.cardEyebrow}>SKILLS</Text>
                    <View style={styles.pencilRight}>
                      <PencilLine size={15} color="#566073" weight="bold" />
                    </View>
                  </View>
                  {structuredData.skills.length ? (
                    <View style={styles.chipsWrapRow}>
                      {structuredData.skills.map((skill, index) => (
                        <View key={`${skill}-${index}`} style={styles.solidChip}>
                          <Text style={styles.solidChipText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.eduSubtitle}>No skills added. Tap to add skills.</Text>
                  )}
                </Pressable>

                {/* Card 4: EXPERIENCE & PROJECTS */}
                <Pressable
                  style={({ pressed }) => [styles.detailCard, pressed && styles.cardPressed]}
                  onPress={() => setIsStructuredEditorOpen(true)}
                >
                  <View style={styles.cardHeaderRow}>
                    <Flask size={16} color="#5F6B80" weight="bold" />
                    <Text style={styles.cardEyebrow}>EXPERIENCE & PROJECTS</Text>
                    <View style={styles.pencilRight}>
                      <PencilLine size={15} color="#566073" weight="bold" />
                    </View>
                  </View>
                  <View style={styles.expList}>
                    {structuredData.experience.length ? (
                      structuredData.experience.map((exp, idx) => (
                        <React.Fragment key={`exp-${idx}`}>
                          {idx > 0 && <View style={styles.hairlineDivider} />}
                          <View style={styles.expItem}>
                            <Text style={styles.expTitle}>{exp.title}</Text>
                            <Text style={styles.expSubtitle}>
                              {exp.employer} · {exp.start_year}–{exp.end_year || 'Present'}
                            </Text>
                            {exp.summary ? (
                              <Text style={[styles.eduSubtitle, { marginTop: 4 }]}>
                                {exp.summary}
                              </Text>
                            ) : null}
                          </View>
                        </React.Fragment>
                      ))
                    ) : (
                      <View style={styles.expItem}>
                        <Text style={styles.expTitle}>No experience added</Text>
                        <Text style={styles.expSubtitle}>Tap to add a role or project</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>

        {/* Bottom CTA Action Area */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              isConfirming && styles.buttonDisabled,
              pressed && !isConfirming && styles.buttonPressed,
            ]}
            onPress={handleConfirmClick}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirming...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>Confirm and score</Text>
            )}
          </Pressable>
          <Text style={styles.bottomSubtext}>You can edit any of this later</Text>
        </View>

        <ManualResumeModal
          visible={isStructuredEditorOpen}
          initialData={structuredData}
          initialFullName={candidateName}
          title="Edit resume details"
          subtitle="Saving creates a new resume version"
          submitLabel="Save as new version"
          isSubmitting={isSavingEdit}
          onSubmit={handleStructuredEdit}
          onClose={() => !isSavingEdit && setIsStructuredEditorOpen(false)}
        />

        <PasteTextModal
          visible={isTextEditorOpen}
          initialText={rawText}
          title="Edit extracted resume"
          subtitle="Saving creates a new resume version"
          submitLabel="Save as new version"
          showSampleAction={false}
          isSubmitting={isSavingEdit}
          onSubmit={handleTextEdit}
          onClose={() => !isSavingEdit && setIsTextEditorOpen(false)}
        />
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
    gap: Spacing.lg, // 20px
  },
  titleSection: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md, // 12px
  },
  title: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: Colors.navy, // #0A1931
  },
  toFixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm, // 8px
    paddingVertical: 4,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7A5C0E',
  },
  toFixBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#7A5C0E',
  },
  allFixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: '#E6F1EA',
  },
  allFixedBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 12,
    lineHeight: 16,
    color: '#1F6B45',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: 12,
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#8F3B3B',
  },
  cardsList: {
    gap: Spacing.md, // 12px
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: Radii.cardLg, // 20px
    padding: Spacing.base, // 16px
    gap: Spacing.base, // 16px
  },
  cardPressed: {
    backgroundColor: '#F7F4EC',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm, // 8px
  },
  cardEyebrow: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.1,
    color: '#5F6B80',
  },
  pencilRight: {
    marginLeft: 'auto',
  },
  rawText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#0A1931',
  },
  rawTextHint: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 12,
    lineHeight: 17,
    color: '#5E4DB2',
  },
  rawActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryEditButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D9D0F5',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  secondaryEditButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    color: '#5E4DB2',
  },
  primaryEditButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: '#5E4DB2',
  },
  primaryEditButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  keyValueList: {
    gap: Spacing.md, // 12px
  },
  keyValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.base, // 16px
  },
  keyText: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6B80',
  },
  valueText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  eduList: {
    gap: Spacing.md, // 12px
  },
  eduItem: {
    gap: 4,
  },
  eduTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
  },
  eduSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F7EFD6',
  },
  unclearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7A5C0E',
  },
  unclearBadgeText: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 11,
    lineHeight: 12,
    color: '#7A5C0E',
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  solidChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#F7EFD6',
  },
  solidChipText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#0A1931',
  },
  dashedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6C79A',
    borderStyle: 'dashed',
  },
  dashedChipText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: '#7A5C0E',
  },
  chipPressed: {
    opacity: 0.75,
  },
  expList: {
    gap: 12,
  },
  expItem: {
    gap: 4,
  },
  expTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  expSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  addMissingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  missingLabelText: {
    flex: 1,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6B80',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill, // 999
    backgroundColor: '#5F4DB2', // #5F4DB2 matching BharatPath R_26Aug2026.dc.html
  },
  addButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
  },
  bottomSection: {
    gap: 12,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: '#FFFCF7',
  },
  confirmButton: {
    width: '100%',
    backgroundColor: '#5F4DB2', // #5F4DB2 matching BharatPath R_26Aug2026.dc.html
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#C8C1EC',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  bottomSubtext: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
    textAlign: 'center',
  },
});
