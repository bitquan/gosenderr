
import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { createPaymentIntent } from '@/lib/cloudFunctions';
import { getStripePromise } from '@/lib/stripeConfig';

const stripePromise = getStripePromise();

interface PaymentFormProps {
  jobId: string;
  courierRate: number;
  platformFee: number;
  onSuccess: (paymentIntentId?: string) => void;
}

interface CheckoutFormProps extends PaymentFormProps {
  clientSecret: string | null;
  useFallback: boolean;
  onElementReady: () => void;
}

function CheckoutForm({
  jobId,
  clientSecret,
  courierRate,
  platformFee,
  onSuccess,
  useFallback,
  onElementReady,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  const totalAmount = courierRate + platformFee;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (useFallback) {
        const card = elements.getElement(CardElement);
        if (!card || !clientSecret) {
          throw new Error('Card form not ready. Please try again.');
        }

        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card },
          return_url: `${window.location.origin}/payment?jobId=${encodeURIComponent(jobId)}`,
        });

        if (error) {
          setErrorMessage(error.message || 'An unexpected error occurred.');
          setIsProcessing(false);
          return;
        }
      } else {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/payment?jobId=${encodeURIComponent(jobId)}`,
          },
          redirect: 'if_required',
        });

        if (error) {
          setErrorMessage(error.message || 'An unexpected error occurred.');
          setIsProcessing(false);
          return;
        }
      }

      setPaymentComplete(true);
      onSuccess();
      setIsProcessing(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  if (paymentComplete) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
        <p className="font-semibold">Payment authorized</p>
        <p>Your payment method was saved and will be captured after delivery.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
        {useFallback ? (
          <div className="space-y-3">
            <CardElement />
            <p className="text-xs text-gray-500">
              Using basic card entry (Stripe Elements fallback).
            </p>
          </div>
        ) : (
          <PaymentElement onReady={onElementReady} />
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
      </button>

      <p className="text-sm text-gray-600 text-center">
        Payment will be pre-authorized and captured after successful delivery.
      </p>
    </form>
  );
}

export function PaymentForm({
  jobId,
  courierRate,
  platformFee,
  onSuccess,
}: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [useFallback, setUseFallback] = useState(true);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        const stripe = await getStripePromise();
        if (!stripe) {
          setStripeReady(false);
          setError("Stripe is not configured. Please contact support.");
          return;
        }
        setStripeReady(true);
        const result = await createPaymentIntent({
          jobId,
          courierRate,
          platformFee,
        });
        setClientSecret(result.clientSecret);
        setPaymentIntentId(result.paymentIntentId);
      } catch (err: any) {
        console.error('Payment intent creation failed:', err);
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientSecret();
  }, [jobId, courierRate, platformFee]);

  useEffect(() => {
    if (!clientSecret) return;
    if (!elementReady && !useFallback) {
      const timeout = window.setTimeout(() => {
        if (!elementReady) {
          setUseFallback(true);
        }
      }, 6000);

      return () => window.clearTimeout(timeout);
    }
  }, [clientSecret, elementReady, useFallback]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || stripeReady === false) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
        <p className="font-semibold">Error</p>
        <p>{error || "Stripe is unavailable. Please try again later."}</p>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
      },
    },
  };

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={options}>
      <CheckoutForm
        jobId={jobId}
        clientSecret={clientSecret}
        courierRate={courierRate}
        platformFee={platformFee}
        onSuccess={() => onSuccess(paymentIntentId || undefined)}
        useFallback={useFallback}
        onElementReady={() => setElementReady(true)}
      />
    </Elements>
  );
}
