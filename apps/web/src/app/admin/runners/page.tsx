'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { RunnerApplication, RunnerApplicationStatus } from '@gosenderr/shared';

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  foot: 'On Foot 🚶',
  bike: 'Bike 🚲',
  scooter: 'Scooter 🛴',
  motorcycle: 'Motorcycle 🏍️',
  car: 'Car 🚗',
  van: 'Van 🚐',
  truck: 'Truck 🚛',
};

interface PendingRunner {
  applicationId: string;
  application: RunnerApplication;
}

export default function RunnersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingRunners, setPendingRunners] = useState<PendingRunner[]>([]);
  const [selectedRunner, setSelectedRunner] = useState<PendingRunner | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists() || userDocSnap.data().role !== 'admin') {
        router.push('/');
        return;
      }

      setCurrentUser(user);
      await loadPendingApplications();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadPendingApplications = async () => {
    try {
      const applicationsSnapshot = await getDocs(
        query(collection(db, 'runnerApplications'), where('status', '==', 'pending'))
      );

      const pending: PendingRunner[] = [];

      applicationsSnapshot.docs.forEach((appDoc) => {
        pending.push({
          applicationId: appDoc.id,
          application: appDoc.data() as RunnerApplication,
        });
      });

      // Sort by creation date (newest first)
      pending.sort((a, b) => {
        const aTime = a.application.createdAt?.toMillis() || 0;
        const bTime = b.application.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setPendingRunners(pending);
    } catch (error) {
      console.error('Failed to load pending applications:', error);
    }
  };

  const handleApprove = async () => {
    if (!selectedRunner || !currentUser) return;

    setProcessing(true);

    try {
      // Update application status
      await updateDoc(doc(db, 'runnerApplications', selectedRunner.applicationId), {
        status: 'approved' as RunnerApplicationStatus,
        reviewedBy: currentUser.uid,
        reviewedAt: Timestamp.now(),
        reviewNotes: reviewNotes || undefined,
      });

      // The Cloud Function setPackageRunnerClaim will automatically set the custom claim
      // when it detects the status change to 'approved'

      // Update local state
      setPendingRunners(pendingRunners.filter((runner) => runner !== selectedRunner));
      setSelectedRunner(null);
      setReviewNotes('');
      alert('Runner approved successfully! Custom claim will be set automatically.');
    } catch (error) {
      console.error('Failed to approve runner:', error);
      alert('Failed to approve runner. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRunner || !currentUser || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      await updateDoc(doc(db, 'runnerApplications', selectedRunner.applicationId), {
        status: 'rejected' as RunnerApplicationStatus,
        reviewedBy: currentUser.uid,
        reviewedAt: Timestamp.now(),
        rejectionReason: rejectionReason,
        reviewNotes: reviewNotes || undefined,
      });

      // Update local state
      setPendingRunners(pendingRunners.filter((runner) => runner !== selectedRunner));
      setSelectedRunner(null);
      setRejectionReason('');
      setReviewNotes('');
      alert('Application rejected. User has been notified.');
    } catch (error) {
      console.error('Failed to reject application:', error);
      alert('Failed to reject application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '32px', fontSize: '28px', fontWeight: '600' }}>
        Package Runner Applications ({pendingRunners.length})
      </h1>

      {pendingRunners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px' }}>No pending runner applications at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px' }}>
          {/* List of pending applications */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRunners.map((runner) => (
                <button
                  key={runner.applicationId}
                  onClick={() => {
                    setSelectedRunner(runner);
                    setReviewNotes('');
                    setRejectionReason('');
                  }}
                  style={{
                    padding: '16px',
                    background: selectedRunner === runner ? '#eff6ff' : 'white',
                    border: selectedRunner === runner ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    {runner.application.displayName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {VEHICLE_TYPE_LABELS[runner.application.vehicle.type]}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Applied: {runner.application.createdAt?.toDate().toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Review panel */}
          <div>
            {selectedRunner ? (
              <div
                style={{
                  padding: '24px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                }}
              >
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  {selectedRunner.application.displayName}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                  {selectedRunner.application.email} • {selectedRunner.application.phone}
                </p>

                {/* Vehicle Details */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Vehicle Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Type</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {VEHICLE_TYPE_LABELS[selectedRunner.application.vehicle.type]}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Make/Model</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.vehicle.make} {selectedRunner.application.vehicle.model} ({selectedRunner.application.vehicle.year})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Color</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.vehicle.color}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>License Plate</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.vehicle.licensePlate}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equipment Details */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Equipment & Capacity
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Equipment</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.equipment.hasDolly && '🛒 Dolly '}
                        {selectedRunner.application.equipment.hasStraps && '🪢 Straps '}
                        {selectedRunner.application.equipment.hasFurnitureBlankets && '🧺 Blankets'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Max Weight</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.equipment.maxWeightCapacity} lbs
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Vehicle Capacity</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.equipment.vehicleCapacity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Runner Preferences
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Interstate Delivery</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.preferences.interstateDelivery ? '✅ Yes' : '❌ No'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Long Haul Routes</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.preferences.longHaulRoutes ? '✅ Yes' : '❌ No'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Hub-to-Hub Only</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.preferences.hubToHubOnly ? '✅ Yes' : '❌ No'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Max Distance</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.preferences.maxDistancePerRoute} miles
                      </div>
                    </div>
                  </div>
                  {selectedRunner.application.preferences.preferredRegions.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Preferred Regions</div>
                      <div style={{ fontSize: '14px', fontWeight: '500' }}>
                        {selectedRunner.application.preferences.preferredRegions.join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    Documents
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={selectedRunner.application.driversLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      📄 Driver's License
                    </a>
                    <a
                      href={selectedRunner.application.insuranceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      📄 Insurance
                    </a>
                    <a
                      href={selectedRunner.application.vehicleRegistrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: 'white',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      📄 Registration
                    </a>
                  </div>
                </div>

                {/* Review Notes */}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Review Notes (optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about this application..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Rejection Reason */}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Rejection Reason (required if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why the application is being rejected..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: processing ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: processing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ✅ APPROVE & SET RUNNER CLAIM
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background:
                        processing || !rejectionReason.trim() ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor:
                        processing || !rejectionReason.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ❌ REJECT
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '40px',
                  background: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                <p style={{ fontSize: '16px' }}>
                  Select an application from the list to review
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
