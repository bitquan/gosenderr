/**
 * Cloud Function: getEarnings
 * 
 * Purpose: Get courier's earnings summary (today, week, month, lifetime)
 * 
 * Workflow:
 * 1. Courier opens earnings/stats page
 * 2. Frontend calls getEarnings()
 * 3. Function queries:
 *    - Courier earnings document
 *    - Today's deliveries
 *    - This week's earnings
 *    - This month's earnings
 *    - Lifetime totals
 *    - Courier profile for stats (rating, total jobs)
 * 4. Aggregate data into response
 * 5. Return comprehensive earnings summary
 * 
 * Real-time: Dashboard should refresh every 5-10 seconds when active
 * Caching: Consider caching at frontend level (updated after each job)
 */

import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

export interface GetEarningsResponse {
  success: boolean;
  earnings?: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    lifetime: number;
    todayDeliveries: number;
    weekDeliveries: number;
    monthDeliveries: number;
    totalDeliveries: number;
    rating: number;
    status: "online" | "offline";
    averagePerDelivery: number;
  };
  error?: string;
}

// Helper: Get start of today in ISO format
function getTodayStart(): string {
  return new Date().toISOString().split("T")[0];
}

// Helper: Get start of this week (Monday)
function getWeekStart(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(today.setDate(diff));
  return monday;
}

// Helper: Get start of this month
function getMonthStart(): string {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
}

export const getEarnings = functions.https.onCall(
  async (request: any, context): Promise<GetEarningsResponse> => {
    console.log("[getEarnings] Called by courier:", context.auth?.uid);

    try {
      // ✅ Step 1: Validate authentication
      if (!context.auth) {
        console.error("[getEarnings] No authentication context");
        return {
          success: false,
          error: "Authentication required",
        };
      }

      const courierUid = context.auth.uid;
      console.log("[getEarnings] Fetching earnings for:", courierUid);

      // ✅ Step 2: Get earnings document
      const earningsDoc = await db.collection("courierEarnings").doc(courierUid).get();

      let todayEarnings = 0;
      let weekEarnings = 0;
      let monthEarnings = 0;
      let lifetimeEarnings = 0;
      let totalDeliveries = 0;

      if (earningsDoc.exists) {
        const earnings = earningsDoc.data();
        lifetimeEarnings = earnings?.totalEarnings || 0;
        totalDeliveries = earnings?.totalDeliveries || 0;

        // Today's earnings
        const today = getTodayStart();
        todayEarnings = earnings?.earnings_by_day?.[today] || 0;

        // This week's earnings (from Monday to today)
        const weekStart = getWeekStart();
        const weekEntries = Object.entries(earnings?.earnings_by_day || {});
        weekEarnings = weekEntries.reduce((sum, [dateStr, amount]: any) => {
          if (dateStr >= weekStart.toISOString().split("T")[0]) {
            return sum + (amount || 0);
          }
          return sum;
        }, 0);

        // This month's earnings
        const monthStart = getMonthStart();
        monthEarnings = weekEntries.reduce((sum, [dateStr, amount]: any) => {
          if (dateStr >= monthStart) {
            return sum + (amount || 0);
          }
          return sum;
        }, 0);
      }

      // ✅ Step 3: Get courier profile for stats
      const courierDoc = await db.collection("couriers").doc(courierUid).get();
      const courier = courierDoc.data();
      const rating = courier?.rating || 4.8;
      const online = courier?.isOnline || false;

      // ✅ Step 4: Count today's deliveries
      const today = getTodayStart();
      const completedTodaySnapshot = await db
        .collection("jobs")
        .where("courierUid", "==", courierUid)
        .where("status", "==", "completed")
        .get();

      let todayDeliveries = 0;
      let weekDeliveries = 0;
      let monthDeliveries = 0;

      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      for (const doc of completedTodaySnapshot.docs) {
        const completedAt = doc.data().completedAt?.toDate?.().toISOString?.().split("T")[0];

        if (completedAt === today) {
          todayDeliveries++;
        }

        if (completedAt && completedAt >= weekStart.toISOString().split("T")[0]) {
          weekDeliveries++;
        }

        if (completedAt && completedAt >= monthStart) {
          monthDeliveries++;
        }
      }

      // ✅ Step 5: Calculate average earnings per delivery
      const averagePerDelivery = totalDeliveries > 0 ? Math.round((lifetimeEarnings / totalDeliveries) * 100) / 100 : 0;

      console.log("[getEarnings] ✅ Calculated earnings - Today: $" + todayEarnings + ", Lifetime: $" + lifetimeEarnings);

      // ✅ Step 6: Return comprehensive earnings data
      return {
        success: true,
        earnings: {
          today: Math.round(todayEarnings * 100) / 100,
          thisWeek: Math.round(weekEarnings * 100) / 100,
          thisMonth: Math.round(monthEarnings * 100) / 100,
          lifetime: Math.round(lifetimeEarnings * 100) / 100,
          todayDeliveries,
          weekDeliveries,
          monthDeliveries,
          totalDeliveries,
          rating,
          status: online ? "online" : "offline",
          averagePerDelivery,
        },
      };
    } catch (error: any) {
      console.error("[getEarnings] ❌ Error:", error.message);
      console.error("[getEarnings] Stack:", error.stack);

      return {
        success: false,
        error: `Failed to get earnings: ${error.message}`,
      };
    }
  }
);

/**
 * HOW TO TEST IN FIREBASE EMULATOR
 * 
 * 1. Start emulator: firebase emulators:start
 * 2. Setup:
 *    - Create courier profile with isOnline=true, rating=4.8
 *    - Create courierEarnings/{uid} with:
 *      {
 *        "totalEarnings": 250,
 *        "totalDeliveries": 45,
 *        "earnings_by_day": {
 *          "2026-01-30": 45,
 *          "2026-01-29": 35,
 *          "2026-01-28": 55
 *        }
 *      }
 *    - Create 3 completed jobs assigned to courier
 * 3. Go to Functions tab
 * 4. Call getEarnings() with no parameters
 * 5. Verify response shows:
 *    - today: 45
 *    - lifetime: 250
 *    - totalDeliveries: 45
 *    - rating: 4.8
 *    - status: "online"
 *    - averagePerDelivery: 5.56
 * 
 * EXPECTED OUTPUT:
 * {
 *   "success": true,
 *   "earnings": {
 *     "today": 45.00,
 *     "thisWeek": 135.00,
 *     "thisMonth": 250.00,
 *     "lifetime": 250.00,
 *     "todayDeliveries": 1,
 *     "weekDeliveries": 3,
 *     "monthDeliveries": 3,
 *     "totalDeliveries": 45,
 *     "rating": 4.8,
 *     "status": "online",
 *     "averagePerDelivery": 5.56
 *   }
 * }
 */
