"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleEdit = () => {
    setDisplayName(user.displayName || "");
    setPhoneNumber(user.phoneNumber || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName("");
    setPhoneNumber("");
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Update Firebase Auth display name
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Update Firestore user document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName || null,
        phoneNumber: phoneNumber || null,
        updatedAt: new Date(),
      });

      setIsEditing(false);
      window.location.reload(); // Refresh to show updated data
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Profile</CardTitle>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <Avatar
                  src={user.photoURL ?? undefined}
                  fallback={user.displayName || user.email || undefined}
                  size="xl"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">
                    Profile Photo
                  </div>
                  <div className="text-xs text-gray-500">
                    Coming soon: Upload custom photo
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Email (cannot be changed)
                    </label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500">
                      {user.email}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-gray-500">Name</div>
                    <div className="font-semibold">{user.displayName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-semibold">{user.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Phone Number</div>
                    <div className="font-semibold">{user.phoneNumber || "—"}</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Manage Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
