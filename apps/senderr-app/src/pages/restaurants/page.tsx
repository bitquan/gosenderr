import { useEffect, useMemo, useState } from "react";
import { FoodPickupRestaurantDoc, FoodPickupRestaurantInput } from "@gosenderr/shared";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import {
  createFoodPickupRestaurant,
  subscribeFoodPickupRestaurantsByCourier,
  updateFoodPickupRestaurant,
} from "@/lib/foodPickup/restaurants";
import { uploadRestaurantPhoto } from "@/lib/storage/uploadRestaurantPhoto";

const EMPTY_FORM = {
  restaurantName: "",
  notes: "",
  pickupHours: "",
  cuisineTags: "",
};

export default function RestaurantsPage() {
  const { user, loading: authLoading } = useAuthUser();
  const { userDoc } = useUserDoc();
  const courierId = user?.uid ?? null;
  const isCourier = userDoc?.role === "courier";
  const courierName = useMemo(
    () => userDoc?.displayName || user?.displayName || user?.email || "Courier",
    [userDoc, user],
  );

  const [restaurants, setRestaurants] = useState<FoodPickupRestaurantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [location, setLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!courierId) return;
    const unsubscribe = subscribeFoodPickupRestaurantsByCourier(
      courierId,
      (docs) => {
        setRestaurants(docs);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [courierId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courierId || !location) {
      setStatusMessage("Please sign in and provide a pickup location.");
      return;
    }

    const tags = formState.cuisineTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload: FoodPickupRestaurantInput = {
      courierId,
      courierName,
      restaurantName: formState.restaurantName.trim(),
      location,
      cuisineTags: tags,
      notes: formState.notes.trim() || undefined,
      pickupHours: formState.pickupHours.trim() || undefined,
      isPublic,
    };

    if (!payload.restaurantName) {
      setStatusMessage("Give the restaurant a name before saving.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const restaurantId = editingId
        ? editingId
        : await createFoodPickupRestaurant(payload);

      if (editingId) {
        await updateFoodPickupRestaurant(editingId, payload);
      }

      if (photoFile) {
        const { url, path } = await uploadRestaurantPhoto(
          photoFile,
          courierId,
          restaurantId,
        );
        await updateFoodPickupRestaurant(restaurantId, {
          photoUrl: url,
          photoStoragePath: path,
        });
      }

      setStatusMessage(
        editingId ? "Restaurant updated!" : "Restaurant saved to Senderrplace.",
      );
      resetForm();
    } catch (error) {
      console.error("Restaurant save failed:", error);
      setStatusMessage("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setLocation(null);
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    setIsPublic(true);
    setEditingId(null);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = (restaurant: FoodPickupRestaurantDoc) => {
    setEditingId(restaurant.id);
    setFormState({
      restaurantName: restaurant.restaurantName,
      notes: restaurant.notes || "",
      pickupHours: restaurant.pickupHours || "",
      cuisineTags: restaurant.cuisineTags.join(", "),
    });
    setLocation(restaurant.location);
    setIsPublic(restaurant.isPublic);
    if (restaurant.photoUrl) {
      setPhotoPreview(restaurant.photoUrl);
    }
    setStatusMessage("Editing an existing restaurant. Save to update changes.");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-gray-600">Loading courier experience...</span>
      </div>
    );
  }

  if (!isCourier) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-semibold">Courier-only workspace</h1>
          <p className="text-gray-500">
            Only couriers can upload restaurant pickup details. Please make sure
            your profile includes courier access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-blue-300">
            Senderrplace Food Pickup
          </p>
          <h1 className="text-3xl font-bold">
            Save your favorite restaurants for every pickup.
          </h1>
          <p className="text-gray-300">
            Upload the restaurant profile, share a photo, and Senderr customers
            will see the location the next time they schedule a pickup.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-white/10 border border-white/20 rounded-3xl p-6 space-y-4 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              {editingId ? "Update restaurant" : "Add new restaurant"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-blue-200 hover:text-white"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-gray-200">
              Restaurant name
              <input
                value={formState.restaurantName}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    restaurantName: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-white outline-none"
                placeholder="Taco Market Downtown"
                required
              />
            </label>
            <label className="block text-sm font-medium text-gray-200">
              Cuisine tags
              <input
                value={formState.cuisineTags}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    cuisineTags: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-white outline-none"
                placeholder="mexican, late-night, pickup"
              />
            </label>
          </div>

          <AddressAutocomplete
            label="Restaurant address"
            placeholder="Search for the pickup address"
            required
            onSelect={(result) =>
              setLocation({
                address: result.address,
                lat: result.lat,
                lng: result.lng,
              })
            }
            value={location?.address || ""}
          />
          {location && (
            <p className="text-sm text-blue-200">
              Saved pickup spot: {location.address}
            </p>
          )}

          <label className="block text-sm font-medium text-gray-200">
            Optional notes
            <textarea
              value={formState.notes}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-white outline-none"
              rows={3}
              placeholder="Best pickup window, WIFI password, etc."
            />
          </label>
          <label className="block text-sm font-medium text-gray-200">
            Pickup hours (optional)
            <input
              value={formState.pickupHours}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  pickupHours: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-white outline-none"
              placeholder="Mon–Fri · 11a–10p"
            />
          </label>

          <div className="border-t border-white/10 pt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-200">
              Restaurant photo (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="mt-2 w-full text-sm text-white"
              />
            </label>
            <label className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="h-4 w-4 rounded border-white/40 text-blue-400 focus:ring-blue-400"
              />
              Show restaurant to every Senderrplace customer
            </label>
          </div>
          {photoPreview && (
            <div className="rounded-2xl border border-white/20 bg-white/5 p-2">
              <img
                src={photoPreview}
                alt="Restaurant preview"
                className="h-48 w-full rounded-2xl object-cover"
              />
            </div>
          )}

          {statusMessage && (
            <div className="text-sm text-blue-200">{statusMessage}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update restaurant" : "Save restaurant"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-blue-400">
                Published restaurants
              </p>
              <h2 className="text-2xl font-semibold">
                Ready for Senderrplace customers
              </h2>
            </div>
            <span className="text-sm text-gray-400">
              {restaurants.length} saved locations
            </span>
          </div>

          {loading && (
            <div className="text-center text-sm text-gray-300">Loading...</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {restaurants.map((restaurant) => (
              <article
                key={restaurant.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur hover:border-white/30 transition"
              >
                {restaurant.photoUrl && (
                  <div className="mb-3 h-36 overflow-hidden rounded-2xl bg-white/10">
                    <img
                      src={restaurant.photoUrl}
                      alt={restaurant.restaurantName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {restaurant.restaurantName}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {restaurant.location.address}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEdit(restaurant)}
                    className="text-sm text-blue-300 hover:text-white"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {restaurant.cuisineTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {restaurant.notes && (
                  <p className="mt-3 text-sm text-gray-300">
                    {restaurant.notes}
                  </p>
                )}
                {restaurant.pickupHours && (
                  <p className="mt-2 text-xs text-gray-400">
                    Hours: {restaurant.pickupHours}
                  </p>
                )}
                {restaurant.lastUsedAt && (
                  <p className="mt-2 text-xs text-gray-400">
                    Last used: {restaurant.lastUsedAt.toDate().toLocaleString()}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Shared with {restaurant.isPublic ? "Senderrplace" : "private"} customers
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
