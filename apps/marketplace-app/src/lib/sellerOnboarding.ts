export interface SellerLocalSellingConfig {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  operatingRadiusMiles: number;
  contactPhone: string;
  complianceConfirmed: boolean;
}

export interface LocalSellingValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BookingLinkEligibility {
  allowed: boolean;
  reason: string | null;
}

export interface SellerOnboardingStepResult {
  currentStep: "business" | "local_config" | "review" | "completed";
  completedSteps: string[];
}

type UserDataLike = Record<string, any> | null | undefined;

const DEFAULT_REQUIRED_ROLES = ["customer", "buyer", "seller"];

export function ensureSellerDualRoles(existingRoles: unknown): string[] {
  const roles = Array.isArray(existingRoles)
    ? existingRoles.filter((role) => typeof role === "string")
    : [];

  const unique = new Set<string>(roles);
  for (const requiredRole of DEFAULT_REQUIRED_ROLES) {
    unique.add(requiredRole);
  }

  return Array.from(unique);
}

export function validateLocalSellingConfig(
  config: SellerLocalSellingConfig,
): LocalSellingValidationResult {
  const errors: string[] = [];

  if (!config.address.trim()) {
    errors.push("Storefront or pickup address is required.");
  }
  if (!config.city.trim()) {
    errors.push("City is required.");
  }
  if (!config.state.trim()) {
    errors.push("State is required.");
  }
  if (!config.postalCode.trim()) {
    errors.push("Postal code is required.");
  }

  const radius = Number(config.operatingRadiusMiles);
  if (!Number.isFinite(radius) || radius < 1 || radius > 100) {
    errors.push("Operating radius must be between 1 and 100 miles.");
  }

  if (!config.contactPhone.trim()) {
    errors.push("Seller contact phone is required.");
  }
  if (!config.complianceConfirmed) {
    errors.push("Compliance confirmation is required.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function resolveSellerOnboardingStep(
  businessComplete: boolean,
  localConfigValid: boolean,
  submitted: boolean,
): SellerOnboardingStepResult {
  if (submitted) {
    return {
      currentStep: "completed",
      completedSteps: ["business", "local_config", "review", "completed"],
    };
  }

  if (!businessComplete) {
    return { currentStep: "business", completedSteps: [] };
  }

  if (!localConfigValid) {
    return { currentStep: "local_config", completedSteps: ["business"] };
  }

  return {
    currentStep: "review",
    completedSteps: ["business", "local_config"],
  };
}

export function isSellerOnboardingComplete(userData: UserDataLike): boolean {
  if (!userData) return false;

  const sellerApplicationStatus = userData?.sellerApplication?.status;
  if (sellerApplicationStatus !== "approved") return false;

  const config = userData?.sellerProfile?.localSellingConfig;
  if (!config) return false;

  const validation = validateLocalSellingConfig({
    address: String(config.address || ""),
    city: String(config.city || ""),
    state: String(config.state || ""),
    postalCode: String(config.postalCode || ""),
    operatingRadiusMiles: Number(config.operatingRadiusMiles || 0),
    contactPhone: String(config.contactPhone || ""),
    complianceConfirmed: Boolean(config.complianceConfirmed),
  });

  return validation.isValid;
}

export function getBookingLinkEligibility(userData: UserDataLike): BookingLinkEligibility {
  if (!userData) {
    return { allowed: false, reason: "Seller profile is still loading." };
  }

  const roles = ensureSellerDualRoles(userData?.roles);
  if (!roles.includes("seller")) {
    return {
      allowed: false,
      reason: "Complete seller onboarding to unlock booking links.",
    };
  }

  if (!isSellerOnboardingComplete(userData)) {
    return {
      allowed: false,
      reason:
        "Seller onboarding must be approved and local selling details must be complete before creating booking links.",
    };
  }

  return { allowed: true, reason: null };
}

export function buildSellerBookingLink(baseUrl: string, itemId: string, bookingLinkId: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    itemId,
    bookingLink: bookingLinkId,
  });
  return `${normalizedBase}/request-delivery?${params.toString()}`;
}
