import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";

export default function NewItemPage() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: 0,
    category: "",
    images: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "marketplaceItems"), {
        ...form,
        vendorId: uid,
        status: "draft",
        createdAt: new Date(),
      });
      navigate("/vendor/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">Create Item</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <input
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg"
              >
                {loading ? "Creating..." : "Create Item"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
