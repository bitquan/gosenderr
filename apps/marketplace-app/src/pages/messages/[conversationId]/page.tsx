import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { messagingService } from "@/services/messaging.service";
import type { Conversation, Message } from "@/types/messaging";

const formatTimestamp = (date: any) => {
  const value = date?.toDate?.();
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
};

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { uid } = useAuthUser();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [isFullScreen, setIsFullScreen] = useState(
    Boolean((location.state as { fullscreen?: boolean } | null)?.fullscreen)
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    const convoRef = doc(db, "conversations", conversationId);
    const unsubscribe = onSnapshot(convoRef, (snapshot) => {
      if (!snapshot.exists()) {
        setConversation(null);
        setLoading(false);
        return;
      }
      setConversation({
        id: snapshot.id,
        ...(snapshot.data() as Omit<Conversation, "id">),
      });
      setLoading(false);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc")),
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Message, "id">),
        }));
        setMessages(items);
      }
    );

    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (conversation) {
      setLoading(false);
    }
  }, [conversationId, conversation]);

  useEffect(() => {
    if (!conversationId || !uid) return;
    messagingService.markConversationRead(conversationId, uid).catch(() => undefined);
  }, [conversationId, uid]);

  useEffect(() => {
    if (!loading && messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [loading, messages.length]);

  const otherParticipant = useMemo(() => {
    if (!conversation || !uid) return null;
    const otherId = conversation.participants.find((id) => id !== uid);
    if (!otherId) return null;
    return {
      id: otherId,
      ...conversation.participantDetails?.[otherId],
    };
  }, [conversation, uid]);

  const handleSend = async () => {
    if (!conversationId || !uid || !otherParticipant?.id || !text.trim()) return;
    setSending(true);
    try {
      await messagingService.sendMessage({
        conversationId,
        senderId: uid,
        recipientId: otherParticipant.id,
        text: text.trim(),
      });
      setText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h2>
        <button
          onClick={() => navigate("/messages")}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Back to messages
        </button>
      </div>
    );
  }

  const pageContent = (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            {otherParticipant?.photoURL ? (
              <img
                src={otherParticipant.photoURL}
                alt={otherParticipant.displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-semibold">
                {otherParticipant?.displayName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">
                {otherParticipant?.displayName || "User"}
              </h2>
              {conversation.itemId && (
                <Link
                  to={`/marketplace/${conversation.itemId}`}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  View item
                </Link>
              )}
            </div>
          </div>
          </div>
          <button
            onClick={() => setIsFullScreen(true)}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Full screen
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start the conversation</h3>
            <p className="text-sm text-gray-600 mb-6">
              Send a quick message to get the chat going.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setText("Hi! Is this still available?")}
                className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700"
              >
                Hi! Is this still available?
              </button>
              <button
                onClick={() => setText("Can we schedule a pickup?")}
                className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700"
              >
                Can we schedule a pickup?
              </button>
              <button
                onClick={() => inputRef.current?.focus()}
                className="px-4 py-2 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-700"
              >
                Type a message
              </button>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === uid;
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isMine
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-900 border border-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <div
                    className={`mt-2 text-[11px] ${
                      isMine ? "text-purple-100" : "text-gray-400"
                    }`}
                  >
                    {formatTimestamp(message.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-gray-200 bg-white sticky bottom-0">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  if (!isFullScreen) {
    return pageContent;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full h-full max-w-5xl max-h-[92vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullScreen(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
            <div className="font-semibold text-gray-900">
              {otherParticipant?.displayName || "Conversation"}
            </div>
          </div>
          {conversation?.itemId && (
            <Link
              to={`/marketplace/${conversation.itemId}`}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              View item
            </Link>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {pageContent}
        </div>
      </div>
    </div>
  );
}
