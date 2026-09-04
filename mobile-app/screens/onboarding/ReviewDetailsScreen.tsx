import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
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
  Plus,
} from 'phosphor-react-native';
import { Colors, Radii, Spacing } from '@/theme/tokens';
import { FixSkillModal } from './FixSkillModal';

interface SkillItem {
  id: string;
  name: string;
  original?: string;
  isUnclear?: boolean;
  suggestions?: string[];
}

const INITIAL_SKILLS: SkillItem[] = [
  { id: '1', name: 'Microbial culturing' },
  { id: '2', name: 'Lab reporting' },
  { id: '3', name: 'MS Excel' },
  {
    id: '4',
    name: 'MS-Ofice',
    original: 'MS-Ofice',
    isUnclear: true,
    suggestions: ['MS Office', 'MS Excel', 'Office 365'],
  },
  {
    id: '5',
    name: 'Teem work',
    original: 'Teem work',
    isUnclear: true,
    suggestions: ['Teamwork', 'Team Leadership', 'Collaboration'],
  },
];

interface ReviewDetailsScreenProps {
  onConfirm?: () => void;
  onFixField?: (field: string) => void;
}

export function ReviewDetailsScreen({ onConfirm, onFixField }: ReviewDetailsScreenProps) {
  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [activeFixSkill, setActiveFixSkill] = useState<SkillItem | null>(null);

  const unclearSkills = skills.filter((s) => s.isUnclear);
  const unclearCount = unclearSkills.length;

  const handleOpenFixModal = (skill: SkillItem) => {
    setActiveFixSkill(skill);
  };

  const handleSaveSkill = (newValue: string) => {
    if (!activeFixSkill) return;
    setSkills((prev) =>
      prev.map((s) =>
        s.id === activeFixSkill.id
          ? { ...s, name: newValue, isUnclear: false }
          : s
      )
    );
    setActiveFixSkill(null);
  };

  const handleRemoveSkill = () => {
    if (!activeFixSkill) return;
    setSkills((prev) => prev.filter((s) => s.id !== activeFixSkill.id));
    setActiveFixSkill(null);
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
              {unclearCount > 0 ? (
                <View style={styles.toFixBadge}>
                  <WarningCircle size={14} color="#7A5C0E" weight="fill" />
                  <Text style={styles.toFixBadgeText}>{unclearCount} to fix</Text>
                </View>
              ) : (
                <View style={styles.allFixedBadge}>
                  <CheckCircle size={14} color="#1F6B45" weight="fill" />
                  <Text style={styles.allFixedBadgeText}>All clear</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Nothing is scored until you confirm.</Text>
          </View>

          {/* Cards List */}
          <View style={styles.cardsList}>
            {/* Card 1: BASICS */}
            <Pressable
              style={({ pressed }) => [
                styles.detailCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onFixField && onFixField('basics')}
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
                  <Text style={styles.valueText}>Priya Deshmukh</Text>
                </View>
                <View style={styles.keyValueRow}>
                  <Text style={styles.keyText}>Phone</Text>
                  <Text style={styles.valueText}>+91 98••• ••42</Text>
                </View>
                <View style={styles.keyValueRow}>
                  <Text style={styles.keyText}>City</Text>
                  <Text style={styles.valueText}>Pune, Maharashtra</Text>
                </View>
              </View>
            </Pressable>

            {/* Card 2: EDUCATION */}
            <Pressable
              style={({ pressed }) => [
                styles.detailCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onFixField && onFixField('education')}
            >
              <View style={styles.cardHeaderRow}>
                <GraduationCap size={16} color="#5F6B80" weight="bold" />
                <Text style={styles.cardEyebrow}>EDUCATION</Text>
                <CheckCircle size={18} color="#1F6B45" weight="fill" />
                <View style={styles.pencilRight}>
                  <PencilLine size={15} color="#566073" weight="bold" />
                </View>
              </View>

              <View style={styles.eduList}>
                <View style={styles.eduItem}>
                  <Text style={styles.eduTitle}>B.Sc Microbiology</Text>
                  <Text style={styles.eduSubtitle}>
                    Fergusson College, Pune · 2022–2025 · 68%
                  </Text>
                </View>
                <View style={styles.hairlineDivider} />
                <View style={styles.eduItem}>
                  <Text style={styles.eduTitle}>HSC Science</Text>
                  <Text style={styles.eduSubtitle}>
                    Maharashtra Board · 2022 · 74%
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* Card 3: SKILLS */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeaderRow}>
                <Wrench size={16} color="#5F6B80" weight="bold" />
                <Text style={styles.cardEyebrow}>SKILLS</Text>
                {unclearCount > 0 ? (
                  <View style={styles.unclearBadge}>
                    <WarningCircle size={12} color="#7A5C0E" weight="fill" />
                    <Text style={styles.unclearBadgeText}>{unclearCount} unclear</Text>
                  </View>
                ) : (
                  <CheckCircle size={18} color="#1F6B45" weight="fill" />
                )}
                <View style={styles.pencilRight}>
                  <PencilLine size={15} color="#566073" weight="bold" />
                </View>
              </View>

              <View style={styles.chipsWrapRow}>
                {skills.map((skill) => {
                  if (skill.isUnclear) {
                    return (
                      <Pressable
                        key={skill.id}
                        style={({ pressed }) => [
                          styles.dashedChip,
                          pressed && styles.chipPressed,
                        ]}
                        onPress={() => handleOpenFixModal(skill)}
                      >
                        <Text style={styles.dashedChipText}>{skill.name}</Text>
                        <PencilLine size={12} color="#7A5C0E" weight="bold" />
                      </Pressable>
                    );
                  }

                  return (
                    <Pressable
                      key={skill.id}
                      style={({ pressed }) => [
                        styles.solidChip,
                        pressed && styles.chipPressed,
                      ]}
                      onPress={() => handleOpenFixModal(skill)}
                    >
                      <Text style={styles.solidChipText}>{skill.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Card 4: EXPERIENCE & PROJECTS */}
            <Pressable
              style={({ pressed }) => [
                styles.detailCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onFixField && onFixField('experience')}
            >
              <View style={styles.cardHeaderRow}>
                <Flask size={16} color="#5F6B80" weight="bold" />
                <Text style={styles.cardEyebrow}>EXPERIENCE & PROJECTS</Text>
                <View style={styles.pencilRight}>
                  <PencilLine size={15} color="#566073" weight="bold" />
                </View>
              </View>

              <View style={styles.expList}>
                <View style={styles.expItem}>
                  <Text style={styles.expTitle}>Internship — Quality lab</Text>
                  <Text style={styles.expSubtitle}>
                    Sahyadri Dairy, Pune · 3 months, 2024
                  </Text>
                </View>
                <View style={styles.hairlineDivider} />
                <View style={styles.addMissingRow}>
                  <Text style={styles.missingLabelText}>Final-year project missing</Text>
                  <View style={styles.addButton}>
                    <Plus size={12} color="#FFFFFF" weight="bold" />
                    <Text style={styles.addButtonText}>Add</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </ScrollView>

        {/* Bottom CTA Action Area */}
        <View style={styles.bottomSection}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </Pressable>
          <Text style={styles.bottomSubtext}>You can edit any of this later</Text>
        </View>

        {/* Fix Skill Pop-Up Bottom Sheet Modal */}
        {activeFixSkill ? (
          <FixSkillModal
            visible={!!activeFixSkill}
            originalSkill={activeFixSkill.original || activeFixSkill.name}
            initialValue={
              activeFixSkill.suggestions
                ? activeFixSkill.suggestions[0]
                : activeFixSkill.name
            }
            suggestions={
              Array.from(new Set(
                activeFixSkill.suggestions || [
                  activeFixSkill.name,
                  'MS Excel',
                  'Office 365',
                ]
              ))
            }
            onSave={handleSaveSkill}
            onRemove={handleRemoveSkill}
            onClose={() => setActiveFixSkill(null)}
          />
        ) : null}
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  subtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text.primary, // #3A4761
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
    fontWeight: '700',
  },
  pencilRight: {
    marginLeft: 'auto',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  eduSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: '#F4EFE4',
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
    fontWeight: '700',
  },
  chipsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm, // 8px
  },
  solidChip: {
    paddingHorizontal: Spacing.md, // 12px
    paddingVertical: Spacing.sm, // 8px
    borderRadius: Radii.pill, // 999
    backgroundColor: '#F4EFE4',
  },
  solidChipText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 13,
    lineHeight: 16,
    color: Colors.navy, // #0A1931
    fontWeight: '500',
  },
  dashedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md, // 12px
    paddingVertical: Spacing.sm, // 8px
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
    fontWeight: '500',
  },
  chipPressed: {
    opacity: 0.75,
  },
  expList: {
    gap: Spacing.md, // 12px
  },
  expItem: {
    gap: 4,
  },
  expTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: Colors.navy, // #0A1931
    fontWeight: '600',
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
    gap: Spacing.md, // 12px
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
    backgroundColor: Colors.navy, // #0A1931
  },
  addButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 12,
    lineHeight: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSection: {
    gap: Spacing.md, // 12px
    paddingBottom: Spacing.xl, // 24px
    paddingTop: Spacing.sm, // 8px
    backgroundColor: Colors.offWhite,
  },
  confirmButton: {
    width: '100%',
    backgroundColor: Colors.navy, // #0A1931
    paddingVertical: 18,
    borderRadius: Radii.pill, // 999
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  confirmButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: Colors.offWhite,
    fontWeight: '600',
  },
  bottomSubtext: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#5F6B80',
    textAlign: 'center',
  },
});
