/**
 * Native notification permission and presentation.
 *
 * This makes notifications appear in the device tray when the app receives
 * one, including while the app is in the foreground. It does NOT implement
 * remote delivery: the backend still needs a device-token registration
 * endpoint and an Expo/APNs/FCM sender before server events can reach a phone.
 *
 * **`expo-notifications` is required lazily, never at module load.** Expo Go
 * dropped push support in SDK 53, and importing the module there throws at
 * import time - which took down the whole app from `app/_layout.tsx`, since
 * that is where presentation is configured. Requiring it inside a try/catch
 * keeps Expo Go usable and turns a missing capability into a message.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';

type NotificationsModule = typeof import('expo-notifications');

let cachedModule: NotificationsModule | null | undefined;
let configured = false;

/** True in the Expo Go sandbox, false in a development or production build. */
export const isExpoGo =
  isRunningInExpoGo() ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Remote (server-sent) push needs a development build. Local notifications
 * still work in Expo Go, so this is not the same question as "is the module
 * available".
 */
export const supportsRemotePush = Platform.OS !== 'web' && !isExpoGo;

function loadNotifications(): NotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (Platform.OS === 'web' || isExpoGo) {
    cachedModule = null;
    return cachedModule;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    console.warn('[Notifications] module unavailable on this runtime', error);
    cachedModule = null;
  }
  return cachedModule;
}

export function configureNotificationPresentation(): void {
  if (configured) return;
  const Notifications = loadNotifications();
  if (!Notifications) return;
  configured = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('[Notifications] could not set the foreground handler', error);
  }
}

export type NotificationPermissionResult =
  | { status: 'granted'; remotePushAvailable: boolean }
  | { status: 'denied'; canAskAgain: boolean }
  /** No notification capability on this runtime (web, or the module is absent). */
  | { status: 'unsupported'; reason: 'web' | 'runtime' };

export async function requestDeviceNotificationPermission(): Promise<NotificationPermissionResult> {
  if (Platform.OS === 'web') {
    return { status: 'unsupported', reason: 'web' };
  }

  const Notifications = loadNotifications();
  if (!Notifications) {
    return { status: 'unsupported', reason: 'runtime' };
  }

  configureNotificationPresentation();

  if (Platform.OS === 'android') {
    // The channel carries the importance: without a HIGH one, Android files
    // the notification silently instead of showing it in the tray.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'BharatPath updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: '#5F4DB2',
      sound: 'default',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return { status: 'granted', remotePushAvailable: supportsRemotePush };
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  if (requested.granted) {
    return { status: 'granted', remotePushAvailable: supportsRemotePush };
  }
  return { status: 'denied', canAskAgain: requested.canAskAgain };
}
