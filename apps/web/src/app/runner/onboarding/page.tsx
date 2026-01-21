'use client';

import { useState, useEffect } from 'react';
import { auth, db, storage } from '@/lib/firebase/client';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { VehicleType, RunnerApplication } from '@gosenderr/shared';

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Car 🚗' },
  { value: 'van', label: 'Van 🚐' },
  { value: 'truck', label: 'Truck 🚛' },
];

const REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'Southwest',
  'West Coast',
  'Northwest',
  'Mountain West',
];

export default function RunnerOnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  
  const [hasDolly, setHasDolly] = useState(false);
  const [hasStraps, setHasStraps] = useState(false);
  const [hasFurnitureBlankets, setHasFurnitureBlankets] = useState(false);
  const [maxWeightCapacity, setMaxWeightCapacity] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState('');
  
  const [interstateDelivery, setInterstateDelivery] = useState(false);
  const [longHaulRoutes, setLongHaulRoutes] = useState(false);
  const [hubToHubOnly, setHubToHubOnly] = useState(false);
  const [maxDistancePerRoute, setMaxDistancePerRoute] = useState('');
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  
  const [driversLicenseFile, setDriversLicenseFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);
      
      // Pre-fill user info
      setEmail(user.email || '');
      setDisplayName(user.displayName || '');
      setPhone(user.phoneNumber || '');

      // Check for existing application
      const applicationsSnapshot = await getDocs(
        query(collection(db, 'runnerApplications'), where('userId', '==', user.uid))
      );

      if (!applicationsSnapshot.empty) {
        const existingApp = applicationsSnapshot.docs[0].data();
        setExistingApplication(existingApp);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleRegionToggle = (region: string) => {
    setPreferredRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };

  const uploadDocument = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;

    // Validate required fields
    if (!driversLicenseFile || !insuranceFile || !registrationFile) {
      alert('Please upload all required documents');
      return;
    }

    setSubmitting(true);

    try {
      // Upload documents
      const [driversLicenseUrl, insuranceUrl, vehicleRegistrationUrl] = await Promise.all([
        uploadDocument(driversLicenseFile, `runner-docs/${currentUser.uid}/drivers-license-${Date.now()}`),
        uploadDocument(insuranceFile, `runner-docs/${currentUser.uid}/insurance-${Date.now()}`),
        uploadDocument(registrationFile, `runner-docs/${currentUser.uid}/registration-${Date.now()}`),
      ]);

      const application: Omit<RunnerApplication, 'createdAt' | 'updatedAt'> = {
        userId: currentUser.uid,
        displayName,
        email,
        phone,
        status: 'pending',
        vehicle: {
          type: vehicleType,
          make: vehicleMake,
          model: vehicleModel,
          year: parseInt(vehicleYear),
          color: vehicleColor,
          licensePlate,
        },
        equipment: {
          hasDolly,
          hasStraps,
          hasFurnitureBlankets,
          maxWeightCapacity: parseInt(maxWeightCapacity),
          vehicleCapacity,
        },
        preferences: {
          interstateDelivery,
          longHaulRoutes,
          hubToHubOnly,
          maxDistancePerRoute: parseInt(maxDistancePerRoute),
          preferredRegions,
        },
        driversLicenseUrl,
        insuranceUrl,
        vehicleRegistrationUrl,
      };

      await addDoc(collection(db, 'runnerApplications'), {
        ...application,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      alert('Application submitted successfully! You will be notified once reviewed.');
      router.push('/');
    } catch (error) {
      console.error('Failed to submit application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px' }}>
          Package Runner Application
        </h1>
        <div
          style={{
            padding: '24px',
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            Application {existingApplication.status === 'pending' ? 'Pending' : existingApplication.status === 'approved' ? 'Approved' : 'Rejected'}
          </h2>
          <p style={{ color: '#6b7280' }}>
            {existingApplication.status === 'pending' && 'Your application is currently under review. You will be notified once it has been processed.'}
            {existingApplication.status === 'approved' && 'Your application has been approved! You can now access package runner features.'}
            {existingApplication.status === 'rejected' && `Your application was rejected: ${existingApplication.rejectionReason}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '32px' }}>
        Become a Package Runner
      </h1>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Personal Information
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Phone *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Vehicle Information */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Vehicle Information
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Vehicle Type *
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Make *
                </label>
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  required
                  placeholder="Toyota"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Model *
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  required
                  placeholder="Camry"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Year *
                </label>
                <input
                  type="number"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  required
                  placeholder="2020"
                  min="1990"
                  max="2025"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Color *
                </label>
                <input
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  required
                  placeholder="Silver"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  License Plate *
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  required
                  placeholder="ABC1234"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Equipment */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Equipment & Capacity
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasDolly}
                onChange={(e) => setHasDolly(e.target.checked)}
              />
              <span>I have a dolly/hand truck</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={hasStraps}
                onChange={(e) => setHasStraps(e.target.checked)}
              />
              <span>I have tie-down straps</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={hasFurnitureBlankets}
                onChange={(e) => setHasFurnitureBlankets(e.target.checked)}
              />
              <span>I have furniture blankets/padding</span>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Max Weight Capacity (lbs) *
              </label>
              <input
                type="number"
                value={maxWeightCapacity}
                onChange={(e) => setMaxWeightCapacity(e.target.value)}
                required
                placeholder="500"
                min="100"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Vehicle Capacity *
              </label>
              <input
                type="text"
                value={vehicleCapacity}
                onChange={(e) => setVehicleCapacity(e.target.value)}
                required
                placeholder="sedan, van, truck"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Delivery Preferences
          </h2>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={interstateDelivery}
                onChange={(e) => setInterstateDelivery(e.target.checked)}
              />
              <span>I'm interested in interstate deliveries</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={longHaulRoutes}
                onChange={(e) => setLongHaulRoutes(e.target.checked)}
              />
              <span>I'm interested in long-haul routes (100+ miles)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
              <input
                type="checkbox"
                checked={hubToHubOnly}
                onChange={(e) => setHubToHubOnly(e.target.checked)}
              />
              <span>Hub-to-hub only (no residential deliveries)</span>
            </label>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Max Distance Per Route (miles) *
            </label>
            <input
              type="number"
              value={maxDistancePerRoute}
              onChange={(e) => setMaxDistancePerRoute(e.target.value)}
              required
              placeholder="500"
              min="100"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Preferred Regions (select all that apply)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {REGIONS.map((region) => (
                <label
                  key={region}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={preferredRegions.includes(region)}
                    onChange={() => handleRegionToggle(region)}
                  />
                  <span>{region}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Documents */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Required Documents
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Driver's License *
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setDriversLicenseFile(e.target.files?.[0] || null)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Insurance Card *
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Vehicle Registration *
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setRegistrationFile(e.target.files?.[0] || null)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                }}
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '16px',
            background: submitting ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting Application...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
