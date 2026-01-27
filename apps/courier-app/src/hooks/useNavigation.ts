import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationContext } from '@/contexts/NavigationContext';
import { useMapboxDirections } from './useMapboxDirections';
import type { Job } from '@/lib/v2/types';
import type { CourierLocation, ItemLocation } from '@/lib/v2/types';

/**
 * Hook for managing navigation flow
 * Combines NavigationContext with routing and API calls
 */
export function useNavigation() {
  const navigate = useNavigate();
  const context = useNavigationContext();
  const { fetchRoute, loading: routeLoading, error: routeError } = useMapboxDirections();

  /**
   * Start navigation for a job
   * Fetches route and navigates to full-screen navigation view
   */
  const startNavigationForJob = useCallback(async (
    job: Job,
    courierLocation: CourierLocation,
    destination: ItemLocation
  ) => {
    if (!destination) {
      throw new Error('Destination location is required');
    }

    console.log('🚀 Starting navigation for job', { jobId: job.id, destination });

    try {
      // Fetch route from Mapbox
      const routeData = await fetchRoute(
        [courierLocation.lng, courierLocation.lat],
        [destination.lng, destination.lat]
      );

      if (!routeData) {
        throw new Error('No route data returned');
      }
      
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
  }, [context, fetchRoute, navigate]);

  /**
   * Stop navigation and return to job detail page
   */
  const stopNavigation = useCallback(() => {
    const jobId = context.currentJob?.id;
    
    context.stopNavigation();
    
    if (jobId) {
      navigate(`/jobs/${jobId}`);
    } else {
      navigate('/dashboard');
    }
  }, [context, navigate]);

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
