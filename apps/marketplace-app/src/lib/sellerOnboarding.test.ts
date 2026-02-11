import { describe, expect, it } from "vitest";
import {
  buildSellerBookingLink,
  ensureSellerDualRoles,
  getBookingLinkEligibility,
  validateLocalSellingConfig,
} from "./sellerOnboarding";

describe("seller onboarding helpers", () => {
  it("ensures customer + buyer + seller roles exist", () => {
    expect(ensureSellerDualRoles(["buyer"])).toEqual(
      expect.arrayContaining(["customer", "buyer", "seller"]),
    );
  });

  it("validates local selling config", () => {
    const invalid = validateLocalSellingConfig({
      address: "",
      city: "",
      state: "",
      postalCode: "",
      operatingRadiusMiles: 0,
      contactPhone: "",
      complianceConfirmed: false,
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it("blocks booking links when onboarding is incomplete", () => {
    const eligibility = getBookingLinkEligibility({
      roles: ["customer", "buyer", "seller"],
      sellerApplication: { status: "pending" },
      sellerProfile: {},
    });

    expect(eligibility.allowed).toBe(false);
    expect(eligibility.reason).toContain("Seller onboarding");
  });

  it("builds request-delivery booking links", () => {
    const link = buildSellerBookingLink(
      "https://dev.gosenderr.com/",
      "item_123",
      "sbl_abc",
    );
    expect(link).toBe(
      "https://dev.gosenderr.com/request-delivery?itemId=item_123&bookingLink=sbl_abc",
    );
  });
});
