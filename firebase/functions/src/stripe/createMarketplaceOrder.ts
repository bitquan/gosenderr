import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getStripeClient } from './stripeSecrets';

// Ensure admin is initialized (safe to call multiple times)
if (!admin.apps.length) {
  admin.initializeApp();
}

interface MarketplaceItemInput {
  itemId: string;
  title: string;
  quantity: number;
  price: number;
  sellerId?: string;
  vendorId?: string;
  sellerName?: string;
}

interface NormalizedMarketplaceItem {
  itemId: string;
  title: string;
  quantity: number;
  price: number;
  sellerId: string;
  sellerName?: string;
}

interface CreateMarketplaceOrderData {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  paymentMode?: 'card' | 'cash';
  shippingInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  items: MarketplaceItemInput[];
}

interface SellerSuborder {
  sellerId: string;
  sellerName?: string;
  items: NormalizedMarketplaceItem[];
  subtotal: number;
  platformFee: number;
  adFee: number;
  tax: number;
  shipping: number;
  total: number;
  sellerPayoutMode: SellerPayoutMode;
  sellerPayoutExecution: SellerPayoutExecution;
  sellerPaymentStatus: PaymentRailStatus;
  deliveryFeeStatus: PaymentRailStatus;
  suborderId: string;
  orderId: string;
}

type PaymentRailStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
type SellerPayoutMode = 'stripe_connect' | 'external_provider' | 'manual_settlement';
type SellerPayoutExecution = 'stripe_connect' | 'stripe_connect_fallback' | 'deferred_non_stripe';

interface DeliveryFeePolicy {
  baseFee: number;
  perMileFee: number;
  perStopFee: number;
  minimumFee: number;
}

const DEFAULT_DELIVERY_FEE_POLICY: DeliveryFeePolicy = {
  baseFee: 3.99,
  perMileFee: 0.85,
  perStopFee: 0.65,
  minimumFee: 4.99,
};

interface RoutePoint {
  lat: number;
  lng: number;
}

interface PickupRouteStop {
  sellerId: string;
  sellerName?: string;
  orderId: string;
  suborderId: string;
  pickupAddress: string;
  pickup: RoutePoint | null;
  itemIds: string[];
  itemCount: number;
  sequence: number;
  legMilesFromPrevious: number | null;
  legMinutesFromPrevious: number | null;
}

interface MultiPickupRoutePlan {
  routeType: 'multi_pickup_single_dropoff';
  routeId: string;
  orderGroupId: string;
  dropoffAddress: string;
  dropoff: RoutePoint | null;
  hasCompleteCoordinates: boolean;
  pickupStopCount: number;
  missingPickupStops: number;
  totalPickupMiles: number;
  totalEstimatedMinutes: number;
  stops: PickupRouteStop[];
  issues: string[];
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

function allocateMoneyByWeight(total: number, weights: number[]): number[] {
  const totalCents = Math.max(0, Math.round(total * 100));
  const weightCents = weights.map((weight) => Math.max(0, Math.round(weight * 100)));
  const weightSum = weightCents.reduce((sum, cents) => sum + cents, 0);

  if (totalCents === 0 || weightSum === 0) {
    return new Array(weights.length).fill(0);
  }

  const allocations = new Array(weights.length).fill(0);
  let allocated = 0;

  for (let index = 0; index < weightCents.length; index += 1) {
    if (index === weightCents.length - 1) {
      allocations[index] = totalCents - allocated;
      break;
    }

    const share = Math.floor((totalCents * weightCents[index]) / weightSum);
    allocations[index] = share;
    allocated += share;
  }

  return allocations.map((cents) => cents / 100);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNonNegativeNumber(value: unknown, fallback: number): number {
  const parsed = parseNumber(value);
  if (parsed == null || Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parseSellerPayoutMode(value: unknown): SellerPayoutMode {
  if (value === 'external_provider' || value === 'manual_settlement' || value === 'stripe_connect') {
    return value;
  }
  return 'stripe_connect';
}

function mapStripeStatusToRailStatus(status: string): PaymentRailStatus {
  if (status === 'succeeded') return 'captured';
  if (status === 'requires_capture' || status === 'processing' || status === 'requires_action') {
    return 'authorized';
  }
  if (status === 'canceled') return 'failed';
  return 'pending';
}

function parseRoutePoint(value: unknown): RoutePoint | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const lat =
    parseNumber(candidate.lat) ??
    parseNumber(candidate.latitude) ??
    parseNumber(candidate._latitude);
  const lng =
    parseNumber(candidate.lng) ??
    parseNumber(candidate.longitude) ??
    parseNumber(candidate._longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function calculateMiles(a: RoutePoint, b: RoutePoint): number {
  const earthRadiusMiles = 3959;
  const latDelta = ((b.lat - a.lat) * Math.PI) / 180;
  const lngDelta = ((b.lng - a.lng) * Math.PI) / 180;
  const latA = (a.lat * Math.PI) / 180;
  const latB = (b.lat * Math.PI) / 180;

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusMiles * (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function estimateMinutesForMiles(miles: number): number {
  const averageMph = 22;
  return Math.max(1, Math.round((miles / averageMph) * 60));
}

function buildPickupSequence(
  stops: Array<Omit<PickupRouteStop, 'sequence' | 'legMilesFromPrevious' | 'legMinutesFromPrevious'>>,
  dropoff: RoutePoint | null
): PickupRouteStop[] {
  if (stops.length <= 1) {
    return stops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
      legMilesFromPrevious: null,
      legMinutesFromPrevious: null,
    }));
  }

  const geocoded = stops.filter((stop) => stop.pickup !== null);
  const ungeocoded = stops.filter((stop) => stop.pickup === null);
  if (geocoded.length <= 1) {
    return [...geocoded, ...ungeocoded].map((stop, index) => ({
      ...stop,
      sequence: index + 1,
      legMilesFromPrevious: null,
      legMinutesFromPrevious: null,
    }));
  }

  const remaining = [...geocoded];
  const backward: typeof remaining = [];
  let anchor = dropoff ?? remaining[0].pickup!;

  // Build backward from dropoff so forward pickup chain naturally ends near dropoff.
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestMiles = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const point = remaining[index].pickup!;
      const miles = calculateMiles(anchor, point);
      if (miles < nearestMiles) {
        nearestMiles = miles;
        nearestIndex = index;
      }
    }
    const [next] = remaining.splice(nearestIndex, 1);
    backward.push(next);
    anchor = next.pickup!;
  }

  const forward = backward.reverse();
  const sequenced: PickupRouteStop[] = [];

  for (let index = 0; index < forward.length; index += 1) {
    const previous = index > 0 ? forward[index - 1] : null;
    const current = forward[index];
    let legMilesFromPrevious: number | null = null;
    let legMinutesFromPrevious: number | null = null;
    if (previous?.pickup && current.pickup) {
      legMilesFromPrevious = roundMoney(calculateMiles(previous.pickup, current.pickup));
      legMinutesFromPrevious = estimateMinutesForMiles(legMilesFromPrevious);
    }
    sequenced.push({
      ...current,
      sequence: index + 1,
      legMilesFromPrevious,
      legMinutesFromPrevious,
    });
  }

  return [...sequenced, ...ungeocoded.map((stop, index) => ({
    ...stop,
    sequence: sequenced.length + index + 1,
    legMilesFromPrevious: null,
    legMinutesFromPrevious: null,
  }))];
}

function calculateDeliveryMiles(routePlan: MultiPickupRoutePlan): number {
  const pickupLegMiles = routePlan.stops.reduce((sum, stop) => {
    if (typeof stop.legMilesFromPrevious !== 'number') return sum;
    return sum + stop.legMilesFromPrevious;
  }, 0);

  const sortedStops = [...routePlan.stops].sort((a, b) => a.sequence - b.sequence);
  let lastPickup: PickupRouteStop | null = null;
  for (const stop of sortedStops) {
    if (stop.pickup) {
      lastPickup = stop;
    }
  }
  const dropoffLegMiles =
    lastPickup?.pickup && routePlan.dropoff
      ? calculateMiles(lastPickup.pickup, routePlan.dropoff)
      : 0;

  return roundMoney(pickupLegMiles + dropoffLegMiles);
}

function calculateDeliveryFee(routePlan: MultiPickupRoutePlan, policy: DeliveryFeePolicy): number {
  const extraStops = Math.max(0, routePlan.pickupStopCount - 1);
  if (!routePlan.dropoff) {
    const fallbackFee = policy.baseFee + extraStops * policy.perStopFee;
    return roundMoney(Math.max(policy.minimumFee, fallbackFee));
  }
  const miles = calculateDeliveryMiles(routePlan);
  const variableFee = policy.baseFee + miles * policy.perMileFee + extraStops * policy.perStopFee;
  return roundMoney(Math.max(policy.minimumFee, variableFee));
}

export const createMarketplaceOrder = functions.https.onCall<CreateMarketplaceOrderData>(
  {
    cors: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    // secrets: ['STRIPE_SECRET_KEY'],
  },
  async (request) => {
    // Authentication check
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create an order'
      );
    }

    const { amount, currency, paymentMethodId, shippingInfo, items } = request.data;
    const paymentMode = request.data.paymentMode === 'cash' ? 'cash' : 'card';

    // Validation
    if (!amount || !currency || !shippingInfo || !items || items.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }
    if (paymentMode === 'card' && !paymentMethodId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'paymentMethodId is required for card checkout'
      );
    }

    try {
      const db = admin.firestore();
      const stripe = await getStripeClient();

      const normalizedItems: NormalizedMarketplaceItem[] = items.map((item) => {
        const sellerId = item.sellerId || item.vendorId;
        if (!sellerId) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            `Missing seller ID for item ${item.itemId || 'unknown'}`
          );
        }

        return {
          itemId: item.itemId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          sellerId,
          sellerName: item.sellerName,
        };
      });

      if (normalizedItems.some((item) => !item.itemId || !item.title || item.quantity <= 0 || item.price < 0)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid item payload'
        );
      }
      
      const timestamp = FieldValue.serverTimestamp();
      const orderGroupId = db.collection('orders').doc().id;
      const orderSubtotal = roundMoney(
        normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      );

      const sellerBuckets = new Map<string, NormalizedMarketplaceItem[]>();
      normalizedItems.forEach((item) => {
        const existing = sellerBuckets.get(item.sellerId) || [];
        existing.push(item);
        sellerBuckets.set(item.sellerId, existing);
      });

      const sellerEntries = Array.from(sellerBuckets.entries()).map(([sellerId, sellerItems]) => {
        const subtotal = roundMoney(
          sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        );
        const sellerName = sellerItems.find((item) => item.sellerName)?.sellerName;
        return { sellerId, sellerItems, subtotal, sellerName };
      });

      const suborderSkeletons = sellerEntries.map((entry, index) => ({
        sellerId: entry.sellerId,
        sellerName: entry.sellerName,
        items: entry.sellerItems,
        subtotal: entry.subtotal,
        suborderId: `${orderGroupId}-${String(index + 1).padStart(2, '0')}`,
        orderId: db.collection('orders').doc().id,
      }));

      const uniqueItemIds = Array.from(new Set(normalizedItems.map((item) => item.itemId)));
      const itemDocs = await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          const snapshot = await db.collection('marketplaceItems').doc(itemId).get();
          const data = snapshot.exists ? snapshot.data() ?? null : null;
          return [itemId, data] as const;
        })
      );
      const itemDataById = new Map<string, admin.firestore.DocumentData | null>(itemDocs);

      const pickupStops = suborderSkeletons.map((suborder) => {
        const firstItemWithLocation = suborder.items
          .map((item) => itemDataById.get(item.itemId))
          .find((itemData) => itemData && itemData.pickupLocation);
        const pickupLocation = firstItemWithLocation?.pickupLocation as
          | Record<string, unknown>
          | undefined;
        const pickupPoint =
          parseRoutePoint(pickupLocation?.location) ??
          parseRoutePoint(pickupLocation) ??
          null;
        const pickupAddress =
          (typeof pickupLocation?.address === 'string' && pickupLocation.address) ||
          `Seller pickup (${suborder.sellerId.slice(0, 8)})`;

        return {
          sellerId: suborder.sellerId,
          sellerName: suborder.sellerName,
          orderId: suborder.orderId,
          suborderId: suborder.suborderId,
          pickupAddress,
          pickup: pickupPoint,
          itemIds: suborder.items.map((item) => item.itemId),
          itemCount: suborder.items.reduce((sum, item) => sum + item.quantity, 0),
        };
      });

      const dropoffPoint =
        shippingInfo.lat != null && shippingInfo.lng != null
          ? { lat: shippingInfo.lat, lng: shippingInfo.lng }
          : null;
      const orderedStops = buildPickupSequence(pickupStops, dropoffPoint);
      const totalPickupMiles = roundMoney(
        orderedStops.reduce(
          (sum, stop) => sum + (typeof stop.legMilesFromPrevious === 'number' ? stop.legMilesFromPrevious : 0),
          0
        )
      );
      const totalEstimatedMinutes = orderedStops.reduce(
        (sum, stop) => sum + (typeof stop.legMinutesFromPrevious === 'number' ? stop.legMinutesFromPrevious : 0),
        0
      );
      const missingPickupStops = orderedStops.filter((stop) => !stop.pickup).length;
      const routeIssues: string[] = [];
      if (missingPickupStops > 0) {
        routeIssues.push(`${missingPickupStops} pickup stop(s) missing coordinates`);
      }
      if (!dropoffPoint) {
        routeIssues.push('Dropoff coordinates missing from checkout payload');
      }

      const routeId = db.collection('marketplaceOrderRoutes').doc().id;
      const routePlan: MultiPickupRoutePlan = {
        routeType: 'multi_pickup_single_dropoff',
        routeId,
        orderGroupId,
        dropoffAddress: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}`.trim(),
        dropoff: dropoffPoint,
        hasCompleteCoordinates: missingPickupStops === 0 && !!dropoffPoint,
        pickupStopCount: orderedStops.length,
        missingPickupStops,
        totalPickupMiles,
        totalEstimatedMinutes,
        stops: orderedStops,
        issues: routeIssues,
      };

      const [paymentSettingsSnapshot, featureFlagsSnapshot, sellerUserSnapshots] = await Promise.all([
        db.doc('platformSettings/payment').get(),
        db.doc('featureFlags/config').get(),
        Promise.all(
          sellerEntries.map(async (entry) => {
            const snap = await db.collection('users').doc(entry.sellerId).get();
            return [entry.sellerId, snap] as const;
          })
        ),
      ]);

      const paymentSettings = paymentSettingsSnapshot.exists
        ? paymentSettingsSnapshot.data() ?? {}
        : {};
      const featureFlags = featureFlagsSnapshot.exists
        ? featureFlagsSnapshot.data() ?? {}
        : {};
      const allowNonStripeSellerPayouts = Boolean(
        (featureFlags as Record<string, any>)?.payments?.senderrplaceNonStripeSellerPayouts ??
        (featureFlags as Record<string, any>)?.senderrplaceNonStripeSellerPayouts
      );

      const deliveryPolicy: DeliveryFeePolicy = {
        baseFee: toNonNegativeNumber(
          (paymentSettings as Record<string, unknown>)?.deliveryBaseFee,
          DEFAULT_DELIVERY_FEE_POLICY.baseFee
        ),
        perMileFee: toNonNegativeNumber(
          (paymentSettings as Record<string, unknown>)?.deliveryPerMileFee,
          DEFAULT_DELIVERY_FEE_POLICY.perMileFee
        ),
        perStopFee: toNonNegativeNumber(
          (paymentSettings as Record<string, unknown>)?.deliveryPerStopFee,
          DEFAULT_DELIVERY_FEE_POLICY.perStopFee
        ),
        minimumFee: toNonNegativeNumber(
          (paymentSettings as Record<string, unknown>)?.deliveryMinimumFee,
          DEFAULT_DELIVERY_FEE_POLICY.minimumFee
        ),
      };

      const orderShipping = calculateDeliveryFee(routePlan, deliveryPolicy);
      const platformFeeFlat = roundMoney(
        toNonNegativeNumber((paymentSettings as Record<string, unknown>)?.platformFeePackage, 2.5)
      );
      const adFeeEnabled = Boolean(
        (paymentSettings as Record<string, unknown>)?.orderAdFeeEnabled ??
        (paymentSettings as Record<string, unknown>)?.adFeeEnabled
      );
      const adFeeFlat = adFeeEnabled
        ? roundMoney(
            toNonNegativeNumber((paymentSettings as Record<string, unknown>)?.orderAdFeeFlat, 0)
          )
        : 0;
      const collectTax = Boolean((paymentSettings as Record<string, unknown>)?.collectTax);
      const taxRateFraction = collectTax
        ? toNonNegativeNumber((paymentSettings as Record<string, unknown>)?.taxRate, 0) / 100
        : 0;

      const orderTax = roundMoney(orderSubtotal * taxRateFraction);
      const platformRailTotal = roundMoney(orderShipping + platformFeeFlat + adFeeFlat);
      const computedOrderTotal = roundMoney(orderSubtotal + orderTax + platformRailTotal);
      const requestedOrderTotal = roundMoney(amount / 100);

      if (Math.abs(requestedOrderTotal - computedOrderTotal) > 0.01) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Checkout total changed. Refresh and retry. expected=${computedOrderTotal.toFixed(2)} requested=${requestedOrderTotal.toFixed(2)}`
        );
      }

      let paymentIntentId: string | null = null;
      let paymentClientSecret: string | null = null;
      let paymentStatus: string = 'pending';
      let sharedRailStatus: PaymentRailStatus = 'pending';

      if (paymentMode === 'card') {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(computedOrderTotal * 100),
          currency: currency.toLowerCase(),
          payment_method: paymentMethodId!,
          confirm: true,
          return_url: `${request.rawRequest.headers.origin}/orders`,
          metadata: {
            userId: request.auth.uid,
            orderType: 'marketplace',
            orderGroupId,
            paymentMode,
            sellerRailTotal: orderSubtotal.toFixed(2),
            platformRailTotal: platformRailTotal.toFixed(2),
          },
        });

        paymentIntentId = paymentIntent.id;
        paymentClientSecret = paymentIntent.client_secret;
        paymentStatus = paymentIntent.status;
        sharedRailStatus = mapStripeStatusToRailStatus(paymentIntent.status);
      } else {
        paymentStatus = 'cash_pending';
        sharedRailStatus = 'pending';
      }
      const sellerUserDataById = new Map(
        sellerUserSnapshots.map(([sellerId, snapshot]) => [
          sellerId,
          snapshot.exists ? snapshot.data() ?? {} : {},
        ])
      );

      const taxAllocations = allocateMoneyByWeight(
        orderTax,
        sellerEntries.map((entry) => entry.subtotal)
      );
      const shippingAllocations = allocateMoneyByWeight(
        orderShipping,
        sellerEntries.map((entry) => entry.subtotal)
      );
      const platformFeeAllocations = allocateMoneyByWeight(
        platformFeeFlat,
        sellerEntries.map((entry) => entry.subtotal)
      );
      const adFeeAllocations = allocateMoneyByWeight(
        adFeeFlat,
        sellerEntries.map((entry) => entry.subtotal)
      );

      const suborders: SellerSuborder[] = sellerEntries.map((entry, index) => {
        const suborderSkeleton = suborderSkeletons[index];
        const tax = roundMoney(taxAllocations[index] || 0);
        const shipping = roundMoney(shippingAllocations[index] || 0);
        const platformFee = roundMoney(platformFeeAllocations[index] || 0);
        const adFee = roundMoney(adFeeAllocations[index] || 0);
        const total = roundMoney(entry.subtotal + tax + shipping + platformFee + adFee);

        const sellerUserData = sellerUserDataById.get(entry.sellerId) as Record<string, unknown> | undefined;
        const sellerProfile = (sellerUserData?.sellerProfile || {}) as Record<string, unknown>;
        const configuredPayoutMode = parseSellerPayoutMode(
          sellerProfile.payoutMode ?? sellerProfile.sellerPayoutMode
        );
        const sellerPayoutMode =
          configuredPayoutMode === 'stripe_connect' || allowNonStripeSellerPayouts
            ? configuredPayoutMode
            : 'stripe_connect';
        const sellerPayoutExecution: SellerPayoutExecution =
          sellerPayoutMode === 'stripe_connect'
            ? configuredPayoutMode === 'stripe_connect'
              ? 'stripe_connect'
              : 'stripe_connect_fallback'
            : 'deferred_non_stripe';

        return {
          sellerId: entry.sellerId,
          sellerName: entry.sellerName,
          items: entry.sellerItems,
          subtotal: entry.subtotal,
          platformFee,
          adFee,
          tax,
          shipping,
          total,
          sellerPayoutMode,
          sellerPayoutExecution,
          sellerPaymentStatus: sharedRailStatus,
          deliveryFeeStatus: sharedRailStatus,
          suborderId: suborderSkeleton.suborderId,
          orderId: suborderSkeleton.orderId,
        };
      });

      const orderTotal = roundMoney(suborders.reduce((sum, suborder) => sum + suborder.total, 0));

      const orderGroupSnapshot = {
        id: orderGroupId,
        suborderCount: suborders.length,
        sellerIds: suborders.map((suborder) => suborder.sellerId),
        subtotal: orderSubtotal,
        shipping: orderShipping,
        tax: orderTax,
        total: orderTotal,
        paymentStatus,
        paymentMode,
        seller_payment_status: sharedRailStatus,
        delivery_fee_status: sharedRailStatus,
        paymentRails: {
          sellerTotal: orderSubtotal,
          platformTotal: platformRailTotal,
          deliveryFee: orderShipping,
          platformFee: platformFeeFlat,
          adFee: adFeeFlat,
        },
        payoutFlags: {
          nonStripeSellerPayoutsEnabled: allowNonStripeSellerPayouts,
        },
        routePlan: {
          routeId: routePlan.routeId,
          routeType: routePlan.routeType,
          hasCompleteCoordinates: routePlan.hasCompleteCoordinates,
          pickupStopCount: routePlan.pickupStopCount,
          missingPickupStops: routePlan.missingPickupStops,
          totalPickupMiles: routePlan.totalPickupMiles,
          totalEstimatedMinutes: routePlan.totalEstimatedMinutes,
          dropoffAddress: routePlan.dropoffAddress,
          dropoff: routePlan.dropoff,
          issues: routePlan.issues,
          stops: routePlan.stops,
        },
        suborders: suborders.map((suborder, index) => ({
          id: suborder.suborderId,
          index,
          orderId: suborder.orderId,
          sellerId: suborder.sellerId,
          sellerName: suborder.sellerName || null,
          itemCount: suborder.items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: suborder.subtotal,
          shipping: suborder.shipping,
          platformFee: suborder.platformFee,
          adFee: suborder.adFee,
          tax: suborder.tax,
          total: suborder.total,
          sellerPayoutMode: suborder.sellerPayoutMode,
          sellerPayoutExecution: suborder.sellerPayoutExecution,
          sellerPaymentStatus: suborder.sellerPaymentStatus,
          deliveryFeeStatus: suborder.deliveryFeeStatus,
          status: 'pending',
        })),
      };

      const batch = db.batch();
      const routeRef = db.collection('marketplaceOrderRoutes').doc(routeId);
      batch.set(routeRef, {
        ...routePlan,
        deliveryFeePolicy: deliveryPolicy,
        pricing: {
          deliveryFee: orderShipping,
          platformFee: platformFeeFlat,
          adFee: adFeeFlat,
          tax: orderTax,
          total: orderTotal,
        },
        seller_payment_status: sharedRailStatus,
        delivery_fee_status: sharedRailStatus,
        status: 'planned',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      suborders.forEach((suborder, index) => {
        const orderRef = db.collection('orders').doc(suborder.orderId);
        batch.set(orderRef, {
          customerId: request.auth?.uid,
          customerEmail: shippingInfo.email,
          sellerId: suborder.sellerId,
          sellerName: suborder.sellerName || null,
          items: suborder.items.map((item) => ({
            itemId: item.itemId,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            sellerId: item.sellerId,
            vendorId: item.sellerId,
          })),
          shippingInfo: {
            fullName: shippingInfo.fullName,
            email: shippingInfo.email,
            phone: shippingInfo.phone,
            address: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zipCode: shippingInfo.zipCode,
            country: shippingInfo.country,
          },
          subtotal: suborder.subtotal,
          shipping: suborder.shipping,
          platformFee: suborder.platformFee,
          adFee: suborder.adFee,
          tax: suborder.tax,
          total: suborder.total,
          paymentIntentId,
          paymentStatus,
          paymentMode,
          seller_payment_status: suborder.sellerPaymentStatus,
          delivery_fee_status: suborder.deliveryFeeStatus,
          sellerPayoutMode: suborder.sellerPayoutMode,
          sellerPayoutExecution: suborder.sellerPayoutExecution,
          paymentRails: {
            seller: {
              amount: suborder.subtotal,
              payoutMode: suborder.sellerPayoutMode,
              execution: suborder.sellerPayoutExecution,
              status: suborder.sellerPaymentStatus,
            },
            platform: {
              deliveryFee: suborder.shipping,
              platformFee: suborder.platformFee,
              adFee: suborder.adFee,
              total: roundMoney(suborder.shipping + suborder.platformFee + suborder.adFee),
              status: suborder.deliveryFeeStatus,
            },
          },
          status: 'pending',
          orderGroupId,
          orderGroup: orderGroupSnapshot,
          suborder: {
            id: suborder.suborderId,
            index,
            sellerId: suborder.sellerId,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      });

      await batch.commit();

      // Update inventory for each item
      for (const item of normalizedItems) {
        const itemRef = db.collection('marketplaceItems').doc(item.itemId);
        await db.runTransaction(async (transaction) => {
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists) {
            const currentStock = itemDoc.data()?.stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            transaction.update(itemRef, {
              stock: newStock,
              updatedAt: timestamp,
            });
          }
        });
      }

      console.log(
        `Order group created: ${orderGroupId} (${suborders.length} suborders) for user ${request.auth.uid}`
      );

      return {
        orderId: suborders[0]?.orderId,
        orderIds: suborders.map((suborder) => suborder.orderId),
        orderGroupId,
        suborderCount: suborders.length,
        routeId,
        clientSecret: paymentClientSecret,
        paymentIntentId,
        paymentMode,
        status: paymentStatus,
        pricing: {
          subtotal: orderSubtotal,
          deliveryFee: orderShipping,
          platformFee: platformFeeFlat,
          adFee: adFeeFlat,
          tax: orderTax,
          total: orderTotal,
        },
      };
    } catch (error) {
      console.error('Error creating marketplace order:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to create order'
      );
    }
  }
);
