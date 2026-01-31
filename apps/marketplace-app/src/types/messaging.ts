import { Timestamp } from "firebase/firestore";

export type MessageType = "text" | "photo" | "system";

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: Record<
    string,
    {
      displayName: string;
      photoURL?: string;
    }
  >;
  orderId?: string;
  itemId?: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastMessageSenderId: string;
  lastMessageType: MessageType;
  unreadCount: Record<string, number>;
  isArchived: Record<string, boolean>;
  isMuted: Record<string, boolean>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  recipientId: string;
  text?: string;
  photoURL?: string;
  type: MessageType;
  isRead: boolean;
  readAt?: Timestamp;
  isDelivered: boolean;
  deliveredAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
