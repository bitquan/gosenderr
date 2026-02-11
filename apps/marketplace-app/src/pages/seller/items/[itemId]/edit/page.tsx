import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { Card, CardContent } from "@/components/ui/Card";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";

export default function EditSellerItem() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  useUserDoc();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [pickupLocation, setPickupLocation] = useState<{
    address: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "other",
    condition: "new",
    status: "available",
    quantity: "1",
    deliveryOptions: ["courier"],
  });

  const deliveryOptions = [
    { value: "courier", label: "Courier Delivery" },
    { value: "pickup", label: "Pickup" },
    { value: "shipping", label: "Shipping" },
  ];

  const parseAddressParts = (address: string) => {
    const parts = address.split(",").map((part) => part.trim());
    const [street, city, stateZip] = parts;
    const stateZipParts = (stateZip || "").split(" ").filter(Boolean);
    const state = stateZipParts[0] || "";
    return {
      street: street || address,
      city: city || "",
      state,
    };
  };

  useEffect(() => {
    if (!itemId) return;

    // If auth is still initializing, wait before attempting to load or authorize
    if (authLoading) {
      console.log('Auth still loading; waiting before loading item');
      return;
    }

    // If auth finished but there's no user, redirect to login
    if (uid == null) {
      console.warn('No authenticated user; redirecting to login');
      navigate('/login');
      return;
    }

    (async () => {
      // Mark not-ready before loading
      try {
        (window as any).__GOSENDERR_EDIT_FORM_READY = false;
      } catch (e) {}

      setLoading(true);
      try {
        const docRef = doc(db, "marketplaceItems", itemId as string);
        const snap = await getDoc(docRef);
        if (!snap.exists()) throw new Error("Item not found");
        const data: any = snap.data();

        // Only allow the seller to edit in the UI
        const ownerId = data.sellerId || null;
        if (ownerId !== uid) {
          console.warn('Unauthorized edit attempt: ownerId mismatch', { ownerId, uid, itemId, sellerId: data.sellerId });
          // Show more context in dev mode to aid debugging; keep generic alert in production
          if (import.meta.env.MODE !== 'production') {
            alert(`You are not authorized to edit this item (ownerId=${ownerId}, uid=${uid})`);
          } else {
            alert("You are not authorized to edit this item");
          }
          navigate("/seller/dashboard");
          return;
        }

        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: data.price?.toString() || "",
          category: data.category || "other",
          condition: data.condition || "new",
          status: data.status || "available",
          quantity: data.quantity?.toString() || "1",
          deliveryOptions: data.deliveryOptions || ["courier"],
        });
        setImages(data.images || data.photos || []);
        if (data.pickupLocation) {
          const pickupData = data.pickupLocation as any;
          const location = pickupData.location || pickupData;
          const lat = location?.latitude ?? location?.lat;
          const lng = location?.longitude ?? location?.lng;
          if (lat != null && lng != null) {
            setPickupLocation({
              address: pickupData.address || "",
              city: pickupData.city || "",
              state: pickupData.state || "",
              lat,
              lng,
            });
          }
        }
        console.log('EditPage loaded item data:', data);
      } catch (err) {
        console.error("Failed to load item:", err);
        alert("Failed to load item");
        navigate("/seller/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, uid, authLoading, navigate]);

  useEffect(() => {
    if (!loading) {
      console.log('EditPage render ready, loading:', loading, 'formData:', formData);
      try {
        const formExists = !!document.querySelector('[data-testid="edit-item-form"]');
        console.log('DOM check, form exists:', formExists);
        console.log('DOM buttons count:', document.querySelectorAll('button').length);
        console.log('DOM button texts:', Array.from(document.querySelectorAll('button')).map(b => b.textContent).join(' | '));
        try {
          (window as any).__GOSENDERR_EDIT_FORM_READY = formExists;
          console.log('Set window.__GOSENDERR_EDIT_FORM_READY', (window as any).__GOSENDERR_EDIT_FORM_READY);
        } catch (e) {
          console.log('Could not set window flag', e);
        }
      } catch (err) {
        console.log('DOM check error:', err);
      }
    }
  }, [loading]);

  // Clear flag when unmounting
  useEffect(() => {
    return () => {
      try {
        (window as any).__GOSENDERR_EDIT_FORM_READY = false;
      } catch (e) {}
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(Array.from(e.target.files).slice(0, 5));
    }
  };

  const uploadNewFiles = async () => {
    const urls: string[] = [];
    for (const file of newFiles) {
      const storageRef = ref(storage, `items/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const handleRemoveImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !uid) return;
    setSaving(true);

    try {
      const needsPickupLocation = formData.deliveryOptions.some(
        (option) => option === "courier" || option === "pickup",
      );
      if (needsPickupLocation && !pickupLocation) {
        alert("Please add a pickup location for courier or pickup delivery.");
        setSaving(false);
        return;
      }

      const uploaded = await uploadNewFiles();
      const newImages = [...images, ...uploaded];
      const deliveryOptions = formData.deliveryOptions.length > 0
        ? formData.deliveryOptions
        : ["courier"];

      const updatePayload: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price || "0"),
        quantity: Math.max(1, parseInt(formData.quantity || "1", 10)),
        images: newImages,
        photos: newImages,
        category: formData.category,
        condition: formData.condition,
        status: formData.status,
        deliveryOptions,
        pickupLocation: pickupLocation
          ? {
              address: pickupLocation.address,
              city: pickupLocation.city,
              state: pickupLocation.state,
              location: new GeoPoint(pickupLocation.lat, pickupLocation.lng),
            }
          : undefined,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "marketplaceItems", itemId), updatePayload);
      navigate("/seller/dashboard");
    } catch (err) {
      console.error("Failed to update item:", err);
      alert("Failed to update item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/seller/dashboard')} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">← Back</button>
          <h1 className="text-3xl font-bold mb-2">Edit Item</h1>
          <p className="text-blue-100">Update your marketplace listing</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <form data-testid="edit-item-form" onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {images.map((src, idx) => (
                    <div key={idx} className="relative">
                      <img src={src} alt={`img-${idx}`} className="w-full h-20 object-cover rounded-lg" />
                      <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 rounded-full border border-violet-200/80 bg-gradient-to-br from-violet-200/90 via-fuchsia-200/75 to-blue-200/80 p-1 text-sm">✕</button>
                    </div>
                  ))}
                </div>

                <input type="file" accept="image/*" multiple onChange={handleFileChange} className="block w-full text-sm text-gray-500" />
                {newFiles.length > 0 && <div className="mt-2 text-sm text-gray-600">New files: {newFiles.map(f => f.name).join(', ')}</div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                <input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Options *</label>
                <div className="space-y-2">
                  {deliveryOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.deliveryOptions.includes(option.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.deliveryOptions, option.value]
                            : formData.deliveryOptions.filter((value) => value !== option.value);
                          setFormData({ ...formData, deliveryOptions: next });
                        }}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Location</label>
                <AddressAutocomplete
                  label="Pickup Address"
                  placeholder="Enter pickup address..."
                  onSelect={(result) => {
                    const parsed = parseAddressParts(result.address);
                    setPickupLocation({
                      address: result.address,
                      city: parsed.city,
                      state: parsed.state,
                      lat: result.lat,
                      lng: result.lng,
                    });
                  }}
                  required={formData.deliveryOptions.some(
                    (option) => option === "courier" || option === "pickup",
                  )}
                />
                {pickupLocation && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    <div className="font-semibold">Pickup location set</div>
                    <div>{pickupLocation.address}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/seller/dashboard')} className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} data-testid="save-changes-btn" aria-label="save-changes" className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
