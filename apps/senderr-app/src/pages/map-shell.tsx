import React from "react";
import { useLocation, Navigate } from "react-router-dom";
import MapShellScreen from "../screens/MapShellScreen";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export default function MapShellPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const devPreview = params.get("dev_preview") === "1";

  const { flags, loading } = useFeatureFlags();

  if (loading) return null;

  const flagEnabled = flags?.delivery?.mapShell === true;

  if (!devPreview && !flagEnabled) {
    // Not allowed: redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <MapShellScreen devPreview={devPreview} />;
}
