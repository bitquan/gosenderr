"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BottomNav, adminNavItems } from "@/components/ui/BottomNav";
import { Avatar } from "@/components/ui/Avatar";

export default function AdminUsersNew() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        router.push("/");
        return;
      }

      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading users:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Change user role to "${newRole}"?`)) return;

    setUpdating(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update user role");
    } finally {
      setUpdating(null);
    }
  };

  const handleSuspendUser = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "unsuspend" : "suspend";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    setUpdating(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        suspended: !currentStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error suspending user:", error);
      alert("Failed to update user status");
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === "all" || user.role === filter;

    return matchesSearch && matchesFilter;
  });

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: "error",
      customer: "info",
      runner: "purple",
      package_runner: "purple",
    };
    return roleMap[role] || "default";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-purple-100 text-sm">
                {filteredUsers.length} users
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-purple-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: "All", value: "all" },
            { label: "Customers", value: "customer" },
            { label: "Runners", value: "package_runner" },
            { label: "Admins", value: "admin" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                filter === tab.value
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-purple-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {filteredUsers.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-600 text-lg">No users found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user: any) => (
            <Card key={user.id} variant="elevated" className="animate-fade-in">
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar fallback={user.displayName || user.email} size="lg" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {user.displayName || "No name"}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge variant={getRoleBadge(user.role) as any}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <p className="font-mono text-xs font-medium truncate">
                      {user.id}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="font-medium">
                      {user.suspended ? (
                        <span className="text-red-600">Suspended</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </p>
                  </div>
                </div>

                {user.packageRunnerProfile && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-xl">
                    <p className="text-xs text-purple-600 font-medium mb-1">
                      Runner Profile
                    </p>
                    <p className="text-sm text-gray-700">
                      Status: {user.packageRunnerProfile.status}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={updating === user.id}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="package_runner">Runner</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleSuspendUser(user.id, user.suspended)}
                    disabled={updating === user.id}
                    className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                      user.suspended
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    } disabled:bg-gray-400`}
                  >
                    {user.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNav items={adminNavItems} />
    </div>
  );
}
