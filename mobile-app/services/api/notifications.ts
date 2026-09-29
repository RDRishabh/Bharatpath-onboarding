import { apiRequest } from './client';

export interface NotificationPreferences {
  locale: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  nudges_enabled: boolean;
}

export async function updatePushPreference(
  pushEnabled: boolean
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: { push_enabled: pushEnabled },
  });
}
