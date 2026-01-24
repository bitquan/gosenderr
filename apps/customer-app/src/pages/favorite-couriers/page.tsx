"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

interface FavoriteCourier {
  id: string;
  courierId: string;
  courierName: string;
  courierPhoto?: string;
  rating: number;
  totalDeliveries: number;
  addedAt: any;
}

interface Courier {
  id: string;
  name: string;
  photoURL?: string;
  rating: number;
  totalDeliveries: number;
}

export default function FavoriteCouriersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<FavoriteCourier[]>([]);
  const [availableCouriers, setAvailableCouriers] = useState<Courier[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.uid);
      await fetchFavorites(user.uid);
      await fetchAvailableCouriers();
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchFavorites = async (uid: string) => {
    const q = query(
      collection(db, "favoriteCouriers"),
      where("customerId", "==", uid),
    );
    const snapshot = await getDocs(q);
    const favs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FavoriteCourier[];
    setFavorites(favs);
  };

  const fetchAvailableCouriers = async () => {
    setLoading(true);
    const q = query(collection(db, "users"), where("role", "==", "runner"));
    const snapshot = await getDocs(q);
    const couriers = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "Unknown Senderr",
      photoURL: doc.data().photoURL,
      rating: doc.data().rating || 0,
      totalDeliveries: doc.data().totalDeliveries || 0,
    })) as Courier[];
    setAvailableCouriers(couriers);
    setLoading(false);
  };

  const handleAddFavorite = async (courier: Courier) => {
    if (!userId) return;

    // Check if already favorited
    const alreadyFavorited = favorites.some(
      (fav) => fav.courierId === courier.id,
    );
    if (alreadyFavorited) {
      alert("This Senderr is already in your favorites!");
      return;
    }

    try {
      await addDoc(collection(db, "favoriteCouriers"), {
        customerId: userId,
        courierId: courier.id,
        courierName: courier.name,
        courierPhoto: courier.photoURL || "",
        rating: courier.rating,
        totalDeliveries: courier.totalDeliveries,
        addedAt: serverTimestamp(),
      });

      alert("Senderr added to favorites!");
      if (userId) await fetchFavorites(userId);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding favorite:", error);
      alert("Failed to add Senderr to favorites");
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!confirm("Remove this Senderr from favorites?")) return;

    try {
      await deleteDoc(doc(db, "favoriteCouriers", favoriteId));
      setFavorites((prev) => prev.filter((fav) => fav.id !== favoriteId));
    } catch (error) {
      console.error("Error removing favorite:", error);
      alert("Failed to remove favorite");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Favorite Senderrs
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
          >
            {showAddForm ? "Cancel" : "+ Add Favorite"}
          </button>
        </div>

        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⭐</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Request your favorite Senderrs
                </p>
                <p className="text-xs text-gray-500">
                  When creating a delivery, you can request a preferred Senderr
                  from your favorites list for faster, more personalized
                  service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showAddForm && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Add Favorite Senderr</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availableCouriers
                  .filter(
                    (courier) =>
                      !favorites.some((fav) => fav.courierId === courier.id),
                  )
                  .map((courier) => (
                    <div
                      key={courier.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar
                          src={courier.photoURL}
                          fallback={courier.name}
                          size="md"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {courier.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>⭐ {courier.rating.toFixed(1)}</span>
                            <span>•</span>
                            <span>{courier.totalDeliveries} deliveries</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFavorite(courier)}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {favorites.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No favorite Senderrs yet
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Save your favorite Senderrs for faster delivery requests
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
              >
                Add Your First Favorite
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        fallback={favorite.courierName}
                        src={favorite.courierPhoto}
                        size="lg"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {favorite.courierName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>⭐ {favorite.rating.toFixed(1)}</span>
                          <span>•</span>
                          <span>{favorite.totalDeliveries} deliveries</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(favorite.id)}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition"
                  >
                    Remove from Favorites
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
