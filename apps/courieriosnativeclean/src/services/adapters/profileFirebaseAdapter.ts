import {loadCourierProfile, saveCourierProfile, validateCourierProfileDraft} from '../profileService';
import type {ProfileServicePort} from '../ports/profilePort';

export const profileFirebaseAdapter: ProfileServicePort = {
  loadProfile: loadCourierProfile,
  saveProfile: saveCourierProfile,
  validateDraft: validateCourierProfileDraft,
};
