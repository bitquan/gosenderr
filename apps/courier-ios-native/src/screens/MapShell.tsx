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
import { mockJobs } from '../data/mockJobs';
import { useOpenJobs } from '../hooks/useOpenJobs';
import { useAuth } from '../hooks/useAuth';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { Job } from '../types/job';
import type { MockJob } from '../data/mockJobs';
import { claimJob, updateJobStatus } from '../lib/jobs';
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
  const { user } = useAuth();
  const { flags } = useFeatureFlags();
  const { jobs, completedJobs, loading } = useOpenJobs(user?.uid ?? null);
  const [useMockJobs, setUseMockJobs] = useState(true);
  const canUseMock = jobs.length === 0;
  const usingMockJobs = useMockJobs && canUseMock;
  const displayJobs: Array<Job | MockJob> = usingMockJobs ? mockJobs : jobs;
  const [followUser] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mockClaimedId, setMockClaimedId] = useState<string | null>(null);
  const [mockStatus, setMockStatus] = useState<
    'assigned' | 'enroute_pickup' | 'arrived_pickup' | 'picked_up' | 'enroute_dropoff' | 'arrived_dropoff' | 'completed'
  >('assigned');
  const lastLocationWriteRef = useRef(0);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showJobsPanel, setShowJobsPanel] = useState(true);
  const [proofJob, setProofJob] = useState<Job | null>(null);
  const [proofMode, setProofMode] = useState<'pickup' | 'dropoff'>('dropoff');
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [jobAlert, setJobAlert] = useState<string | null>(null);
  const [jobAlertActive, setJobAlertActive] = useState(false);
  const [jobAlertFlash, setJobAlertFlash] = useState(false);
  const [pushDebugLog, setPushDebugLog] = useState<string[]>([]);
  const [showPushDebug, setShowPushDebug] = useState(false);
  const lastJobIdsRef = useRef<string[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showRateCards, setShowRateCards] = useState(false);
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
    identityDocUrl: '',
    identityStatus: 'missing',
    avatarUrl: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const flushBusyRef = useRef(false);
  const [selectedJob, setSelectedJob] = useState<Job | MockJob | null>(null);
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
  const [routeLoading, setRouteLoading] = useState(false);
  const lastRouteRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const proofEnabled = Boolean(flags?.customer?.proofPhotos);
  const jobDetailsEnabled = Boolean(flags?.courier?.jobDetails ?? true);
  const jobAlertsEnabled = Boolean(flags?.courier?.jobAlerts ?? true);
  const pushEnabled = Boolean(flags?.advanced?.pushNotifications ?? true);
  const backgroundLocationEnabled = Boolean(flags?.advanced?.backgroundLocation ?? false);
  const rateCardsEnabled = Boolean(flags?.courier?.rateCards ?? true);
  const modernUiEnabled = Boolean(flags?.ui?.modernStyling ?? true);
  const presentLocalNotification = useCallback((title: string, body: string) => {
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

  const togglePanel = useCallback((panel: 'earnings' | 'profile' | 'rateCards') => {
    setShowEarnings((prev) => (panel === 'earnings' ? !prev : false));
    setShowProfile((prev) => (panel === 'profile' ? !prev : false));
    setShowRateCards((prev) => (panel === 'rateCards' ? !prev : false));
  }, []);

  useEffect(() => {
    if (jobs.length > 0 && useMockJobs) {
      setUseMockJobs(false);
    }
  }, [jobs.length, useMockJobs]);

  useEffect(() => {
    if (!selectedJob) return;
    const exists = displayJobs.some((job) => job.id === selectedJob.id);
    if (!exists) setSelectedJob(null);
  }, [displayJobs, selectedJob]);

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
      void updateDoc(doc(db, 'users', user.uid), {
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
        await messaging().registerDeviceForRemoteMessages();
        const authStatus = await messaging().requestPermission();
        addPushLog(`FCM permission status: ${authStatus}`);
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) return;

        const apnsToken = await messaging().getAPNSToken();
        if (apnsToken) {
          addPushLog(`FCM APNs token: ${apnsToken.slice(0, 12)}…`);
          await updateDoc(doc(db, 'users', user.uid), {
            'courierProfile.apnsToken': apnsToken,
            'courierProfile.apnsTokenUpdatedAt': serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await logCourierEvent({
            courierUid: user.uid,
            event: 'apns_token_registered',
          });
        }

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
          await updateDoc(doc(db, 'users', user.uid), {
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
          await updateDoc(doc(db, 'users', user.uid), {
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
  }, [pushEnabled, user?.uid, addPushLog]);

  useEffect(() => {
    if (!pushEnabled) return;
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const title = remoteMessage.notification?.title || 'New notification';
      const body = remoteMessage.notification?.body || 'You have a new update.';
      addPushLog(`Foreground push: ${title}`);

      setJobAlert(title);
      setJobAlertActive(true);
      setJobAlertFlash(true);

      presentLocalNotification(title, body);

      const flash = setInterval(() => setJobAlertFlash((prev) => !prev), 400);
      const timeout = setTimeout(() => {
        setJobAlertActive(false);
        setJobAlertFlash(false);
        setJobAlert(null);
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
  }, [pushEnabled, user?.uid, addPushLog]);

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
    if (!jobAlertsEnabled) return;
    const alertSource = usingMockJobs ? mockJobs : jobs;
    const liveIds = alertSource.map((job) => job.id).sort();
    const previous = lastJobIdsRef.current;
    const added = liveIds.filter((id) => !previous.includes(id));
    const removed = previous.filter((id) => !liveIds.includes(id));
    lastJobIdsRef.current = liveIds;

    if (added.length > 0) {
      setJobAlert('New job available');
      setJobAlertActive(true);
      Vibration.vibrate(400);
      if (pushEnabled) {
        presentLocalNotification('GoSenderr Courier', 'New job available');
      }
      if (user?.uid) {
        void logCourierEvent({
          courierUid: user.uid,
          event: 'job_alert_new',
          details: { count: added.length, source: usingMockJobs ? 'mock' : 'live' },
        });
      }
      const flash = setInterval(() => setJobAlertFlash((prev) => !prev), 400);
      const timeout = setTimeout(() => {
        setJobAlertActive(false);
        setJobAlertFlash(false);
        setJobAlert(null);
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
    }
  }, [jobs, jobAlertsEnabled, usingMockJobs, jobAlertActive, user?.uid]);

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
        identityDocUrl: data?.courierProfile?.identityDocUrl || prev.identityDocUrl,
        identityStatus: data?.courierProfile?.identityStatus || prev.identityStatus,
        avatarUrl: data?.courierProfile?.avatarUrl || data?.photoURL || prev.avatarUrl,
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

  const getMarkerEmoji = (job: Job | MockJob) =>
    'type' in job && job.type === 'food' ? '🍔' : '📦';
  const isFoodJob = (job: Job | MockJob) => 'type' in job && job.type === 'food';
  const getPayoutText = (job: Job | MockJob) => {
    if ('payout' in job) return `$${job.payout.toFixed(2)}`;
    if (job.agreedFee != null) return `$${job.agreedFee.toFixed(2)}`;
    return '—';
  };
  const getJobPhotoUrl = (job: Job | MockJob) => {
    if (!isLiveJob(job)) return null;
    const photos = (job as any).photos || [];
    return photos?.[0]?.thumbnailURL || photos?.[0]?.url || null;
  };
  const getPickupLabel = (job: Job | MockJob) =>
    (job.pickup as any).label || (job.pickup as any).address || 'Pickup';
  const getDropoffLabel = (job: Job | MockJob) =>
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
  const isLiveJob = (job: Job | MockJob): job is Job => 'status' in job;
  const isMockJob = (job: Job | MockJob): job is MockJob => !isLiveJob(job);
  const getEffectiveStatus = (job: Job): string => job.statusDetail ?? job.status;
  const isAssignedToMe = (job: Job) => !!user?.uid && job.courierUid === user.uid;
  const canRevealDetails = (job: Job) => isAssignedToMe(job);
  const getVisiblePickupLabel = (job: Job | MockJob) =>
    isLiveJob(job) && !canRevealDetails(job)
      ? getMaskedLocation(job.pickup)
      : getPickupLabel(job);
  const getVisibleDropoffLabel = (job: Job | MockJob) =>
    isLiveJob(job) && !canRevealDetails(job)
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
      setPendingSyncCount(remainingLocations.length + remainingStatuses.length);
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
      const { latitude, longitude, heading, speed, accuracy } = location.coords;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
      setCurrentLocation({ lat: latitude, lng: longitude });
      if (typeof heading === 'number') {
        setCurrentHeading(heading);
      }

      if (navActive && routeData?.targetCoord) {
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: 15,
          pitch: 55,
          heading: typeof heading === 'number' ? heading : 0,
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
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'courierProfile.isOnline': !isOnline,
        updatedAt: serverTimestamp(),
      });
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

  const mockJob = displayJobs.find((job) => isMockJob(job) && job.id === mockClaimedId) as MockJob | undefined;
  const liveActiveJob = jobs.find(
    (job) => isAssignedToMe(job) && job.status !== 'completed' && job.status !== 'cancelled'
  );
  const hasActiveJob = Boolean(liveActiveJob || mockJob);
  const [jobsView, setJobsView] = useState<'active' | 'jobs'>('active');

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
          `?geometries=geojson&overview=full&access_token=${mapboxConfig.accessToken}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Route fetch failed: ${res.status}`);
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route?.geometry) throw new Error('No route geometry');

        const steps = route.legs?.[0]?.steps?.map((step: any) => ({
          instruction: step.maneuver?.instruction || 'Continue',
          distance: step.distance || 0,
          duration: step.duration || 0,
          location: {
            lat: step.maneuver?.location?.[1],
            lng: step.maneuver?.location?.[0],
          },
        })) || [];

        setRouteData({
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
        });
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
    if (!hasActiveJob) {
      setJobsView('jobs');
    }
  }, [hasActiveJob]);
  const showPickupProofButton = !!liveActiveJob && needsPickupProof(liveActiveJob);
  const showDropoffProofButton = !!liveActiveJob && needsDropoffProof(liveActiveJob);
  const advanceMockStatus = () => {
    const next: Record<typeof mockStatus, typeof mockStatus | 'completed'> = {
      assigned: 'enroute_pickup',
      enroute_pickup: 'arrived_pickup',
      arrived_pickup: 'picked_up',
      picked_up: 'enroute_dropoff',
      enroute_dropoff: 'arrived_dropoff',
      arrived_dropoff: 'completed',
      completed: 'completed',
    };
    setMockStatus(next[mockStatus] as typeof mockStatus);
  };

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
          followZoomLevel={navActive ? 15 : 12}
          pitch={navActive ? 55 : 0}
          heading={navActive && currentHeading != null ? currentHeading : 0}
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
          <MapboxGL.MarkerView
            id="courier-location"
            coordinate={[currentLocation.lng, currentLocation.lat]}
          >
            <View style={styles.courierMarkerWrap}>
              <Animated.View
                style={[
                  styles.courierPulse,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1.4],
                        }),
                      },
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
              <View style={styles.courierDot} />
            </View>
          </MapboxGL.MarkerView>
        )}
        {displayJobs.map((job) => (
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
            <Text style={styles.title}>Courier V2</Text>
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
        <View
          style={[
            styles.jobAlert,
            jobAlertFlash && styles.jobAlertFlash,
            !jobAlertActive && styles.jobAlertHidden,
          ]}
        >
          <Text style={styles.jobAlertText}>{jobAlert}</Text>
        </View>
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
            {showJobsPanel && (
              <Pressable
                style={styles.mockToggleButton}
                onPress={() => setUseMockJobs((prev) => !prev)}
                disabled={!canUseMock}
              >
                <Text style={styles.toggleButtonText}>
                  {usingMockJobs ? 'Mock on' : 'Mock off'}
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
          <>
            {hasActiveJob && jobsView === 'active' ? (
              <>
                {mockJob && (
                  <View style={[styles.activePanel, styles.activePanelInline]}>
                    <Text style={styles.activeTitle}>Active job (mock)</Text>
                    <Text style={styles.activeMeta}>
                      {mockJob.title} • {mockStatus.replace('_', ' ')}
                    </Text>
                    <Text style={styles.activeMeta}>
                      {mockJob.pickup.label} → {mockJob.dropoff.label}
                    </Text>
                    <Pressable style={styles.actionButton} onPress={advanceMockStatus}>
                      <Text style={styles.actionButtonText}>
                        {mockStatus === 'completed' ? 'Completed' : 'Advance status'}
                      </Text>
                    </Pressable>
                  </View>
                )}

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
                          <Text style={styles.actionButtonText}>Start navigation</Text>
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
                          <Text style={styles.actionButtonText}>View details</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sourceBadge}>
                  {usingMockJobs ? 'Mock data' : `Live jobs (${jobs.length})`}
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
                {!loading && displayJobs.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No jobs yet</Text>
                    <Text style={styles.emptyStateMeta}>
                      {isOnline
                        ? 'Hang tight — new requests will appear here.'
                        : 'Go online to start receiving jobs.'}
                    </Text>
                  </View>
                )}
                {displayJobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={[styles.jobCard, selectedJob?.id === job.id && styles.jobCardSelected]}
                    onPress={() => setSelectedJob(job)}
                  >
                    <View style={styles.jobHeaderCompact}>
                      <Text style={styles.jobTitle}>
                        {'title' in job ? job.title : 'Delivery job'}
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
                          {isLiveJob(job) && job.package?.notes
                            ? job.package.notes
                            : isLiveJob(job) && job.package?.size
                            ? `${job.package.size.toUpperCase()} package`
                            : 'Package'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.jobMeta}>
                      {getVisiblePickupLabel(job)} → {getVisibleDropoffLabel(job)}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {isLiveJob(job) ? `Live • ${getEffectiveStatus(job)}` : 'Mock'}
                    </Text>
                    {selectedJob?.id === job.id && isLiveJob(job) && !isAssignedToMe(job) && (
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
                    {isLiveJob(job) && (
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
                                  setProofMode(needsPickupProof(job) ? 'pickup' : 'dropoff'))
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
                            <Text style={styles.actionButtonText}>Details</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                    {isMockJob(job) && (
                      <View style={styles.jobActions}>
                        {mockClaimedId === job.id ? (
                          <Text style={styles.jobMeta}>Claimed (mock)</Text>
                        ) : (
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => setMockClaimedId(job.id)}
                          >
                            <Text style={styles.actionButtonText}>Claim (mock)</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </Pressable>
                ))}
              </>
            )}

            {showCompleted && completedJobs.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedTitle}>Completed</Text>
                {completedJobs.map((job) => (
                  <View key={job.id} style={styles.completedCard}>
                    <Text style={styles.jobTitle}>Delivery job</Text>
                    <Text style={styles.jobMeta}>
                      {getPickupLabel(job)} → {getDropoffLabel(job)}
                    </Text>
                    <Text style={styles.jobMeta}>
                      {job.completedAt?.toDate ? `Completed at ${job.completedAt.toDate().toLocaleTimeString()}` : 'Completed'}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
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
        onClose={() => setProofJob(null)}
        onCompleted={() => {
          if (user?.uid && proofJob?.id) {
            void logCourierEvent({
              courierUid: user.uid,
              event: proofMode === 'pickup' ? 'pickup_proof_complete' : 'dropoff_proof_complete',
              jobId: proofJob.id,
            });
          }
          setProofJob(null);
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
    backgroundColor: '#0b0f1a',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionCard: {
    position: 'absolute',
    top: 120,
    left: 16,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(8, 12, 24, 0.92)',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 25,
  },
  actionCardCollapsed: {
    padding: 8,
  },
  actionToggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionToggleText: {
    color: '#e2e8f0',
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
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    minWidth: 110,
  },
  actionItemDanger: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  actionItemText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusOnline: {
    backgroundColor: '#16a34a',
  },
  statusOffline: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  debugButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#334155',
  },
  debugButtonText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  earningsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  earningsButtonText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  syncPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#1e3a8a',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  syncPillText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  signOutText: {
    color: '#d1d5db',
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
  },
  jobAlertFlash: {
    backgroundColor: 'rgba(99, 102, 241, 0.98)',
    borderColor: '#818cf8',
  },
  jobAlertHidden: {
    opacity: 0.4,
  },
  jobAlertText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  debugPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    zIndex: 30,
  },
  debugTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  debugLine: {
    color: '#cbd5f5',
    fontSize: 11,
    marginBottom: 2,
  },
  earningsPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    zIndex: 30,
  },
  onboardingPanel: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    zIndex: 30,
  },
  earningsScrollContent: {
    paddingBottom: 24,
  },
  earningsTitle: {
    color: '#e2e8f0',
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
    borderColor: '#1f2937',
  },
  panelCloseText: {
    color: '#e2e8f0',
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
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  avatarButtonText: {
    color: '#e2e8f0',
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
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  earningsCardWide: {
    flexBasis: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  earningsLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  earningsValue: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  stripeCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stripeTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
  },
  stripeStatus: {
    color: '#94a3b8',
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
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
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
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#e2e8f0',
    fontSize: 12,
    backgroundColor: '#0b1220',
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
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  receiptButtonPrimary: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  receiptButtonText: {
    color: '#e2e8f0',
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
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  rateToggleActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  rateToggleText: {
    color: '#e2e8f0',
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
    borderBottomColor: '#1f2937',
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
    backgroundColor: '#0b1220',
  },
  receiptThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
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
    borderColor: '#1f2937',
  },
  historyChipActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  historyChipText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '600',
  },
  receiptModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  receiptModalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0b1220',
    padding: 16,
  },
  receiptModalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#0f172a',
  },
  identityPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#0b1220',
  },
  payoutsTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  payoutsList: {
    flex: 1,
  },
  payoutsEmpty: {
    color: '#94a3b8',
    fontSize: 12,
  },
  payoutRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payoutAmount: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  payoutMeta: {
    color: '#94a3b8',
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
    borderColor: '#111827',
  },
  markerFood: {
    backgroundColor: '#F59E0B',
  },
  markerText: {
    fontSize: 14,
  },
  courierMarkerWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierPulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(37, 99, 235, 0.45)',
  },
  courierDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  overlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
  },
  overlayCollapsed: {
    paddingBottom: 10,
  },
  activePanel: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 170,
    backgroundColor: 'rgba(8, 12, 24, 0.92)',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
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
    borderColor: '#2563eb',
  },
  activeTitle: {
    color: '#e2e8f0',
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
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 6,
  },
  statusPillProof: {
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  statusPillProofText: {
    color: '#dbeafe',
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
    backgroundColor: '#374151',
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
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  timelineMeta: {
    color: '#94a3b8',
    fontSize: 10,
  },
  timelineToggle: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  timelineToggleText: {
    color: '#e5e7eb',
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
    color: '#e5e7eb',
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
    backgroundColor: '#1f2937',
  },
  mockToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  toggleButtonText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '600',
  },
  sourceBadge: {
    color: '#94a3b8',
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
    backgroundColor: '#1f2937',
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
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    marginTop: 6,
  },
  emptyStateTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateMeta: {
    color: '#94a3b8',
    fontSize: 11,
  },
  jobCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  jobCardSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -8,
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
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  jobPayout: {
    color: '#a7f3d0',
    fontSize: 14,
    fontWeight: '700',
  },
  jobMeta: {
    marginTop: 6,
    color: '#9ca3af',
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
    backgroundColor: '#111827',
  },
  jobThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  jobThumbIcon: {
    fontSize: 18,
  },
  jobThumbMeta: {
    flex: 1,
  },
  jobThumbLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  jobThumbValue: {
    marginTop: 2,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  previewCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#e2e8f0',
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
    color: '#94a3b8',
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
    backgroundColor: '#111827',
  },
  previewThumbPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  previewThumbIcon: {
    fontSize: 20,
  },
  previewMeta: {
    flex: 1,
  },
  previewItemLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  previewItemValue: {
    marginTop: 2,
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  previewPayout: {
    marginTop: 4,
    color: '#a7f3d0',
    fontSize: 13,
    fontWeight: '700',
  },
  previewRouteLine: {
    marginTop: 8,
    color: '#cbd5f5',
    fontSize: 12,
  },
  previewRouteMeta: {
    marginTop: 4,
    color: '#94a3b8',
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
    borderColor: '#0f172a',
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
  routeRow: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  routeLabel: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '600',
  },
  routeMeta: {
    marginTop: 2,
    color: '#e2e8f0',
    fontSize: 12,
  },
  routeLoading: {
    marginTop: 6,
    color: '#94a3b8',
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
    borderColor: '#0f172a',
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
    backgroundColor: 'rgba(8, 12, 24, 0.92)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
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
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  navInstruction: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  navMeta: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  navEndButton: {
    backgroundColor: '#ef4444',
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
    borderTopColor: '#1f2937',
  },
  completedTitle: {
    color: '#cbd5f5',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  completedCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  actionButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonAlt: {
    backgroundColor: '#2563eb',
  },
  actionButtonSecondary: {
    backgroundColor: '#1f2937',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
