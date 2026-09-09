/**
 * BharatPath — JobFiltersSheet
 * Matches Screen 34 from BharatPath Handoff and Screenshot 3.
 * Features:
 * - Slide-up bottom sheet overlay with backdrop blur/darkening
 * - Header with "Filters" and "Reset"
 * - SHOW ME: Only where I qualify vs Everything
 * - DISTANCE FROM ME: Interactive distance slider (default 15 km)
 * - MONTHLY SALARY, AT LEAST: ₹10k, ₹15k, ₹20k, ₹25k+
 * - WORK TYPE: Full-time, Part-time, Internship, Apprentice
 * - CTA: "Show 28 jobs"
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Funnel,
  MapPin,
  CurrencyInr,
  Clock,
  Check,
} from 'phosphor-react-native';
import { Colors, Spacing } from '@/theme/tokens';

export interface FilterState {
  showMode: 'qualify' | 'everything';
  distanceKm: number;
  minSalary: string;
  workType: string;
}

export interface JobFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply?: (filters: FilterState) => void;
  matchCount?: number;
}

export function JobFiltersSheet({
  visible,
  onClose,
  onApply,
  matchCount = 28,
}: JobFiltersSheetProps) {
  const [showMode, setShowMode] = useState<'qualify' | 'everything'>('qualify');
  const [distanceKm, setDistanceKm] = useState<number>(15);
  const [minSalary, setMinSalary] = useState<string>('₹15k');
  const [workType, setWorkType] = useState<string>('Full-time');

  const handleReset = () => {
    setShowMode('qualify');
    setDistanceKm(15);
    setMinSalary('₹15k');
    setWorkType('Full-time');
  };

  const handleApply = () => {
    onApply?.({
      showMode,
      distanceKm,
      minSalary,
      workType,
    });
    onClose();
  };

  const salaryOptions = ['₹10k', '₹15k', '₹20k', '₹25k+'];
  const workTypeOptions = ['Full-time', 'Part-time', 'Internship', 'Apprentice'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Top Grab Handle */}
          <View style={styles.grabHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable onPress={handleReset} accessibilityRole="button">
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
          </View>

          {/* Section 1: SHOW ME */}
          <View style={styles.filterSection}>
            <View style={styles.sectionEyebrow}>
              <Funnel size={12} color="#A87C17" weight="bold" />
              <Text style={styles.eyebrowText}>SHOW ME</Text>
            </View>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleButton,
                  showMode === 'qualify' && styles.toggleButtonActive,
                ]}
                onPress={() => setShowMode('qualify')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    showMode === 'qualify' && styles.toggleTextActive,
                  ]}
                >
                  Only where I qualify
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleButton,
                  showMode === 'everything' && styles.toggleButtonActive,
                ]}
                onPress={() => setShowMode('everything')}
              >
                <Text
                  style={[
                    styles.toggleText,
                    showMode === 'everything' && styles.toggleTextActive,
                  ]}
                >
                  Everything
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Section 2: DISTANCE FROM ME */}
          <View style={styles.filterSection}>
            <View style={styles.sectionEyebrowBetween}>
              <View style={styles.eyebrowLeft}>
                <MapPin size={12} color="#A87C17" weight="bold" />
                <Text style={styles.eyebrowText}>DISTANCE FROM ME</Text>
              </View>
              <Text style={styles.distanceValueText}>{distanceKm} km</Text>
            </View>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack} />
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(distanceKm / 30) * 100}%` },
                ]}
              />
              <Pressable
                style={[
                  styles.sliderThumb,
                  { left: `${(distanceKm / 30) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.distanceChipsRow}>
              {[5, 10, 15, 25].map((km) => (
                <Pressable
                  key={km}
                  style={[
                    styles.kmPill,
                    distanceKm === km && styles.kmPillActive,
                  ]}
                  onPress={() => setDistanceKm(km)}
                >
                  <Text
                    style={[
                      styles.kmPillText,
                      distanceKm === km && styles.kmPillTextActive,
                    ]}
                  >
                    {km} km
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Section 3: MONTHLY SALARY, AT LEAST */}
          <View style={styles.filterSection}>
            <View style={styles.sectionEyebrow}>
              <CurrencyInr size={12} color="#A87C17" weight="bold" />
              <Text style={styles.eyebrowText}>MONTHLY SALARY, AT LEAST</Text>
            </View>
            <View style={styles.pillsRow}>
              {salaryOptions.map((sal) => {
                const isSelected = minSalary === sal;
                return (
                  <Pressable
                    key={sal}
                    style={[
                      styles.salaryPill,
                      isSelected && styles.pillActive,
                    ]}
                    onPress={() => setMinSalary(sal)}
                  >
                    <Text
                      style={[
                        styles.salaryPillText,
                        isSelected && styles.pillTextActive,
                      ]}
                    >
                      {sal}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 4: WORK TYPE */}
          <View style={styles.filterSection}>
            <View style={styles.sectionEyebrow}>
              <Clock size={12} color="#A87C17" weight="bold" />
              <Text style={styles.eyebrowText}>WORK TYPE</Text>
            </View>
            <View style={styles.pillsRow}>
              {workTypeOptions.map((type) => {
                const isSelected = workType === type;
                return (
                  <Pressable
                    key={type}
                    style={[
                      styles.workTypePill,
                      isSelected && styles.pillActive,
                    ]}
                    onPress={() => setWorkType(type)}
                  >
                    {isSelected && (
                      <Check size={12} color="#4A3E8F" weight="bold" />
                    )}
                    <Text
                      style={[
                        styles.workTypePillText,
                        isSelected && styles.pillTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Bottom Action */}
          <Pressable
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>Show {matchCount} jobs</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 49, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 20,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E0D4',
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: Colors.navy,
  },
  resetButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 20,
    color: '#5F6B80',
  },
  filterSection: {
    gap: 10,
  },
  sectionEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionEyebrowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  eyebrowText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: '#5F6B80',
    fontWeight: '700',
  },
  distanceValueText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Bold', android: 'SpaceMono-Bold', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 16,
    color: Colors.navy,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#F1EAF7',
    borderWidth: 1,
    borderColor: '#C9BEEB',
  },
  toggleText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#5F6B80',
  },
  toggleTextActive: {
    color: '#4A3E8F',
  },
  sliderContainer: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#F4EFE4',
  },
  sliderFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#5E4DB2',
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5E4DB2',
    marginLeft: -12,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  kmPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F7F4EC',
  },
  kmPillActive: {
    backgroundColor: '#F1EAF7',
    borderWidth: 1,
    borderColor: '#C9BEEB',
  },
  kmPillText: {
    fontFamily: 'GeneralSans-Medium',
    fontSize: 11,
    lineHeight: 14,
    color: '#5F6B80',
  },
  kmPillTextActive: {
    color: '#4A3E8F',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  salaryPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F7F4EC',
  },
  salaryPillText: {
    fontFamily: Platform.select({ ios: 'SpaceMono-Regular', android: 'SpaceMono-Regular', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 16,
    color: '#3A4761',
  },
  workTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#F7F4EC',
  },
  workTypePillText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 13,
    lineHeight: 16,
    color: '#3A4761',
  },
  pillActive: {
    backgroundColor: '#F1EAF7',
    borderWidth: 1,
    borderColor: '#C9BEEB',
  },
  pillTextActive: {
    color: '#4A3E8F',
  },
  applyButton: {
    width: '100%',
    backgroundColor: Colors.navy,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  applyButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
