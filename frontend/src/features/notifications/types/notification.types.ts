export type NotificationType = 'mention' | 'thread_reply' | 'reaction' | 'direct_message' | 'invitation' | 'workspace_event';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  relatedEntity?: {
    id: string;
    type: 'message' | 'channel' | 'conversation' | 'workspace';
  };
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}
