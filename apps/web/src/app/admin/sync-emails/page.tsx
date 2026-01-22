"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default function SyncEmailsPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<{
    updated: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, message]);
    console.log(message);
  };

  const syncEmails = async () => {
    setSyncing(true);
    setLog([]);
    setSummary(null);

    const auth = getAuthSafe();
    if (!auth?.currentUser) {
      alert("You must be logged in as admin");
      router.push("/admin-login");
      return;
    }

    addLog("🔄 Starting email sync from Firebase Auth to Firestore...");

    try {
      // Get all users from Firestore
      const usersSnapshot = await getDocs(collection(db, "users"));
      addLog(`📊 Found ${usersSnapshot.size} users in Firestore`);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      // We can't access Firebase Auth user list from client SDK
      // So we'll get the email from the auth object if the user is currently logged in
      // Instead, we'll need to handle this differently

      addLog("⚠️  Cannot access Firebase Auth user list from client SDK");
      addLog(
        "ℹ️  This would require Firebase Admin SDK (server-side) or Cloud Function",
      );
      addLog("");
      addLog("💡 Alternative approach: Ask users to re-login");
      addLog("   New signups will automatically have email saved to Firestore");
      addLog("");
      addLog("🔧 If you need to sync existing users:");
      addLog("   1. Use Firebase Console to export user emails");
      addLog("   2. Or create a Cloud Function with Admin SDK");
      addLog("   3. Or have users re-login (email will be synced)");

      setSummary({ updated, skipped, errors });
      addLog("\n✅ Analysis complete!");
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      console.error("Sync error:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold mb-2">Sync User Emails</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This tool syncs email addresses from Firebase Auth to Firestore user
          documents.
        </p>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            ⚠️ Client-Side Limitation
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            The Firebase client SDK cannot list all users. To sync existing
            users, you need:
          </p>
          <ul className="list-disc ml-6 mt-2 text-sm text-yellow-800 dark:text-yellow-300">
            <li>Firebase Admin SDK (server-side)</li>
            <li>Cloud Function with elevated privileges</li>
            <li>
              Or have existing users re-login (new users work automatically)
            </li>
          </ul>
        </div>

        <div className="mb-6">
          <button
            onClick={syncEmails}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {syncing ? "Analyzing..." : "Check Status"}
          </button>
        </div>

        {log.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
            {log.map((line, i) => (
              <div key={i} className="mb-1">
                {line}
              </div>
            ))}
          </div>
        )}

        {summary && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.updated}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Updated
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-2xl font-bold">{summary.skipped}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Skipped
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.errors}
              </div>
              <div className="text-sm text-red-800 dark:text-red-300">
                Errors
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold mb-3">Workaround Options:</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="font-semibold w-24">Option 1:</span>
              <span>
                Have users logout and login again - their email will be saved
                automatically
              </span>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold w-24">Option 2:</span>
              <span>
                Manually update user emails in Firebase Console → Firestore
              </span>
            </div>
            <div className="flex gap-3">
              <span className="font-semibold w-24">Option 3:</span>
              <span>
                Create a simple Cloud Function that runs once with Admin SDK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
