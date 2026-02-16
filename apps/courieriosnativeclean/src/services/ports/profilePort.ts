import type {AuthSession} from '../../types/auth';
import type {CourierProfile, CourierProfileDraft} from '../../types/profile';

export type CourierProfileValidationErrors = Partial<
  Record<
    | 'fullName'
    | 'phoneNumber'
    | 'availability'
    | 'vehicleMakeModel'
    | 'vehiclePlateNumber'
    | 'vehicleColor'
    | 'packagesBaseFare'
    | 'packagesPerMile'
    | 'packagesPerMinute'
    | 'foodBaseFare'
    | 'foodPerMile'
    | 'foodRestaurantWaitPay',
    string
  >
>;

export type CourierProfileLoadResult = {
  profile: CourierProfile;
  source: 'firebase' | 'local';
  message: string | null;
};

export type CourierProfileSaveResult = {
  profile: CourierProfile;
  source: 'firebase' | 'local';
  message: string;
  syncPending: boolean;
};

export interface ProfileServicePort {
  loadProfile: (session: AuthSession) => Promise<CourierProfileLoadResult>;
  saveProfile: (session: AuthSession, draft: CourierProfileDraft) => Promise<CourierProfileSaveResult>;
  validateDraft: (draft: CourierProfileDraft) => CourierProfileValidationErrors;
}
