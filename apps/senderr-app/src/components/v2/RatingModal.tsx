
import { useState, useEffect } from 'react';

export interface RatingModalProps {
  show: boolean;
  targetUser: {
    uid: string;
    displayName?: string;
    role: 'courier' | 'customer';
  };
  targetRole: 'customer_to_courier' | 'courier_to_customer';
  deliveryJobId: string;
  onSubmit: (rating: {
    stars: number;
    review?: string;
    categories?: {
      professionalism?: number;
      timeliness?: number;
      communication?: number;
      care?: number;
    };
  }) => Promise<void>;
  onClose: () => void;
}

export function RatingModal({
  show,
  targetUser,
  targetRole,
  deliveryJobId,
  onSubmit,
  onClose,
}: RatingModalProps) {
  const [overallStars, setOverallStars] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [timeliness, setTimeliness] = useState(0);
  const [careOrCommunication, setCareOrCommunication] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setOverallStars(0);
      setProfessionalism(0);
      setTimeliness(0);
      setCareOrCommunication(0);
      setReview('');
      setSubmitting(false);
      setError('');
    }
  }, [show]);

  // Close on ESC key
  useEffect(() => {
    if (!show) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (overallStars === 0) {
      setError('Please select an overall rating');
      return;
    }

    if (review.length > 500) {
      setError('Review must be 500 characters or less');
      return;
    }

    setSubmitting(true);

    try {
      const categories: any = {};
      if (professionalism > 0) categories.professionalism = professionalism;
      if (timeliness > 0) categories.timeliness = timeliness;
      
      if (targetRole === 'customer_to_courier') {
        if (careOrCommunication > 0) categories.care = careOrCommunication;
      } else {
        if (careOrCommunication > 0) categories.communication = careOrCommunication;
      }

      await onSubmit({
        stars: overallStars,
        review: review.trim() || undefined,
        categories: Object.keys(categories).length > 0 ? categories : undefined,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      setError(err.message || 'Failed to submit rating. Please try again.');
      setSubmitting(false);
    }
  };

  const isCourierRating = targetRole === 'customer_to_courier';
  const title = isCourierRating ? 'Rate Your Delivery' : 'Rate Customer';
  const thirdCategoryLabel = isCourierRating ? 'Care with item' : 'Communication';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            color: '#6b7280',
            padding: '8px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {/* Title */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#111827',
            }}
          >
            {title}
          </h2>

          {targetUser.displayName && (
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {targetUser.displayName}
            </p>
          )}

          {/* Overall Rating */}
          <div style={{ marginBottom: '32px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '500',
                marginBottom: '12px',
                color: '#111827',
              }}
            >
              Overall Rating *
            </label>
            <StarRating
              value={overallStars}
              onChange={setOverallStars}
              size="large"
              disabled={submitting}
            />
          </div>

          {/* Category Ratings */}
          <div style={{ marginBottom: '24px' }}>
            <p
              style={{
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '16px',
                color: '#6b7280',
              }}
            >
              Rate specific aspects (optional)
            </p>

            {/* Professionalism */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Professionalism
              </label>
              <StarRating
                value={professionalism}
                onChange={setProfessionalism}
                size="small"
                disabled={submitting}
              />
            </div>

            {/* Timeliness */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Timeliness
              </label>
              <StarRating
                value={timeliness}
                onChange={setTimeliness}
                size="small"
                disabled={submitting}
              />
            </div>

            {/* Care with item / Communication */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                {thirdCategoryLabel}
              </label>
              <StarRating
                value={careOrCommunication}
                onChange={setCareOrCommunication}
                size="small"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Review */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '8px',
                color: '#374151',
              }}
            >
              Review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience..."
              disabled={submitting}
              maxLength={500}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <p
              style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                textAlign: 'right',
              }}
            >
              {review.length}/500
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '14px', color: '#dc2626' }}>{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={overallStars === 0 || submitting}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: overallStars === 0 || submitting ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: overallStars === 0 || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </div>
  );
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'small' | 'large';
  disabled?: boolean;
}

function StarRating({ value, onChange, size = 'small', disabled = false }: StarRatingProps) {
  const starSize = size === 'large' ? 48 : 32;
  const gap = size === 'large' ? 8 : 4;

  return (
    <div style={{ display: 'flex', gap: `${gap}px` }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
            width: `${starSize}px`,
            height: `${starSize}px`,
            fontSize: `${starSize}px`,
            lineHeight: 1,
            color: star <= value ? '#fbbf24' : '#e5e7eb',
            transition: 'color 0.2s',
          }}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          {star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
