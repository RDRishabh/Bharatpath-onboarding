import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  QrCode,
  At,
  ArrowSquareOut,
  CaretRight,
  ShieldCheck,
  CheckCircle,
} from 'phosphor-react-native';
import { Radii } from '@/theme/tokens';

export interface UpiPaymentSheetProps {
  amount?: number;
  onClose: () => void;
  onPaySuccess: () => void;
}

export function UpiPaymentSheet({
  amount = 299,
  onClose,
  onPaySuccess,
}: UpiPaymentSheetProps) {
  const [selectedMethod, setSelectedMethod] = useState<'id' | 'qr' | 'app'>('id');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaySuccess();
    }, 900);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag Handle Bar */}
              <View style={styles.dragHandle} />

              {/* Title & Price Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleInfo}>
                  <Text style={styles.itemTitle}>AI Mock Interview</Text>
                  <Text style={styles.itemSubtitle}>
                    One session · 6 questions · Lab & QC track
                  </Text>
                </View>
                <Text style={styles.priceAmount}>₹{amount}</Text>
              </View>

              <View style={styles.divider} />

              {/* Section Header */}
              <View style={styles.eyebrowRow}>
                <QrCode size={13} color="#A87C17" weight="bold" />
                <Text style={styles.eyebrowText}>PAY WITH UPI</Text>
              </View>

              {/* Payment Methods */}
              <View style={styles.optionsList}>
                {/* Method 1: Your UPI ID */}
                <Pressable
                  style={({ pressed }) => [
                    styles.methodCard,
                    selectedMethod === 'id' && styles.methodCardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => setSelectedMethod('id')}
                >
                  <View style={styles.iconBox}>
                    <At size={18} color="#D4AF37" weight="bold" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Your UPI ID</Text>
                    <Text style={styles.methodMeta}>priya@bank</Text>
                  </View>
                  {selectedMethod === 'id' ? (
                    <CheckCircle size={20} color="#0A1931" weight="fill" />
                  ) : (
                    <View style={styles.unselectedCircle} />
                  )}
                </Pressable>

                {/* Method 2: Scan a QR code */}
                <Pressable
                  style={({ pressed }) => [
                    styles.methodCard,
                    selectedMethod === 'qr' && styles.methodCardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => setSelectedMethod('qr')}
                >
                  <View style={styles.iconBox}>
                    <QrCode size={18} color="#D4AF37" weight="bold" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Scan a QR code</Text>
                  </View>
                  <CaretRight size={16} color="#5F6B80" weight="bold" />
                </Pressable>

                {/* Method 3: Open a UPI app */}
                <Pressable
                  style={({ pressed }) => [
                    styles.methodCard,
                    selectedMethod === 'app' && styles.methodCardSelected,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => setSelectedMethod('app')}
                >
                  <View style={styles.iconBox}>
                    <ArrowSquareOut size={18} color="#D4AF37" weight="bold" />
                  </View>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodTitle}>Open a UPI app</Text>
                  </View>
                  <CaretRight size={16} color="#5F6B80" weight="bold" />
                </Pressable>
              </View>

              {/* Guarantee Note Box */}
              <View style={styles.noteBox}>
                <ShieldCheck size={18} color="#3A4761" weight="bold" />
                <Text style={styles.noteText}>
                  Your session opens only after the bank confirms. If payment fails, nothing is charged and nothing is used up.
                </Text>
              </View>

              {/* Pay Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.payButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handlePay}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel={`Pay ₹${amount}`}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.payButtonText}>Pay ₹{amount}</Text>
                )}
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 25, 49, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 16,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E7E0D4',
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleInfo: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 17,
    lineHeight: 22,
    color: '#0A1931',
  },
  itemSubtitle: {
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#5F6B80',
  },
  priceAmount: {
    fontFamily: 'GeneralSans-Bold',
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: '#0A1931',
  },
  divider: {
    height: 1,
    backgroundColor: '#F4EFE4',
    marginVertical: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  eyebrowText: {
    fontFamily: 'SpaceMono-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#5F6B80',
  },
  optionsList: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E0D4',
    borderRadius: 16,
    padding: 14,
  },
  methodCardSelected: {
    borderWidth: 1.5,
    borderColor: '#0A1931',
  },
  cardPressed: {
    opacity: 0.88,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0A1931',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
    gap: 2,
  },
  methodTitle: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 15,
    lineHeight: 20,
    color: '#0A1931',
  },
  methodMeta: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 12,
    color: '#5F6B80',
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DDD6C7',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F4EFE4',
    borderRadius: 16,
    padding: 15,
  },
  noteText: {
    flex: 1,
    fontFamily: 'GeneralSans-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#3A4761',
  },
  payButton: {
    width: '100%',
    backgroundColor: '#0A1931',
    borderRadius: Radii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#0A1931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  payButtonText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
});
