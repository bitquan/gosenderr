
import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';

interface CustomerConfirmationProps {
  deliveryJobId: string;
  deliveredAt: Timestamp;
  confirmationDeadline: Timestamp;
  onConfirm: (received: boolean, disputeReason?: string) => Promise<void>;
  alreadyConfirmed?: boolean;
  confirmedAt?: Timestamp;
  autoConfirmed?: boolean;
}

export function CustomerConfirmation({
  deliveryJobId,
  deliveredAt,
  confirmationDeadline,
  onConfirm,
  alreadyConfirmed = false,
  confirmedAt,
  autoConfirmed = false,
}: CustomerConfirmationProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  // Calculate time remaining
  useEffect(() => {
    if (alreadyConfirmed) return;

    const updateTimeRemaining = () => {
      const now = Date.now();
      const deadline = confirmationDeadline.toMillis();
      const remaining = deadline - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining(`${hours}h ${minutes}m remaining`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [confirmationDeadline, alreadyConfirmed]);

  const handleConfirmReceived = async () => {
    setConfirming(true);
    try {
      await onConfirm(true);
      // Success - component will re-render with confirmed state
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
      setConfirming(false);
      // Error message could be displayed via toast/inline here
    }
  };

  const handleReportIssue = async () => {
    if (!disputeReason.trim()) {
      // Could show inline error message here instead
      return;
    }

    setConfirming(true);
    try {
      await onConfirm(false, disputeReason);
      // Success - component will re-render or navigate away
    } catch (error) {
      console.error('Failed to report issue:', error);
      setConfirming(false);
      // Error message could be displayed via toast/inline here
    }
  };

  // Already confirmed
  if (alreadyConfirmed) {
    return (
      <div
        style={{
          background: autoConfirmed ? '#f3f4f6' : '#dcfce7',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid ' + (autoConfirmed ? '#d1d5db' : '#86efac'),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '32px' }}>{autoConfirmed ? '⏱️' : '✅'}</div>
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: autoConfirmed ? '#374151' : '#16a34a',
              }}
            >
              {autoConfirmed ? 'Auto-Confirmed' : 'Delivery Confirmed'}
            </div>
            {confirmedAt && (
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {autoConfirmed
                  ? `Auto-confirmed on ${confirmedAt.toDate().toLocaleDateString()}`
                  : `Confirmed on ${confirmedAt.toDate().toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
        {autoConfirmed && (
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            No response was received within 72 hours, so the delivery was automatically confirmed.
          </div>
        )}
      </div>
    );
  }

  // Needs confirmation
  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        border: '2px solid #f59e0b',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '32px' }}>⚠️</div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#000' }}>
            CONFIRM RECEIPT
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
            Did you receive your delivery?
          </div>
        </div>
      </div>

      {!showDisputeForm && (
        <>
          <div
            style={{
              background: '#fef3c7',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#92400e',
              marginBottom: '16px',
            }}
          >
            ⏰ {timeRemaining}
            <div style={{ marginTop: '4px', fontSize: '13px' }}>
              Failure to respond within 72 hours will result in automatic confirmation and invalid
              future claims.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleConfirmReceived}
              disabled={confirming}
              style={{
                flex: 1,
                padding: '16px',
                background: confirming ? '#9ca3af' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: confirming ? 'not-allowed' : 'pointer',
              }}
            >
              {confirming ? 'Confirming...' : '✅ Yes, I received it'}
            </button>

            <button
              onClick={() => setShowDisputeForm(true)}
              disabled={confirming}
              style={{
                flex: 1,
                padding: '16px',
                background: confirming ? '#9ca3af' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: confirming ? 'not-allowed' : 'pointer',
              }}
            >
              ❌ Report Issue
            </button>
          </div>
        </>
      )}

      {showDisputeForm && (
        <div>
          <div
            style={{
              background: '#fee2e2',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#991b1b',
              marginBottom: '16px',
            }}
          >
            ⚠️ Please provide details about the issue with your delivery.
          </div>

          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the issue (e.g., item not delivered, item damaged, wrong item, etc.)"
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              resize: 'vertical',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowDisputeForm(false)}
              disabled={confirming}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: confirming ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleReportIssue}
              disabled={confirming || !disputeReason.trim()}
              style={{
                flex: 1,
                padding: '12px',
                background: confirming || !disputeReason.trim() ? '#9ca3af' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: confirming || !disputeReason.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {confirming ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
