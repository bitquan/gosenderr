import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function trackSellerOnboardingEvent(
  uid: string | null | undefined,
  eventName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!uid || !db) return;

  try {
    await addDoc(collection(db, "users", uid, "onboardingEvents"), {
      flow: "seller_onboarding_v2",
      eventName,
      metadata,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Do not block the user flow when analytics writes fail.
    console.warn("Failed to track seller onboarding event:", error);
  }
}
