export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface Message {
  id: string;
  channelId?: string;
  conversationId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  reactions: MessageReaction[];
  threadCount: number;
  isPinned: boolean;
  isSaved: boolean;
  mentions: string[];
  attachments?: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file' | 'video';
  size: number;
}

export interface ThreadMessage extends Message {
  parentMessageId: string;
}

export interface MessageState {
  messages: Message[];
  threadMessages: ThreadMessage[];
  activeThreadId: string | null;
  isLoading: boolean;
  error: string | null;
}
