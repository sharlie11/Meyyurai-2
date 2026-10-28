import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase'; // Ensure supabase instance is imported

export const BACKGROUND_LOCATION_TASK_NAME = 'MEYYURAI_BACKGROUND_LOCATION_TASK';
export const PERIODIC_SESSION_CHECK_TASK_NAME = 'MEYYURAI_PERIODIC_SESSION_CHECK_TASK';

export const STORAGE_KEYS = {
  SESSION_ID: '@meyyurai_tracking_session_id',
  START_TIME: '@meyyurai_tracking_start_time',
  MAX_DURATION: '@meyyurai_tracking_max_duration',
  PENDING_BREADCRUMBS: '@meyyurai_pending_breadcrumbs',
};

export interface BreadcrumbPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export const BACKGROUND_TRACKING_CONFIG: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 45000, // 45 seconds
  distanceInterval: 50, // 50 meters
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: false,
  foregroundService: {
    notificationTitle: 'Meyyurai Live Safety Tracking',
    notificationBody: 'Sharing live transit location with trusted contacts.',
    notificationColor: '#0F766E',
  },
};

// Helper: Get API URL base
function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
  return envUrl.replace(/\/api\/(ai\/chat|contacts|sos)?\/?$/, '');
}

// 1. Get or Refresh Auth Token
export async function getValidAuthToken(): Promise<string | null> {
  try {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    const isExpired = session?.expires_at
      ? session.expires_at * 1000 - Date.now() < 120000
      : true;

    if (!session || isExpired) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (!error && refreshed.session) {
        session = refreshed.session;
      }
    }

    return session?.access_token || null;
  } catch (err) {
    console.warn('[BackgroundTracking] Token retrieval fallback error:', err);
    return null;
  }
}

// 2. Queue Breadcrumb Locally (FIFO Cap = 200 items)
export async function queueBreadcrumbLocally(breadcrumb: BreadcrumbPoint): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_BREADCRUMBS);
    let queue: BreadcrumbPoint[] = raw ? JSON.parse(raw) : [];

    queue.push(breadcrumb);

    // Enforce 200-item FIFO cap
    if (queue.length > 200) {
      queue = queue.slice(-200);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_BREADCRUMBS, JSON.stringify(queue));
    return queue.length;
  } catch (err) {
    console.error('[BackgroundTracking] Local queue error:', err);
    return 0;
  }
}

// 3. Flush Pending Breadcrumbs to Backend API
export async function flushPendingBreadcrumbs(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_BREADCRUMBS);
    if (!raw) return true;

    const queue: BreadcrumbPoint[] = JSON.parse(raw);
    if (queue.length === 0) return true;

    const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) return true;

    const token = await getValidAuthToken();
    const baseUrl = getApiUrl();

    const response = await fetch(`${baseUrl}/api/location/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        session_id: sessionId,
        breadcrumbs: queue,
      }),
    });

    if (response.ok || response.status === 210) {
      // Clear queue only on successful network flush
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_BREADCRUMBS);
      console.log(`[BackgroundTracking] Flushed ${queue.length} breadcrumbs to backend.`);
      return true;
    } else {
      console.warn(`[BackgroundTracking] Backend flush returned status ${response.status}`);
      return false;
    }
  } catch (err) {
    console.warn('[BackgroundTracking] Flush network error:', err);
    return false;
  }
}

// 4. Check Session Expiration (Independent of GPS Movement)
export async function checkSessionExpiration(): Promise<boolean> {
  try {
    const [sessionId, startTimeStr, maxDurationStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID),
      AsyncStorage.getItem(STORAGE_KEYS.START_TIME),
      AsyncStorage.getItem(STORAGE_KEYS.MAX_DURATION),
    ]);

    if (!sessionId || !startTimeStr) return false;

    const startTime = parseInt(startTimeStr, 10);
    const maxDuration = parseInt(maxDurationStr || '10800000', 10); // Default 3 hours

    if (Date.now() - startTime > maxDuration) {
      console.log('[BackgroundTracking] Max duration elapsed. Auto-expiring session...');
      await stopLiveTransitSharing('AUTO_EXPIRED_TIME_LIMIT');
      return true;
    }
    return false;
  } catch (err) {
    console.error('[BackgroundTracking] Expiration check error:', err);
    return false;
  }
}

// Register TaskManager definitions
TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTracking] Location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    // Check stationary expiration first
    const isExpired = await checkSessionExpiration();
    if (isExpired) return;

    for (const loc of locations) {
      const breadcrumb: BreadcrumbPoint = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: new Date(loc.timestamp).toISOString(),
      };

      // Always capture locally (decoupled from auth/network state)
      await queueBreadcrumbLocally(breadcrumb);
    }

    // Attempt background flush
    await flushPendingBreadcrumbs();
  }
});

TaskManager.defineTask(PERIODIC_SESSION_CHECK_TASK_NAME, async () => {
  try {
    const expired = await checkSessionExpiration();
    return expired
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 5. Start Live Transit Sharing Flow (Two-Step Permission Flow)
export async function startLiveTransitSharing(maxDurationMs = 10800000): Promise<{
  status: 'BACKGROUND' | 'FOREGROUND_ONLY' | 'DENIED';
  sessionId?: string;
  error?: string;
}> {
  // Step 1: Foreground Permission Request
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return { status: 'DENIED', error: 'Foreground location permission is required.' };
  }

  // Step 2: Background Permission Request (Only on explicit user action)
  const background = await Location.requestBackgroundPermissionsAsync();
  const sessionId = `TRK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now().toString();

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.SESSION_ID, sessionId],
    [STORAGE_KEYS.START_TIME, startTime],
    [STORAGE_KEYS.MAX_DURATION, maxDurationMs.toString()],
  ]);

  // Inform backend of session start
  try {
    const token = await getValidAuthToken();
    const baseUrl = getApiUrl();
    await fetch(`${baseUrl}/api/location/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch (err) {
    console.warn('[BackgroundTracking] Backend start notify warning:', err);
  }

  if (background.status === 'granted') {
    // Start Background Task & Background Fetch
    await Location.startLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME,
      BACKGROUND_TRACKING_CONFIG
    );

    const isFetchRegistered = await TaskManager.isTaskRegisteredAsync(PERIODIC_SESSION_CHECK_TASK_NAME);
    if (!isFetchRegistered) {
      await BackgroundFetch.registerTaskAsync(PERIODIC_SESSION_CHECK_TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    return { status: 'BACKGROUND', sessionId };
  } else {
    // Fallback: Foreground-Only Tracking Mode
    console.warn('[BackgroundTracking] Background permission denied. Entering Foreground-only mode.');
    return { status: 'FOREGROUND_ONLY', sessionId };
  }
}

// 6. Stop Live Transit Sharing Flow
export async function stopLiveTransitSharing(reason = 'USER_STOPPED'): Promise<{
  flushed: boolean;
  pendingCount: number;
}> {
  let flushSuccess = false;

  try {
    // Unregister background tasks
    const [isLocReg, isFetchReg] = await Promise.all([
      TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK_NAME),
      TaskManager.isTaskRegisteredAsync(PERIODIC_SESSION_CHECK_TASK_NAME),
    ]);

    if (isLocReg) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    if (isFetchReg) await BackgroundFetch.unregisterTaskAsync(PERIODIC_SESSION_CHECK_TASK_NAME);

    // Attempt final queue flush
    try {
      flushSuccess = await flushPendingBreadcrumbs();
    } catch (err) {
      flushSuccess = false;
      console.warn('[BackgroundTracking] Final flush failed:', err);
    }

    // Inform backend of stop
    const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const token = await getValidAuthToken();
    const baseUrl = getApiUrl();

    if (sessionId) {
      await fetch(`${baseUrl}/api/location/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId, reason }),
      });
    }

    // Clean session keys. Keep pending breadcrumbs IF flush failed!
    const keysToRemove = [
      STORAGE_KEYS.SESSION_ID,
      STORAGE_KEYS.START_TIME,
      STORAGE_KEYS.MAX_DURATION,
    ];

    if (flushSuccess) {
      keysToRemove.push(STORAGE_KEYS.PENDING_BREADCRUMBS);
    }

    await AsyncStorage.multiRemove(keysToRemove);

    const remainingRaw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_BREADCRUMBS);
    const remainingCount = remainingRaw ? JSON.parse(remainingRaw).length : 0;

    return { flushed: flushSuccess, pendingCount: remainingCount };
  } catch (err) {
    console.error('[BackgroundTracking] Stop error:', err);
    return { flushed: false, pendingCount: 0 };
  }
}
