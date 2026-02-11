export type FeatureFlagKey =
  | 'trackingUpload'
  | 'notifications'
  | 'mapRouting'
  | 'jobStatusActions';

export type FeatureFlagDefinition = {
  key: FeatureFlagKey;
  owner: string;
  defaultValue: boolean;
  removalCriteria: string;
};

export type FeatureFlagsSnapshot = {
  flags: Record<FeatureFlagKey, boolean>;
  source: 'defaults' | 'remote';
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
};

export type UseFeatureFlags = () => {
  state: FeatureFlagsSnapshot;
  refresh: () => Promise<void>;
};

export interface FeatureFlagsServicePort {
  useFeatureFlags: UseFeatureFlags;
  isEnabled: (key: FeatureFlagKey) => boolean;
  getSnapshot: () => FeatureFlagsSnapshot;
  definitions: readonly FeatureFlagDefinition[];
}
