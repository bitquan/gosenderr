import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  status: string;
}

export default function ItemsListPage() {
  const { uid } = useAuthUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uid === undefined) return;
    if (!uid) {
      setLoading(false);
      return;
    }

    loadItems();
  }, [uid]);

  const loadItems = async () => {
    try {
      // E2E override
      if (typeof window !== 'undefined' && (window as any).__E2E_MARKETPLACE_ITEMS) {
        const injected = (window as any).__E2E_MARKETPLACE_ITEMS as any[];
        const itemsList = injected.map((it) => ({ id: it.id, title: it.title, description: it.description, price: it.price, status: it.status })) as Item[];
        setItems(itemsList);
      } else {
        const itemsQuery = query(collection(db, "marketplaceItems"), where("vendorId", "==", uid));
        const snapshot = await getDocs(itemsQuery);
        const itemsList = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as Item[];
        setItems(itemsList);
      }
    } catch (error) {
      console.error('Failed to load items', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Items</h1>
        {items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <p className="text-gray-600">No items yet</p>
            <Link to="/vendor/items/new" className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">Create Item</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg flex-1">{item.title}</h3>
                    <Badge>{item.status}</Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">${item.price}</span>
                    <div className="flex gap-2">
                      <Link to={`/vendor/items/${item.id}/edit`} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Edit</Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
