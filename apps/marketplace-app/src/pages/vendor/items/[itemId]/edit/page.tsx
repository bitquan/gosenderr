import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { Card, CardContent } from "@/components/ui/Card";

export default function EditVendorItem() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { uid, loading: authLoading } = useAuthUser();
  useUserDoc();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "other",
    condition: "new",
    status: "available",
  });

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
        const docRef = doc(db, "items", itemId as string);
        const snap = await getDoc(docRef);
        if (!snap.exists()) throw new Error("Item not found");
        const data: any = snap.data();

        // Only allow the seller to edit in the UI
        // Backwards-compat: if `sellerId` is missing, fall back to `vendorId`.
        const ownerId = data.sellerId || data.vendorId || null;
        if (ownerId !== uid) {
          console.warn('Unauthorized edit attempt: ownerId mismatch', { ownerId, uid, itemId, sellerId: data.sellerId, vendorId: data.vendorId });
          // Show more context in dev mode to aid debugging; keep generic alert in production
          if (import.meta.env.MODE !== 'production') {
            alert(`You are not authorized to edit this item (ownerId=${ownerId}, uid=${uid})`);
          } else {
            alert("You are not authorized to edit this item");
          }
          navigate("/vendor/dashboard");
          return;
        }

        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: data.price?.toString() || "",
          category: data.category || "other",
          condition: data.condition || "new",
          status: data.status || "available",
        });
        setImages(data.images || data.photos || []);
        console.log('EditPage loaded item data:', data);
      } catch (err) {
        console.error("Failed to load item:", err);
        alert("Failed to load item");
        navigate("/vendor/dashboard");
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
      const uploaded = await uploadNewFiles();
      const newImages = [...images, ...uploaded];

      const updatePayload: any = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price || "0"),
        images: newImages,
        photos: newImages,
        category: formData.category,
        condition: formData.condition,
        status: formData.status,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "items", itemId), updatePayload);
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error("Failed to update item:", err);
      alert("Failed to update item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate('/vendor/dashboard')} className="flex items-center gap-2 text-white/90 hover:text-white mb-4">← Back</button>
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
                      <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-white rounded-full p-1 text-sm">✕</button>
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

              <div className="flex gap-3">
                <button type="button" onClick={() => navigate('/vendor/dashboard')} className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} data-testid="save-changes-btn" aria-label="save-changes" className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
