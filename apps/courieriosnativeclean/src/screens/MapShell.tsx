import MapboxGL from '@rnmapbox/maps';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  NativeModules,
  Pressable,
  PushNotificationIOS,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
const { Alert, AppState } = require('react-native');
import { useCallback, useEffect, useRef, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mapboxConfig } from '../config/mapbox';
import { useOpenJobs } from '../hooks/useOpenJobs';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { Job } from '../types/job';
import {
  claimJob,
  getTokenPolicy,
  tokenFinalizeCheckoutSession,
  getTokenWalletSummary,
  tokenCreateCheckoutSession,
  updateJobStatus,
} from '../lib/jobs';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { getPublicConfig } from '../lib/publicConfig';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { JobDetailSheet } from '../components/JobDetailSheet';
import { logCourierEvent } from '../lib/analytics';
import { launchImageLibrary } from 'react-native-image-picker';

MapboxGL.setAccessToken(mapboxConfig.accessToken);

interface MapShellProps {
  onSignOut: () => void;
}

type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export function MapShell({ onSignOut }: MapShellProps) {
  const LOCATION_QUEUE_KEY = 'courier_location_queue_v1';
  const STATUS_QUEUE_KEY = 'courier_status_queue_v1';
  const TOKEN_CHECKOUT_PENDING_KEY = 'courier_token_checkout_pending_v1';
  const { user } = useAuth();
  const { flags } = useFeatureFlags();
  const { jobs, completedJobs, loading } = useOpenJobs(user?.uid ?? null);
  const [followUser] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastLocationWriteRef = useRef(0);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const shouldShareLocationRef = useRef(false);
  const locationClearedRef = useRef(false);
  const notificationIdRef = useRef(0);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showJobsPanel, setShowJobsPanel] = useState(true);
  const [proofJob, setProofJob] = useState<Job | null>(null);
  const [proofMode, setProofMode] = useState<'pickup' | 'dropoff'>('dropoff');
  const [proofLocation, setProofLocation] = useState<{ lat: number; lng: number; accuracy?: number | null } | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [jobAlert, setJobAlert] = useState<string | null>(null);
  const [jobAlertBody, setJobAlertBody] = useState<string | null>(null);
  const [jobAlertActive, setJobAlertActive] = useState(false);
  const [jobAlertFlash, setJobAlertFlash] = useState(false);
  const [pushDebugLog, setPushDebugLog] = useState<string[]>([]);
  const [showPushDebug, setShowPushDebug] = useState(false);
  const lastJobIdsRef = useRef<string[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRateCards, setShowRateCards] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxItems, setInboxItems] = useState<Array<{
    id: string;
    title: string;
    body: string;
    createdAt: number;
    read: boolean;
  }>>([]);
  const [actionsOpen, setActionsOpen] = useState(true);
  const [navActive, setNavActive] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({
    accountId: null as string | null,
    chargesEnabled: false,
    payoutsEnabled: false,
    requirementsDue: [] as string[],
    requirementsPastDue: [] as string[],
  });
  const [payouts, setPayouts] = useState<Array<{ id: string; amount: number; status: string; createdAt?: any }>>([]);
  const [earnings, setEarnings] = useState({
    total: 0,
    completed: 0,
    thisMonth: 0,
    pendingPayout: 0,
    avgPerJob: 0,
  });
  const [receipts, setReceipts] = useState<Array<{ id: string; amount: number; category: string; date?: any; notes?: string; receiptUrl?: string }>>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<{ id: string; receiptUrl?: string; amount?: number } | null>(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptCategory, setReceiptCategory] = useState('fuel');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [jobHistoryFilter, setJobHistoryFilter] = useState<'all' | 'week' | 'month'>('month');
  const [packageRateCard, setPackageRateCard] = useState<any | null>(null);
  const [foodRateCard, setFoodRateCard] = useState<any | null>(null);
  const [packageRateDraft, setPackageRateDraft] = useState({
    baseFare: '',
    perMile: '',
    perMinute: '',
    maxPickupDistanceMiles: '',
    maxDeliveryDistanceMiles: '',
  });
  const [foodRateDraft, setFoodRateDraft] = useState({
    baseFare: '',
    perMile: '',
    restaurantWaitPay: '',
    maxPickupDistanceMiles: '',
    maxDeliveryDistanceMiles: '',
  });
  const [rateCardSaving, setRateCardSaving] = useState(false);
  const [rateCardError, setRateCardError] = useState<string | null>(null);
  const rateCardDirtyRef = useRef(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    vehicleType: 'car',
    serviceRadius: '10',
    packagesEnabled: true,
    foodEnabled: false,
    payoutMode: 'cash' as 'cash' | 'token',
    acceptTokenPayoutJobs: true,
    identityDocUrl: '',
    identityStatus: 'missing',
    avatarUrl: '',
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    jobOffers: true,
    payoutUpdates: true,
    reminders: true,
  });
  const [tokenWallet, setTokenWallet] = useState<{ available: number; reserved: number } | null>(null);
  const [tokenPolicy, setTokenPolicy] = useState<any | null>(null);
  const [tokenWalletLoading, setTokenWalletLoading] = useState(false);
  const [tokenWalletError, setTokenWalletError] = useState<string | null>(null);
  const [tokenCheckoutBusy, setTokenCheckoutBusy] = useState(false);
  const tokenCheckoutFinalizeBusyRef = useRef(false);
  const appStateStatusRef = useRef<AppStateStatus>((AppState?.currentState as AppStateStatus) || 'active');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const flushBusyRef = useRef(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [previewRoute, setPreviewRoute] = useState<{
    toPickup?: { geojson: any; distance: number; duration: number };
    toDropoff?: { geojson: any; distance: number; duration: number };
    pickupCoord: { lat: number; lng: number };
    dropoffCoord: { lat: number; lng: number };
  } | null>(null);
  const [previewFallback, setPreviewFallback] = useState<{
    toPickup?: any;
    toDropoff?: any;
  } | null>(null);
  const [previewLocked, setPreviewLocked] = useState(false);
  const previewRouteCacheRef = useRef<
    Map<string, {
      toPickup?: { geojson: any; distance: number; duration: number };
      toDropoff?: { geojson: any; distance: number; duration: number };
      pickupCoord: { lat: number; lng: number };
      dropoffCoord: { lat: number; lng: number };
      updatedAt: number;
    }>
  >(new Map());
  const [previewLoading, setPreviewLoading] = useState(false);
  const lastPreviewRouteRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const [previewBounds, setPreviewBounds] = useState<{
    ne: [number, number];
    sw: [number, number];
  } | null>(null);
  const lastPreviewBoundsKeyRef = useRef<string>('');
  const [routeData, setRouteData] = useState<{
    geojson: any;
    distance: number;
    duration: number;
    targetLabel: string;
    targetCoord: { lat: number; lng: number };
    steps?: Array<{
      instruction: string;
      distance: number;
      duration: number;
      location: { lat: number; lng: number };
    }>;
  } | null>(null);
  const [routeOptions, setRouteOptions] = useState<Array<{
    geojson: any;
    distance: number;
    duration: number;
    targetLabel: string;
    targetCoord: { lat: number; lng: number };
    steps?: Array<{
      instruction: string;
      distance: number;
      duration: number;
      location: { lat: number; lng: number };
    }>;
  }>>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const lastRouteRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const courierWriteDeniedRef = useRef(false);
  const [pulseValue, setPulseValue] = useState(0.6);
  const proofEnabled = Boolean(flags?.customer?.proofPhotos);
  const jobDetailsEnabled = Boolean(flags?.courier?.jobDetails ?? true);
  const jobAlertsEnabled = Boolean(flags?.courier?.jobAlerts ?? true);
  const pushEnabled = Boolean(flags?.advanced?.pushNotifications ?? true);
  const backgroundLocationEnabled = Boolean(flags?.advanced?.backgroundLocation ?? false);
  const rateCardsEnabled = Boolean(flags?.courier?.rateCards ?? true);
  const modernUiEnabled = Boolean(flags?.ui?.modernStyling ?? true);
  const presentLocalNotification = useCallback((title: string, body: string) => {
    if (AppState?.currentState === 'active') return;
    if ((NativeModules as any)?.PushNotificationManager) {
      const push = PushNotificationIOS as any;
      push?.presentLocalNotification?.({
        alertTitle: title,
        alertBody: body,
        soundName: 'default',
      });
    }
  }, []);

  const addPushLog = useCallback((message: string) => {
    if (!__DEV__) return;
    setPushDebugLog((prev) => {
      const next = [`${new Date().toLocaleTimeString()}: ${message}`, ...prev];
      return next.slice(0, 8);
    });
  }, []);

  const isPermissionDeniedError = (err: any) => {
    const code = String(err?.code || '');
    const message = String(err?.message || '').toLowerCase();
    return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
  };

  const updateCourierProfile = useCallback(
    async (
      payload: Record<string, any>,
      options?: { warnLabel?: string; notifyUser?: boolean },
    ) => {
      if (!user?.uid || courierWriteDeniedRef.current) return false;
      try {
        await updateDoc(doc(db, 'users', user.uid), payload);
        return true;
      } catch (err: any) {
        if (isPermissionDeniedError(err)) {
          courierWriteDeniedRef.current = true;
          addPushLog('Firestore write denied for courier profile updates');
          if (options?.notifyUser) {
            setError('Your account cannot update courier settings yet. Please complete courier approval.');
          }
          return false;
        }
        if (options?.warnLabel) {
          console.warn(options.warnLabel, err);
        }
        return false;
      }
    },
    [user?.uid, addPushLog],
  );

  const addInboxItem = useCallback((title: string, body: string) => {
    const createdAt = Date.now();
    notificationIdRef.current += 1;
    const id = `${createdAt}-${notificationIdRef.current}`;
    setInboxItems((prev) => [{ id, title, body, createdAt, read: false }, ...prev].slice(0, 50));
  }, []);

  const formatInboxTime = (value: number) => {
    try {
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Now';
    }
  };

  const unreadCount = inboxItems.filter((item) => !item.read).length;

  const togglePanel = useCallback((panel: 'earnings' | 'profile' | 'rateCards' | 'inbox') => {
    setShowEarnings((prev) => (panel === 'earnings' ? !prev : false));
    setShowProfile((prev) => (panel === 'profile' ? !prev : false));
    setShowRateCards((prev) => (panel === 'rateCards' ? !prev : false));
    setShowInbox((prev) => (panel === 'inbox' ? !prev : false));
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    const exists = jobs.some((job) => job.id === selectedJob.id);
    if (!exists) setSelectedJob(null);
  }, [jobs, selectedJob]);

  useEffect(() => {
    if (!pushEnabled || !user?.uid) return;
    const nativePush = (NativeModules as any)?.PushNotificationManager;
    if (!nativePush) return;
    const push = PushNotificationIOS as any;
    if (!push?.requestPermissions || !push?.addEventListener) return;

    let isMounted = true;
    addPushLog('Requesting iOS notification permissions');
    push.requestPermissions({ alert: true, badge: true, sound: true })
      .then?.(() => addPushLog('iOS permissions requested'))
      .catch?.((err: any) => addPushLog(`iOS permission error: ${err?.message || err}`));

    const onRegister = (token: string) => {
      if (!isMounted || !token) return;
      addPushLog(`APNs device token registered: ${token.slice(0, 12)}…`);
      void updateCourierProfile({
        pushToken: token,
        pushTokenUpdatedAt: serverTimestamp(),
        'courierProfile.pushToken': token,
        'courierProfile.pushTokenUpdatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      void logCourierEvent({
        courierUid: user.uid,
        event: 'push_token_registered',
      });
    };

    const onRegistrationError = (err: any) => {
      console.warn('Push registration error', err);
      addPushLog(`APNs registration error: ${err?.message || err}`);
    };

    push.addEventListener('register', onRegister);
    push.addEventListener('registrationError', onRegistrationError);

    return () => {
      isMounted = false;
      push.removeEventListener('register', onRegister);
      push.removeEventListener('registrationError', onRegistrationError);
    };
  }, [pushEnabled, user?.uid, addPushLog]);

  useEffect(() => {
    if (!pushEnabled || !user?.uid) return;
    let unsubscribe: (() => void) | null = null;
    const initMessaging = async () => {
      try {
        await messaging().setAutoInitEnabled(true);
        const authStatus = await messaging().requestPermission();
        addPushLog(`FCM permission status: ${authStatus}`);
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) return;

        const apnsToken = await messaging().getAPNSToken();
        if (!apnsToken) {
          addPushLog('APNS token not ready; skipping FCM token fetch');
          return;
        }

        addPushLog(`FCM APNs token: ${apnsToken.slice(0, 12)}…`);
        await updateCourierProfile({
          apnsToken,
          apnsTokenUpdatedAt: serverTimestamp(),
          'courierProfile.apnsToken': apnsToken,
          'courierProfile.apnsTokenUpdatedAt': serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logCourierEvent({
          courierUid: user.uid,
          event: 'apns_token_registered',
        });

        if (__DEV__) {
          try {
            await messaging().deleteToken();
          } catch {
            // ignore token refresh errors in dev
          }
        }

        const token = await messaging().getToken();
        if (token) {
          addPushLog(`FCM token: ${token.slice(0, 12)}…`);
          await updateCourierProfile({
            fcmToken: token,
            fcmTokenUpdatedAt: serverTimestamp(),
            'courierProfile.fcmToken': token,
            'courierProfile.fcmTokenUpdatedAt': serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await logCourierEvent({
            courierUid: user.uid,
            event: 'fcm_token_registered',
          });
        }

        unsubscribe = messaging().onTokenRefresh(async (nextToken) => {
          addPushLog(`FCM token refreshed: ${nextToken.slice(0, 12)}…`);
          await updateCourierProfile({
            fcmToken: nextToken,
            fcmTokenUpdatedAt: serverTimestamp(),
            'courierProfile.fcmToken': nextToken,
            'courierProfile.fcmTokenUpdatedAt': serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
      } catch (error: any) {
        console.warn('FCM init failed', error);
        addPushLog(`FCM init error: ${error?.message || error}`);
      }
    };

    void initMessaging();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [pushEnabled, user?.uid, addPushLog, updateCourierProfile]);

  useEffect(() => {
    if (!pushEnabled) return;
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'New notification';
      const body = remoteMessage.notification?.body || 'You have a new update.';
      addPushLog(`Foreground push: ${title}`);

      setJobAlert(title);
      setJobAlertBody(body);
      addInboxItem(title, body);
      setJobAlertActive(true);
      setJobAlertFlash(true);

      const flash = setInterval(() => setJobAlertFlash((prev) => !prev), 400);
      const timeout = setTimeout(() => {
        setJobAlertActive(false);
        setJobAlertFlash(false);
        setJobAlert(null);
        setJobAlertBody(null);
        clearInterval(flash);
      }, 3500);

      if (user?.uid) {
        void updateDoc(doc(db, 'users', user.uid), {
          'courierProfile.lastPushAt': serverTimestamp(),
          'courierProfile.lastPushTitle': title,
          'courierProfile.lastPushBody': body,
          updatedAt: serverTimestamp(),
        });
        void logCourierEvent({
          courierUid: user.uid,
          event: 'push_received_foreground',
          details: {
            title,
            hasNotification: Boolean(remoteMessage.notification),
          },
        });
      }

      return () => {
        clearInterval(flash);
        clearTimeout(timeout);
      };
    });

    return () => unsubscribe();
  }, [pushEnabled, user?.uid, addPushLog, addInboxItem]);

  useEffect(() => {
    if (!pushEnabled) return;

    const handleOpened = (remoteMessage: any, source: 'opened' | 'initial') => {
      const title = remoteMessage?.notification?.title || 'New notification';
      const body = remoteMessage?.notification?.body || 'You have a new update.';
      addPushLog(`${source === 'initial' ? 'Launch' : 'Opened'} push: ${title}`);
      setJobAlert(title);
      setJobAlertBody(body);
      addInboxItem(title, body);
      setJobAlertActive(true);
      setTimeout(() => {
        setJobAlertActive(false);
        setJobAlert(null);
        setJobAlertBody(null);
      }, 3500);
    };

    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleOpened(remoteMessage, 'opened');
    });

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) handleOpened(remoteMessage, 'initial');
      })
      .catch((error) => {
        addPushLog(`Initial push read error: ${(error as any)?.message || error}`);
      });

    return () => unsubscribe();
  }, [pushEnabled, addInboxItem, addPushLog]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const sub = pulseAnim.addListener(({ value }: { value: number }) => {
      setPulseValue(0.6 + value * 0.8);
    });
    return () => {
      pulseAnim.removeListener(sub);
    };
  }, [pulseAnim]);

  useEffect(() => {
    if (!jobAlertsEnabled) return;
    const liveIds = jobs.map((job) => job.id).sort();
    const previous = lastJobIdsRef.current;
    const added = liveIds.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !liveIds.includes(id));
    lastJobIdsRef.current = liveIds;

    if (added.length > 0) {
      setJobAlert('New job available');
      setJobAlertBody('Tap to view details or claim the job.');
      addInboxItem('New job available', 'Tap to view details or claim the job.');
      setJobAlertActive(true);
      Vibration.vibrate(400);
      if (user?.uid) {
        void logCourierEvent({
          courierUid: user.uid,
          event: 'job_alert_new',
          details: { count: added.length, source: 'live' },
        });
      }
      const flash = setInterval(() => setJobAlertFlash((prev) => !prev), 400);
      const timeout = setTimeout(() => {
        setJobAlertActive(false);
        setJobAlertFlash(false);
        setJobAlert(null);
        setJobAlertBody(null);
        clearInterval(flash);
      }, 3500);
      return () => {
        clearInterval(flash);
        clearTimeout(timeout);
      };
    }

    if (removed.length > 0 && jobAlertActive) {
      setJobAlertActive(false);
      setJobAlertFlash(false);
      setJobAlert(null);
      setJobAlertBody(null);
    }
  }, [jobs, jobAlertsEnabled, jobAlertActive, user?.uid, addInboxItem]);

  useEffect(() => {
    let isMounted = true;
    const enableLocation = async () => {
      try {
        const locationManager = MapboxGL.locationManager as any;
        if (locationManager && !Array.isArray(locationManager._listeners)) {
          locationManager._listeners = [];
        }
        if (backgroundLocationEnabled) {
          await (locationManager.requestAlwaysAuthorization?.() ?? locationManager.requestWhenInUseAuthorization?.());
        } else {
          await (locationManager.requestWhenInUseAuthorization?.() ?? locationManager.requestAlwaysAuthorization?.());
        }
        if (backgroundLocationEnabled) {
          locationManager.setAllowsBackgroundLocationUpdates?.(true);
          locationManager.setPausesLocationUpdatesAutomatically?.(false);
          locationManager.setShowsBackgroundLocationIndicator?.(true);
        }
        await locationManager.start?.();
      } catch (err) {
        if (isMounted) {
          console.warn('Failed to enable location', err);
        }
      }
    };

    enableLocation();
    return () => {
      isMounted = false;
    };
  }, [backgroundLocationEnabled]);

  useEffect(() => {
    if (!user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as any;
      const next = data?.courierProfile?.isOnline ?? data?.courier?.isOnline ?? true;
      setIsOnline(Boolean(next));
      setStripeStatus({
        accountId:
          data?.courierProfile?.stripeConnectAccountId ||
          data?.courierProfile?.stripeAccountId ||
          null,
        chargesEnabled: Boolean(data?.courierProfile?.stripeChargesEnabled),
        payoutsEnabled: Boolean(data?.courierProfile?.stripePayoutsEnabled),
        requirementsDue: data?.courierProfile?.stripeRequirementsDue || [],
        requirementsPastDue: data?.courierProfile?.stripeRequirementsPastDue || [],
      });
      const nextPackageRateCard = data?.courierProfile?.packageRateCard || null;
      const nextFoodRateCard = data?.courierProfile?.foodRateCard || null;
      setPackageRateCard(nextPackageRateCard);
      setFoodRateCard(nextFoodRateCard);
      if (!rateCardDirtyRef.current) {
        setPackageRateDraft({
          baseFare: String(nextPackageRateCard?.baseFare ?? ''),
          perMile: String(nextPackageRateCard?.perMile ?? ''),
          perMinute: String(nextPackageRateCard?.perMinute ?? ''),
          maxPickupDistanceMiles: String(nextPackageRateCard?.maxPickupDistanceMiles ?? ''),
          maxDeliveryDistanceMiles: String(nextPackageRateCard?.maxDeliveryDistanceMiles ?? ''),
        });
        setFoodRateDraft({
          baseFare: String(nextFoodRateCard?.baseFare ?? ''),
          perMile: String(nextFoodRateCard?.perMile ?? ''),
          restaurantWaitPay: String(nextFoodRateCard?.restaurantWaitPay ?? ''),
          maxPickupDistanceMiles: String(nextFoodRateCard?.maxPickupDistanceMiles ?? ''),
          maxDeliveryDistanceMiles: String(nextFoodRateCard?.maxDeliveryDistanceMiles ?? ''),
        });
      }
      setProfileForm((prev) => ({
        ...prev,
        fullName: data?.fullName || prev.fullName,
        vehicleType: data?.courierProfile?.vehicleType || prev.vehicleType,
        serviceRadius: String(data?.courierProfile?.serviceRadius || prev.serviceRadius),
        packagesEnabled: Boolean(data?.courierProfile?.workModes?.packagesEnabled ?? prev.packagesEnabled),
        foodEnabled: Boolean(data?.courierProfile?.workModes?.foodEnabled ?? prev.foodEnabled),
        payoutMode: (data?.courierProfile?.payoutMode === 'token' ? 'token' : 'cash'),
        acceptTokenPayoutJobs: data?.courierProfile?.acceptTokenPayoutJobs !== false,
        identityDocUrl: data?.courierProfile?.identityDocUrl || prev.identityDocUrl,
        identityStatus: data?.courierProfile?.identityStatus || prev.identityStatus,
        avatarUrl: data?.courierProfile?.avatarUrl || data?.photoURL || prev.avatarUrl,
      }));
      setNotificationPrefs((prev) => ({
        ...prev,
        jobOffers: data?.courierProfile?.notificationPrefs?.jobOffers ?? prev.jobOffers,
        payoutUpdates: data?.courierProfile?.notificationPrefs?.payoutUpdates ?? prev.payoutUpdates,
        reminders: data?.courierProfile?.notificationPrefs?.reminders ?? prev.reminders,
      }));
      void loadQueue<any>(LOCATION_QUEUE_KEY).then((items) => {
        void loadQueue<any>(STATUS_QUEUE_KEY).then((statusItems) => {
          setPendingSyncCount(items.length + statusItems.length);
        });
      });
    });

    return () => unsubscribe();
  }, [user?.uid]);


  useEffect(() => {
    const total = completedJobs.reduce((sum, job) => sum + (job.agreedFee || 0), 0);
    const completed = completedJobs.length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = completedJobs
      .filter((job) => {
        const completedAt = job.completedAt?.toDate?.() || job.completedAt;
        return completedAt && completedAt >= monthStart;
      })
      .reduce((sum, job) => sum + (job.agreedFee || 0), 0);
    const avgPerJob = completed > 0 ? total / completed : 0;
    setEarnings((prev) => ({
      ...prev,
      total,
      completed,
      thisMonth,
      avgPerJob,
    }));
  }, [completedJobs]);

  useEffect(() => {
    if (!user?.uid) return;
    const payoutsQuery = query(
      collection(db, 'payouts'),
      where('courierUid', '==', user.uid)
    );
    const unsubscribe = onSnapshot(payoutsQuery, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      const pending = rows
        .filter((row) => row.status === 'pending' || row.status === 'pending_setup')
        .reduce((sum, row) => sum + (row.amount || 0), 0);
      setPayouts(rows as any);
      setEarnings((prev) => ({ ...prev, pendingPayout: pending }));
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const year = new Date().getFullYear();
    const receiptsQuery = query(
      collection(db, 'courierExpenseReceipts'),
      where('courierUid', '==', user.uid),
      where('year', '==', year),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(receiptsQuery, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
      setReceipts(rows as any);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const getMarkerEmoji = (job: Job) =>
    job.type === 'food' ? '🍔' : '📦';
  const isFoodJob = (job: Job) => job.type === 'food';
  const getPayoutText = (job: Job) => {
    if (job.agreedFee != null) return `$${job.agreedFee.toFixed(2)}`;
    return '—';
  };
  const getJobPhotoUrl = (job: Job) => {
    const photos = (job as any).photos || [];
    return photos?.[0]?.thumbnailURL || photos?.[0]?.url || null;
  };
  const getPickupLabel = (job: Job) =>
    (job.pickup as any).label || (job.pickup as any).address || 'Pickup';
  const getDropoffLabel = (job: Job) =>
    (job.dropoff as any).label || (job.dropoff as any).address || 'Dropoff';
  const getMaskedLocation = (point: { label?: string; address?: string }) => {
    const raw = point.address || point.label || '';
    const zipMatch = raw.match(/\b(\d{5})(-\d{4})?\b/);
    const zip = zipMatch?.[1];
    if (raw.includes(',')) {
      const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
      const city = parts.length >= 2 ? parts[1] : parts[0];
      if (city && zip) return `${city} ${zip}`;
      if (city) return city;
    }
    return zip ? `Area ${zip}` : 'Area';
  };
  const getEffectiveStatus = (job: Job): string => job.statusDetail ?? job.status;
  const isAssignedToMe = (job: Job) => !!user?.uid && job.courierUid === user.uid;
  const canRevealDetails = (job: Job) => isAssignedToMe(job);
  const getVisiblePickupLabel = (job: Job) =>
    !canRevealDetails(job)
      ? getMaskedLocation(job.pickup)
      : getPickupLabel(job);
  const getVisibleDropoffLabel = (job: Job) =>
    !canRevealDetails(job)
      ? getMaskedLocation(job.dropoff)
      : getDropoffLabel(job);

  const formatMoney = (value: number) => `$${value.toFixed(2)}`;
  const metersToMiles = (meters: number) => meters / 1609.34;
  const formatMiles = (meters: number) => `${metersToMiles(meters).toFixed(1)} mi`;

  const getFilteredCompletedJobs = () => {
    const now = new Date();
    const cutoff = new Date(now);
    if (jobHistoryFilter === 'week') {
      cutoff.setDate(now.getDate() - 7);
    } else if (jobHistoryFilter === 'month') {
      cutoff.setDate(now.getDate() - 30);
    } else {
      cutoff.setFullYear(1970);
    }
    return completedJobs.filter((job) => {
      const completedAt = job.completedAt?.toDate?.() || job.completedAt;
      return completedAt && completedAt >= cutoff;
    });
  };

  const loadQueue = async <T,>(key: string): Promise<T[]> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  };

  const saveQueue = async <T,>(key: string, items: T[]) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const enqueueLocation = async (payload: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    ts: number;
  }) => {
    const items = await loadQueue<typeof payload>(LOCATION_QUEUE_KEY);
    const next = [payload, ...items].slice(0, 50);
    await saveQueue(LOCATION_QUEUE_KEY, next);
    setPendingSyncCount((count) => count + 1);
  };

  const enqueueStatus = async (payload: { jobId: string; statusDetail: Job['status']; ts: number }) => {
    const items = await loadQueue<typeof payload>(STATUS_QUEUE_KEY);
    const next = [payload, ...items].slice(0, 50);
    await saveQueue(STATUS_QUEUE_KEY, next);
    setPendingSyncCount((count) => count + 1);
  };

  const flushQueues = useCallback(async () => {
    if (!user?.uid || flushBusyRef.current) return;
    flushBusyRef.current = true;
    try {
      if (shouldShareLocationRef.current) {
        const locationQueue = await loadQueue<any>(LOCATION_QUEUE_KEY);
        const remainingLocations: any[] = [];
        for (const item of locationQueue) {
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              'courierProfile.currentLocation.lat': item.lat,
              'courierProfile.currentLocation.lng': item.lng,
              ...(item.heading != null ? { 'courierProfile.currentLocation.heading': item.heading } : {}),
              ...(item.speed != null ? { 'courierProfile.currentLocation.speed': item.speed } : {}),
              ...(item.accuracy != null ? { 'courierProfile.currentLocation.accuracy': item.accuracy } : {}),
              'courierProfile.currentLocation.timestamp': serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch {
            remainingLocations.push(item);
          }
        }
        await saveQueue(LOCATION_QUEUE_KEY, remainingLocations);
      } else {
        await saveQueue(LOCATION_QUEUE_KEY, []);
      }

      const statusQueue = await loadQueue<any>(STATUS_QUEUE_KEY);
      const remainingStatuses: any[] = [];
      for (const item of statusQueue) {
        try {
          await updateJobStatus(item.jobId, item.statusDetail);
        } catch {
          remainingStatuses.push(item);
        }
      }
      await saveQueue(STATUS_QUEUE_KEY, remainingStatuses);
      const locationQueue = await loadQueue<any>(LOCATION_QUEUE_KEY);
      setPendingSyncCount(locationQueue.length + remainingStatuses.length);
    } finally {
      flushBusyRef.current = false;
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    flushQueues();
    const interval = setInterval(flushQueues, 20000);
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        flushQueues();
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user?.uid, flushQueues]);

  const handleStripeConnect = async () => {
    if (!user?.uid) return;
    try {
      const config = await getPublicConfig();
      const baseUrl = config?.stripeMode === 'live'
        ? 'https://gosenderr.com'
        : 'https://gosenderr-courier.web.app';
      const functions = getFunctions();
      const stripeConnect = httpsCallable(functions, 'stripeConnect');
      const refreshUrl = `${baseUrl}/onboarding/stripe`;
      const returnUrl = `${baseUrl}/onboarding/stripe?success=1`;
      const result = await stripeConnect({
        accountId: stripeStatus.accountId,
        refreshUrl,
        returnUrl,
      });
      const data = result.data as any;
      const url = data?.url;
      if (url) {
        Linking.openURL(url);
      }
    } catch (error: any) {
      console.warn('Stripe connect failed', error);
    }
  };

  const handlePickReceipt = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1600,
        maxHeight: 1600,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setReceiptError(result.errorMessage ?? 'Unable to select photo');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setReceiptError('No receipt selected');
        return;
      }
      setReceiptUri(asset.uri);
      setReceiptError(null);
    } catch (err: any) {
      setReceiptError(err?.message ?? 'Failed to select receipt');
    }
  };

  const handleUploadReceipt = async () => {
    if (!user?.uid || !receiptUri || receiptUploading) return;
    const amount = Number(receiptAmount);
    if (!amount || Number.isNaN(amount)) {
      setReceiptError('Enter a valid amount');
      return;
    }
    setReceiptUploading(true);
    setReceiptError(null);
    try {
      const response = await fetch(receiptUri);
      const blob = await response.blob();
      const filename = `receipt_${Date.now()}.jpg`;
      const dateValue = receiptDate ? new Date(receiptDate) : new Date();
      const year = dateValue.getFullYear();
      const storageRef = ref(storage, `courier-expenses/${user.uid}/${year}/${filename}`);
      await uploadBytes(storageRef, blob as any, { contentType: 'image/jpeg' });
      const receiptUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'courierExpenseReceipts'), {
        courierUid: user.uid,
        amount,
        category: receiptCategory,
        notes: receiptNotes || null,
        date: Timestamp.fromDate(dateValue),
        year,
        receiptUrl,
        createdAt: serverTimestamp(),
      } as any);

      setReceiptAmount('');
      setReceiptCategory('fuel');
      setReceiptNotes('');
      setReceiptDate(new Date().toISOString().slice(0, 10));
      setReceiptUri(null);
    } catch (err: any) {
      setReceiptError(err?.message ?? 'Failed to upload receipt');
    } finally {
      setReceiptUploading(false);
    }
  };

  const handlePickIdentity = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        maxWidth: 1800,
        maxHeight: 1800,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setProfileError(result.errorMessage ?? 'Unable to select ID');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setProfileError('No ID selected');
        return;
      }

      setProfileSaving(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = `id_${Date.now()}.jpg`;
      const storageRef = ref(storage, `courierDocuments/${user?.uid}/${filename}`);
      await uploadBytes(storageRef, blob as any, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.identityDocUrl': url,
        'courierProfile.identityStatus': 'pending',
        'courierProfile.identityUpdatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfileForm((prev) => ({ ...prev, identityDocUrl: url, identityStatus: 'pending' }));
      setProfileError(null);
    } catch (err: any) {
      setProfileError(err?.message ?? 'Failed to upload ID');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!user?.uid) return;
    setAvatarError(null);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        setAvatarError(result.errorMessage ?? 'Unable to select avatar');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setAvatarError('No avatar selected');
        return;
      }

      setAvatarUploading(true);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = `avatar_${Date.now()}.jpg`;
      const storageRef = ref(storage, `courier-avatars/${user.uid}/${filename}`);
      await uploadBytes(storageRef, blob as any, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: url,
        'courierProfile.avatarUrl': url,
        'courierProfile.avatarUpdatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfileForm((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      setAvatarError(err?.message ?? 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const radius = Number(profileForm.serviceRadius);
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: profileForm.fullName,
        'courierProfile.vehicleType': profileForm.vehicleType,
        'courierProfile.serviceRadius': Number.isNaN(radius) ? 10 : radius,
        'courierProfile.workModes.packagesEnabled': profileForm.packagesEnabled,
        'courierProfile.workModes.foodEnabled': profileForm.foodEnabled,
        'courierProfile.payoutMode': profileForm.payoutMode,
        'courierProfile.acceptTokenPayoutJobs': profileForm.acceptTokenPayoutJobs,
        'courierProfile.notificationPrefs': notificationPrefs,
        notificationPreferences: {
          deliveryUpdates: notificationPrefs.jobOffers,
          nearbyCourierAlerts: notificationPrefs.jobOffers,
          marketing: notificationPrefs.reminders,
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setProfileError(err?.message ?? 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const parseOptionalNumber = (value: string) => {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleSaveRateCard = async (type: 'package' | 'food') => {
    if (!user?.uid) return;
    setRateCardSaving(true);
    setRateCardError(null);
    try {
      if (type === 'package') {
        const nextPackageRateCard = {
          baseFare: Math.max(3, Number(packageRateDraft.baseFare) || 3),
          perMile: Math.max(0.5, Number(packageRateDraft.perMile) || 0.5),
          perMinute: Math.max(0.1, Number(packageRateDraft.perMinute) || 0.1),
          maxPickupDistanceMiles: parseOptionalNumber(packageRateDraft.maxPickupDistanceMiles),
          maxDeliveryDistanceMiles: parseOptionalNumber(packageRateDraft.maxDeliveryDistanceMiles),
          optionalFees: packageRateCard?.optionalFees || [],
        };
        await updateDoc(doc(db, 'users', user.uid), {
          'courierProfile.packageRateCard': nextPackageRateCard,
          'courierProfile.workModes.packagesEnabled': true,
          updatedAt: serverTimestamp(),
        });
        setPackageRateCard(nextPackageRateCard);
      } else {
        const nextFoodRateCard = {
          baseFare: Math.max(2.5, Number(foodRateDraft.baseFare) || 2.5),
          perMile: Math.max(0.75, Number(foodRateDraft.perMile) || 0.75),
          restaurantWaitPay: Math.max(0.15, Number(foodRateDraft.restaurantWaitPay) || 0.15),
          maxPickupDistanceMiles: parseOptionalNumber(foodRateDraft.maxPickupDistanceMiles),
          maxDeliveryDistanceMiles: parseOptionalNumber(foodRateDraft.maxDeliveryDistanceMiles),
          optionalFees: foodRateCard?.optionalFees || [],
        };
        await updateDoc(doc(db, 'users', user.uid), {
          'courierProfile.foodRateCard': nextFoodRateCard,
          'courierProfile.workModes.foodEnabled': true,
          updatedAt: serverTimestamp(),
        });
        setFoodRateCard(nextFoodRateCard);
      }
      rateCardDirtyRef.current = false;
    } catch (err: any) {
      setRateCardError(err?.message ?? 'Failed to save rate card');
    } finally {
      setRateCardSaving(false);
    }
  };

  const handleToggleWorkMode = async (type: 'packages' | 'food') => {
    if (!user?.uid) return;
    setRateCardError(null);
    const nextValue = type === 'packages' ? !profileForm.packagesEnabled : !profileForm.foodEnabled;
    setProfileForm((prev) => ({
      ...prev,
      packagesEnabled: type === 'packages' ? nextValue : prev.packagesEnabled,
      foodEnabled: type === 'food' ? nextValue : prev.foodEnabled,
    }));
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...(type === 'packages'
          ? { 'courierProfile.workModes.packagesEnabled': nextValue }
          : { 'courierProfile.workModes.foodEnabled': nextValue }),
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      setRateCardError(err?.message ?? 'Failed to update work mode');
    }
  };

  const refreshTokenWallet = useCallback(async () => {
    if (!user?.uid) return;

    if (!tokenCheckoutFinalizeBusyRef.current) {
      try {
        const pendingRaw = await AsyncStorage.getItem(TOKEN_CHECKOUT_PENDING_KEY);
        if (pendingRaw) {
          const pendingCheckout = JSON.parse(pendingRaw) as { idempotencyKey?: string; sessionId?: string };
          const finalizeResult = await tokenFinalizeCheckoutSession({
            idempotencyKey: pendingCheckout?.idempotencyKey,
            sessionId: pendingCheckout?.sessionId,
          });
          if (finalizeResult?.paymentStatus === 'paid' || finalizeResult?.credited) {
            await AsyncStorage.removeItem(TOKEN_CHECKOUT_PENDING_KEY);
            if (finalizeResult?.wallet) {
              setTokenWallet({
                available: finalizeResult.wallet.available,
                reserved: finalizeResult.wallet.reserved,
              });
            }
          }
        }
      } catch {
        // Best effort: wallet refresh still runs below.
      }
    }

    setTokenWalletLoading(true);
    try {
      const [policy, wallet] = await Promise.all([
        getTokenPolicy(),
        getTokenWalletSummary(),
      ]);
      setTokenPolicy(policy);
      setTokenWallet({ available: wallet.available, reserved: wallet.reserved });
      setTokenWalletError(null);
    } catch (error: any) {
      setTokenWalletError(error?.message || 'Unable to sync token wallet');
    } finally {
      setTokenWalletLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!showProfile || !user?.uid) return;
    void refreshTokenWallet();
  }, [showProfile, user?.uid, refreshTokenWallet]);

  useEffect(() => {
    if (!user?.uid) return;
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prevState = appStateStatusRef.current;
      appStateStatusRef.current = nextState;
      if ((prevState === 'background' || prevState === 'inactive') && nextState === 'active') {
        if (tokenCheckoutFinalizeBusyRef.current) return;
        tokenCheckoutFinalizeBusyRef.current = true;
        void (async () => {
          try {
            const pendingRaw = await AsyncStorage.getItem(TOKEN_CHECKOUT_PENDING_KEY);
            if (!pendingRaw) return;

            const pendingCheckout = JSON.parse(pendingRaw) as { idempotencyKey?: string; sessionId?: string };
            const finalizeResult = await tokenFinalizeCheckoutSession({
              idempotencyKey: pendingCheckout?.idempotencyKey,
              sessionId: pendingCheckout?.sessionId,
            });

            if (finalizeResult?.paymentStatus === 'paid' || finalizeResult?.credited) {
              await AsyncStorage.removeItem(TOKEN_CHECKOUT_PENDING_KEY);
              if (finalizeResult?.wallet) {
                setTokenWallet({
                  available: finalizeResult.wallet.available,
                  reserved: finalizeResult.wallet.reserved,
                });
              }
              setTokenWalletError(null);
              Alert.alert('Tokens added', 'Your token wallet has been credited.');
              return;
            }

            if (finalizeResult?.paymentStatus && finalizeResult.paymentStatus !== 'paid') {
              setTokenWalletError('Payment is still processing. Pull to refresh in a moment.');
            }
          } catch (error: any) {
            setTokenWalletError(error?.message || 'Unable to finalize token checkout yet');
          } finally {
            tokenCheckoutFinalizeBusyRef.current = false;
          }
        })();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user?.uid]);

  const handleTokenTopUp = async () => {
    if (!user?.uid || !tokenPolicy?.enabled || !Array.isArray(tokenPolicy?.packs)) return;
    const firstActivePack = tokenPolicy.packs.find((pack: any) => pack?.active !== false) || tokenPolicy.packs[0];
    if (!firstActivePack?.id) return;

    setTokenCheckoutBusy(true);
    try {
      const idempotencyKey = `native_token_checkout_${Date.now()}`;
      const session = await tokenCreateCheckoutSession(
        firstActivePack.id,
        'https://gosenderr.com/senderr/token/success',
        'https://gosenderr.com/senderr/token/cancel',
        idempotencyKey,
      );
      if (session?.url) {
        await AsyncStorage.setItem(
          TOKEN_CHECKOUT_PENDING_KEY,
          JSON.stringify({
            idempotencyKey,
            sessionId: session.sessionId,
            createdAt: Date.now(),
          }),
        );
        await Linking.openURL(session.url);
      }
    } catch (error: any) {
      setTokenWalletError(error?.message || 'Unable to start token checkout');
    } finally {
      setTokenCheckoutBusy(false);
    }
  };
  const isClaimable = (job: Job) =>
    isOnline &&
    (getEffectiveStatus(job) === 'open' || getEffectiveStatus(job) === 'pending') &&
    (job.courierUid == null);
  const getNextStatus = (status: string): Job['status'] | null => {
    switch (status) {
      case 'in_progress':
        return 'enroute_pickup';
      case 'assigned':
        return 'enroute_pickup';
      case 'enroute_pickup':
        return 'arrived_pickup';
      case 'arrived_pickup':
        return 'picked_up';
      case 'picked_up':
        return 'enroute_dropoff';
      case 'enroute_dropoff':
        return 'arrived_dropoff';
      case 'arrived_dropoff':
        return 'completed';
      default:
        return null;
    }
  };

  const needsPickupProof = (job: Job) =>
    proofEnabled && getEffectiveStatus(job) === 'arrived_pickup';
  const needsDropoffProof = (job: Job) =>
    proofEnabled && getEffectiveStatus(job) === 'arrived_dropoff';

  const formatTimestamp = (value: any) =>
    value?.toDate ? value.toDate().toLocaleTimeString() : '—';

  const normalizeStatusForTimeline = (status: string) =>
    status === 'pending' ? 'open' : status === 'in_progress' ? 'enroute_pickup' : status;

  const getRouteTarget = (job: Job) => {
    const status = getEffectiveStatus(job);
    if (['assigned', 'enroute_pickup', 'arrived_pickup'].includes(status)) {
      return { ...job.pickup, label: 'Pickup' };
    }
    if (['picked_up', 'enroute_dropoff', 'arrived_dropoff'].includes(status)) {
      return { ...job.dropoff, label: 'Dropoff' };
    }
    return null;
  };

  const getNextStep = (
    steps: Array<{ instruction: string; distance: number; duration: number; location: { lat: number; lng: number } }>,
    location: { lat: number; lng: number }
  ) => {
    if (!steps.length) return null;
    const next = steps
      .map((step) => ({
        step,
        remaining: getDistanceMeters(location.lat, location.lng, step.location.lat, step.location.lng),
      }))
      .sort((a, b) => a.remaining - b.remaining)[0];
    return next?.step ?? null;
  };

  const handleStartNavigation = (job: Job) => {
    setShowEarnings(false);
    setShowProfile(false);
    setShowRateCards(false);
    setNavActive(true);
  };

  const getBoundsForGeojson = (geojson?: any) => {
    const coords: number[][] = geojson?.geometry?.coordinates || [];
    if (!Array.isArray(coords) || coords.length === 0) return null;
    let minLng = coords[0][0];
    let maxLng = coords[0][0];
    let minLat = coords[0][1];
    let maxLat = coords[0][1];
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    return { minLng, minLat, maxLng, maxLat };
  };

  const getBoundsForPoints = (points: Array<{ lat: number; lng: number }>) => {
    if (points.length === 0) return null;
    let minLng = points[0].lng;
    let maxLng = points[0].lng;
    let minLat = points[0].lat;
    let maxLat = points[0].lat;
    points.forEach(({ lng, lat }) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    return { ne: [maxLng, maxLat] as [number, number], sw: [minLng, minLat] as [number, number] };
  };

  const setPreviewBoundsIfChanged = (bounds: { ne: [number, number]; sw: [number, number] } | null) => {
    if (!bounds) {
      lastPreviewBoundsKeyRef.current = '';
      setPreviewBounds(null);
      return;
    }
    const key = `${bounds.ne[0].toFixed(5)},${bounds.ne[1].toFixed(5)}:${bounds.sw[0].toFixed(5)},${bounds.sw[1].toFixed(5)}`;
    if (lastPreviewBoundsKeyRef.current === key) return;
    lastPreviewBoundsKeyRef.current = key;
    setPreviewBounds(bounds);
  };

  const focusPreviewRoute = useCallback(
    (job: Job) => {
      const bounds = getBoundsForPoints([
        { lat: job.pickup.lat, lng: job.pickup.lng },
        { lat: job.dropoff.lat, lng: job.dropoff.lng },
      ]);
      if (!bounds) return;
      setPreviewBoundsIfChanged(bounds);
      cameraRef.current?.setCamera({
        bounds: {
          ne: bounds.ne,
          sw: bounds.sw,
          paddingTop: 120,
          paddingBottom: 220,
          paddingLeft: 80,
          paddingRight: 80,
        },
        animationDuration: 700,
      });
    },
    []
  );

  const buildLineFeature = (points: Array<{ lat: number; lng: number }>) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
    properties: {},
  });

  const fitPreviewRoute = useCallback((route: typeof previewRoute) => {
    if (!route?.pickupCoord || !route?.dropoffCoord) return;
    const points = [route.pickupCoord, route.dropoffCoord];
    const bounds = getBoundsForPoints(points);
    if (bounds) setPreviewBoundsIfChanged(bounds);
  }, []);

  const tripSteps = [
    { status: 'open', label: 'Posted' },
    { status: 'assigned', label: 'Assigned' },
    { status: 'enroute_pickup', label: 'En route to pickup' },
    { status: 'arrived_pickup', label: 'Arrived pickup' },
    { status: 'picked_up', label: 'Picked up' },
    { status: 'enroute_dropoff', label: 'En route to dropoff' },
    { status: 'arrived_dropoff', label: 'Arrived dropoff' },
    { status: 'completed', label: 'Completed' },
  ];

  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocationUpdate = useCallback(
    (location: any) => {
      if (!user?.uid || !location?.coords) return;
      const { latitude, longitude, heading, speed, accuracy, course } = location.coords;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      setCurrentLocation({ lat: latitude, lng: longitude });
      const nextHeading = typeof heading === 'number' ? heading : typeof course === 'number' ? course : null;
      if (nextHeading != null) {
        setCurrentHeading(nextHeading);
      }
      if (typeof accuracy === 'number') {
        setCurrentAccuracy(accuracy);
      }

      if (navActive && routeData?.targetCoord) {
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 16,
          pitch: 55,
          heading: nextHeading ?? 0,
          animationDuration: 350,
        });
      }

      const now = Date.now();
      const timeSinceLast = now - lastLocationWriteRef.current;
      let shouldWrite = timeSinceLast >= 5000;

      if (!shouldWrite && lastLocationRef.current) {
        const distance = getDistanceMeters(
          lastLocationRef.current.lat,
          lastLocationRef.current.lng,
          latitude,
          longitude
        );
        shouldWrite = distance >= 25;
      }

      const isPreviewing = Boolean(previewBounds || previewRoute || selectedJob || previewLocked);

      if (!shouldWrite) {
        if (followUser && !isPreviewing && !navActive) {
          cameraRef.current?.setCamera({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 12,
            animationDuration: 500,
          });
        }
        return;
      }

      if (followUser && !isPreviewing && !navActive) {
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 12,
          animationDuration: 500,
        });
      }

      if (!shouldShareLocationRef.current) {
        return;
      }

      void updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.currentLocation.lat': latitude,
        'courierProfile.currentLocation.lng': longitude,
        ...(heading != null ? { 'courierProfile.currentLocation.heading': heading } : {}),
        ...(speed != null ? { 'courierProfile.currentLocation.speed': speed } : {}),
        ...(accuracy != null ? { 'courierProfile.currentLocation.accuracy': accuracy } : {}),
        'courierProfile.currentLocation.timestamp': serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
        .then(() => {
          lastLocationWriteRef.current = now;
          lastLocationRef.current = { lat: latitude, lng: longitude };
        })
        .catch(async (err) => {
          console.warn('Failed to update courier location', err);
          await enqueueLocation({
            lat: latitude,
            lng: longitude,
            heading,
            speed,
            accuracy,
            ts: now,
          });
        });
    },
    [user?.uid, followUser, previewBounds, previewRoute, selectedJob, previewLocked, navActive, routeData]
  );


  useEffect(() => {
    if (!currentLocation || !selectedJob || !isLiveJob(selectedJob)) {
      setPreviewRoute(null);
      setPreviewFallback(null);
      setPreviewLocked(false);
      return;
    }
    if (isAssignedToMe(selectedJob)) {
      setPreviewRoute(null);
      setPreviewFallback(null);
      setPreviewLocked(false);
      return;
    }
    if (selectedJob.courierUid && selectedJob.courierUid !== user?.uid) {
      setPreviewRoute(null);
      setPreviewFallback(null);
      setPreviewLocked(false);
      return;
    }

    const pickup = selectedJob.pickup;
    const dropoff = selectedJob.dropoff;
    if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
      setPreviewRoute(null);
      return;
    }

    const initialBounds = getBoundsForPoints([
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng },
      ...(currentLocation ? [{ lat: currentLocation.lat, lng: currentLocation.lng }] : []),
    ]);
    if (initialBounds) {
      setPreviewBoundsIfChanged(initialBounds);
    }

    if (!previewLocked) {
      setPreviewFallback({
        toPickup: currentLocation ? buildLineFeature([
          { lat: currentLocation.lat, lng: currentLocation.lng },
          { lat: pickup.lat, lng: pickup.lng },
        ]) : null,
        toDropoff: buildLineFeature([
          { lat: pickup.lat, lng: pickup.lng },
          { lat: dropoff.lat, lng: dropoff.lng },
        ]),
      });
    }

    const key = `${selectedJob.id}:${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(4)}:` +
      `${pickup.lat.toFixed(4)},${pickup.lng.toFixed(4)}:` +
      `${dropoff.lat.toFixed(4)},${dropoff.lng.toFixed(4)}`;
    const now = Date.now();
    if (lastPreviewRouteRef.current.key === key && now - lastPreviewRouteRef.current.at < 30000) {
      return;
    }

    const cached = previewRouteCacheRef.current.get(key);
    if (cached && now - cached.updatedAt < 5 * 60 * 1000) {
      setPreviewRoute({
        toPickup: cached.toPickup,
        toDropoff: cached.toDropoff,
        pickupCoord: cached.pickupCoord,
        dropoffCoord: cached.dropoffCoord,
      });
    }

    const controller = new AbortController();
    setPreviewLoading(true);
    const fetchLeg = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
        `${from.lng},${from.lat};${to.lng},${to.lat}` +
        `?geometries=geojson&overview=full&access_token=${mapboxConfig.accessToken}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route?.geometry) throw new Error('No route geometry');
      return {
        geojson: { type: 'Feature', geometry: route.geometry, properties: {} },
        distance: route.distance || 0,
        duration: route.duration || 0,
      };
    };

    const fetchPreview = async () => {
      try {
        const [toPickup, toDropoff] = await Promise.all([
          fetchLeg(currentLocation, pickup),
          fetchLeg(pickup, dropoff),
        ]);
        const nextPreview = {
          toPickup,
          toDropoff,
          pickupCoord: { lat: pickup.lat, lng: pickup.lng },
          dropoffCoord: { lat: dropoff.lat, lng: dropoff.lng },
        };
        setPreviewRoute(nextPreview);
        previewRouteCacheRef.current.set(key, { ...nextPreview, updatedAt: Date.now() });
        lastPreviewRouteRef.current = { key, at: Date.now() };
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          console.warn('Failed to fetch preview route', err);
        }
      } finally {
        setPreviewLoading(false);
      }
    };

    void fetchPreview();
    return () => controller.abort();
  }, [currentLocation, selectedJob, user?.uid, previewLocked]);

  useEffect(() => {
    if (previewRoute) {
      fitPreviewRoute(previewRoute);
      return;
    }
    if (!previewLocked) {
      setPreviewBoundsIfChanged(null);
      setPreviewFallback(null);
    }
    if (currentLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: [currentLocation.lng, currentLocation.lat],
        zoomLevel: 12,
        animationDuration: 700,
      });
    }
  }, [previewRoute, currentLocation, fitPreviewRoute, previewLocked]);

  const toggleOnline = async () => {
    if (!user?.uid || onlineBusy) return;
    setOnlineBusy(true);
    try {
      const updated = await updateCourierProfile(
        {
        'courierProfile.isOnline': !isOnline,
        updatedAt: serverTimestamp(),
        },
        { warnLabel: 'Failed to update online status', notifyUser: true },
      );
      if (!updated) return;
      await logCourierEvent({
        courierUid: user.uid,
        event: 'courier_online_toggle',
        details: { isOnline: !isOnline },
      });
    } catch (err) {
      console.warn('Failed to update online status', err);
    } finally {
      setOnlineBusy(false);
    }
  };

  const handleClaim = async (job: Job) => {
    if (!user?.uid) return;
    setError(null);
    setBusyJobId(job.id);
    try {
      await claimJob(job, user.uid, job.agreedFee ?? undefined);
      await logCourierEvent({
        courierUid: user.uid,
        event: 'job_claimed',
        jobId: job.id,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to claim job');
    } finally {
      setBusyJobId(null);
    }
  };

  const confirmClaim = (job: Job) => {
    Alert.alert(
      'Claim this job?',
      'You will be assigned this delivery.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Claim', style: 'default', onPress: () => handleClaim(job) },
      ],
    );
  };

  const handleAdvance = async (job: Job) => {
    const nextStatus = getNextStatus(getEffectiveStatus(job));
    if (!nextStatus) return;
    setError(null);
    setBusyJobId(job.id);
    try {
      await updateJobStatus(job.id, nextStatus);
      if (user?.uid) {
        await logCourierEvent({
          courierUid: user.uid,
          event: 'job_status_advance',
          jobId: job.id,
          details: { status: nextStatus },
        });
      }
    } catch (err: any) {
      await enqueueStatus({ jobId: job.id, statusDetail: nextStatus, ts: Date.now() });
      setError('Offline: status update queued');
    } finally {
      setBusyJobId(null);
    }
  };

  const liveActiveJob = jobs.find(
    (job) => isAssignedToMe(job) && job.status !== 'completed' && job.status !== 'cancelled'
  );
  const hasActiveJob = Boolean(liveActiveJob);
  const [jobsView, setJobsView] = useState<'active' | 'jobs'>('active');

  useEffect(() => {
    const status = liveActiveJob ? getEffectiveStatus(liveActiveJob) : null;
    const shouldShare = Boolean(liveActiveJob && status !== 'completed' && status !== 'cancelled');
    shouldShareLocationRef.current = shouldShare;

    if (shouldShare) {
      locationClearedRef.current = false;
      return;
    }

    if (!user?.uid || locationClearedRef.current) return;
    locationClearedRef.current = true;
    lastLocationRef.current = null;
    void saveQueue(LOCATION_QUEUE_KEY, []).then(() => {
      void loadQueue<any>(STATUS_QUEUE_KEY).then((statusQueue) => {
        setPendingSyncCount(statusQueue.length);
      });
    });
    void updateDoc(doc(db, 'users', user.uid), {
      'courierProfile.currentLocation': null,
      updatedAt: serverTimestamp(),
    }).catch(() => undefined);
  }, [liveActiveJob, user?.uid]);

  useEffect(() => {
    if (!liveActiveJob) {
      setNavActive(false);
      return;
    }
    const status = getEffectiveStatus(liveActiveJob);
    if (status === 'completed' || status === 'cancelled') {
      setNavActive(false);
      return;
    }
    if (status === 'enroute_pickup' || status === 'enroute_dropoff') {
      setNavActive(true);
    }
  }, [liveActiveJob]);

  useEffect(() => {
    if (!currentLocation || !liveActiveJob) {
      setRouteData(null);
      setRouteOptions([]);
      return;
    }

    const target = getRouteTarget(liveActiveJob);
    if (!target) {
      setRouteData(null);
      return;
    }

    const key = `${liveActiveJob.id}:${getEffectiveStatus(liveActiveJob)}:` +
      `${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(4)}:` +
      `${target.lat.toFixed(4)},${target.lng.toFixed(4)}`;
    const now = Date.now();
    if (lastRouteRef.current.key === key && now - lastRouteRef.current.at < 30000) {
      return;
    }

    const controller = new AbortController();
    setRouteLoading(true);
    const fetchRoute = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${currentLocation.lng},${currentLocation.lat};${target.lng},${target.lat}` +
          `?geometries=geojson&overview=full&steps=true&alternatives=true&access_token=${mapboxConfig.accessToken}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
        const data = await res.json();
        const routes = (data?.routes || []).filter((route: any) => route?.geometry);
        if (routes.length === 0) throw new Error('No route geometry');

        const nextRoutes = routes.map((route: any) => {
          const steps = route.legs?.[0]?.steps?.map((step: any) => ({
            instruction: step.maneuver?.instruction || 'Continue',
            distance: step.distance || 0,
            duration: step.duration || 0,
            location: {
              lat: step.maneuver?.location?.[1],
              lng: step.maneuver?.location?.[0],
            },
          })) || [];

          return {
            geojson: {
              type: 'Feature',
              geometry: route.geometry,
              properties: {},
            },
            distance: route.distance || 0,
            duration: route.duration || 0,
            targetLabel: target.label || 'Target',
            targetCoord: { lat: target.lat, lng: target.lng },
            steps: steps.filter((step: any) => typeof step.location.lat === 'number' && typeof step.location.lng === 'number'),
          };
        });

        setRouteOptions(nextRoutes);
        setSelectedRouteIndex((prev) => (prev < nextRoutes.length ? prev : 0));
        lastRouteRef.current = { key, at: Date.now() };
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          console.warn('Failed to fetch route', err);
        }
      } finally {
        setRouteLoading(false);
      }
    };

    void fetchRoute();
    return () => controller.abort();
  }, [currentLocation, liveActiveJob]);

  useEffect(() => {
    if (routeOptions.length === 0) {
      setRouteData(null);
      return;
    }
    const index = Math.min(selectedRouteIndex, routeOptions.length - 1);
    setRouteData(routeOptions[index]);
  }, [routeOptions, selectedRouteIndex]);

  useEffect(() => {
    if (!hasActiveJob) {
      setJobsView('jobs');
    }
  }, [hasActiveJob]);

  const showPickupProofButton = !!liveActiveJob && needsPickupProof(liveActiveJob);
  const showDropoffProofButton = !!liveActiveJob && needsDropoffProof(liveActiveJob);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Dark}
        logoEnabled
        compassEnabled
      >
        {previewRoute?.toPickup?.geojson && (
          <MapboxGL.ShapeSource id="preview-route-pickup" shape={previewRoute.toPickup.geojson}>
            <MapboxGL.LineLayer id="preview-route-pickup-line" style={styles.previewRoutePickup} />
          </MapboxGL.ShapeSource>
        )}
        {!previewRoute?.toPickup?.geojson && previewFallback?.toPickup && previewLoading && !previewLocked && (
          <MapboxGL.ShapeSource id="preview-route-pickup-fallback" shape={previewFallback.toPickup}>
            <MapboxGL.LineLayer id="preview-route-pickup-fallback-line" style={styles.previewRoutePickupFallback} />
          </MapboxGL.ShapeSource>
        )}
        {previewRoute?.toDropoff?.geojson && (
          <MapboxGL.ShapeSource id="preview-route-dropoff" shape={previewRoute.toDropoff.geojson}>
            <MapboxGL.LineLayer id="preview-route-dropoff-line" style={styles.previewRouteDropoff} />
          </MapboxGL.ShapeSource>
        )}
        {!previewRoute?.toDropoff?.geojson && previewFallback?.toDropoff && previewLoading && !previewLocked && (
          <MapboxGL.ShapeSource id="preview-route-dropoff-fallback" shape={previewFallback.toDropoff}>
            <MapboxGL.LineLayer id="preview-route-dropoff-fallback-line" style={styles.previewRouteDropoffFallback} />
          </MapboxGL.ShapeSource>
        )}
        {previewRoute?.pickupCoord && (
          <MapboxGL.MarkerView
            id="preview-pickup"
            coordinate={[previewRoute.pickupCoord.lng, previewRoute.pickupCoord.lat]}
          >
            <View style={styles.previewMarkerWrap}>
              <View style={styles.previewMarkerDot} />
              <Text style={styles.previewMarkerLabel}>📦</Text>
            </View>
          </MapboxGL.MarkerView>
        )}
        {previewRoute?.dropoffCoord && (
          <MapboxGL.MarkerView
            id="preview-dropoff"
            coordinate={[previewRoute.dropoffCoord.lng, previewRoute.dropoffCoord.lat]}
          >
            <View style={styles.previewMarkerWrap}>
              <View style={[styles.previewMarkerDot, styles.previewMarkerDotAlt]} />
              <Text style={styles.previewMarkerLabel}>🎯</Text>
            </View>
          </MapboxGL.MarkerView>
        )}
        {routeOptions.length > 1 && routeOptions.map((route, index) => (
          index !== selectedRouteIndex && route?.geojson ? (
            <MapboxGL.ShapeSource key={`route-alt-${index}`} id={`route-alt-${index}`} shape={route.geojson}>
              <MapboxGL.LineLayer id={`route-alt-line-${index}`} style={styles.routeLineAlt} />
            </MapboxGL.ShapeSource>
          ) : null
        ))}
        {routeData?.geojson && (
          <MapboxGL.ShapeSource id="active-route" shape={routeData.geojson}>
            <MapboxGL.LineLayer id="active-route-line-glow" style={styles.routeLineGlow} />
            <MapboxGL.LineLayer id="active-route-line" style={styles.routeLine} />
          </MapboxGL.ShapeSource>
        )}
        {routeData?.targetCoord && (
          <MapboxGL.MarkerView
            id="route-target"
            coordinate={[routeData.targetCoord.lng, routeData.targetCoord.lat]}
          >
            <View style={styles.routeTargetWrap}>
              <View style={styles.routeTargetGlow} />
              <View style={styles.routeTargetDot} />
              <Text style={styles.routeTargetLabel}>🎯</Text>
            </View>
          </MapboxGL.MarkerView>
        )}
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={11}
          centerCoordinate={currentLocation ? [currentLocation.lng, currentLocation.lat] : [-96.797, 32.7767]}
          animationDuration={0}
          followUserLocation={navActive || (!previewBounds && followUser)}
          followZoomLevel={navActive ? 16 : 12}
          followPitch={navActive ? 55 : 0}
          followHeading={navActive ? (currentHeading ?? 0) : 0}
          followUserMode={navActive ? MapboxGL.UserTrackingMode.FollowWithCourse : MapboxGL.UserTrackingMode.Follow}
          heading={!navActive && currentHeading != null ? currentHeading : 0}
          bounds={previewBounds ? {
            ne: previewBounds.ne,
            sw: previewBounds.sw,
            paddingTop: 120,
            paddingBottom: 220,
            paddingLeft: 80,
            paddingRight: 80,
          } : undefined}
        />
        <MapboxGL.UserLocation
          visible={false}
          onUpdate={handleLocationUpdate}
          showsUserHeadingIndicator
        />
        {currentLocation && (
          <MapboxGL.ShapeSource
            id="courier-location-source"
            shape={{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [currentLocation.lng, currentLocation.lat],
              },
              properties: { pulse: pulseValue },
            }}
          >
            <MapboxGL.CircleLayer id="courier-location-glow" style={styles.courierCircleGlow} />
            <MapboxGL.CircleLayer id="courier-location-dot" style={styles.courierCircleDot} />
          </MapboxGL.ShapeSource>
        )}
        {jobs.map((job) => (
          <MapboxGL.MarkerView
            key={job.id}
            id={job.id}
            coordinate={[job.pickup.lng, job.pickup.lat]}
          >
            <Pressable onPress={() => setSelectedJob(job)}>
              <View style={[styles.marker, isFoodJob(job) && styles.markerFood]}>
                <Text style={styles.markerText}>{getMarkerEmoji(job)}</Text>
              </View>
            </Pressable>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {!navActive && (
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>GoSenderr</Text>
            <Text style={styles.subtitle}>On‑demand deliveries</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              style={[styles.statusPill, isOnline ? styles.statusOnline : styles.statusOffline]}
              onPress={toggleOnline}
              disabled={onlineBusy}
            >
              <Text style={styles.statusText}>{onlineBusy ? '...' : isOnline ? 'Online' : 'Offline'}</Text>
            </Pressable>
            {pendingSyncCount > 0 && (
              <View style={styles.syncPill}>
                <Text style={styles.syncPillText}>Sync {pendingSyncCount}</Text>
              </View>
            )}
            {!modernUiEnabled && (
              <>
                <Pressable
                  style={styles.earningsButton}
                  onPress={() => togglePanel('earnings')}
                >
                  <Text style={styles.earningsButtonText}>{showEarnings ? 'Map' : 'Earnings'}</Text>
                </Pressable>
                <Pressable
                  style={styles.earningsButton}
                  onPress={() => togglePanel('profile')}
                >
                  <Text style={styles.earningsButtonText}>{showProfile ? 'Map' : 'Profile'}</Text>
                </Pressable>
                <Pressable
                  style={styles.earningsButton}
                  onPress={() => togglePanel('inbox')}
                >
                  <Text style={styles.earningsButtonText}>
                    {showInbox ? 'Map' : `Inbox${unreadCount ? ` (${unreadCount})` : ''}`}
                  </Text>
                </Pressable>
                {rateCardsEnabled && (
                  <Pressable
                    style={styles.earningsButton}
                    onPress={() => togglePanel('rateCards')}
                  >
                    <Text style={styles.earningsButtonText}>{showRateCards ? 'Map' : 'Rate Cards'}</Text>
                  </Pressable>
                )}
                {__DEV__ && (
                  <Pressable style={styles.debugButton} onPress={() => setShowPushDebug((prev) => !prev)}>
                    <Text style={styles.debugButtonText}>{showPushDebug ? 'Hide Logs' : 'Push Logs'}</Text>
                  </Pressable>
                )}
                <Pressable style={styles.signOutButton} onPress={onSignOut}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {modernUiEnabled && !navActive && (
        <View style={[styles.actionCard, !actionsOpen && styles.actionCardCollapsed]}>
          <Pressable
            style={styles.actionToggle}
            onPress={() => setActionsOpen((prev) => !prev)}
          >
            <Text style={styles.actionToggleText}>{actionsOpen ? '✕' : '⋮'}</Text>
          </Pressable>
          {actionsOpen && (
            <View style={styles.actionList}>
              <Pressable style={styles.actionItem} onPress={() => togglePanel('earnings')}>
                <Text style={styles.actionItemText}>{showEarnings ? 'Map' : 'Earnings'}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={() => togglePanel('profile')}>
                <Text style={styles.actionItemText}>{showProfile ? 'Map' : 'Profile'}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={() => togglePanel('inbox')}>
                <Text style={styles.actionItemText}>
                  {showInbox ? 'Map' : `Inbox${unreadCount ? ` (${unreadCount})` : ''}`}
                </Text>
              </Pressable>
              {rateCardsEnabled && (
                <Pressable style={styles.actionItem} onPress={() => togglePanel('rateCards')}>
                  <Text style={styles.actionItemText}>{showRateCards ? 'Map' : 'Rate Cards'}</Text>
                </Pressable>
              )}
              {__DEV__ && (
                <Pressable style={styles.actionItem} onPress={() => setShowPushDebug((prev) => !prev)}>
                  <Text style={styles.actionItemText}>{showPushDebug ? 'Hide Logs' : 'Push Logs'}</Text>
                </Pressable>
              )}
              <Pressable style={styles.actionItem} onPress={() => setActionsOpen(false)}>
                <Text style={styles.actionItemText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.actionItem, styles.actionItemDanger]} onPress={onSignOut}>
                <Text style={styles.actionItemText}>Sign Out</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {!navActive && jobAlert && (
        <Pressable
          style={[
            styles.jobAlert,
            jobAlertFlash && styles.jobAlertFlash,
            !jobAlertActive && styles.jobAlertHidden,
          ]}
          onPress={() => {
            setShowInbox(true);
            setJobAlertActive(false);
            setJobAlertFlash(false);
          }}
        >
          <View style={styles.jobAlertTextWrap}
          >
            <Text style={styles.jobAlertTitle}>{jobAlert}</Text>
            {jobAlertBody && <Text style={styles.jobAlertBody}>{jobAlertBody}</Text>}
          </View>
          <Text style={styles.jobAlertAction}>Inbox</Text>
        </Pressable>
      )}

      {__DEV__ && showPushDebug && !navActive && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Push Debug</Text>
          {pushDebugLog.length === 0 ? (
            <Text style={styles.debugLine}>No events yet.</Text>
          ) : (
            pushDebugLog.map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.debugLine}>
                {line}
              </Text>
            ))
          )}
        </View>
      )}

      {showInbox && !navActive && (
        <View style={styles.inboxPanel}>
          <ScrollView contentContainerStyle={styles.inboxScrollContent}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.inboxTitle}>Inbox</Text>
              <Pressable style={styles.panelCloseButton} onPress={() => setShowInbox(false)}>
                <Text style={styles.panelCloseText}>Close</Text>
              </Pressable>
            </View>
            {inboxItems.length === 0 ? (
              <View style={styles.inboxEmpty}>
                <Text style={styles.inboxEmptyText}>No notifications yet.</Text>
              </View>
            ) : (
              <View style={styles.inboxList}>
                {inboxItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.inboxItem, !item.read && styles.inboxItemUnread]}
                    onPress={() =>
                      setInboxItems((prev) =>
                        prev.map((entry) =>
                          entry.id === item.id ? { ...entry, read: true } : entry
                        )
                      )
                    }
                  >
                    <View style={styles.inboxItemHeader}>
                      <Text style={styles.inboxItemTitle}>{item.title}</Text>
                      <Text style={styles.inboxItemTime}>{formatInboxTime(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.inboxItemBody}>{item.body}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {showEarnings && !navActive && (
        <View style={styles.earningsPanel}>
          <ScrollView contentContainerStyle={styles.earningsScrollContent}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.earningsTitle}>Earnings & Payouts</Text>
              <Pressable style={styles.panelCloseButton} onPress={() => setShowEarnings(false)}>
                <Text style={styles.panelCloseText}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.earningsGrid}>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>Total</Text>
                <Text style={styles.earningsValue}>{formatMoney(earnings.total)}</Text>
              </View>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>This Month</Text>
                <Text style={styles.earningsValue}>{formatMoney(earnings.thisMonth)}</Text>
              </View>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>Completed</Text>
                <Text style={styles.earningsValue}>{earnings.completed}</Text>
              </View>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>Avg/Job</Text>
                <Text style={styles.earningsValue}>{formatMoney(earnings.avgPerJob)}</Text>
              </View>
              <View style={styles.earningsCardWide}>
                <Text style={styles.earningsLabel}>Pending Payout</Text>
                <Text style={styles.earningsValue}>{formatMoney(earnings.pendingPayout)}</Text>
              </View>
            </View>

            <View style={styles.stripeCard}>
              <Text style={styles.stripeTitle}>Stripe Connect</Text>
              {stripeStatus.accountId ? (
                <Text style={styles.stripeStatus}>
                  Charges: {stripeStatus.chargesEnabled ? 'Enabled' : 'Disabled'} • Payouts: {stripeStatus.payoutsEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              ) : (
                <Text style={styles.stripeStatus}>No account connected.</Text>
              )}
              {(stripeStatus.requirementsDue.length > 0 || stripeStatus.requirementsPastDue.length > 0) && (
                <Text style={styles.stripeWarning}>
                  Requirements due: {stripeStatus.requirementsDue.length} • Past due: {stripeStatus.requirementsPastDue.length}
                </Text>
              )}
              <Pressable style={styles.stripeButton} onPress={handleStripeConnect}>
                <Text style={styles.stripeButtonText}>
                  {stripeStatus.accountId ? 'Update Stripe' : 'Connect Stripe'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.payoutsTitle}>Receipts</Text>
            <View style={styles.receiptCard}>
              <View style={styles.receiptRow}>
                <TextInput
                  style={styles.receiptInput}
                  placeholder="Amount"
                  placeholderTextColor="#64748b"
                  keyboardType="decimal-pad"
                  value={receiptAmount}
                  onChangeText={setReceiptAmount}
                />
                <TextInput
                  style={styles.receiptInput}
                  placeholder="Category"
                  placeholderTextColor="#64748b"
                  value={receiptCategory}
                  onChangeText={setReceiptCategory}
                />
              </View>
              <TextInput
                style={styles.receiptInput}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor="#64748b"
                value={receiptDate}
                onChangeText={setReceiptDate}
              />
              <TextInput
                style={styles.receiptInput}
                placeholder="Notes"
                placeholderTextColor="#64748b"
                value={receiptNotes}
                onChangeText={setReceiptNotes}
              />
              <View style={styles.receiptActions}>
                <Pressable style={styles.receiptButton} onPress={handlePickReceipt}>
                  <Text style={styles.receiptButtonText}>{receiptUri ? 'Change Photo' : 'Add Photo'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.receiptButton, styles.receiptButtonPrimary]}
                  onPress={handleUploadReceipt}
                  disabled={receiptUploading}
                >
                  <Text style={styles.receiptButtonText}>
                    {receiptUploading ? 'Uploading…' : 'Save Receipt'}
                  </Text>
                </Pressable>
              </View>
              {receiptError && <Text style={styles.receiptError}>{receiptError}</Text>}
            </View>

            {receipts.length === 0 ? (
              <Text style={styles.payoutsEmpty}>No receipts yet.</Text>
            ) : (
              receipts.map((item) => (
                <View key={item.id} style={styles.receiptRowItem}>
                  <View style={styles.receiptRowLeft}>
                    {item.receiptUrl ? (
                      <Image source={{ uri: item.receiptUrl }} style={styles.receiptThumb} />
                    ) : (
                      <View style={styles.receiptThumbPlaceholder}>
                        <Text style={styles.jobThumbIcon}>🧾</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.payoutAmount}>{formatMoney(Number(item.amount || 0))}</Text>
                      <Text style={styles.payoutMeta}>{item.category || 'Expense'}</Text>
                      <Text style={styles.payoutMeta}>
                        {item.date?.toDate?.() ? item.date.toDate().toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>
                  {item.receiptUrl && (
                    <Pressable
                      onPress={() => setSelectedReceipt({ id: item.id, receiptUrl: item.receiptUrl, amount: item.amount })}
                    >
                      <Text style={styles.previewRouteAction}>View</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}

            <Text style={styles.payoutsTitle}>Payout History</Text>
            {payouts.length === 0 ? (
              <Text style={styles.payoutsEmpty}>No payouts yet.</Text>
            ) : (
              payouts
                .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
                .map((payout) => (
                  <View key={payout.id} style={styles.payoutRow}>
                    <View>
                      <Text style={styles.payoutAmount}>{formatMoney(Number(payout.amount || 0))}</Text>
                      <Text style={styles.payoutMeta}>{payout.status || 'pending'}</Text>
                    </View>
                    <Text style={styles.payoutMeta}>
                      {payout.createdAt?.toDate?.() ? payout.createdAt.toDate().toLocaleDateString() : '—'}
                    </Text>
                  </View>
                ))
            )}

            <View style={styles.historyHeader}>
              <Text style={styles.payoutsTitle}>Job History</Text>
              <View style={styles.historyFilters}>
                {(['week', 'month', 'all'] as const).map((filter) => (
                  <Pressable
                    key={filter}
                    style={[styles.historyChip, jobHistoryFilter === filter && styles.historyChipActive]}
                    onPress={() => setJobHistoryFilter(filter)}
                  >
                    <Text style={styles.historyChipText}>{filter}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {getFilteredCompletedJobs().length === 0 ? (
              <Text style={styles.payoutsEmpty}>No completed jobs in this range.</Text>
            ) : (
              [...getFilteredCompletedJobs()]
                .sort((a, b) => (b.completedAt?.toMillis?.() ?? 0) - (a.completedAt?.toMillis?.() ?? 0))
                .slice(0, 10)
                .map((job) => (
                  <View key={job.id} style={styles.payoutRow}>
                    <View>
                      <Text style={styles.payoutAmount}>{formatMoney(job.agreedFee || 0)}</Text>
                      <Text style={styles.payoutMeta}>{getPickupLabel(job)} → {getDropoffLabel(job)}</Text>
                    </View>
                    <Text style={styles.payoutMeta}>
                      {job.completedAt?.toDate?.() ? job.completedAt.toDate().toLocaleDateString() : '—'}
                    </Text>
                  </View>
                ))
            )}
          </ScrollView>
          {selectedReceipt?.receiptUrl && (
            <View style={styles.receiptModal}>
              <View style={styles.receiptModalCard}>
                <Text style={styles.earningsTitle}>Receipt</Text>
                <Image source={{ uri: selectedReceipt.receiptUrl }} style={styles.receiptModalImage} />
                <Pressable
                  style={[styles.receiptButton, styles.receiptButtonPrimary]}
                  onPress={() => setSelectedReceipt(null)}
                >
                  <Text style={styles.receiptButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {showProfile && !navActive && (
        <View style={styles.onboardingPanel}>
          <ScrollView contentContainerStyle={styles.earningsScrollContent}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.earningsTitle}>Profile</Text>
              <Pressable style={styles.panelCloseButton} onPress={() => setShowProfile(false)}>
                <Text style={styles.panelCloseText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.avatarRow}>
              {profileForm.avatarUrl ? (
                <Image source={{ uri: profileForm.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>👤</Text>
                </View>
              )}
              <View style={styles.avatarActions}>
                <Pressable style={styles.avatarButton} onPress={handlePickAvatar} disabled={avatarUploading}>
                  <Text style={styles.avatarButtonText}>{avatarUploading ? 'Uploading…' : 'Upload Avatar'}</Text>
                </Pressable>
                {avatarError && <Text style={styles.avatarError}>{avatarError}</Text>}
              </View>
            </View>

            <Text style={styles.payoutsTitle}>Profile</Text>
            <TextInput
              style={styles.receiptInput}
              placeholder="Full name"
              placeholderTextColor="#64748b"
              value={profileForm.fullName}
              onChangeText={(value: string) => setProfileForm((prev) => ({ ...prev, fullName: value }))}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Service radius (miles)"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              value={profileForm.serviceRadius}
              onChangeText={(value: string) => setProfileForm((prev) => ({ ...prev, serviceRadius: value }))}
            />

            <Text style={styles.payoutsTitle}>Vehicle</Text>
            <View style={styles.receiptActions}>
              {['bike', 'car', 'suv', 'van', 'truck'].map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.receiptButton,
                    profileForm.vehicleType === type && styles.receiptButtonPrimary,
                  ]}
                  onPress={() => setProfileForm((prev) => ({ ...prev, vehicleType: type }))}
                >
                  <Text style={styles.receiptButtonText}>{type}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.payoutsTitle}>Work Modes</Text>
            <View style={styles.receiptActions}>
              <Pressable
                style={[styles.receiptButton, profileForm.packagesEnabled && styles.receiptButtonPrimary]}
                onPress={() => setProfileForm((prev) => ({ ...prev, packagesEnabled: !prev.packagesEnabled }))}
              >
                <Text style={styles.receiptButtonText}>Packages</Text>
              </Pressable>
              <Pressable
                style={[styles.receiptButton, profileForm.foodEnabled && styles.receiptButtonPrimary]}
                onPress={() => setProfileForm((prev) => ({ ...prev, foodEnabled: !prev.foodEnabled }))}
              >
                <Text style={styles.receiptButtonText}>Food</Text>
              </Pressable>
            </View>

            <Text style={styles.payoutsTitle}>Payout Mode</Text>
            <View style={styles.receiptActions}>
              <Pressable
                style={[styles.receiptButton, profileForm.payoutMode === 'cash' && styles.receiptButtonPrimary]}
                onPress={() => setProfileForm((prev) => ({ ...prev, payoutMode: 'cash' }))}
              >
                <Text style={styles.receiptButtonText}>Cash</Text>
              </Pressable>
              <Pressable
                style={[styles.receiptButton, profileForm.payoutMode === 'token' && styles.receiptButtonPrimary]}
                onPress={() => setProfileForm((prev) => ({ ...prev, payoutMode: 'token' }))}
              >
                <Text style={styles.receiptButtonText}>Token Wallet</Text>
              </Pressable>
            </View>

            <View style={styles.receiptActions}>
              <Pressable
                style={[styles.receiptButton, profileForm.acceptTokenPayoutJobs && styles.receiptButtonPrimary]}
                onPress={() =>
                  setProfileForm((prev) => ({
                    ...prev,
                    acceptTokenPayoutJobs: !prev.acceptTokenPayoutJobs,
                  }))
                }
              >
                <Text style={styles.receiptButtonText}>
                  {profileForm.acceptTokenPayoutJobs ? 'Token payout jobs: On' : 'Token payout jobs: Off'}
                </Text>
              </Pressable>
            </View>

            {profileForm.payoutMode === 'token' && (
              <View style={styles.receiptCard}>
                <Text style={styles.payoutsTitle}>Token Wallet</Text>
                {tokenWalletLoading ? (
                  <Text style={styles.stripeStatus}>Loading wallet…</Text>
                ) : (
                  <Text style={styles.stripeStatus}>
                    Available: {tokenWallet?.available ?? 0} • Reserved: {tokenWallet?.reserved ?? 0}
                  </Text>
                )}
                {tokenWalletError && <Text style={styles.receiptError}>{tokenWalletError}</Text>}
                <View style={styles.receiptActions}>
                  <Pressable style={styles.receiptButton} onPress={() => void refreshTokenWallet()}>
                    <Text style={styles.receiptButtonText}>Refresh Wallet</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.receiptButton, styles.receiptButtonPrimary]}
                    onPress={handleTokenTopUp}
                    disabled={tokenCheckoutBusy}
                  >
                    <Text style={styles.receiptButtonText}>
                      {tokenCheckoutBusy ? 'Opening…' : 'Buy Tokens'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.payoutsTitle}>Notifications</Text>
            <View style={styles.receiptActions}>
              <Pressable
                style={[styles.receiptButton, notificationPrefs.jobOffers && styles.receiptButtonPrimary]}
                onPress={() => setNotificationPrefs((prev) => ({ ...prev, jobOffers: !prev.jobOffers }))}
              >
                <Text style={styles.receiptButtonText}>Job Offers {notificationPrefs.jobOffers ? 'On' : 'Off'}</Text>
              </Pressable>
              <Pressable
                style={[styles.receiptButton, notificationPrefs.payoutUpdates && styles.receiptButtonPrimary]}
                onPress={() => setNotificationPrefs((prev) => ({ ...prev, payoutUpdates: !prev.payoutUpdates }))}
              >
                <Text style={styles.receiptButtonText}>Payout Updates {notificationPrefs.payoutUpdates ? 'On' : 'Off'}</Text>
              </Pressable>
              <Pressable
                style={[styles.receiptButton, notificationPrefs.reminders && styles.receiptButtonPrimary]}
                onPress={() => setNotificationPrefs((prev) => ({ ...prev, reminders: !prev.reminders }))}
              >
                <Text style={styles.receiptButtonText}>Reminders {notificationPrefs.reminders ? 'On' : 'Off'}</Text>
              </Pressable>
            </View>

            <Text style={styles.payoutsTitle}>Identity</Text>
            <View style={styles.receiptCard}>
              <Text style={styles.stripeStatus}>Status: {profileForm.identityStatus}</Text>
              {profileForm.identityDocUrl ? (
                <Image source={{ uri: profileForm.identityDocUrl }} style={styles.identityPreview} />
              ) : (
                <Text style={styles.payoutsEmpty}>No ID uploaded.</Text>
              )}
              <View style={styles.receiptActions}>
                <Pressable style={styles.receiptButton} onPress={handlePickIdentity}>
                  <Text style={styles.receiptButtonText}>Upload ID</Text>
                </Pressable>
                <Pressable
                  style={[styles.receiptButton, styles.receiptButtonPrimary]}
                  onPress={handleSaveProfile}
                  disabled={profileSaving}
                >
                  <Text style={styles.receiptButtonText}>
                    {profileSaving ? 'Saving…' : 'Save Profile'}
                  </Text>
                </Pressable>
              </View>
              {profileError && <Text style={styles.receiptError}>{profileError}</Text>}
            </View>
          </ScrollView>
        </View>
      )}

      {rateCardsEnabled && showRateCards && !navActive && (
        <View style={styles.onboardingPanel}>
          <ScrollView contentContainerStyle={styles.earningsScrollContent}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.earningsTitle}>Rate Cards</Text>
              <Pressable style={styles.panelCloseButton} onPress={() => setShowRateCards(false)}>
                <Text style={styles.panelCloseText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.rateCardToggleRow}>
              <Pressable
                style={[styles.rateToggleButton, profileForm.packagesEnabled && styles.rateToggleActive]}
                onPress={() => handleToggleWorkMode('packages')}
              >
                <Text style={styles.rateToggleText}>Packages {profileForm.packagesEnabled ? 'On' : 'Off'}</Text>
              </Pressable>
              <Pressable
                style={[styles.rateToggleButton, profileForm.foodEnabled && styles.rateToggleActive]}
                onPress={() => handleToggleWorkMode('food')}
              >
                <Text style={styles.rateToggleText}>Food {profileForm.foodEnabled ? 'On' : 'Off'}</Text>
              </Pressable>
            </View>

            <Text style={styles.payoutsTitle}>Package Delivery</Text>
            <TextInput
              style={styles.receiptInput}
              placeholder="Base fare (min 3.00)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={packageRateDraft.baseFare}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setPackageRateDraft((prev) => ({ ...prev, baseFare: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Per mile (min 0.50)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={packageRateDraft.perMile}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setPackageRateDraft((prev) => ({ ...prev, perMile: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Per minute (min 0.10)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={packageRateDraft.perMinute}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setPackageRateDraft((prev) => ({ ...prev, perMinute: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Max pickup miles (optional)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={packageRateDraft.maxPickupDistanceMiles}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setPackageRateDraft((prev) => ({ ...prev, maxPickupDistanceMiles: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Max delivery miles (optional)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={packageRateDraft.maxDeliveryDistanceMiles}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setPackageRateDraft((prev) => ({ ...prev, maxDeliveryDistanceMiles: value }));
              }}
            />
            <Pressable
              style={[styles.receiptButton, styles.receiptButtonPrimary]}
              onPress={() => handleSaveRateCard('package')}
              disabled={rateCardSaving}
            >
              <Text style={styles.receiptButtonText}>{rateCardSaving ? 'Saving…' : 'Save Package Rates'}</Text>
            </Pressable>

            <Text style={styles.payoutsTitle}>Food Delivery</Text>
            <TextInput
              style={styles.receiptInput}
              placeholder="Base fare (min 2.50)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={foodRateDraft.baseFare}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setFoodRateDraft((prev) => ({ ...prev, baseFare: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Per mile (min 0.75)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={foodRateDraft.perMile}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setFoodRateDraft((prev) => ({ ...prev, perMile: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Restaurant wait pay (min 0.15)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={foodRateDraft.restaurantWaitPay}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setFoodRateDraft((prev) => ({ ...prev, restaurantWaitPay: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Max pickup miles (optional)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={foodRateDraft.maxPickupDistanceMiles}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setFoodRateDraft((prev) => ({ ...prev, maxPickupDistanceMiles: value }));
              }}
            />
            <TextInput
              style={styles.receiptInput}
              placeholder="Max delivery miles (optional)"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              value={foodRateDraft.maxDeliveryDistanceMiles}
              onChangeText={(value: string) => {
                rateCardDirtyRef.current = true;
                setFoodRateDraft((prev) => ({ ...prev, maxDeliveryDistanceMiles: value }));
              }}
            />
            <Pressable
              style={[styles.receiptButton, styles.receiptButtonPrimary]}
              onPress={() => handleSaveRateCard('food')}
              disabled={rateCardSaving}
            >
              <Text style={styles.receiptButtonText}>{rateCardSaving ? 'Saving…' : 'Save Food Rates'}</Text>
            </Pressable>

            {rateCardError && <Text style={styles.receiptError}>{rateCardError}</Text>}
          </ScrollView>
        </View>
      )}

      {!navActive && (
        <View style={[styles.overlay, !showJobsPanel && styles.overlayCollapsed]}>
        <View style={[styles.overlayHeader, hasActiveJob && styles.overlayHeaderActive]}>
          <Text style={[styles.overlayTitle, hasActiveJob && styles.overlayTitleCentered]}>
            {hasActiveJob ? 'Active job' : 'Nearby jobs'}
          </Text>
          <View style={[styles.overlayHeaderActions, hasActiveJob && styles.overlayHeaderActionsActive]}>
            {hasActiveJob && (
              <Pressable
                style={styles.toggleButton}
                onPress={() => setJobsView((prev) => (prev === 'active' ? 'jobs' : 'active'))}
              >
                <Text style={styles.toggleButtonText}>
                  {jobsView === 'active' ? 'Show jobs' : 'Show active'}
                </Text>
              </Pressable>
            )}
            {showJobsPanel && (
              <Pressable
                style={styles.toggleButton}
                onPress={() => setShowCompleted((prev) => !prev)}
              >
                <Text style={styles.toggleButtonText}>
                  {showCompleted ? 'Hide completed' : 'Show completed'}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.collapseButton}
              onPress={() => setShowJobsPanel((prev) => !prev)}
            >
              <Text style={styles.toggleButtonText}>{showJobsPanel ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </View>
        {showJobsPanel && (
          <ScrollView
            style={styles.overlayBody}
            contentContainerStyle={styles.overlayBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {hasActiveJob && jobsView === 'active' ? (
              <>
                {liveActiveJob && (
                  <View style={[styles.activePanel, styles.activePanelLive, styles.activePanelInline]}>
                    <Text style={styles.activeTitle}>Active job (live)</Text>
                    <View style={styles.statusRow}>
                      <Text style={styles.activeMeta}>Status: {getEffectiveStatus(liveActiveJob)}</Text>
                      {(needsPickupProof(liveActiveJob) || needsDropoffProof(liveActiveJob)) && (
                        <View style={styles.statusPillProof}>
                          <Text style={styles.statusPillProofText}>Photo required</Text>
                        </View>
                      )}
                    </View>
                    {routeData && (
                      <View style={styles.routeRow}>
                        <Text style={styles.routeLabel}>Route to {routeData.targetLabel}</Text>
                        <Text style={styles.routeMeta}>
                          {Math.round(routeData.distance / 100) / 10} km • {Math.round(routeData.duration / 60)} min
                        </Text>
                      </View>
                    )}
                    {routeLoading && (
                      <Text style={styles.routeLoading}>Updating route…</Text>
                    )}
                    <Text style={styles.activeMeta}>
                      {getPickupLabel(liveActiveJob)} → {getDropoffLabel(liveActiveJob)}
                    </Text>
                    <Pressable
                      style={styles.timelineToggle}
                      onPress={() => setShowTimeline((prev) => !prev)}
                    >
                      <Text style={styles.timelineToggleText}>
                        {showTimeline ? 'Hide timeline' : 'Show timeline'}
                      </Text>
                    </Pressable>
                    {showTimeline && (
                      <View style={styles.timeline}>
                        {tripSteps.map((step, index) => {
                          const effectiveStatus = normalizeStatusForTimeline(getEffectiveStatus(liveActiveJob));
                          const currentIndex = tripSteps.findIndex((item) => item.status === effectiveStatus);
                          const isDone = index < currentIndex;
                          const isCurrent = index === currentIndex;
                          const timestamp =
                            step.status === 'assigned'
                              ? formatTimestamp(liveActiveJob.acceptedAt)
                              : step.status === 'completed'
                              ? formatTimestamp(liveActiveJob.completedAt)
                              : '—';
                          return (
                            <View key={step.status} style={styles.timelineRow}>
                              <View
                                style={[
                                  styles.timelineDot,
                                  isDone && styles.timelineDotDone,
                                  isCurrent && styles.timelineDotCurrent,
                                ]}
                              />
                              <View style={styles.timelineTextWrap}>
                                <Text style={styles.timelineLabel}>{step.label}</Text>
                                <Text style={styles.timelineMeta}>{timestamp}</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    <View style={styles.activeActions}>
                      {!navActive && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() => handleStartNavigation(liveActiveJob)}
                        >
                          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Start navigation</Text>
                        </Pressable>
                      )}
                      {getNextStatus(getEffectiveStatus(liveActiveJob)) &&
                        !showPickupProofButton &&
                        !showDropoffProofButton && (
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => handleAdvance(liveActiveJob)}
                            disabled={busyJobId === liveActiveJob.id}
                          >
                            {busyJobId === liveActiveJob.id ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={styles.actionButtonText}>Advance status</Text>
                            )}
                          </Pressable>
                        )}
                      {showPickupProofButton && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonAlt]}
                          onPress={() => {
                            setProofJob(liveActiveJob);
                            setProofMode('pickup');
                            setProofLocation(
                              currentLocation
                                ? { lat: currentLocation.lat, lng: currentLocation.lng, accuracy: currentAccuracy ?? null }
                                : null
                            );
                          }}
                        >
                          <Text style={styles.actionButtonText}>Confirm pickup (photo)</Text>
                        </Pressable>
                      )}
                      {showDropoffProofButton && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonAlt]}
                          onPress={() => {
                            setProofJob(liveActiveJob);
                            setProofMode('dropoff');
                            setProofLocation(
                              currentLocation
                                ? { lat: currentLocation.lat, lng: currentLocation.lng, accuracy: currentAccuracy ?? null }
                                : null
                            );
                          }}
                        >
                          <Text style={styles.actionButtonText}>Complete delivery (photo)</Text>
                        </Pressable>
                      )}
                      {jobDetailsEnabled && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() => {
                            setDetailJob(liveActiveJob);
                            if (user?.uid) {
                              void logCourierEvent({
                                courierUid: user.uid,
                                event: 'job_details_open',
                                jobId: liveActiveJob.id,
                              });
                            }
                          }}
                        >
                          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>View details</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sourceBadge}>
                  {`Live jobs (${jobs.length})`}
                </Text>
                {!isOnline && (
                  <Text style={styles.jobMeta}>Go online to claim new jobs.</Text>
                )}
                {error && <Text style={styles.errorText}>{error}</Text>}
                {loading && (
                  <View style={styles.skeletonWrap}>
                    <View style={styles.skeletonRow}>
                      <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
                      <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
                    </View>
                    <View style={styles.skeletonRow}>
                      <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
                      <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
                    </View>
                    <View style={styles.skeletonRow}>
                      <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
                      <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
                    </View>
                  </View>
                )}
                {!loading && jobs.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No jobs yet</Text>
                    <Text style={styles.emptyStateMeta}>
                      {isOnline
                        ? 'Hang tight — new requests will appear here.'
                        : 'Go online to start receiving jobs.'}
                    </Text>
                  </View>
                )}
                {jobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={[styles.jobCard, selectedJob?.id === job.id && styles.jobCardSelected]}
                    onPress={() => setSelectedJob(job)}
                  >
                    <View style={styles.jobHeaderCompact}>
                      <Text style={styles.jobTitle}>
                        {job.title || 'Delivery job'}
                      </Text>
                      <Text style={styles.jobPayout}>{getPayoutText(job)}</Text>
                    </View>
                    <View style={styles.jobThumbRow}>
                      {getJobPhotoUrl(job) ? (
                        <Image source={{ uri: getJobPhotoUrl(job) as string }} style={styles.jobThumb} />
                      ) : (
                        <View style={styles.jobThumbPlaceholder}>
                          <Text style={styles.jobThumbIcon}>📦</Text>
                        </View>
                      )}
                      <View style={styles.jobThumbMeta}>
                        <Text style={styles.jobThumbLabel}>Item</Text>
                        <Text style={styles.jobThumbValue}>
                          {job.package?.notes
                            ? job.package.notes
                            : job.package?.size
                            ? `${job.package.size.toUpperCase()} package`
                            : 'Package'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.jobMeta}>
                      {getVisiblePickupLabel(job)} → {getVisibleDropoffLabel(job)}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {`Live • ${getEffectiveStatus(job)}`}
                    </Text>
                    {selectedJob?.id === job.id && !isAssignedToMe(job) && (
                      <View style={styles.previewInlineRow}>
                        <Pressable
                          onPress={() => {
                            setPreviewLocked(true);
                            focusPreviewRoute(job);
                          }}
                        >
                          <Text style={styles.previewRouteAction}>View route</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setSelectedJob(null);
                            setPreviewRoute(null);
                            setPreviewFallback(null);
                            setPreviewBoundsIfChanged(null);
                            setPreviewLocked(false);
                          }}
                        >
                          <Text style={styles.previewClear}>Clear</Text>
                        </Pressable>
                        {previewLoading && (
                          <Text style={styles.previewRouteMeta}>Loading…</Text>
                        )}
                      </View>
                    )}
                    <View style={styles.jobActions}>
                      {isClaimable(job) && (
                        <Pressable
                          style={styles.actionButton}
                          onPress={() => confirmClaim(job)}
                          disabled={busyJobId === job.id}
                        >
                          {busyJobId === job.id ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.actionButtonText}>Claim job</Text>
                          )}
                        </Pressable>
                      )}
                      {isAssignedToMe(job) && getNextStatus(job.status) && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonAlt]}
                          onPress={() =>
                            needsPickupProof(job) || needsDropoffProof(job)
                              ? (setProofJob(job),
                                setProofMode(needsPickupProof(job) ? 'pickup' : 'dropoff'),
                                setProofLocation(
                                  currentLocation
                                    ? { lat: currentLocation.lat, lng: currentLocation.lng, accuracy: currentAccuracy ?? null }
                                    : null
                                ))
                              : handleAdvance(job)
                          }
                          disabled={busyJobId === job.id}
                        >
                          {busyJobId === job.id ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.actionButtonText}>
                              {needsPickupProof(job)
                                ? 'Confirm pickup'
                                : needsDropoffProof(job)
                                ? 'Complete delivery'
                                : 'Advance status'}
                            </Text>
                          )}
                        </Pressable>
                      )}
                      {job.status !== 'open' && !isAssignedToMe(job) && (
                        <Text style={styles.jobMeta}>Status: {job.status}</Text>
                      )}
                      {jobDetailsEnabled && isAssignedToMe(job) && (
                        <Pressable
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() => {
                            setDetailJob(job);
                            if (user?.uid) {
                              void logCourierEvent({
                                courierUid: user.uid,
                                event: 'job_details_open',
                                jobId: job.id,
                              });
                            }
                          }}
                        >
                          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Details</Text>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {showCompleted && completedJobs.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedTitle}>Completed</Text>
                {completedJobs.map((job) => (
                  <View key={job.id} style={styles.completedCard}>
                    <Text style={styles.completedJobTitle}>Delivery job</Text>
                    <Text style={styles.completedJobMeta}>
                      {getPickupLabel(job)} → {getDropoffLabel(job)}
                    </Text>
                    <Text style={styles.completedJobMeta}>
                      {job.completedAt?.toDate ? `Completed at ${job.completedAt.toDate().toLocaleTimeString()}` : 'Completed'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
        </View>
      )}

      {navActive && liveActiveJob && (
        <View style={styles.navOverlay}>
          <View style={styles.navInfo}>
            <Text style={styles.navTitle}>Navigation</Text>
            {routeData ? (
              <>
                {currentLocation && routeData.steps?.length ? (() => {
                  const nextStep = getNextStep(routeData.steps, currentLocation);
                  const distanceToTurn = nextStep
                    ? getDistanceMeters(currentLocation.lat, currentLocation.lng, nextStep.location.lat, nextStep.location.lng)
                    : 0;
                  return (
                    <Text style={styles.navInstruction}>
                      {nextStep?.instruction ?? 'Continue'}{distanceToTurn ? ` • ${formatMiles(distanceToTurn)}` : ''}
                    </Text>
                  );
                })() : (
                  <Text style={styles.navInstruction}>Continue</Text>
                )}
                <Text style={styles.navMeta}>
                  {routeData.targetLabel} • {formatMiles(routeData.distance)} • {Math.round(routeData.duration / 60)} min
                </Text>
                {routeOptions.length > 1 && (
                  <View style={styles.navRouteOptions}>
                    {routeOptions.map((route, index) => (
                      <Pressable
                        key={`route-option-${index}`}
                        style={[styles.navRouteChip, index === selectedRouteIndex && styles.navRouteChipActive]}
                        onPress={() => setSelectedRouteIndex(index)}
                      >
                        <Text style={styles.navRouteChipText}>
                          Route {index + 1} • {Math.round(route.duration / 60)} min
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.navMeta}>Preparing route…</Text>
            )}
          </View>
          <Pressable
            style={[styles.actionButton, styles.navEndButton]}
            onPress={() => setNavActive(false)}
          >
            <Text style={styles.actionButtonText}>End Navigation</Text>
          </Pressable>
        </View>
      )}

      <ProofOfDeliveryModal
        visible={Boolean(proofJob)}
        job={proofJob}
        courierUid={user?.uid ?? null}
        mode={proofMode}
        location={proofLocation}
        onClose={() => {
          setProofJob(null);
          setProofLocation(null);
        }}
        onCompleted={() => {
          if (user?.uid && proofJob?.id) {
            void logCourierEvent({
              courierUid: user.uid,
              event: proofMode === 'pickup' ? 'pickup_proof_complete' : 'dropoff_proof_complete',
              jobId: proofJob.id,
            });
          }
          setProofJob(null);
          setProofLocation(null);
        }}
      />
      <JobDetailSheet
        visible={Boolean(detailJob)}
        job={detailJob}
        onClose={() => setDetailJob(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0B1220',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1F2A44',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionCard: {
    position: 'absolute',
    top: 130,
    left: 16,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2A44',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    zIndex: 25,
  },
  actionCardCollapsed: {
    padding: 8,
  },
  actionToggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionToggleText: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
  },
  actionList: {
    marginTop: 10,
    gap: 8,
  },
  actionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
    minWidth: 110,
  },
  actionItemDanger: {
    backgroundColor: '#2A1532',
    borderColor: '#4C1D95',
  },
  actionItemText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: '#0F2A20',
    borderColor: '#22C55E',
  },
  statusOffline: {
    backgroundColor: '#1F2937',
    borderColor: '#334155',
  },
  statusText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  debugButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  debugButtonText: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '600',
  },
  earningsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
  },
  earningsButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  syncPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  syncPillText: {
    color: '#DBEAFE',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  jobAlert: {
    position: 'absolute',
    top: 96,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobAlertFlash: {
    backgroundColor: 'rgba(99, 102, 241, 0.98)',
    borderColor: '#818cf8',
  },
  jobAlertHidden: {
    opacity: 0.4,
  },
  jobAlertTextWrap: {
    flex: 1,
  },
  jobAlertTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  jobAlertBody: {
    color: '#dbeafe',
    fontSize: 11,
    marginTop: 2,
  },
  jobAlertAction: {
    color: '#bfdbfe',
    fontSize: 12,
    fontWeight: '700',
  },
  inboxPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    bottom: 120,
    backgroundColor: '#0B1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#273349',
    zIndex: 25,
  },
  inboxScrollContent: {
    paddingBottom: 20,
  },
  inboxTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
  },
  inboxEmpty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  inboxEmptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  inboxList: {
    gap: 10,
  },
  inboxItem: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#273349',
  },
  inboxItemUnread: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
  },
  inboxItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inboxItemTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  inboxItemTime: {
    color: '#94A3B8',
    fontSize: 11,
  },
  inboxItemBody: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 6,
  },
  debugPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    backgroundColor: '#0B1220',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#273349',
    zIndex: 30,
  },
  debugTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  debugLine: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 2,
  },
  earningsPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: '#0B1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#273349',
    zIndex: 30,
  },
  onboardingPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: '#0B1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#273349',
    zIndex: 30,
  },
  earningsScrollContent: {
    paddingBottom: 24,
  },
  earningsTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
  },
  panelCloseText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  avatarPlaceholderText: {
    fontSize: 24,
  },
  avatarActions: {
    flex: 1,
    gap: 6,
  },
  avatarButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#273349',
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  avatarButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  avatarError: {
    color: '#fca5a5',
    fontSize: 11,
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  earningsCard: {
    flexBasis: '48%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#273349',
  },
  earningsCardWide: {
    flexBasis: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#273349',
  },
  earningsLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  earningsValue: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  stripeCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
  },
  stripeTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  stripeStatus: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 6,
  },
  stripeWarning: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 6,
  },
  stripeButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  stripeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptCard: {
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
  },
  receiptRow: {
    flexDirection: 'row',
    gap: 8,
  },
  receiptInput: {
    flex: 1,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#E2E8F0',
    fontSize: 12,
    backgroundColor: '#0B1220',
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  receiptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  receiptButtonPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  receiptButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  rateCardToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rateToggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  rateToggleActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  rateToggleText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  receiptError: {
    marginTop: 6,
    color: '#fca5a5',
    fontSize: 11,
  },
  receiptRowItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#273349',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  receiptRowLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  receiptThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0B1220',
  },
  receiptThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  historyFilters: {
    flexDirection: 'row',
    gap: 6,
  },
  historyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#3B82F6',
  },
  historyChipText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  receiptModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  receiptModalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0B1220',
    padding: 16,
  },
  receiptModalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#111827',
  },
  identityPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#111827',
  },
  payoutsTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  payoutsList: {
    flex: 1,
  },
  payoutsEmpty: {
    color: '#94A3B8',
    fontSize: 12,
  },
  payoutRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#273349',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payoutAmount: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  payoutMeta: {
    color: '#94A3B8',
    fontSize: 11,
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B4EFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B1220',
  },
  markerFood: {
    backgroundColor: '#F59E0B',
  },
  markerText: {
    fontSize: 14,
  },
  courierCircleGlow: {
    circleRadius: ['interpolate', ['linear'], ['get', 'pulse'], 0.6, 10, 1.4, 18],
    circleColor: 'rgba(37, 99, 235, 0.45)',
    circleBlur: 0.8,
    circleOpacity: 0.9,
  },
  courierCircleDot: {
    circleRadius: 7,
    circleColor: '#2563eb',
    circleStrokeColor: '#e2e8f0',
    circleStrokeWidth: 3,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B1220',
    padding: 16,
    paddingBottom: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  overlayCollapsed: {
    paddingBottom: 10,
  },
  overlayBody: {
    marginTop: 6,
  },
  overlayBodyContent: {
    paddingBottom: 24,
  },
  activePanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 170,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#273349',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  activePanelInline: {
    position: 'relative',
    left: 0,
    right: 0,
    bottom: 0,
    marginTop: 8,
    marginBottom: 4,
  },
  activePanelLive: {
    borderColor: '#BFDBFE',
  },
  activeTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  statusPillProof: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  statusPillProofText: {
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '700',
  },
  timeline: {
    marginTop: 4,
    marginBottom: 8,
    gap: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  timelineDotDone: {
    backgroundColor: '#22c55e',
  },
  timelineDotCurrent: {
    backgroundColor: '#60a5fa',
  },
  timelineTextWrap: {
    flex: 1,
  },
  timelineLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  timelineMeta: {
    color: '#94A3B8',
    fontSize: 10,
  },
  timelineToggle: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  timelineToggleText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  activeActions: {
    marginTop: 8,
    gap: 8,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayHeaderActive: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  overlayHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayHeaderActionsActive: {
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  overlayTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  overlayTitleCentered: {
    textAlign: 'center',
    marginBottom: 0,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  toggleButtonText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceBadge: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#f87171',
    marginBottom: 8,
    fontSize: 12,
  },
  skeletonWrap: {
    gap: 10,
    marginTop: 6,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  skeletonBar: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#1F2937',
    opacity: 0.6,
  },
  skeletonBarWide: {
    flex: 1,
  },
  skeletonBarShort: {
    width: 80,
  },
  emptyState: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#273349',
    backgroundColor: '#111827',
    marginTop: 6,
  },
  emptyStateTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateMeta: {
    color: '#94A3B8',
    fontSize: 11,
  },
  jobCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#273349',
    backgroundColor: '#111827',
  },
  jobCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  jobPayout: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
  jobMeta: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
  jobThumbRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0B1220',
  },
  jobThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  jobThumbIcon: {
    fontSize: 18,
  },
  jobThumbMeta: {
    flex: 1,
  },
  jobThumbLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  jobThumbValue: {
    marginTop: 2,
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  previewCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#273349',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewHeaderActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  previewTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  previewRouteAction: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '600',
  },
  previewInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  previewClear: {
    color: '#94A3B8',
    fontSize: 11,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#0B1220',
  },
  previewThumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewThumbIcon: {
    fontSize: 20,
  },
  previewMeta: {
    flex: 1,
  },
  previewItemLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  previewItemValue: {
    marginTop: 2,
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  previewPayout: {
    marginTop: 4,
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  previewRouteLine: {
    marginTop: 8,
    color: '#CBD5E1',
    fontSize: 12,
  },
  previewRouteMeta: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 11,
  },
  previewRoutePickup: {
    lineColor: '#38bdf8',
    lineWidth: 5,
    lineOpacity: 0.7,
    lineJoin: 'round',
    lineCap: 'round',
    lineDasharray: [1.5, 1.5],
  },
  previewRoutePickupFallback: {
    lineColor: '#7dd3fc',
    lineWidth: 3,
    lineOpacity: 0.5,
    lineJoin: 'round',
    lineCap: 'round',
    lineDasharray: [2, 2],
  },
  previewRouteDropoff: {
    lineColor: '#a78bfa',
    lineWidth: 5,
    lineOpacity: 0.7,
    lineJoin: 'round',
    lineCap: 'round',
  },
  previewRouteDropoffFallback: {
    lineColor: '#c4b5fd',
    lineWidth: 3,
    lineOpacity: 0.5,
    lineJoin: 'round',
    lineCap: 'round',
    lineDasharray: [2, 2],
  },
  previewMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  previewMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38bdf8',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  previewMarkerDotAlt: {
    backgroundColor: '#a78bfa',
  },
  previewMarkerLabel: {
    position: 'absolute',
    top: -10,
    fontSize: 14,
  },
  routeLine: {
    lineColor: '#38bdf8',
    lineWidth: 6,
    lineOpacity: 0.9,
    lineJoin: 'round',
    lineCap: 'round',
  },
  routeLineGlow: {
    lineColor: '#7dd3fc',
    lineWidth: 12,
    lineOpacity: 0.35,
    lineJoin: 'round',
    lineCap: 'round',
  },
  routeLineAlt: {
    lineColor: '#94a3b8',
    lineWidth: 4,
    lineOpacity: 0.35,
    lineJoin: 'round',
    lineCap: 'round',
  },
  routeRow: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  routeLabel: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '600',
  },
  routeMeta: {
    marginTop: 2,
    color: '#E2E8F0',
    fontSize: 12,
  },
  routeLoading: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 11,
  },
  routeTargetWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
  },
  routeTargetGlow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.35)',
  },
  routeTargetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38bdf8',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  routeTargetLabel: {
    position: 'absolute',
    top: -10,
    fontSize: 14,
  },
  navOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: '#0B1220',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#273349',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 30,
  },
  navInfo: {
    flex: 1,
  },
  navTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  navInstruction: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  navMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  navEndButton: {
    backgroundColor: '#ef4444',
  },
  navRouteOptions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  navRouteChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  navRouteChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  navRouteChipText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  jobActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  completedSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#273349',
  },
  completedTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  completedCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#273349',
  },
  completedJobTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  completedJobMeta: {
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 3,
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonAlt: {
    backgroundColor: '#2563eb',
  },
  actionButtonSecondary: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: '#E2E8F0',
  },
});
