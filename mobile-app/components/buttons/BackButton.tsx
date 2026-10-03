/**
 * BackButton - Navigation back control using IconButton with ArrowLeft.
 * Uses bold weight Phosphor icon. Minimum 44px touch target.
 */
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { IconButton } from './IconButton';
import { Colors } from '@/theme/tokens';

interface BackButtonProps {
  onPress?: () => void;
  variant?: 'default' | 'navy' | 'ghost';
  color?: string;
  size?: number;
  accessibilityLabel?: string;
}

export function BackButton({
  onPress,
  variant = 'default',
  color,
  size = 44,
  accessibilityLabel = 'Go back',
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  const iconColor = color ?? (variant === 'navy' ? Colors.offWhite : Colors.navy);

  return (
    <IconButton
      onPress={handlePress}
      accessibilityLabel={accessibilityLabel}
      variant={variant}
      size={size}
      icon={<ArrowLeft size={22} color={iconColor} weight="bold" />}
    />
  );
}
