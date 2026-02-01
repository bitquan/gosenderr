import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Conversation, Message } from "@/types/messaging";

const normalizeName = (data: any) => {
  return data?.displayName || data?.name || data?.fullName || data?.email || "User";
};

const normalizePhoto = (data: any) => {
  return data?.photoURL || data?.avatarUrl || data?.profilePhotoUrl;
};

const getUserSummary = async (userId: string) => {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) {
    return { displayName: "User", photoURL: undefined };
  }
  const data = userSnap.data();
  return {
    displayName: normalizeName(data),
    photoURL: normalizePhoto(data),
  };
};

const buildConversationId = (userId: string, otherUserId: string, itemId?: string) => {
  const participants = [userId, otherUserId].sort();
  const baseId = participants.join("_");
  return itemId ? `${baseId}_item_${itemId}` : baseId;
};

export const messagingService = {
  async getOrCreateConversation(params: {
    userId: string;
    otherUserId: string;
    itemId?: string;
    orderId?: string;
  }) {
    const { userId, otherUserId, itemId, orderId } = params;
    const conversationId = buildConversationId(userId, otherUserId, itemId);
    const convoRef = doc(db, "conversations", conversationId);
    const convoSnap = await getDoc(convoRef);

    if (convoSnap.exists()) {
      return { id: convoSnap.id, ...(convoSnap.data() as Omit<Conversation, "id">) };
    }

    const participants = [userId, otherUserId].sort();
    const [userSummary, otherSummary] = await Promise.all([
      getUserSummary(userId),
      getUserSummary(otherUserId),
    ]);

    const payload: Omit<Conversation, "id"> = {
      participants,
      participantDetails: {
        [userId]: userSummary,
        [otherUserId]: otherSummary,
      },
      ...(orderId ? { orderId } : {}),
      ...(itemId ? { itemId } : {}),
      lastMessage: "",
      lastMessageAt: serverTimestamp() as any,
      lastMessageSenderId: userId,
      lastMessageType: "system",
      unreadCount: {
        [userId]: 0,
        [otherUserId]: 0,
      },
      isArchived: {
        [userId]: false,
        [otherUserId]: false,
      },
      isMuted: {
        [userId]: false,
        [otherUserId]: false,
      },
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    await setDoc(convoRef, payload);
    return { id: conversationId, ...payload } as Conversation;
  },

  async sendMessage(params: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    text: string;
  }) {
    const { conversationId, senderId, recipientId, text } = params;
    const senderSummary = await getUserSummary(senderId);
    const participants = [senderId, recipientId].sort();

    const messagePayload = {
      conversationId,
      senderId,
      senderName: senderSummary.displayName,
      senderPhotoURL: senderSummary.photoURL,
      recipientId,
      participants,
      text,
      type: "text" as const,
      isRead: false,
      isDelivered: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, "conversations", conversationId, "messages"), messagePayload);

    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: senderId,
      lastMessageType: "text",
      updatedAt: serverTimestamp(),
      [`unreadCount.${recipientId}`]: increment(1),
      [`unreadCount.${senderId}`]: 0,
    });
  },

  async markConversationRead(conversationId: string, userId: string) {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    );
    const messagesSnap = await getDocs(messagesQuery);
    const batch = writeBatch(db);
    messagesSnap.forEach((messageDoc) => {
      batch.update(messageDoc.ref, {
        isRead: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    batch.update(doc(db, "conversations", conversationId), {
      [`unreadCount.${userId}`]: 0,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  },

  async getConversation(conversationId: string) {
    const convoSnap = await getDoc(doc(db, "conversations", conversationId));
    if (!convoSnap.exists()) return null;
    return { id: convoSnap.id, ...(convoSnap.data() as Omit<Conversation, "id">) };
  },

  async getMessages(conversationId: string) {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages")
    );
    const snapshot = await getDocs(messagesQuery);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Message, "id">),
    }));
  },
};
