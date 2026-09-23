export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelMember {
  id: string;
  userId: string;
  channelId: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface ChannelState {
  channels: Channel[];
  activeChannel: Channel | null;
  members: ChannelMember[];
  isLoading: boolean;
  error: string | null;
}
