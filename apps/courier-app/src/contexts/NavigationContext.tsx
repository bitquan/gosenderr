import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { Job } from '@/lib/v2/types';
import type { RouteData, RouteStep } from '@/lib/navigation/types';

interface NavigationState {
  isNavigating: boolean;
  currentJob: Job | null;
  currentStep: RouteStep | null;
  remainingSteps: RouteStep[];
  distanceToNextTurn: number;
  estimatedTimeRemaining: number;
  currentRoute: RouteData | null;
  cameraMode: 'follow' | 'overview';
}

interface NavigationContextType extends NavigationState {
  startNavigation: (job: Job, route: RouteData) => void;
  stopNavigation: () => void;
  updateCurrentStep: (stepIndex: number) => void;
  updateDistance: (distance: number) => void;
  updateETA: (seconds: number) => void;
  toggleCameraMode: () => void;
  goToNextStep: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const initialState: NavigationState = {
  isNavigating: false,
  currentJob: null,
  currentStep: null,
  remainingSteps: [],
  distanceToNextTurn: 0,
  estimatedTimeRemaining: 0,
  currentRoute: null,
  cameraMode: 'follow',
};

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>(initialState);

  const startNavigation = useCallback((job: Job, route: RouteData) => {
    console.log('🧭 Starting navigation', { 
      jobId: job.id, 
      routeLegs: route.legs.length,
      hasGeometry: !!route.geometry,
      numCoordinates: route.geometry?.coordinates?.length,
      distance: route.distance,
      duration: route.duration
    });

    // Get all steps from all legs
    const allSteps = route.legs.flatMap(leg => leg.steps);

    // If Mapbox returned no steps (rare), synthesize a single step from the
    // overall route geometry so the navigation UI has something to render and
    // the ETA/distance values are populated.
    if (allSteps.length === 0) {
      console.warn('NavigationContext: no route steps returned, synthesizing a fallback step')

      const syntheticStep = {
        distance: route.distance,
        duration: route.duration,
        instruction: 'Follow route to destination',
        geometry: route.geometry,
        maneuver: {
          type: 'depart',
          instruction: 'Start navigation',
          location: route.geometry.coordinates[0],
        },
      } as any;

      setState({
        isNavigating: true,
        currentJob: job,
        currentRoute: route,
        currentStep: syntheticStep,
        remainingSteps: [],
        distanceToNextTurn: syntheticStep.distance,
        estimatedTimeRemaining: route.duration,
        cameraMode: 'follow',
      });

      return
    }

    setState({
      isNavigating: true,
      currentJob: job,
      currentRoute: route,
      currentStep: allSteps[0] || null,
      remainingSteps: allSteps.slice(1),
      distanceToNextTurn: allSteps[0]?.distance || 0,
      estimatedTimeRemaining: route.duration,
      cameraMode: 'follow',
    });
  }, []);

  const stopNavigation = useCallback(() => {
    console.log('🧭 Stopping navigation');
    setState(initialState);
  }, []);

  const updateCurrentStep = useCallback((stepIndex: number) => {
    setState(prev => {
      if (!prev.currentRoute) return prev;

      const allSteps = prev.currentRoute.legs.flatMap(leg => leg.steps);
      
      if (stepIndex >= allSteps.length) {
        // Navigation complete
        return {
          ...prev,
          currentStep: null,
          remainingSteps: [],
          distanceToNextTurn: 0,
        };
      }

      return {
        ...prev,
        currentStep: allSteps[stepIndex],
        remainingSteps: allSteps.slice(stepIndex + 1),
        distanceToNextTurn: allSteps[stepIndex]?.distance || 0,
      };
    });
  }, []);

  const goToNextStep = useCallback(() => {
    setState(prev => {
      if (!prev.currentRoute || prev.remainingSteps.length === 0) {
        return prev;
      }

      const nextStep = prev.remainingSteps[0];
      
      return {
        ...prev,
        currentStep: nextStep,
        remainingSteps: prev.remainingSteps.slice(1),
        distanceToNextTurn: nextStep.distance,
      };
    });
  }, []);

  const updateDistance = useCallback((distance: number) => {
    setState(prev => ({
      ...prev,
      distanceToNextTurn: distance,
    }));
  }, []);

  const updateETA = useCallback((seconds: number) => {
    setState(prev => ({
      ...prev,
      estimatedTimeRemaining: seconds,
    }));
  }, []);

  const toggleCameraMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      cameraMode: prev.cameraMode === 'follow' ? 'overview' : 'follow',
    }));
  }, []);

  // Persist navigation state to localStorage
  useEffect(() => {
    if (state.isNavigating) {
      localStorage.setItem('navigation_state', JSON.stringify({
        jobId: state.currentJob?.id,
        cameraMode: state.cameraMode,
      }));
    } else {
      localStorage.removeItem('navigation_state');
    }
  }, [state.isNavigating, state.currentJob?.id, state.cameraMode]);

  const value: NavigationContextType = {
    ...state,
    startNavigation,
    stopNavigation,
    updateCurrentStep,
    updateDistance,
    updateETA,
    toggleCameraMode,
    goToNextStep,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider');
  }
  return context;
}
