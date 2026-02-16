import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {launchImageLibrary, type Asset} from 'react-native-image-picker';

import {PrimaryButton} from '../components/PrimaryButton';
import {EmptyState} from '../components/states/EmptyState';
import {ErrorState} from '../components/states/ErrorState';
import {LoadingState} from '../components/states/LoadingState';
import {ScreenContainer} from '../components/ScreenContainer';
import {runtimeConfig} from '../config/runtime';
import {useAuth} from '../context/AuthContext';
import {
  classifyUnknownError,
  formatErrorContext,
  getErrorResolution,
  type AppError,
} from '../services/errorSystem';
import type {CourierProfileValidationErrors} from '../services/ports/profilePort';
import {useServiceRegistry} from '../services/serviceRegistry';
import {
  COURIER_DOCUMENT_ORDER,
  COURIER_EQUIPMENT_TYPES,
  COURIER_EQUIPMENT_LABELS,
  deriveCourierBadges,
  type CourierAvailability,
  type CourierDocumentType,
  type CourierEquipmentType,
  type CourierPayoutMode,
  type CourierProfile,
  type CourierProfileDraft,
} from '../types/profile';
import {senderrTheme} from '../theme/senderrTheme';

type Feedback = {
  tone: 'error' | 'info';
  text: string;
};

type SettingsTabId =
  | 'operations'
  | 'profile'
  | 'rates'
  | 'equipment'
  | 'compliance'
  | 'payouts'
  | 'account'
  | 'debug';

const asRateInput = (value: number): string => value.toFixed(2);
const asStringListInput = (values: string[]): string => values.join(', ');
const toStringList = (value: string): string[] =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const toDraft = (profile: CourierProfile): CourierProfileDraft => ({
  fullName: profile.fullName,
  phoneNumber: profile.phoneNumber,
  profilePhotoUrl: profile.profilePhotoUrl ?? '',
  status: profile.status,
  rejectionReason: profile.rejectionReason ?? '',
  availability: profile.availability,
  isOnline: profile.isOnline,
  serviceRadiusMiles: String(profile.serviceRadiusMiles),
  taxState: profile.taxState,
  vehicle: {
    makeModel: profile.vehicle.makeModel,
    plateNumber: profile.vehicle.plateNumber,
    color: profile.vehicle.color,
  },
  workModes: {
    packagesEnabled: profile.workModes.packagesEnabled,
    foodEnabled: profile.workModes.foodEnabled,
  },
  notificationPrefs: {
    jobOffers: profile.notificationPrefs.jobOffers,
    payoutUpdates: profile.notificationPrefs.payoutUpdates,
    reminders: profile.notificationPrefs.reminders,
  },
  settings: {
    acceptsNewJobs: profile.settings.acceptsNewJobs,
    autoStartTracking: profile.settings.autoStartTracking,
  },
  documents: profile.documents.map(item => ({...item})),
  equipment: Object.fromEntries(
    COURIER_EQUIPMENT_TYPES.map(type => [type, {...profile.equipment[type]}]),
  ) as CourierProfileDraft['equipment'],
  stripe: {
    connectAccountId: profile.stripe.connectAccountId,
    accountStatus: profile.stripe.accountStatus,
    chargesEnabled: profile.stripe.chargesEnabled,
    payoutsEnabled: profile.stripe.payoutsEnabled,
    requirementsDue: [...profile.stripe.requirementsDue],
    requirementsPastDue: [...profile.stripe.requirementsPastDue],
  },
  payoutMode: profile.payoutMode,
  externalPayoutProvider: profile.externalPayoutProvider,
  externalPayoutHandle: profile.externalPayoutHandle,
  stats: {
    todayJobs: profile.stats.todayJobs,
    completedJobs: profile.stats.completedJobs,
  },
  rateCards: {
    packages: {
      baseFare: asRateInput(profile.rateCards.packages.baseFare),
      perMile: asRateInput(profile.rateCards.packages.perMile),
      perMinute: asRateInput(profile.rateCards.packages.perMinute),
      optionalFees: profile.rateCards.packages.optionalFees,
    },
    food: {
      baseFare: asRateInput(profile.rateCards.food.baseFare),
      perMile: asRateInput(profile.rateCards.food.perMile),
      restaurantWaitPay: asRateInput(profile.rateCards.food.restaurantWaitPay),
      optionalFees: profile.rateCards.food.optionalFees,
    },
  },
});

const AVAILABILITY_OPTIONS: CourierAvailability[] = ['available', 'busy', 'offline'];
const PAYOUT_MODE_OPTIONS: ReadonlyArray<{
  value: CourierPayoutMode;
  label: string;
  caption: string;
}> = [
  {value: 'stripe_connect', label: 'Stripe Connect', caption: 'Automatic transfers'},
  {value: 'external_provider', label: 'External Provider', caption: 'PayPal, Cash App, Zelle, etc.'},
  {value: 'manual_settlement', label: 'Manual Settlement', caption: 'Off-platform payout records'},
];
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

const shouldUseCallableUploadFallback = (error: unknown): boolean => {
  const message = String(error instanceof Error ? error.message : error ?? '').toLowerCase();
  return (
    message.includes('arraybuffer') ||
    message.includes('arraybufferview') ||
    message.includes('creating blobs') ||
    message.includes('blob')
  );
};

export const SettingsScreen = (): React.JSX.Element => {
  const {session, signOutUser} = useAuth();
  const {location: locationService, profile: profileService, featureFlags, analytics} = useServiceRegistry();
  const {state: locationState, requestPermission, startTracking, stopTracking} = locationService.useLocationTracking();
  const {state: flagsState, refresh: refreshFlags} = featureFlags.useFeatureFlags();
  const showFlagsDebug = runtimeConfig.envName !== 'prod';
  const {width: viewportWidth} = useWindowDimensions();
  const useSideTabs = viewportWidth >= 920;

  const [profileDraft, setProfileDraft] = useState<CourierProfileDraft | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [profileActionError, setProfileActionError] = useState<AppError | null>(null);
  const [locationActionError, setLocationActionError] = useState<AppError | null>(null);
  const [validationErrors, setValidationErrors] = useState<CourierProfileValidationErrors>({});
  const [profileSource, setProfileSource] = useState<'firebase' | 'local'>('local');
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('operations');
  const [showPayoutModeOptions, setShowPayoutModeOptions] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async (): Promise<void> => {
      if (!session) {
        if (mounted) {
          setProfileLoadError(null);
          setProfileActionError(null);
          setLoadingProfile(false);
        }
        return;
      }

      setLoadingProfile(true);
      setProfileLoadError(null);
      setProfileActionError(null);
      setFeedback(null);
      try {
        const result = await profileService.loadProfile(session);
        if (!mounted) {
          return;
        }
        setProfileDraft(toDraft(result.profile));
        setProfileSource(result.source);
        setProfileActionError(null);
        if (result.message) {
          setFeedback({
            tone: 'info',
            text: result.message,
          });
        }
      } catch (error) {
        if (!mounted) {
          return;
        }
        const classified = classifyUnknownError(error, {
          source: 'settings_load_profile',
          fallbackMessage: 'Unable to load courier profile.',
        });
        setProfileLoadError(classified.userMessage);
        setProfileActionError(classified);
        void analytics.recordError(error, formatErrorContext('settings_load_profile', classified));
      } finally {
        if (mounted) {
          setLoadingProfile(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [analytics, loadAttempt, profileService, session]);

  const canSaveProfile = useMemo(() => Boolean(profileDraft) && !savingProfile && !loadingProfile, [
    profileDraft,
    savingProfile,
    loadingProfile,
  ]);

  const retryProfileLoad = useCallback((): void => {
    setLoadAttempt(previous => previous + 1);
  }, []);

  const updateDraft = (updater: (previous: CourierProfileDraft) => CourierProfileDraft): void => {
    setProfileDraft(previous => {
      if (!previous) {
        return previous;
      }
      return updater(previous);
    });
  };

  const updateTextField = (field: 'fullName' | 'phoneNumber', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateProfileMetaField = (
    field: 'profilePhotoUrl' | 'status' | 'rejectionReason' | 'serviceRadiusMiles' | 'taxState',
    value: string,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateVehicleField = (field: 'makeModel' | 'plateNumber' | 'color', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      vehicle: {
        ...previous.vehicle,
        [field]: value,
      },
    }));
  };

  const updateSettingsField = (field: 'acceptsNewJobs' | 'autoStartTracking', value: boolean): void => {
    updateDraft(previous => ({
      ...previous,
      settings: {
        ...previous.settings,
        [field]: value,
      },
    }));
  };

  const updateAvailability = (availability: CourierAvailability): void => {
    updateDraft(previous => ({
      ...previous,
      availability,
    }));
  };

  const updateOnlineState = (isOnline: boolean): void => {
    updateDraft(previous => ({
      ...previous,
      isOnline,
      availability: isOnline ? previous.availability : 'offline',
    }));
  };

  const updateWorkModeField = (field: 'packagesEnabled' | 'foodEnabled', value: boolean): void => {
    updateDraft(previous => ({
      ...previous,
      workModes: {
        ...previous.workModes,
        [field]: value,
      },
    }));
  };

  const updateNotificationField = (
    field: 'jobOffers' | 'payoutUpdates' | 'reminders',
    value: boolean,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      notificationPrefs: {
        ...previous.notificationPrefs,
        [field]: value,
      },
    }));
  };

  const recoverRejectedStatusIfResubmitted = (
    draft: CourierProfileDraft,
  ): CourierProfileDraft => {
    if (draft.status !== 'rejected') {
      return draft;
    }
    const hasResubmittedDocument = draft.documents.some(
      document => document.status === 'pending_review' && Boolean(document.url?.trim()),
    );
    if (!hasResubmittedDocument) {
      return draft;
    }
    return {
      ...draft,
      status: 'pending_review',
      rejectionReason: '',
    };
  };

  const updateDocumentStatus = (type: CourierDocumentType, status: CourierProfileDraft['documents'][number]['status']): void => {
    updateDraft(previous =>
      recoverRejectedStatusIfResubmitted({
        ...previous,
        documents: previous.documents.map(document => {
          if (document.type !== type) {
            return document;
          }
          if (status === 'not_uploaded') {
            return {
              ...document,
              status,
              url: undefined,
              uploadedAt: undefined,
              reviewedAt: undefined,
              rejectedReason: undefined,
            };
          }
          const nowIso = new Date().toISOString();
          return {
            ...document,
            status,
            uploadedAt: status === 'pending_review' ? nowIso : document.uploadedAt,
            reviewedAt: status === 'approved' || status === 'rejected' ? nowIso : document.reviewedAt,
            rejectedReason: status === 'rejected' ? document.rejectedReason ?? 'Needs review updates.' : undefined,
          };
        }),
      }),
    );
  };

  const updateDocumentUrl = (type: CourierDocumentType, url: string): void => {
    updateDraft(previous =>
      recoverRejectedStatusIfResubmitted({
        ...previous,
        documents: previous.documents.map(document =>
          document.type === type
            ? {
                ...document,
                url,
                status: url.trim().length > 0 ? 'pending_review' : 'not_uploaded',
                uploadedAt: url.trim().length > 0 ? new Date().toISOString() : undefined,
              }
            : document,
        ),
      }),
    );
  };

  const updateEquipmentField = (
    type: CourierEquipmentType,
    field: 'has' | 'approved' | 'photoUrl',
    value: boolean | string,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      equipment: {
        ...previous.equipment,
        [type]: {
          ...previous.equipment[type],
          [field]: value,
          ...(field === 'has' && value === false
            ? {
                approved: false,
                photoUrl: undefined,
                approvedAt: undefined,
                rejectedReason: undefined,
              }
            : {}),
          ...(field === 'approved'
            ? {
                approvedAt: value ? new Date().toISOString() : undefined,
                rejectedReason: value ? undefined : previous.equipment[type].rejectedReason,
              }
            : {}),
        },
      },
    }));
  };

  const updateStripeField = (
    field: 'connectAccountId' | 'accountStatus',
    value: string,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      stripe: {
        ...previous.stripe,
        [field]: value,
      },
    }));
  };

  const updateStripeToggle = (
    field: 'chargesEnabled' | 'payoutsEnabled',
    value: boolean,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      stripe: {
        ...previous.stripe,
        [field]: value,
      },
    }));
  };

  const updateStripeRequirements = (
    field: 'requirementsDue' | 'requirementsPastDue',
    value: string,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      stripe: {
        ...previous.stripe,
        [field]: toStringList(value),
      },
    }));
  };

  const updatePayoutMode = (value: CourierPayoutMode): void => {
    updateDraft(previous => ({
      ...previous,
      payoutMode: value,
      externalPayoutProvider: value === 'stripe_connect' ? '' : previous.externalPayoutProvider,
      externalPayoutHandle: value === 'stripe_connect' ? '' : previous.externalPayoutHandle,
    }));
    setShowPayoutModeOptions(false);
  };

  const updateExternalPayoutField = (
    field: 'externalPayoutProvider' | 'externalPayoutHandle',
    value: string,
  ): void => {
    updateDraft(previous => ({
      ...previous,
      [field]: value,
    }));
  };

  const updatePackagesRateField = (field: 'baseFare' | 'perMile' | 'perMinute', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        packages: {
          ...previous.rateCards.packages,
          [field]: value,
        },
      },
    }));
  };

  const updatePackagesOptionalFees = (value: string): void => {
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        packages: {
          ...previous.rateCards.packages,
          optionalFees: toStringList(value),
        },
      },
    }));
  };

  /*
   * Row-based editor for package optional fees.
   * - UI keeps a local rows array (so empty/new rows can be shown)
   * - profileDraft.rateCards.packages.optionalFees always contains only filled entries
   *   in the "label:amount" format.
   */
  const [packageOptionalFeesRows, setPackageOptionalFeesRows] = useState<Array<{name: string; amount: string}>>(
    [],
  );

  useEffect(() => {
    if (!profileDraft) {
      setPackageOptionalFeesRows([]);
      return;
    }
    const rows = (profileDraft.rateCards.packages.optionalFees || []).map(item => {
      const [name, ...rest] = item.split(':');
      return {name: (name || '').trim(), amount: (rest.join(':') || '').trim()};
    });
    setPackageOptionalFeesRows(rows);
  }, [profileDraft?.rateCards.packages.optionalFees]);

  const persistOptionalFeesRows = (rows: Array<{name: string; amount: string}>): void => {
    const serialized = rows
      .map(r => `${r.name.trim()}:${r.amount.trim()}`)
      .filter(s => s.split(':')[0].length > 0);
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        packages: {
          ...previous.rateCards.packages,
          optionalFees: serialized,
        },
      },
    }));
  };

  const addOptionalFeeRow = (): void => {
    setPackageOptionalFeesRows(prev => {
      const next = [...prev, {name: '', amount: ''}];
      // do not persist empty row yet (persist only filled rows)
      return next;
    });
  };

  const updateOptionalFeeRow = (index: number, field: 'name' | 'amount', value: string): void => {
    setPackageOptionalFeesRows(prev => {
      const next = prev.map((r, i) => (i === index ? {...r, [field]: value} : r));
      persistOptionalFeesRows(next);
      return next;
    });
  };

  const removeOptionalFeeRow = (index: number): void => {
    setPackageOptionalFeesRows(prev => {
      const next = prev.filter((_, i) => i !== index);
      persistOptionalFeesRows(next);
      return next;
    });
  };

  const updateFoodRateField = (field: 'baseFare' | 'perMile' | 'restaurantWaitPay', value: string): void => {
    updateDraft(previous => ({
      ...previous,
      rateCards: {
        ...previous.rateCards,
        food: {
          ...previous.rateCards.food,
          [field]: value,
        },
      },
    }));
  };

  const getAssetExtension = (asset: Asset): string => {
    const mime = String(asset.type ?? '').toLowerCase();
    if (mime in MIME_EXTENSION_MAP) {
      return MIME_EXTENSION_MAP[mime];
    }
    return 'jpg';
  };

  const uploadAssetToStorage = async (asset: Asset, destinationPrefix: string): Promise<string> => {
    if (!session) {
      throw new Error('Sign in again and retry.');
    }

    const extension = getAssetExtension(asset);
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const fullPath = `${destinationPrefix}/${filename}`;
    const mime = asset.type ?? 'image/jpeg';

    const uploadViaCallable = async (): Promise<string> => {
      if (!asset.base64 || asset.base64.trim().length === 0) {
        throw new Error('Selected image data is missing. Please choose a different photo.');
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {getFirebaseFunctions} = require('../services/firebase');
      const functions = getFirebaseFunctions();
      if (!functions) {
        throw new Error('Firebase Functions is not available in this environment.');
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {httpsCallable} = require('firebase/functions');
      const callable = httpsCallable<
        {destinationPrefix: string; extension: string; mimeType: string; base64: string},
        {url?: string}
      >(functions, 'uploadCourierAsset');

      const response = await callable({
        destinationPrefix,
        extension,
        mimeType: mime,
        base64: asset.base64,
      });

      const url = response?.data?.url;
      if (typeof url !== 'string' || url.trim().length === 0) {
        throw new Error('Upload succeeded but returned an invalid URL.');
      }
      return url.trim();
    };

    try {
      // Lazy-load firebase helper so tests without native AsyncStorage don't fail at module load.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {getFirebaseStorage} = require('../services/firebase');
      const storage = getFirebaseStorage();

      if (storage) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const {ref: storageRef, uploadString, uploadBytes, getDownloadURL} = require('firebase/storage');
        const destRef = storageRef(storage, fullPath);

        if (asset.base64 && asset.base64.trim().length > 0) {
          await uploadString(destRef, `data:${mime};base64,${asset.base64}`, 'data_url');
          return getDownloadURL(destRef);
        }

        if (!asset.uri) {
          throw new Error('No image data selected.');
        }

        const response = await fetch(asset.uri);
        const blob = await response.blob();
        await uploadBytes(destRef, blob as never);
        return getDownloadURL(destRef);
      }
    } catch (error) {
      if (!shouldUseCallableUploadFallback(error)) {
        throw error;
      }
    }

    return uploadViaCallable();
  };

  const pickPhotoAsset = async (): Promise<Asset | null> => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.72,
    });

    if (response.didCancel) {
      return null;
    }

    if (response.errorCode) {
      throw new Error(response.errorMessage || 'Unable to select photo.');
    }

    const asset = response.assets?.[0];
    if (!asset) {
      return null;
    }
    return asset;
  };

  const runUploadFlow = (
    key: string,
    source: string,
    destinationPrefix: string,
    applyUrl: (url: string) => void,
    successMessage: string,
  ): void => {
    if (!session || uploadingKey) {
      return;
    }

    void (async () => {
      setUploadingKey(key);
      try {
        const asset = await pickPhotoAsset();
        if (!asset) {
          setFeedback({
            tone: 'info',
            text: 'Upload canceled.',
          });
          return;
        }

        const url = await uploadAssetToStorage(asset, destinationPrefix);
        applyUrl(url);
        setFeedback({
          tone: 'info',
          text: successMessage,
        });
      } catch (error) {
        const classified = classifyUnknownError(error, {
          source,
          fallbackMessage: 'Unable to upload file.',
        });
        void analytics.recordError(error, formatErrorContext(source, classified));
        setFeedback({
          tone: 'error',
          text: classified.userMessage,
        });
      } finally {
        setUploadingKey(null);
      }
    })();
  };

  const uploadProfilePhoto = (): void => {
    if (!session) {
      return;
    }
    runUploadFlow(
      'profile-photo',
      'settings_upload_profile_photo',
      `courierProfiles/${session.uid}/profilePhoto`,
      url => {
        updateProfileMetaField('profilePhotoUrl', url);
      },
      'Profile photo uploaded. Save profile to sync it.',
    );
  };

  const uploadDocumentPhoto = (type: CourierDocumentType): void => {
    if (!session) {
      return;
    }
    runUploadFlow(
      `document-${type}`,
      'settings_upload_document_photo',
      `courierProfiles/${session.uid}/documents/${type}`,
      url => {
        updateDocumentUrl(type, url);
      },
      'Document uploaded. Save profile to sync review state.',
    );
  };

  const uploadEquipmentPhoto = (type: CourierEquipmentType): void => {
    if (!session) {
      return;
    }
    runUploadFlow(
      `equipment-${type}`,
      'settings_upload_equipment_photo',
      `courierProfiles/${session.uid}/equipment/${type}`,
      url => {
        updateDraft(previous => ({
          ...previous,
          equipment: {
            ...previous.equipment,
            [type]: {
              ...previous.equipment[type],
              has: true,
              approved: false,
              approvedAt: undefined,
              rejectedReason: undefined,
              photoUrl: url,
            },
          },
        }));
      },
      'Equipment photo uploaded. Save profile to sync badge review.',
    );
  };

  const saveProfile = async (): Promise<void> => {
    if (!session || !profileDraft) {
      return;
    }

    const nextErrors = profileService.validateDraft(profileDraft);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback({
        tone: 'error',
        text: 'Please fix the highlighted fields and try again.',
      });
      return;
    }

    setSavingProfile(true);
    setFeedback({tone: 'info', text: 'Saving profile...'});
    setProfileActionError(null);

    try {
      const result = await profileService.saveProfile(session, profileDraft);
      setProfileDraft(toDraft(result.profile));
      setProfileSource(result.source);
      setFeedback({
        tone: result.syncPending ? 'error' : 'info',
        text: result.message,
      });
    } catch (error) {
      const classified = classifyUnknownError(error, {
        source: 'settings_save_profile',
        fallbackMessage: 'Unable to save courier profile.',
      });
      void analytics.recordError(error, formatErrorContext('settings_save_profile', classified));
      setProfileActionError(classified);
      setFeedback({
        tone: 'error',
        text: classified.userMessage,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const requestLocationPermission = (): void => {
    void (async () => {
      try {
        const granted = await requestPermission();
        if (granted) {
          setLocationActionError(null);
          setFeedback({tone: 'info', text: 'Location permission granted.'});
          return;
        }
        const denied = classifyUnknownError(new Error('Location permission denied.'), {
          source: 'settings_request_permission',
          fallbackMessage: 'Location permission denied.',
        });
        setLocationActionError(denied);
        setFeedback({tone: 'error', text: denied.userMessage});
      } catch (error) {
        const classified = classifyUnknownError(error, {
          source: 'settings_request_permission',
          fallbackMessage: 'Unable to request location permission.',
        });
        setLocationActionError(classified);
        setFeedback({tone: 'error', text: classified.userMessage});
        void analytics.recordError(error, formatErrorContext('settings_request_permission', classified));
      }
    })();
  };

  const startLocationTracking = (): void => {
    void (async () => {
      try {
        await startTracking();
        setLocationActionError(null);
        setFeedback({tone: 'info', text: 'Tracking started.'});
        void analytics.track('tracking_started', {
          from_screen: 'settings',
        });
      } catch (error) {
        const classified = classifyUnknownError(error, {
          source: 'settings_tracking_start',
          fallbackMessage: 'Unable to start tracking.',
        });
        setLocationActionError(classified);
        setFeedback({tone: 'error', text: classified.userMessage});
        void analytics.track('tracking_error', {
          from_screen: 'settings',
          action: 'start',
        });
        void analytics.recordError(error, formatErrorContext('settings_tracking_start', classified));
      }
    })();
  };

  const stopLocationTracking = (): void => {
    stopTracking();
    setLocationActionError(null);
    setFeedback({tone: 'info', text: 'Tracking stopped.'});
    void analytics.track('tracking_stopped', {
      from_screen: 'settings',
    });
  };

  const sendTelemetryTest = (): void => {
    void analytics.track('tracking_error', {
      manual_test: true,
      env: runtimeConfig.envName,
    });
    void analytics.recordError(new Error('senderr_manual_nonfatal_test'), 'settings_manual_test');
    setFeedback({
      tone: 'info',
      text: 'Telemetry test event sent.',
    });
  };

  const retryProfileAction = (): void => {
    if (!profileActionError) {
      return;
    }
    if (profileActionError.source === 'settings_save_profile') {
      void saveProfile();
      return;
    }
    retryProfileLoad();
  };

  const retryLocationAction = (): void => {
    if (!locationActionError) {
      return;
    }
    if (locationActionError.source === 'settings_request_permission') {
      requestLocationPermission();
      return;
    }
    startLocationTracking();
  };

  const profileActionResolution = profileActionError ? getErrorResolution(profileActionError) : null;
  const locationActionResolution = locationActionError ? getErrorResolution(locationActionError) : null;
  const tabs = useMemo(
    () =>
      [
        {id: 'operations' as const, label: 'Operations', caption: 'Work controls'},
        {id: 'profile' as const, label: 'Profile', caption: 'Identity'},
        {id: 'rates' as const, label: 'Rates', caption: 'Earnings'},
        {id: 'equipment' as const, label: 'Equipment', caption: 'Badges'},
        {id: 'compliance' as const, label: 'Compliance', caption: 'Docs'},
        {id: 'payouts' as const, label: 'Payouts', caption: 'Stripe + external'},
        {id: 'account' as const, label: 'Account', caption: 'Session'},
        ...(showFlagsDebug ? [{id: 'debug' as const, label: 'Debug', caption: 'Flags + telemetry'}] : []),
      ] satisfies ReadonlyArray<{id: SettingsTabId; label: string; caption: string}>,
    [showFlagsDebug],
  );

  useEffect(() => {
    if (tabs.some(tab => tab.id === activeTab)) {
      return;
    }
    setActiveTab('operations');
  }, [activeTab, tabs]);

  useEffect(() => {
    if (activeTab !== 'payouts' && showPayoutModeOptions) {
      setShowPayoutModeOptions(false);
    }
  }, [activeTab, showPayoutModeOptions]);

  const showProfileLoadingState = loadingProfile && !profileDraft;
  const showProfileLoadErrorState = !loadingProfile && Boolean(profileLoadError) && !profileDraft;
  const showProfileEmptyState = !loadingProfile && !profileLoadError && !profileDraft;

  const dispatchChecks = useMemo(() => {
    const checks = [
      {
        label: 'Online',
        ok: Boolean(profileDraft && profileDraft.isOnline),
        blocking: true,
      },
      {
        label: 'Accepting jobs',
        ok: Boolean(profileDraft && profileDraft.settings.acceptsNewJobs),
        blocking: true,
      },
      {
        label: 'Location permission',
        ok: locationState.hasPermission,
        blocking: true,
      },
      {
        label: 'Work mode enabled',
        ok: Boolean(profileDraft && (profileDraft.workModes.foodEnabled || profileDraft.workModes.packagesEnabled)),
        blocking: true,
      },
      {
        label: 'Tracking active',
        ok: locationState.tracking || Boolean(profileDraft && !profileDraft.settings.autoStartTracking),
        blocking: false,
      },
    ];
    return checks;
  }, [locationState.hasPermission, locationState.tracking, profileDraft]);

  const dispatchReady = dispatchChecks.every(check => !check.blocking || check.ok);

  const renderProfileRecovery = (): React.JSX.Element | null => {
    if (!profileActionResolution && !(profileLoadError && profileDraft)) {
      return null;
    }

    return (
      <View style={styles.recoveryCard}>
        {profileLoadError && profileDraft ? (
          <ErrorState
            compact
            title="Profile may be stale"
            message={profileLoadError}
            retryLabel="Retry load"
            onRetry={retryProfileLoad}
          />
        ) : null}

        {profileActionResolution?.action === 'retry' ? (
          <PrimaryButton
            label={profileActionError?.source === 'settings_save_profile' ? 'Retry Save' : 'Retry Load'}
            variant="secondary"
            onPress={retryProfileAction}
          />
        ) : null}
        {profileActionResolution?.action === 'refresh' ? (
          <PrimaryButton label="Retry Load" variant="secondary" onPress={retryProfileLoad} />
        ) : null}
        {profileActionResolution?.action === 'open_settings' ? (
          <PrimaryButton
            label="Open Settings"
            variant="secondary"
            onPress={() => {
              void Linking.openSettings();
            }}
          />
        ) : null}
        {profileActionResolution?.escalationMessage ? (
          <Text style={styles.text}>{profileActionResolution.escalationMessage}</Text>
        ) : null}
      </View>
    );
  };

  const renderProfileUnavailableState = (): React.JSX.Element | null => {
    if (showProfileLoadingState) {
      return (
        <LoadingState
          title="Loading profile"
          message="Fetching your latest profile settings..."
        />
      );
    }
    if (showProfileLoadErrorState) {
      return (
        <ErrorState
          title="Unable to load profile"
          message={profileLoadError ?? 'Unable to load courier profile.'}
          retryLabel="Retry"
          onRetry={retryProfileLoad}
        />
      );
    }
    if (showProfileEmptyState) {
      return (
        <EmptyState
          title="No profile data"
          message="We couldn't find your courier profile yet."
          actionLabel="Reload"
          onAction={retryProfileLoad}
        />
      );
    }
    return null;
  };

  const renderTabContent = (): React.JSX.Element => {
    if (activeTab === 'account') {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.text}>Signed in as {session?.email ?? 'unknown'}</Text>
          <Text style={styles.text}>Provider: {session?.provider ?? 'none'}</Text>
          <Text style={styles.text}>Session UID: {session?.uid ?? 'none'}</Text>
          <Text style={styles.text}>Firebase project: {runtimeConfig.firebase.projectId || 'unset'}</Text>
          {profileDraft ? (
            <>
              <Text style={styles.subsectionLabel}>Profile Summary</Text>
              <Text style={styles.text}>Status: {profileDraft.status.replace(/_/g, ' ')}</Text>
              <Text style={styles.text}>Today jobs: {profileDraft.stats.todayJobs}</Text>
              <Text style={styles.text}>Completed jobs: {profileDraft.stats.completedJobs}</Text>
            </>
          ) : null}
          <PrimaryButton
            label="Sign out"
            variant="danger"
            onPress={() => {
              void signOutUser();
            }}
          />
        </View>
      );
    }

    if (activeTab === 'payouts') {
      if (!profileDraft) {
        return (
          <EmptyState
            title="No profile data"
            message="Courier profile is not available."
            actionLabel="Reload"
            onAction={retryProfileLoad}
          />
        );
      }

      return (
        <View style={styles.card}>
          <Text style={styles.title}>Payouts</Text>
          <Text style={styles.sectionLabel}>Payout Method</Text>
          <Pressable
            testID="payout-mode-trigger"
            style={styles.dropdownTrigger}
            onPress={() => setShowPayoutModeOptions(previous => !previous)}>
            <Text style={styles.dropdownTriggerText}>
              {PAYOUT_MODE_OPTIONS.find(option => option.value === profileDraft.payoutMode)?.label ??
                'Select payout method'}
            </Text>
          </Pressable>
          {showPayoutModeOptions ? (
            <View style={styles.dropdownMenu}>
              {PAYOUT_MODE_OPTIONS.map(option => {
                const active = option.value === profileDraft.payoutMode;
                return (
                  <Pressable
                    key={option.value}
                    testID={`payout-mode-option-${option.value}`}
                    style={[styles.dropdownItem, active ? styles.dropdownItemActive : null]}
                    onPress={() => updatePayoutMode(option.value)}>
                    <Text style={[styles.dropdownItemLabel, active ? styles.dropdownItemLabelActive : null]}>
                      {option.label}
                    </Text>
                    <Text style={styles.dropdownItemCaption}>{option.caption}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {profileDraft.payoutMode === 'stripe_connect' ? (
            <View style={styles.payoutCard}>
              <Text style={styles.payoutCardTitle}>Stripe Connect</Text>
              <Text style={styles.payoutCardCaption}>
                Automatic transfer flow. Keep these fields synced with your Stripe account.
              </Text>

              <Text style={styles.sectionLabel}>Connect Account ID</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.stripe.connectAccountId}
                onChangeText={value => updateStripeField('connectAccountId', value)}
                placeholder="acct_..."
                autoCapitalize="none"
              />

              <Text style={styles.sectionLabel}>Account Status</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.stripe.accountStatus}
                onChangeText={value => updateStripeField('accountStatus', value)}
                placeholder="pending / active / restricted"
                autoCapitalize="none"
              />

              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.sectionLabel}>Charges Enabled</Text>
                </View>
                <Switch
                  value={profileDraft.stripe.chargesEnabled}
                  onValueChange={value => updateStripeToggle('chargesEnabled', value)}
                />
              </View>
              <View style={styles.switchRow}>
                <View style={styles.switchTextWrap}>
                  <Text style={styles.sectionLabel}>Payouts Enabled</Text>
                </View>
                <Switch
                  value={profileDraft.stripe.payoutsEnabled}
                  onValueChange={value => updateStripeToggle('payoutsEnabled', value)}
                />
              </View>

              <Text style={styles.sectionLabel}>Requirements Due</Text>
              <TextInput
                style={styles.input}
                value={asStringListInput(profileDraft.stripe.requirementsDue)}
                onChangeText={value => updateStripeRequirements('requirementsDue', value)}
                placeholder="individual.verification.document, external_account"
                autoCapitalize="none"
              />

              <Text style={styles.sectionLabel}>Requirements Past Due</Text>
              <TextInput
                style={styles.input}
                value={asStringListInput(profileDraft.stripe.requirementsPastDue)}
                onChangeText={value => updateStripeRequirements('requirementsPastDue', value)}
                placeholder="individual.verification.additional_document"
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {profileDraft.payoutMode === 'external_provider' ? (
            <View style={styles.payoutCard}>
              <Text style={styles.payoutCardTitle}>External Provider</Text>
              <Text style={styles.payoutCardCaption}>
                Platform tracks payout status, but settlement is handled through your provider.
              </Text>
              <Text style={styles.sectionLabel}>Provider</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.externalPayoutProvider}
                onChangeText={value => updateExternalPayoutField('externalPayoutProvider', value)}
                placeholder="PayPal / Cash App / Zelle / Bank Transfer"
              />
              <Text style={styles.sectionLabel}>Payout Handle / Account</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.externalPayoutHandle}
                onChangeText={value => updateExternalPayoutField('externalPayoutHandle', value)}
                placeholder="your-handle / account id"
                autoCapitalize="none"
              />
            </View>
          ) : null}

          {profileDraft.payoutMode === 'manual_settlement' ? (
            <View style={styles.payoutCard}>
              <Text style={styles.payoutCardTitle}>Manual Settlement</Text>
              <Text style={styles.payoutCardCaption}>
                Use this when payouts are settled outside integrated payment providers.
              </Text>
              <Text style={styles.sectionLabel}>Settlement Channel</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.externalPayoutProvider}
                onChangeText={value => updateExternalPayoutField('externalPayoutProvider', value)}
                placeholder="Bank transfer / Cash / Internal ledger"
              />
              <Text style={styles.sectionLabel}>Reference</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.externalPayoutHandle}
                onChangeText={value => updateExternalPayoutField('externalPayoutHandle', value)}
                placeholder="Account notes / settlement reference"
                autoCapitalize="none"
              />
            </View>
          ) : null}

          <PrimaryButton
            label={savingProfile ? 'Saving...' : 'Save profile'}
            disabled={!canSaveProfile}
            onPress={() => {
              void saveProfile();
            }}
          />
        </View>
      );
    }

    if (activeTab === 'debug') {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Debug Tools</Text>
          <Text style={styles.text}>Environment: {runtimeConfig.envName}</Text>
          <Text style={styles.text}>Flags source: {flagsState.source}</Text>
          <Text style={styles.text}>Flags loading: {flagsState.loading ? 'yes' : 'no'}</Text>
          <Text style={styles.text}>Flags updated: {flagsState.updatedAt ?? 'never'}</Text>
          {flagsState.error ? <Text style={styles.error}>{flagsState.error}</Text> : null}
          <Text style={styles.text}>trackingUpload: {flagsState.flags.trackingUpload ? 'on' : 'off'}</Text>
          <Text style={styles.text}>notifications: {flagsState.flags.notifications ? 'on' : 'off'}</Text>
          <Text style={styles.text}>mapRouting: {flagsState.flags.mapRouting ? 'on' : 'off'}</Text>
          <Text style={styles.text}>jobStatusActions: {flagsState.flags.jobStatusActions ? 'on' : 'off'}</Text>
          <PrimaryButton
            label="Refresh flags"
            variant="secondary"
            onPress={() => {
              void refreshFlags();
            }}
          />
          <PrimaryButton
            label="Send telemetry test event"
            variant="secondary"
            onPress={sendTelemetryTest}
          />
        </View>
      );
    }

    const unavailable = renderProfileUnavailableState();
    if (unavailable) {
      return unavailable;
    }

    if (!profileDraft) {
      return (
        <EmptyState
          title="No profile data"
          message="Courier profile is not available."
          actionLabel="Reload"
          onAction={retryProfileLoad}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Courier Profile</Text>
          <Text style={styles.text}>Linked systems</Text>
          <View style={styles.linkedSystemsRow}>
            <Pressable style={styles.linkedSystemChip} onPress={() => setActiveTab('rates')}>
              <Text style={styles.linkedSystemLabel}>Rate Cards</Text>
            </Pressable>
            <Pressable style={styles.linkedSystemChip} onPress={() => setActiveTab('equipment')}>
              <Text style={styles.linkedSystemLabel}>Equipment</Text>
            </Pressable>
            <Pressable style={styles.linkedSystemChip} onPress={() => setActiveTab('compliance')}>
              <Text style={styles.linkedSystemLabel}>Docs</Text>
            </Pressable>
            <Pressable style={styles.linkedSystemChip} onPress={() => setActiveTab('payouts')}>
              <Text style={styles.linkedSystemLabel}>Payouts</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Profile status</Text>
          <View style={styles.row}>
            {(['pending', 'pending_review', 'approved', 'rejected', 'suspended'] as const).map(status => {
              const active = profileDraft.status === status;
              return (
                <Pressable
                  key={status}
                  style={[styles.pill, active ? styles.pillActive : null]}
                  onPress={() => updateProfileMetaField('status', status)}>
                  <Text style={[styles.pillLabel, active ? styles.pillLabelActive : null]}>
                    {status.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {profileDraft.status === 'rejected' ? (
            <>
              <Text style={styles.sectionLabel}>Rejection reason</Text>
              <TextInput
                style={styles.input}
                value={profileDraft.rejectionReason}
                onChangeText={value => updateProfileMetaField('rejectionReason', value)}
                placeholder="Reason courier needs to resolve"
              />
            </>
          ) : null}

          <Text style={styles.sectionLabel}>Profile photo URL</Text>
          <TextInput
            style={styles.input}
            value={profileDraft.profilePhotoUrl}
            onChangeText={value => updateProfileMetaField('profilePhotoUrl', value)}
            placeholder="https://..."
            autoCapitalize="none"
          />
          <PrimaryButton
            label={uploadingKey === 'profile-photo' ? 'Uploading photo...' : 'Upload profile photo'}
            variant="secondary"
            disabled={Boolean(uploadingKey)}
            onPress={uploadProfilePhoto}
          />

          <Text style={styles.sectionLabel}>Name</Text>
          <TextInput
            style={[styles.input, validationErrors.fullName ? styles.inputError : null]}
            value={profileDraft.fullName}
            onChangeText={value => updateTextField('fullName', value)}
            placeholder="Courier name"
            autoCapitalize="words"
          />
          {validationErrors.fullName ? <Text style={styles.error}>{validationErrors.fullName}</Text> : null}

          <Text style={styles.sectionLabel}>Phone</Text>
          <TextInput
            style={[styles.input, validationErrors.phoneNumber ? styles.inputError : null]}
            value={profileDraft.phoneNumber}
            onChangeText={value => updateTextField('phoneNumber', value)}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          {validationErrors.phoneNumber ? <Text style={styles.error}>{validationErrors.phoneNumber}</Text> : null}

          <Text style={styles.sectionLabel}>Vehicle</Text>
          <TextInput
            style={[styles.input, validationErrors.vehicleMakeModel ? styles.inputError : null]}
            value={profileDraft.vehicle.makeModel}
            onChangeText={value => updateVehicleField('makeModel', value)}
            placeholder="Make / model"
          />
          {validationErrors.vehicleMakeModel ? <Text style={styles.error}>{validationErrors.vehicleMakeModel}</Text> : null}
          <TextInput
            style={[styles.input, validationErrors.vehiclePlateNumber ? styles.inputError : null]}
            value={profileDraft.vehicle.plateNumber}
            onChangeText={value => updateVehicleField('plateNumber', value)}
            placeholder="Plate number"
            autoCapitalize="characters"
          />
          {validationErrors.vehiclePlateNumber ? (
            <Text style={styles.error}>{validationErrors.vehiclePlateNumber}</Text>
          ) : null}
          <TextInput
            style={[styles.input, validationErrors.vehicleColor ? styles.inputError : null]}
            value={profileDraft.vehicle.color}
            onChangeText={value => updateVehicleField('color', value)}
            placeholder="Vehicle color"
          />
          {validationErrors.vehicleColor ? <Text style={styles.error}>{validationErrors.vehicleColor}</Text> : null}

          <Text style={styles.subsectionLabel}>Courier stats</Text>
          <Text style={styles.text}>Today jobs: {profileDraft.stats.todayJobs}</Text>
          <Text style={styles.text}>Completed jobs: {profileDraft.stats.completedJobs}</Text>

          <PrimaryButton
            label={savingProfile ? 'Saving...' : 'Save profile'}
            disabled={!canSaveProfile}
            onPress={() => {
              void saveProfile();
            }}
          />
          <Text style={styles.text}>Profile source: {profileSource}</Text>
        </View>
      );
    }

    if (activeTab === 'rates') {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Rate Cards</Text>
          <Text style={styles.subsectionLabel}>Package Rate Card</Text>
          <Text style={styles.text}>Rates used for package-delivery jobs.</Text>

          <Text style={styles.inputLabel}>Base fare</Text>
          <Text style={styles.metaText}>Flat start fee charged per job.</Text>
          <TextInput
            testID="rates-packages-baseFare"
            accessibilityLabel="Package base fare"
            style={[styles.input, validationErrors.packagesBaseFare ? styles.inputError : null]}
            value={profileDraft.rateCards.packages.baseFare}
            onChangeText={value => updatePackagesRateField('baseFare', value)}
            placeholder="Base fare (e.g. 3.00)"
            keyboardType="decimal-pad"
          />
          {validationErrors.packagesBaseFare ? (
            <Text style={styles.error}>{validationErrors.packagesBaseFare}</Text>
          ) : null}

          <Text style={styles.inputLabel}>Per-mile rate</Text>
          <Text style={styles.metaText}>Charged per mile between pickup and dropoff.</Text>
          <TextInput
            testID="rates-packages-perMile"
            accessibilityLabel="Package per-mile rate"
            style={[styles.input, validationErrors.packagesPerMile ? styles.inputError : null]}
            value={profileDraft.rateCards.packages.perMile}
            onChangeText={value => updatePackagesRateField('perMile', value)}
            placeholder="Per-mile rate (e.g. 1.20)"
            keyboardType="decimal-pad"
          />
          {validationErrors.packagesPerMile ? (
            <Text style={styles.error}>{validationErrors.packagesPerMile}</Text>
          ) : null}

          <Text style={styles.inputLabel}>Per-minute rate</Text>
          <Text style={styles.metaText}>Charged per minute during active delivery.</Text>
          <TextInput
            testID="rates-packages-perMinute"
            accessibilityLabel="Package per-minute rate"
            style={[styles.input, validationErrors.packagesPerMinute ? styles.inputError : null]}
            value={profileDraft.rateCards.packages.perMinute}
            onChangeText={value => updatePackagesRateField('perMinute', value)}
            placeholder="Per-minute rate (e.g. 0.25)"
            keyboardType="decimal-pad"
          />
          {validationErrors.packagesPerMinute ? (
            <Text style={styles.error}>{validationErrors.packagesPerMinute}</Text>
          ) : null}

          <Text style={styles.inputLabel}>Add-on fees (packages)</Text>
          <Text style={styles.metaText}>Add or remove per-package fees. Use the + button to add more than one.</Text>

          {packageOptionalFeesRows.map((row, idx) => (
            <View key={`optional-fee-${idx}`} style={styles.feeRow}>
              <TextInput
                testID={`rates-packages-optionalFee-row-${idx}-name`}
                accessibilityLabel={`Optional fee ${idx + 1} name`}
                style={[styles.input, styles.feeNameInput]}
                value={row.name}
                onChangeText={value => updateOptionalFeeRow(idx, 'name', value)}
                placeholder="insurance"
                autoCapitalize="none"
              />
              <TextInput
                testID={`rates-packages-optionalFee-row-${idx}-amount`}
                accessibilityLabel={`Optional fee ${idx + 1} amount`}
                style={[styles.input, styles.feeAmountInput]}
                value={row.amount}
                onChangeText={value => updateOptionalFeeRow(idx, 'amount', value)}
                placeholder="1.00"
                keyboardType="decimal-pad"
              />
              <Pressable
                testID={`rates-packages-removeOptionalFee-${idx}`}
                accessibilityLabel={`Remove optional fee ${idx + 1}`}
                style={styles.removeFeeButton}
                onPress={() => removeOptionalFeeRow(idx)}>
                <Text style={styles.removeFeeButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}

          <Pressable
            testID="rates-packages-addOptionalFee"
            accessibilityLabel="Add optional fee"
            style={styles.addFeeButton}
            onPress={addOptionalFeeRow}>
            <Text style={styles.addFeeButtonText}>＋ Add fee</Text>
          </Pressable>

          <Text style={styles.metaText}>Existing saved fees: {asStringListInput(profileDraft.rateCards.packages.optionalFees)}</Text>
          

          <Text style={styles.subsectionLabel}>Food Rate Card</Text>
          <Text style={styles.text}>Rates used for restaurant/food-delivery jobs.</Text>
          <Text style={styles.inputLabel}>Base fare</Text>
          <TextInput
            testID="rates-food-baseFare"
            accessibilityLabel="Food base fare"
            style={[styles.input, validationErrors.foodBaseFare ? styles.inputError : null]}
            value={profileDraft.rateCards.food.baseFare}
            onChangeText={value => updateFoodRateField('baseFare', value)}
            placeholder="Base fare (e.g. 2.50)"
            keyboardType="decimal-pad"
          />
          {validationErrors.foodBaseFare ? <Text style={styles.error}>{validationErrors.foodBaseFare}</Text> : null}
          <Text style={styles.inputLabel}>Per-mile rate</Text>
          <TextInput
            testID="rates-food-perMile"
            accessibilityLabel="Food per-mile rate"
            style={[styles.input, validationErrors.foodPerMile ? styles.inputError : null]}
            value={profileDraft.rateCards.food.perMile}
            onChangeText={value => updateFoodRateField('perMile', value)}
            placeholder="Per-mile rate (e.g. 1.50)"
            keyboardType="decimal-pad"
          />
          {validationErrors.foodPerMile ? <Text style={styles.error}>{validationErrors.foodPerMile}</Text> : null}
          <Text style={styles.inputLabel}>Restaurant wait pay</Text>
          <TextInput
            testID="rates-food-restaurantWaitPay"
            accessibilityLabel="Restaurant wait pay"
            style={[styles.input, validationErrors.foodRestaurantWaitPay ? styles.inputError : null]}
            value={profileDraft.rateCards.food.restaurantWaitPay}
            onChangeText={value => updateFoodRateField('restaurantWaitPay', value)}
            placeholder="Restaurant wait pay (e.g. 0.15)"
            keyboardType="decimal-pad"
          />
          {validationErrors.foodRestaurantWaitPay ? (
            <Text style={styles.error}>{validationErrors.foodRestaurantWaitPay}</Text>
          ) : null} 

          <PrimaryButton
            label={savingProfile ? 'Saving...' : 'Save profile'}
            disabled={!canSaveProfile}
            onPress={() => {
              void saveProfile();
            }}
          />
          <Text style={styles.text}>Profile source: {profileSource}</Text>
        </View>
      );
    }

    if (activeTab === 'equipment') {
      const badges = deriveCourierBadges(
        profileDraft
          ? {
              canDeliverHot: profileDraft.equipment.hot_bag.approved || profileDraft.equipment.insulated_bag.approved,
              canDeliverCold: profileDraft.equipment.cooler.approved || profileDraft.equipment.insulated_bag.approved,
              canDeliverFrozen: profileDraft.equipment.cooler.approved,
              canDeliverDrinks: profileDraft.equipment.drink_carrier.approved,
              canDeliverHeavy: profileDraft.equipment.dolly.approved && profileDraft.equipment.straps.approved,
              canDeliverFurniture:
                profileDraft.equipment.dolly.approved &&
                profileDraft.equipment.straps.approved &&
                profileDraft.equipment.furniture_blankets.approved,
            }
          : {
              canDeliverHot: false,
              canDeliverCold: false,
              canDeliverFrozen: false,
              canDeliverDrinks: false,
              canDeliverHeavy: false,
              canDeliverFurniture: false,
            },
      );

      return (
        <View style={styles.card}>
          <Text style={styles.title}>Equipment + Badges</Text>
          <Text style={styles.text}>Approved equipment unlocks courier badges and job capabilities.</Text>

          {COURIER_EQUIPMENT_TYPES.map(type => {
            const item = profileDraft.equipment[type];
            return (
              <View key={type} style={styles.equipmentCard}>
                <Text style={styles.sectionLabel}>{COURIER_EQUIPMENT_LABELS[type]}</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.text}>Uploaded</Text>
                  <Switch value={item.has} onValueChange={value => updateEquipmentField(type, 'has', value)} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.text}>Approved</Text>
                  <Switch
                    value={item.approved}
                    onValueChange={value => updateEquipmentField(type, 'approved', value)}
                    disabled={!item.has}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={item.photoUrl ?? ''}
                  onChangeText={value => updateEquipmentField(type, 'photoUrl', value)}
                  placeholder="Photo URL (optional)"
                  autoCapitalize="none"
                />
                <PrimaryButton
                  label={
                    uploadingKey === `equipment-${type}` ? 'Uploading photo...' : 'Upload equipment photo'
                  }
                  variant="secondary"
                  disabled={Boolean(uploadingKey)}
                  onPress={() => uploadEquipmentPhoto(type)}
                />
                <Text style={styles.metaText}>
                  State: {!item.has ? 'not_uploaded' : item.approved ? 'approved' : 'pending_review'}
                </Text>
              </View>
            );
          })}

          <Text style={styles.subsectionLabel}>Badges</Text>
          <View style={styles.readinessGrid}>
            {badges.map(badge => (
              <View
                key={badge.id}
                style={[
                  styles.readinessChip,
                  badge.earned ? styles.readinessChipOk : styles.readinessChipWarn,
                ]}>
                <Text style={badge.earned ? styles.readinessTextOk : styles.readinessTextWarn}>
                  {badge.earned ? 'Earned' : 'Locked'}
                </Text>
                <Text style={styles.readinessLabel}>{badge.label}</Text>
                <Text style={styles.metaText}>{badge.reason}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            label={savingProfile ? 'Saving...' : 'Save profile'}
            disabled={!canSaveProfile}
            onPress={() => {
              void saveProfile();
            }}
          />
        </View>
      );
    }

    if (activeTab === 'compliance') {
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Compliance Documents</Text>
          <Text style={styles.text}>Update document links and review states for courier approval workflows.</Text>

          {COURIER_DOCUMENT_ORDER.map(type => {
            const item = profileDraft.documents.find(document => document.type === type);
            if (!item) {
              return null;
            }
            return (
              <View key={type} style={styles.equipmentCard}>
                <Text style={styles.sectionLabel}>{item.label}</Text>
                <TextInput
                  style={styles.input}
                  value={item.url ?? ''}
                  onChangeText={value => updateDocumentUrl(type, value)}
                  placeholder="Document URL"
                  autoCapitalize="none"
                />
                <PrimaryButton
                  label={
                    uploadingKey === `document-${type}` ? 'Uploading doc...' : 'Upload document photo'
                  }
                  variant="secondary"
                  disabled={Boolean(uploadingKey)}
                  onPress={() => uploadDocumentPhoto(type)}
                />
                <View style={styles.row}>
                  <PrimaryButton
                    label="Not uploaded"
                    variant="secondary"
                    onPress={() => updateDocumentStatus(type, 'not_uploaded')}
                  />
                  <PrimaryButton
                    label="Pending review"
                    variant="secondary"
                    onPress={() => updateDocumentStatus(type, 'pending_review')}
                  />
                  <PrimaryButton
                    label="Approved"
                    variant="secondary"
                    onPress={() => updateDocumentStatus(type, 'approved')}
                  />
                  <PrimaryButton
                    label="Rejected"
                    variant="secondary"
                    onPress={() => updateDocumentStatus(type, 'rejected')}
                  />
                </View>
                <Text style={styles.metaText}>Status: {item.status.replace(/_/g, ' ')}</Text>
              </View>
            );
          })}

          <PrimaryButton
            label={savingProfile ? 'Saving...' : 'Save profile'}
            disabled={!canSaveProfile}
            onPress={() => {
              void saveProfile();
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.title}>Operations</Text>
        <View style={styles.statusBanner}>
          <Text style={styles.statusBannerTitle}>{dispatchReady ? 'Dispatch Ready' : 'Needs Attention'}</Text>
          <Text style={styles.statusBannerText}>
            {dispatchReady
              ? 'You are fully configured to receive and run jobs.'
              : 'Finish the missing checks below to avoid blocked job actions.'}
          </Text>
        </View>

        <View style={styles.readinessGrid}>
          {dispatchChecks.map(check => (
            <View
              key={check.label}
              style={[styles.readinessChip, check.ok ? styles.readinessChipOk : styles.readinessChipWarn]}>
              <Text style={check.ok ? styles.readinessTextOk : styles.readinessTextWarn}>
                {check.ok ? 'OK' : check.blocking ? 'Fix' : 'Tip'}
              </Text>
              <Text style={styles.readinessLabel}>{check.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Availability</Text>
        <View style={styles.row}>
          {AVAILABILITY_OPTIONS.map(option => {
            const active = profileDraft.availability === option;
            return (
              <Pressable
                key={option}
                style={[styles.pill, active ? styles.pillActive : null]}
                onPress={() => updateAvailability(option)}>
                <Text style={[styles.pillLabel, active ? styles.pillLabelActive : null]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        {validationErrors.availability ? <Text style={styles.error}>{validationErrors.availability}</Text> : null}

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Courier online</Text>
            <Text style={styles.text}>Primary senderrplace online state used for job visibility.</Text>
          </View>
          <Switch value={profileDraft.isOnline} onValueChange={updateOnlineState} />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Accept new jobs</Text>
            <Text style={styles.text}>Control dispatch eligibility.</Text>
          </View>
          <Switch
            value={profileDraft.settings.acceptsNewJobs}
            onValueChange={value => updateSettingsField('acceptsNewJobs', value)}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Auto-start tracking</Text>
            <Text style={styles.text}>Start location updates automatically after sign in.</Text>
          </View>
          <Switch
            value={profileDraft.settings.autoStartTracking}
            onValueChange={value => updateSettingsField('autoStartTracking', value)}
          />
        </View>

        <Text style={styles.sectionLabel}>Service radius (miles)</Text>
        <TextInput
          style={[styles.input, validationErrors.serviceRadiusMiles ? styles.inputError : null]}
          value={profileDraft.serviceRadiusMiles}
          onChangeText={value => updateProfileMetaField('serviceRadiusMiles', value)}
          placeholder="15"
          keyboardType="decimal-pad"
        />
        {validationErrors.serviceRadiusMiles ? (
          <Text style={styles.error}>{validationErrors.serviceRadiusMiles}</Text>
        ) : null}

        <Text style={styles.sectionLabel}>Tax state</Text>
        <TextInput
          style={[styles.input, validationErrors.taxState ? styles.inputError : null]}
          value={profileDraft.taxState}
          onChangeText={value => updateProfileMetaField('taxState', value)}
          placeholder="VA"
          autoCapitalize="characters"
          maxLength={2}
        />
        {validationErrors.taxState ? <Text style={styles.error}>{validationErrors.taxState}</Text> : null}

        <Text style={styles.subsectionLabel}>Work Modes</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Packages enabled</Text>
          </View>
          <Switch
            value={profileDraft.workModes.packagesEnabled}
            onValueChange={value => updateWorkModeField('packagesEnabled', value)}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Food enabled</Text>
          </View>
          <Switch value={profileDraft.workModes.foodEnabled} onValueChange={value => updateWorkModeField('foodEnabled', value)} />
        </View>

        <Text style={styles.subsectionLabel}>Notification Preferences</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Job offers</Text>
          </View>
          <Switch
            value={profileDraft.notificationPrefs.jobOffers}
            onValueChange={value => updateNotificationField('jobOffers', value)}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Payout updates</Text>
          </View>
          <Switch
            value={profileDraft.notificationPrefs.payoutUpdates}
            onValueChange={value => updateNotificationField('payoutUpdates', value)}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.sectionLabel}>Reminders</Text>
          </View>
          <Switch
            value={profileDraft.notificationPrefs.reminders}
            onValueChange={value => updateNotificationField('reminders', value)}
          />
        </View>

        <Text style={styles.subsectionLabel}>Location status</Text>
        <Text style={styles.text}>Permission: {locationState.hasPermission ? 'Granted' : 'Not granted'}</Text>
        <Text style={styles.text}>Tracking: {locationState.tracking ? 'Active' : 'Inactive'}</Text>
        {locationState.lastLocation ? (
          <Text style={styles.text}>
            Last: {locationState.lastLocation.latitude.toFixed(5)}, {locationState.lastLocation.longitude.toFixed(5)}
          </Text>
        ) : null}
        {locationState.error ? <Text style={styles.error}>{locationState.error}</Text> : null}
        {locationActionError ? <Text style={styles.error}>{locationActionError.userMessage}</Text> : null}

        <View style={styles.row}>
          <PrimaryButton label="Request Permission" variant="secondary" onPress={requestLocationPermission} />
          <PrimaryButton label="Start" onPress={startLocationTracking} />
          <PrimaryButton label="Stop" variant="secondary" onPress={stopLocationTracking} />
          {locationActionResolution?.action === 'retry' ? (
            <PrimaryButton
              label={locationActionResolution.label ?? 'Retry'}
              variant="secondary"
              onPress={retryLocationAction}
            />
          ) : null}
          {locationActionResolution?.action === 'open_settings' ? (
            <PrimaryButton
              label="Open Settings"
              variant="secondary"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          ) : null}
        </View>
        {locationActionResolution?.escalationMessage ? (
          <Text style={styles.text}>{locationActionResolution.escalationMessage}</Text>
        ) : null}

        <PrimaryButton
          label={savingProfile ? 'Saving...' : 'Save profile'}
          disabled={!canSaveProfile}
          onPress={() => {
            void saveProfile();
          }}
        />
        <Text style={styles.text}>Profile source: {profileSource}</Text>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.shell, useSideTabs ? styles.shellDesktop : null]}>
        {useSideTabs ? (
          <View style={styles.sideTabRail}>
            {tabs.map(tab => {
              const active = tab.id === activeTab;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.sideTabButton, active ? styles.sideTabButtonActive : null]}
                  onPress={() => setActiveTab(tab.id)}>
                  <Text style={[styles.sideTabLabel, active ? styles.sideTabLabelActive : null]}>{tab.label}</Text>
                  <Text style={[styles.sideTabCaption, active ? styles.sideTabCaptionActive : null]}>
                    {tab.caption}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topTabScrollContent}>
            {tabs.map(tab => {
              const active = tab.id === activeTab;
              return (
                <Pressable
                  key={tab.id}
                  style={[styles.topTabButton, active ? styles.topTabButtonActive : null]}
                  onPress={() => setActiveTab(tab.id)}>
                  <Text style={[styles.topTabLabel, active ? styles.topTabLabelActive : null]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.contentColumn}>
          {renderTabContent()}
          {feedback ? <Text style={feedback.tone === 'error' ? styles.error : styles.info}>{feedback.text}</Text> : null}
          {activeTab !== 'account' && activeTab !== 'debug' ? renderProfileRecovery() : null}
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  shell: {
    gap: 12,
  },
  shellDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sideTabRail: {
    width: 220,
    backgroundColor: senderrTheme.colors.darkSurface,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  sideTabButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 2,
  },
  sideTabButtonActive: {
    borderColor: senderrTheme.colors.brandPrimary,
    backgroundColor: 'rgba(107, 78, 255, 0.22)',
  },
  sideTabLabel: {
    color: '#E7EBFF',
    fontWeight: '700',
  },
  sideTabLabelActive: {
    color: '#ffffff',
  },
  sideTabCaption: {
    color: '#B8C0DF',
    fontSize: 12,
  },
  sideTabCaptionActive: {
    color: '#D9DFFA',
  },
  topTabScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  topTabButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
    backgroundColor: senderrTheme.colors.surface,
  },
  topTabButtonActive: {
    borderColor: senderrTheme.colors.brandPrimary,
    backgroundColor: senderrTheme.colors.brandPrimary,
  },
  topTabLabel: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
  },
  topTabLabelActive: {
    color: '#ffffff',
  },
  contentColumn: {
    flex: 1,
    gap: 10,
  },
  card: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  recoveryCard: {
    backgroundColor: senderrTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
  },
  equipmentCard: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: senderrTheme.colors.textPrimary,
  },
  sectionLabel: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
  },
  subsectionLabel: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
    marginTop: 8,
  },
  text: {
    color: senderrTheme.colors.textSecondary,
  },
  metaText: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: senderrTheme.colors.danger,
    fontWeight: '600',
  },
  info: {
    color: senderrTheme.colors.info,
    fontWeight: '600',
  },
  statusBanner: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: senderrTheme.colors.brandSoft,
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    gap: 4,
  },
  statusBannerTitle: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  statusBannerText: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 13,
  },
  readinessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readinessChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 140,
    gap: 4,
  },
  readinessChipOk: {
    borderColor: '#34d399',
    backgroundColor: '#ecfdf5',
  },
  readinessChipWarn: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  readinessTextOk: {
    color: '#047857',
    fontWeight: '800',
    fontSize: 12,
  },
  readinessTextWarn: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 12,
  },
  readinessLabel: {
    color: senderrTheme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  linkedSystemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkedSystemChip: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    backgroundColor: senderrTheme.colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  linkedSystemLabel: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: senderrTheme.colors.textPrimary,
    backgroundColor: senderrTheme.colors.surfaceMuted,
    marginBottom: 10,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: senderrTheme.colors.surfaceMuted,
    marginBottom: 8,
  },
  dropdownTriggerText: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: senderrTheme.colors.surface,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: senderrTheme.colors.border,
    gap: 3,
  },
  dropdownItemActive: {
    backgroundColor: senderrTheme.colors.brandSoft,
  },
  dropdownItemLabel: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '700',
  },
  dropdownItemLabelActive: {
    color: senderrTheme.colors.brandPrimary,
  },
  dropdownItemCaption: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
  },
  payoutCard: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 12,
    backgroundColor: senderrTheme.colors.surfaceMuted,
    padding: 12,
    marginBottom: 8,
  },
  payoutCardTitle: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '800',
    marginBottom: 2,
  },
  payoutCardCaption: {
    color: senderrTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  inputLabel: {
    color: senderrTheme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '700',
  },
  inputError: {
    borderColor: senderrTheme.colors.danger,
  },
  /* optional-fees row editor */
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  feeNameInput: {
    flex: 1,
  },
  feeAmountInput: {
    width: 110,
  },
  addFeeButton: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    backgroundColor: senderrTheme.colors.surfaceMuted,
  },
  addFeeButtonText: {
    color: senderrTheme.colors.brandPrimary,
    fontWeight: '700',
  },
  removeFeeButton: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff0f0',
  },
  removeFeeButtonText: {
    color: senderrTheme.colors.danger,
    fontWeight: '700',
  },
  pill: {
    borderWidth: 1,
    borderColor: senderrTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: senderrTheme.colors.surface,
  },
  pillActive: {
    backgroundColor: senderrTheme.colors.brandPrimary,
    borderColor: senderrTheme.colors.brandPrimary,
  },
  pillLabel: {
    color: senderrTheme.colors.textPrimary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pillLabelActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
  },
});
