export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  memberCount: number;
  createdAt: Date;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: TenantRole;
  email: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: TenantRole;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface WorkspaceState {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  isLoading: boolean;
  error: string | null;
}
