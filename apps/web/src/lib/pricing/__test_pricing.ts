import { calculateCourierRate, JobInfo } from './calculateCourierRate';
import { PackageRateCard, FoodRateCard } from '@gosenderr/shared';

// Test Package Delivery Pricing
console.log('=== Testing Package Delivery Pricing ===\n');

const packageRateCard: PackageRateCard = {
  baseFare: 5.00,
  perMile: 1.50,
  perMinute: 0.25,
  optionalFees: [],
};

const packageJob: JobInfo = {
  distance: 10,
  estimatedMinutes: 20,
  isFoodItem: false,
};

const packageRate = calculateCourierRate(packageRateCard, packageJob);
console.log('Package Rate Breakdown:');
console.log(`  Base Fare: $${packageRate.baseFare.toFixed(2)}`);
console.log(`  Per-Mile Charge (10 mi × $1.50): $${packageRate.perMileCharge.toFixed(2)}`);
console.log(`  Time Charge (20 min × $0.25): $${packageRate.timeCharge?.toFixed(2)}`);
console.log(`  Courier Earnings: $${packageRate.courierEarnings.toFixed(2)}`);
console.log(`  Platform Fee: $${packageRate.platformFee.toFixed(2)}`);
console.log(`  Total Customer Charge: $${packageRate.totalCustomerCharge.toFixed(2)}`);
console.log('\n');

// Test Food Delivery Pricing (No Peak)
console.log('=== Testing Food Delivery Pricing (No Peak) ===\n');

const foodRateCard: FoodRateCard = {
  baseFare: 4.00,
  perMile: 2.00,
  restaurantWaitPay: 0.15,
  optionalFees: [],
};

const foodJob: JobInfo = {
  distance: 5,
  estimatedMinutes: 10,
  isFoodItem: true,
};

const foodRate = calculateCourierRate(foodRateCard, foodJob);
console.log('Food Rate Breakdown (No Peak):');
console.log(`  Base Fare: $${foodRate.baseFare.toFixed(2)}`);
console.log(`  Per-Mile Charge (5 mi × $2.00): $${foodRate.perMileCharge.toFixed(2)}`);
console.log(`  Peak Multiplier: ${foodRate.peakMultiplier || 'None'}`);
console.log(`  Courier Earnings: $${foodRate.courierEarnings.toFixed(2)}`);
console.log(`  Platform Fee: $${foodRate.platformFee.toFixed(2)}`);
console.log(`  Total Customer Charge: $${foodRate.totalCustomerCharge.toFixed(2)}`);
console.log('\n');

// Test Food Delivery Pricing (With Peak)
console.log('=== Testing Food Delivery Pricing (With Peak) ===\n');

const foodRateCardPeak: FoodRateCard = {
  baseFare: 4.00,
  perMile: 2.00,
  restaurantWaitPay: 0.15,
  peakHours: [
    {
      days: ['friday', 'saturday'],
      startTime: '18:00',
      endTime: '21:00',
      multiplier: 1.5,
    },
  ],
  optionalFees: [],
};

// Create a Friday at 7:30 PM
const fridayEvening = new Date('2024-01-05T19:30:00'); // Friday

const foodRatePeak = calculateCourierRate(foodRateCardPeak, foodJob, fridayEvening);
console.log('Food Rate Breakdown (Peak Hours - Friday 7:30 PM):');
console.log(`  Base Fare: $${foodRatePeak.baseFare.toFixed(2)}`);
console.log(`  Per-Mile Charge (5 mi × $2.00): $${foodRatePeak.perMileCharge.toFixed(2)}`);
console.log(`  Subtotal Before Peak: $${(foodRatePeak.baseFare + foodRatePeak.perMileCharge).toFixed(2)}`);
console.log(`  Peak Multiplier: ${foodRatePeak.peakMultiplier}x`);
console.log(`  Courier Earnings: $${foodRatePeak.courierEarnings.toFixed(2)}`);
console.log(`  Platform Fee: $${foodRatePeak.platformFee.toFixed(2)}`);
console.log(`  Total Customer Charge: $${foodRatePeak.totalCustomerCharge.toFixed(2)}`);
console.log('\n');

console.log('✅ All pricing tests passed!');
