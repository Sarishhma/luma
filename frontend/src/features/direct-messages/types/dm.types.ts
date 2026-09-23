export interface DirectMessage {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  participantIds: string[];
  participants: ConversationParticipant[];
  lastMessage?: DirectMessage;
  lastMessageAt: Date;
  isGroup: boolean;
  name?: string;
  avatar?: string;
  unreadCount: number;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
}

export interface DMState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: DirectMessage[];
  isLoading: boolean;
  error: string | null;
}
