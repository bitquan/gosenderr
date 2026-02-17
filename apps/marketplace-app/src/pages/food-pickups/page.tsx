import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { createFoodPickupRestaurant, toCityZipLabel, useFoodPickupRestaurants } from "@/lib/foodPickup";
import type { FoodPickupRestaurantDoc } from "@/lib/foodPickup";

function formatTags(tags: string[] | null | undefined) {
  const safeTags = Array.isArray(tags) ? tags : [];
  if (!safeTags.length) return "Everyday favorites";
  return safeTags.map((tag) => tag.toUpperCase()).join(" · ");
}

function formatUpdatedAt(restaurant: FoodPickupRestaurantDoc) {
  const raw = restaurant.updatedAt as any;
  if (!raw) return "just now";
  if (typeof raw.toDate === "function") return raw.toDate().toLocaleTimeString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "just now" : parsed.toLocaleTimeString();
}

export default function FoodPickupsPage() {
  const navigate = useNavigate();
  const { user, uid } = useAuthUser();
  const { restaurants, loading, error } = useFoodPickupRestaurants();
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisineTags, setCuisineTags] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [address, setAddress] = useState<{
    address: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    zipCode?: string;
    cityZip?: string;
  } | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  const hasManualAddress = manualAddress.trim().length > 0;
  const parsedManualLat = Number(manualLat);
  const parsedManualLng = Number(manualLng);
  const hasManualCoords = Number.isFinite(parsedManualLat) && Number.isFinite(parsedManualLng);
  const selectedLocation = address ?? (hasManualAddress && hasManualCoords
    ? {
        address: manualAddress.trim(),
        lat: parsedManualLat,
        lng: parsedManualLng,
      }
    : null);

  const heroStats = useMemo(() => {
    const restaurantsReady = restaurants.length;
    const averageTags = restaurantsReady
      ? Math.round(
          restaurants.reduce(
            (count, restaurant) => count + (Array.isArray(restaurant.cuisineTags) ? restaurant.cuisineTags.length : 0),
            0,
          ) /
            restaurantsReady,
        )
      : 0;

    const mostRecent = restaurants[0];
    return {
      restaurantsReady,
      averageTags,
      recentName: mostRecent?.restaurantName ?? "Senderrplace pick",
      updatedLabel: mostRecent ? formatUpdatedAt(mostRecent) : "just now",
    };
  }, [restaurants]);

  const handleSelect = (restaurant: FoodPickupRestaurantDoc) => {
    navigate(`/food-pickups/${restaurant.id}/order`);
  };

  const clearForm = () => {
    setRestaurantName("");
    setCuisineTags("");
    setPickupHours("");
    setNotes("");
    setPhotoUrl("");
    setAddress(null);
    setManualAddress("");
    setManualLat("");
    setManualLng("");
  };

  const handleSaveRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!uid) {
      navigate("/login?redirect=/food-pickups");
      return;
    }

    if (!selectedLocation) {
      setSaveError("Select an address or enter manual address + lat/lng.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await createFoodPickupRestaurant({
        courierId: uid,
        courierName: user?.displayName || user?.email?.split("@")[0] || "Senderr customer",
        restaurantName,
        location: {
          address: selectedLocation.address,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
        },
        publicLocation: {
          city: selectedLocation.city,
          state: selectedLocation.state,
          zipCode: selectedLocation.zipCode,
          cityZip: selectedLocation.cityZip,
        },
        cuisineTags: cuisineTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        pickupHours,
        notes,
        photoUrl,
        isPublic: true,
      });
      clearForm();
      setComposerOpen(false);
      setSaveSuccess("Restaurant saved. It will appear in the pickup list.");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to save restaurant.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-purple-200">
            Senderrplace Food Marketplace
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Order pickup from local restaurants vetted by Senderr couriers
          </h1>
          <p className="text-lg text-purple-100 max-w-3xl">
            Every Senderr courier can save a restaurant once, attach a photo, and the whole network can
            reuse that pickup spot.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Featured today</p>
              <p className="text-2xl font-semibold text-white">{heroStats.recentName}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Restaurants ready</p>
              <p className="text-2xl font-semibold text-white">{heroStats.restaurantsReady}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Average tags</p>
              <p className="text-2xl font-semibold text-white">{heroStats.averageTags}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Card variant="elevated" className="bg-white/10 border border-white/20 shadow-none">
            <CardContent className="space-y-4 pt-6">
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200">How it works</p>
              <h2 className="text-4xl font-bold tracking-tight">Customers can grow the food map</h2>
              <ol className="list-decimal space-y-2 pl-6 text-lg text-purple-100">
                <li>Add a restaurant pickup location with exact address details.</li>
                <li>Optionally add tags, notes, hours, and a photo URL to help other customers.</li>
                <li>Save it once and everyone can order pickup from that location.</li>
              </ol>
              <p className="text-purple-200">
                Public feed shows city + zip only. Exact address is protected for operations.
              </p>
              <div>
                <button
                  onClick={() => {
                    setComposerOpen((open) => !open);
                    setSaveError(null);
                  }}
                  className="rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-900 transition hover:bg-cyan-300"
                >
                  {composerOpen ? "Hide form" : "Add a restaurant"}
                </button>
              </div>
            </CardContent>
          </Card>

          {composerOpen && (
            <Card variant="elevated" className="bg-white/95 text-slate-900 border border-white/30">
              <CardHeader>
                <CardTitle>Add a pickup restaurant</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSaveRestaurant}>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Restaurant name *</label>
                    <input
                      value={restaurantName}
                      onChange={(event) => setRestaurantName(event.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="Example: Mama's Kitchen"
                    />
                  </div>
                  <AddressAutocomplete
                    label="Restaurant address (search)"
                    placeholder="Type and select an address"
                    onSelect={(result) => setAddress(result)}
                  />
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p className="font-semibold">If search fails, enter address manually</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Autocomplete needs a valid Mapbox token. Manual mode keeps BAT-023 unblocked.
                    </p>
                    <div className="mt-3 grid gap-3">
                      <input
                        value={manualAddress}
                        onChange={(event) => setManualAddress(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="Manual address (street, city, state)"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          value={manualLat}
                          onChange={(event) => setManualLat(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          placeholder="Latitude (e.g. 38.9072)"
                        />
                        <input
                          value={manualLng}
                          onChange={(event) => setManualLng(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2"
                          placeholder="Longitude (e.g. -77.0369)"
                        />
                      </div>
                    </div>
                  </div>
                  {selectedLocation && (
                    <p className="text-xs font-semibold text-emerald-700">
                      Location ready: {selectedLocation.address} ({selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)})
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Cuisine tags</label>
                      <input
                        value={cuisineTags}
                        onChange={(event) => setCuisineTags(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="tacos, halal, late-night"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Pickup hours</label>
                      <input
                        value={pickupHours}
                        onChange={(event) => setPickupHours(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="Mon-Fri 11AM-9PM"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Photo URL</label>
                    <input
                      value={photoUrl}
                      onChange={(event) => setPhotoUrl(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      rows={3}
                      placeholder="Parking, entrance tips, best pickup counter..."
                    />
                  </div>
                  {saveError && <p className="text-sm font-semibold text-red-600">{saveError}</p>}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save restaurant"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearForm();
                        setComposerOpen(false);
                        setSaveError(null);
                      }}
                      className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200">Ready for pickup</p>
              <h2 className="text-2xl font-semibold">Saved restaurant locations</h2>
            </div>
            <span className="rounded-full border border-white/30 px-4 py-1 text-sm text-white/70">
              Updated {heroStats.updatedLabel}
            </span>
          </div>

          {loading ? (
            <div className="text-center text-white/70">Loading restaurants...</div>
          ) : error ? (
            <div className="text-center text-red-200">Could not load restaurants. Check emulator/rules and try again.</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center text-white/60">No restaurants shared yet.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {restaurants.map((restaurant) => (
                <FoodPickupCard key={restaurant.id} restaurant={restaurant} onSelect={handleSelect} />
              ))}
            </div>
          )}
          {saveSuccess && <div className="text-center text-sm font-semibold text-emerald-200">{saveSuccess}</div>}
        </section>
      </div>
    </div>
  );
}

interface FoodPickupCardProps {
  restaurant: FoodPickupRestaurantDoc;
  onSelect: (restaurant: FoodPickupRestaurantDoc) => void;
}

function FoodPickupCard({ restaurant, onSelect }: FoodPickupCardProps) {
  return (
    <Card variant="elevated" className="bg-white/10 border border-white/20 shadow-none">
      <CardHeader>
        <CardTitle>{restaurant.restaurantName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-700 to-purple-800 p-4">
          {restaurant.photoUrl ? (
            <img
              src={restaurant.photoUrl}
              alt={restaurant.restaurantName}
              className="h-40 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-white/20 text-sm text-white/70">
              No photo yet
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm text-white/70">
          <div>{toCityZipLabel(restaurant)}</div>
          <div className="text-xs uppercase tracking-[0.4em] text-white/50">
            {formatTags(restaurant.cuisineTags)}
          </div>
          {restaurant.notes && <p className="text-white/80">{restaurant.notes}</p>}
          {restaurant.pickupHours && <p className="text-xs text-white/60">Hours: {restaurant.pickupHours}</p>}
        </div>
        <button
          onClick={() => onSelect(restaurant)}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:opacity-90"
        >
          Order pickup
        </button>
      </CardContent>
    </Card>
  );
}
