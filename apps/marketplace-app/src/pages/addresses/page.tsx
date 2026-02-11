"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { parseUsAddressComponents } from "@/lib/pickupPrivacy";

interface SavedAddress {
  id: string;
  name?: string;
  label?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  postalCode?: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

interface ParsedAddress {
  city: string;
  state: string;
  zipCode: string;
}

interface AddressSelection extends ParsedAddress {
  address: string;
  lat: number;
  lng: number;
}

export default function SavedAddressesPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddressName, setNewAddressName] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSelection | null>(null);

  const parseAddressParts = (address: string): ParsedAddress => {
    const parsed = parseUsAddressComponents(address);
    return {
      city: parsed.city,
      state: parsed.state,
      zipCode: parsed.zipCode,
    };
  };

  useEffect(() => {
    if (!user) return;

    const fetchAddresses = async () => {
      try {
        const q = query(
          collection(db, "savedAddresses"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const addressData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<SavedAddress, "id">),
        })) as SavedAddress[];
        setAddresses(addressData);
      } catch (error) {
        console.error("Error fetching addresses:", error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAddressName.trim()) {
      alert("Please add an address name");
      return;
    }
    if (!selectedAddress) {
      alert("Please select an address from autocomplete");
      return;
    }

    try {
      const payload = {
        userId: user.uid,
        name: newAddressName.trim(),
        label: newAddressName.trim(),
        address: selectedAddress.address,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zipCode: selectedAddress.zipCode,
        postalCode: selectedAddress.zipCode,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        isDefault: addresses.length === 0,
        createdAt: serverTimestamp(),
      };

      const createdDoc = await addDoc(collection(db, "savedAddresses"), {
        ...payload,
      });

      setAddresses((current) => [
        ...current.map((addr) => ({ ...addr, isDefault: payload.isDefault ? false : addr.isDefault })),
        { id: createdDoc.id, ...payload },
      ]);
      setIsAdding(false);
      setNewAddressName("");
      setSelectedAddress(null);
    } catch (error) {
      console.error("Error adding address:", error);
      alert("Failed to add address. Please try again.");
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      // Unset all defaults
      for (const addr of addresses) {
        if (addr.isDefault) {
          await updateDoc(doc(db, "savedAddresses", addr.id), {
            isDefault: false,
          });
        }
      }

      // Set new default
      await updateDoc(doc(db, "savedAddresses", addressId), {
        isDefault: true,
      });
      setAddresses((current) =>
        current.map((addr) => ({
          ...addr,
          isDefault: addr.id === addressId,
        })),
      );
    } catch (error) {
      console.error("Error setting default:", error);
      alert("Failed to set default address.");
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await deleteDoc(doc(db, "savedAddresses", addressId));
      setAddresses((current) => current.filter((addr) => addr.id !== addressId));
    } catch (error) {
      console.error("Error deleting address:", error);
      alert("Failed to delete address.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your frequently used addresses
            </p>
          </div>
          <Link
            to="/settings"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            ← Back to Settings
          </Link>
        </div>

        {/* Add New Address */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 text-lg hover:text-purple-600"
              >
                <span>{isAdding ? "−" : "+"}</span>
                <span>Add New Address</span>
              </button>
            </CardTitle>
          </CardHeader>
          {isAdding && (
            <CardContent>
              <form onSubmit={handleAddAddress} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddressName}
                    onChange={(e) => setNewAddressName(e.target.value)}
                    placeholder="e.g., Home, Work, Mom's House"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <AddressAutocomplete
                    label="Address"
                    placeholder="Search address..."
                    onSelect={(result) => {
                      const parsed = parseAddressParts(result.address);
                      setSelectedAddress({
                        address: result.address,
                        city: parsed.city,
                        state: parsed.state,
                        zipCode: parsed.zipCode,
                        lat: result.lat,
                        lng: result.lng,
                      });
                    }}
                    required
                  />
                  {selectedAddress && (
                    <p className="text-xs text-gray-600 mt-2">
                      {selectedAddress.city}
                      {selectedAddress.state ? `, ${selectedAddress.state}` : ""}
                      {selectedAddress.zipCode ? ` ${selectedAddress.zipCode}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewAddressName("");
                      setSelectedAddress(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Address List */}
        {loadingAddresses ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Loading addresses...
              </div>
            </CardContent>
          </Card>
        ) : addresses.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📍</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  No saved addresses yet
                </h3>
                <p className="text-sm text-gray-600">
                  Add your frequently used addresses for faster checkout
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <Card key={addr.id} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {addr.name}
                        </h3>
                        {addr.isDefault && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{addr.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {addr.city || parseAddressParts(addr.address).city}
                        {(addr.state || parseAddressParts(addr.address).state)
                          ? `, ${addr.state || parseAddressParts(addr.address).state}`
                          : ""}
                        {(addr.zipCode ||
                          addr.postalCode ||
                          parseAddressParts(addr.address).zipCode)
                          ? ` ${addr.zipCode || addr.postalCode || parseAddressParts(addr.address).zipCode}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="px-3 py-1 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                      >
                        Delete
                      </button>
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
