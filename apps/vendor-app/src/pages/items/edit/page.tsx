import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";

export default function EditItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !id) return;
    setLoading(true);

    try {
      // E2E hook to capture updates
      if (typeof window !== 'undefined' && (window as any).__E2E_ON_UPDATE) {
        (window as any).__E2E_ON_UPDATE({ id, title });
        navigate('/vendor/dashboard');
        return;
      }

      await updateDoc(doc(db, `marketplaceItems/${id}`), { title });
      navigate('/vendor/dashboard');
    } catch (err) {
      console.error(err);
      alert('Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Edit Item</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
