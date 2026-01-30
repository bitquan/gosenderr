import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { useMapboxDirections } from './useMapboxDirections';
import type { Job } from '@/lib/v2/types';
import type { CourierLocation } from '@/lib/v2/types';

/**
 * Hook for managing navigation flow
 * Combines NavigationContext with routing and API calls
 */
export function useNavigation() {
  const navigate = useNavigate();
  const context = useNavigationContext();
  const { route, fetchRoute, fetchJobRoute, loading: routeLoading, error: routeError, clearRoute } = useMapboxDirections();

  /**
   * Start navigation for a job
   * Fetches route and navigates to full-screen navigation view
   */
  const startNavigationForJob = useCallback(async (
    job: Job,
    courierLocation: CourierLocation,
    destination: any
  ) => {
    if (!destination) {
      throw new Error('Destination location is required');
    }

    console.log('🚀 Starting navigation for job', { jobId: job.id, destination });

    try {
      // Determine if this is to pickup or dropoff, and fetch the appropriate route
      const isToDropoff = ['picked_up', 'enroute_dropoff', 'arrived_dropoff'].includes(job.status);
      let routeData;

      if (isToDropoff) {
        // Direct route to dropoff
        routeData = await fetchRoute(
          [courierLocation.lng, courierLocation.lat],
          [destination.lng, destination.lat]
        );
      } else {
        // Full job route (through pickup to dropoff)
        routeData = await fetchJobRoute(
          [courierLocation.lng, courierLocation.lat],
          [job.pickup.lng, job.pickup.lat],
          [destination.lng, destination.lat]
        );
      }
      
      if (!routeData) {
        throw new Error('Failed to fetch route');
      }

      console.log('✅ Route fetched successfully:', { 
        jobId: job.id, 
        hasGeometry: !!routeData.geometry,
        coordinates: routeData.geometry?.coordinates?.length || 0
      });

      // Initialize navigation context with job and route
      context.startNavigation(job, routeData);

      // Navigate to full-screen navigation view
      navigate('/navigation/active', { 
        state: { jobId: job.id },
        replace: false 
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to start navigation:', error);
      throw error;
    }
  }, [context, fetchRoute, fetchJobRoute, navigate]);

  /**
   * Stop navigation and return to job detail page
   */
  const stopNavigation = useCallback(() => {
    const jobId = context.currentJob?.id;
    
    context.stopNavigation();
    clearRoute(); // Clear the route from directions hook
    
    if (jobId) {
      navigate(`/jobs/${jobId}`);
    } else {
      navigate('/dashboard');
    }
  }, [context, navigate, clearRoute]);

  /**
   * Check if currently navigating
   */
  const isNavigating = context.isNavigating;

  /**
   * Get current navigation job
   */
  const currentJob = context.currentJob;

  return {
    // State
    isNavigating,
    currentJob,
    currentStep: context.currentStep,
    remainingSteps: context.remainingSteps,
    distanceToNextTurn: context.distanceToNextTurn,
    estimatedTimeRemaining: context.estimatedTimeRemaining,
    cameraMode: context.cameraMode,
    currentRoute: context.currentRoute,
    
    // Actions
    startNavigation: startNavigationForJob,
    stopNavigation,
    goToNextStep: context.goToNextStep,
    toggleCameraMode: context.toggleCameraMode,
    updateDistance: context.updateDistance,
    updateETA: context.updateETA,
    
    // Loading states
    isLoadingRoute: routeLoading,
    routeError,
  };
}
