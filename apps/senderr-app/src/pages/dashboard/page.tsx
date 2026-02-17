import MapShellScreen from "@/screens/MapShellScreen";

export default function CourierDashboardPage() {
  const isDev = import.meta.env.DEV;
  return <MapShellScreen devPreview={isDev} />;
}
