import type { FeatureFlags } from "../types/firestore";

type UnknownRecord = Record<string, unknown>;

import { DEFAULT_FEATURE_FLAGS } from "../types/firestore";

function asRecord(input: unknown): UnknownRecord {
  if (!input || typeof input !== "object") {
    return {};
  }
  return input as UnknownRecord;
}

function coerceBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizeSection<TSection extends object>(
  raw: unknown,
  defaults: TSection,
): TSection {
  const rawRecord = asRecord(raw);
  const next = {} as TSection;
  for (const key of Object.keys(defaults) as Array<keyof TSection>) {
    const fallback = defaults[key];
    if (typeof fallback === "boolean") {
      next[key] = coerceBool(
        rawRecord[key as string],
        fallback,
      ) as TSection[keyof TSection];
      continue;
    }
    next[key] = fallback;
  }
  return next;
}

interface NormalizeOptions {
  forceAdminWebEnabled?: boolean;
}

function readLegacyFlagValue(
  rawFlags: UnknownRecord,
  legacyPath: string,
): unknown {
  const parts = legacyPath.split(".");
  let cursor: unknown = rawFlags;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as UnknownRecord)[part];
  }
  return cursor;
}

export function normalizeFeatureFlags(
  rawFlags: unknown,
  options: NormalizeOptions = {},
): FeatureFlags {
  const root = asRecord(rawFlags);
  const senderrplaceSeed = asRecord(
    root.senderrplaceV2 ?? root.senderrplace ?? {},
  );

  for (const [legacyKey, mappedPath] of Object.entries(
    FEATURE_FLAG_DEPRECATED_ALIASES,
  )) {
    const isV2 = mappedPath.startsWith("senderrplaceV2.");
    const isV1 = mappedPath.startsWith("senderrplace.");
    if (!isV1 && !isV2) continue;
    const prefix = isV2 ? "senderrplaceV2." : "senderrplace.";
    const senderrplaceKey = mappedPath.replace(prefix, "");
    if (typeof senderrplaceSeed[senderrplaceKey] === "boolean") continue;
    const legacyValue = readLegacyFlagValue(root, legacyKey);
    if (typeof legacyValue === "boolean") {
      senderrplaceSeed[senderrplaceKey] = legacyValue;
    }
  }

  const normalized: FeatureFlags = {
    marketplace: normalizeSection(
      root.marketplace,
      DEFAULT_FEATURE_FLAGS.marketplace,
    ),
    delivery: normalizeSection(root.delivery, DEFAULT_FEATURE_FLAGS.delivery),
    courier: normalizeSection(root.courier, DEFAULT_FEATURE_FLAGS.courier),
    seller: normalizeSection(root.seller, DEFAULT_FEATURE_FLAGS.seller),
    customer: normalizeSection(root.customer, DEFAULT_FEATURE_FLAGS.customer),
    packageRunner: normalizeSection(
      root.packageRunner,
      DEFAULT_FEATURE_FLAGS.packageRunner,
    ),
    admin: normalizeSection(root.admin, DEFAULT_FEATURE_FLAGS.admin),
    advanced: normalizeSection(root.advanced, DEFAULT_FEATURE_FLAGS.advanced),
    ui: normalizeSection(root.ui, DEFAULT_FEATURE_FLAGS.ui),
    senderrplaceV2: normalizeSection(
      senderrplaceSeed,
      DEFAULT_FEATURE_FLAGS.senderrplaceV2,
    ),
  };

  if (options.forceAdminWebEnabled) {
    normalized.admin.webPortalEnabled = true;
  }

  return normalized;
}

function flattenBooleanPaths(
  rootKey: string,
  section: UnknownRecord,
): string[] {
  return Object.keys(section).map((key) => `${rootKey}.${key}`);
}

export const REQUIRED_FEATURE_FLAG_PATHS: string[] = Object.entries(
  DEFAULT_FEATURE_FLAGS,
)
  .flatMap(([sectionKey, sectionValue]) =>
    flattenBooleanPaths(sectionKey, sectionValue as UnknownRecord),
  )
  .sort();

export const FEATURE_FLAG_DEPRECATED_ALIASES: Record<string, string> = {
  senderrplaceV2: "senderrplaceV2.enabled",
  marketplace_v2: "senderrplaceV2.enabled",
  seller_portal_v2: "senderrplaceV2.adminControls",
  listing_create_v1: "senderrplaceV2.enabled",
  checkout_v2: "senderrplaceV2.enabled",
  messaging_v1: "senderrplaceV2.enabled",
};

export function getUnknownFeatureFlagPaths(rawFlags: unknown): string[] {
  const root = asRecord(rawFlags);
  const knownRootSections = Object.keys(DEFAULT_FEATURE_FLAGS);
  const ignoredRootKeys = new Set([
    "updatedAt",
    ...Object.keys(FEATURE_FLAG_DEPRECATED_ALIASES).filter(
      (key) => !key.includes("."),
    ),
  ]);
  const unknownPaths: string[] = [];

  for (const rootKey of Object.keys(root)) {
    if (ignoredRootKeys.has(rootKey)) {
      continue;
    }
    if (!knownRootSections.includes(rootKey)) {
      unknownPaths.push(rootKey);
      continue;
    }

    const sectionRaw = asRecord(root[rootKey]);
    const sectionDefaults = asRecord(
      (DEFAULT_FEATURE_FLAGS as unknown as UnknownRecord)[rootKey],
    );

    for (const sectionKey of Object.keys(sectionRaw)) {
      if (!(sectionKey in sectionDefaults)) {
        unknownPaths.push(`${rootKey}.${sectionKey}`);
      }
    }
  }

  return unknownPaths.sort();
}

export function getMissingRequiredFeatureFlagPaths(
  rawFlags: unknown,
): string[] {
  const root = asRecord(rawFlags);
  const missing: string[] = [];

  for (const [rootKey, sectionDefaults] of Object.entries(
    DEFAULT_FEATURE_FLAGS,
  )) {
    const sectionRaw = asRecord(root[rootKey]);
    for (const sectionKey of Object.keys(sectionDefaults as UnknownRecord)) {
      if (typeof sectionRaw[sectionKey] !== "boolean") {
        missing.push(`${rootKey}.${sectionKey}`);
      }
    }
  }

  return missing.sort();
}
