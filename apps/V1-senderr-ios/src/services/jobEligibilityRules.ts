import type {Job} from '../types/jobs';
import type {CourierCapabilities, CourierWorkModes} from '../types/profile';

export type CapabilityRequirementKey =
  | 'canDeliverHot'
  | 'canDeliverCold'
  | 'canDeliverFrozen'
  | 'canDeliverDrinks'
  | 'canDeliverHeavy'
  | 'canDeliverFurniture';

export type CapabilityRequirement = {
  key: CapabilityRequirementKey;
  label: string;
  hint: string;
};

export type CourierJobMode = 'food' | 'package' | 'unknown';

const REQUIREMENT_META: Record<CapabilityRequirementKey, {label: string; hint: string}> = {
  canDeliverHot: {label: 'Hot Delivery', hint: 'approved insulated bag or hot bag'},
  canDeliverCold: {label: 'Cold Delivery', hint: 'approved cooler or insulated bag'},
  canDeliverFrozen: {label: 'Frozen Delivery', hint: 'approved cooler'},
  canDeliverDrinks: {label: 'Drink Delivery', hint: 'approved drink carrier'},
  canDeliverHeavy: {label: 'Heavy Lift', hint: 'approved dolly and straps'},
  canDeliverFurniture: {
    label: 'Furniture Ready',
    hint: 'approved dolly, straps, and furniture blankets',
  },
};

const normalizedText = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const addRequirement = (
  set: Set<CapabilityRequirementKey>,
  key: CapabilityRequirementKey,
): void => {
  set.add(key);
};

const addRequirementsFromText = (
  set: Set<CapabilityRequirementKey>,
  value: string,
): void => {
  const text = normalizedText(value);
  if (!text) {
    return;
  }

  if (/\bhot\b/.test(text)) addRequirement(set, 'canDeliverHot');
  if (/\bcold\b|\bchilled\b/.test(text)) addRequirement(set, 'canDeliverCold');
  if (/\bfrozen\b/.test(text)) addRequirement(set, 'canDeliverFrozen');
  if (/\bdrink\b|\bbeverage\b/.test(text)) addRequirement(set, 'canDeliverDrinks');
  if (/\bheavy\b|\bbulky\b/.test(text)) addRequirement(set, 'canDeliverHeavy');
  if (/\bfurniture\b|\bcouch\b|\bsofa\b|\bmattress\b/.test(text)) addRequirement(set, 'canDeliverFurniture');
};

const addRequirementsFromEquipmentList = (
  set: Set<CapabilityRequirementKey>,
  value: unknown,
): void => {
  if (!Array.isArray(value)) {
    return;
  }
  const equipment = value.map(item => normalizedText(item));
  if (equipment.some(item => item.includes('hot_bag') || item.includes('insulated'))) {
    addRequirement(set, 'canDeliverHot');
  }
  if (equipment.some(item => item.includes('cooler') || item.includes('insulated'))) {
    addRequirement(set, 'canDeliverCold');
  }
  if (equipment.some(item => item.includes('cooler') || item.includes('frozen'))) {
    addRequirement(set, 'canDeliverFrozen');
  }
  if (equipment.some(item => item.includes('drink'))) {
    addRequirement(set, 'canDeliverDrinks');
  }
  if (equipment.some(item => item.includes('dolly') || item.includes('straps') || item.includes('heavy'))) {
    addRequirement(set, 'canDeliverHeavy');
  }
  if (equipment.some(item => item.includes('furniture') || item.includes('blanket'))) {
    addRequirement(set, 'canDeliverFurniture');
  }
};

export const buildCapabilityRequirementsForJob = (
  job: Job | null,
): CapabilityRequirement[] => {
  if (!job) {
    return [];
  }
  const set = new Set<CapabilityRequirementKey>();
  addRequirementsFromText(set, job.notes ?? '');
  return Array.from(set.values()).map(key => ({
    key,
    label: REQUIREMENT_META[key].label,
    hint: REQUIREMENT_META[key].hint,
  }));
};

export const buildCapabilityRequirementsForRawJob = (
  raw: Record<string, unknown>,
  job?: Job | null,
): CapabilityRequirement[] => {
  const set = new Set<CapabilityRequirementKey>();

  addRequirementsFromText(set, normalizedText(raw.notes));
  addRequirementsFromText(set, normalizedText(raw.specialInstructions));
  addRequirementsFromText(set, normalizedText(raw.description));
  addRequirementsFromEquipmentList(set, raw.requiredEquipment);
  addRequirementsFromEquipmentList(set, raw.specialRequirements);

  const foodDetails =
    raw.foodDeliveryDetails && typeof raw.foodDeliveryDetails === 'object'
      ? (raw.foodDeliveryDetails as Record<string, unknown>)
      : null;
  if (foodDetails) {
    const temperature = normalizedText(foodDetails.temperature);
    if (temperature === 'hot') addRequirement(set, 'canDeliverHot');
    if (temperature === 'cold') addRequirement(set, 'canDeliverCold');
    if (temperature === 'frozen') addRequirement(set, 'canDeliverFrozen');
    if (foodDetails.requiresCooler === true) {
      addRequirement(set, 'canDeliverCold');
      addRequirement(set, 'canDeliverFrozen');
    }
    if (foodDetails.requiresHotBag === true) addRequirement(set, 'canDeliverHot');
    if (foodDetails.requiresDrinkCarrier === true) addRequirement(set, 'canDeliverDrinks');
  }

  const itemDetails =
    raw.itemDetails && typeof raw.itemDetails === 'object'
      ? (raw.itemDetails as Record<string, unknown>)
      : null;
  if (itemDetails?.requiresHelp === true) {
    addRequirement(set, 'canDeliverHeavy');
  }

  if (job) {
    for (const requirement of buildCapabilityRequirementsForJob(job)) {
      addRequirement(set, requirement.key);
    }
  }

  return Array.from(set.values()).map(key => ({
    key,
    label: REQUIREMENT_META[key].label,
    hint: REQUIREMENT_META[key].hint,
  }));
};

export const missingCapabilityRequirements = (
  capabilities: CourierCapabilities,
  requirements: CapabilityRequirement[],
): CapabilityRequirement[] =>
  requirements.filter(requirement => !capabilities[requirement.key]);

export const resolveCourierJobMode = (
  raw: Record<string, unknown>,
): CourierJobMode => {
  const explicitType = normalizedText(raw.jobType ?? raw.type);
  if (explicitType === 'food') {
    return 'food';
  }
  if (explicitType === 'package' || explicitType === 'parcel') {
    return 'package';
  }

  if (raw.isFoodItem === true) {
    return 'food';
  }
  if (raw.foodDeliveryDetails && typeof raw.foodDeliveryDetails === 'object') {
    return 'food';
  }

  return 'unknown';
};

export const isCourierEligibleForJobMode = (
  mode: CourierJobMode,
  workModes: CourierWorkModes,
): boolean => {
  if (mode === 'food') {
    return workModes.foodEnabled;
  }
  if (mode === 'package') {
    return workModes.packagesEnabled;
  }
  return true;
};
