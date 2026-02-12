import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { messagingService } from "@/services/messaging.service";
import type { Conversation } from "@/types/messaging";

const formatDate = (date: any) => {
  const value = date?.toDate?.();
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { uid, loading: authLoading } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [startingChat, setStartingChat] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!uid) return;

    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(
      conversationsQuery,
      (snapshot) => {
        const results = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Conversation, "id">),
        }));
        setConversations(results);
        setLoading(false);
      },
      () => {
        setConversations([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, authLoading]);

  useEffect(() => {
    if (!uid) return;
    const otherUserId = searchParams.get("user") || searchParams.get("seller");
    if (!otherUserId) return;

    const itemId = searchParams.get("itemId") || undefined;
    const orderId = searchParams.get("orderId") || undefined;

    (async () => {
      setStartingChat(true);
      setStartError(null);
      try {
        const conversation = await messagingService.getOrCreateConversation({
          userId: uid,
          otherUserId,
          ...(itemId ? { itemId } : {}),
          ...(orderId ? { orderId } : {}),
        });
        navigate(`/messages/${conversation.id}`, {
          replace: true,
          state: { fullscreen: true },
        });
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setStartError("Failed to start conversation. Please try again.");
      } finally {
        setStartingChat(false);
      }
    })();
  }, [uid, searchParams, navigate]);

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.lastMessageAt?.toMillis?.() || 0;
      const bTime = b.lastMessageAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [conversations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-blue-100 mt-1">Chat with buyers and sellers</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {startError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {startError}
          </div>
        )}
        {startingChat ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Starting conversation...</h2>
            <p className="text-gray-600">Hang tight while we open the chat.</p>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h2>
            <p className="text-gray-600">Start a chat from any marketplace item.</p>
            <Link
              to="/marketplace"
              className="inline-flex mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold"
            >
              Browse items
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedConversations.map((conversation) => {
              const currentUserId = uid ?? "";
              const otherUserId =
                conversation.participants.find((id) => id !== currentUserId) || currentUserId;
              const participant = conversation.participantDetails?.[otherUserId];
              const unreadCount = conversation.unreadCount?.[currentUserId] || 0;

              return (
                <Link
                  key={conversation.id}
                  to={`/messages/${conversation.id}`}
                  state={{ fullscreen: true }}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {participant?.photoURL ? (
                        <img
                          src={participant.photoURL}
                          alt={participant.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                          {participant?.displayName?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {participant?.displayName || "User"}
                          </h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-500 text-white font-semibold">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {conversation.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(conversation.lastMessageAt)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
