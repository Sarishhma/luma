import { Workspace, WorkspaceMember, WorkspaceInvitation } from '../types/workspace.types';

const now = new Date();

export const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    description: 'Main workspace for Acme Corporation',
    avatar: '🏢',
    ownerId: 'user-1',
    memberCount: 28,
    createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'ws-2',
    name: 'StartupHub',
    slug: 'startuphub',
    description: 'Early-stage startup collaboration',
    avatar: '🚀',
    ownerId: 'user-2',
    memberCount: 8,
    createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'ws-3',
    name: 'College Project',
    slug: 'college-project',
    description: 'Senior capstone design project',
    avatar: '🎓',
    ownerId: 'user-3',
    memberCount: 5,
    createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
  },
];

export const mockWorkspaceMembers: WorkspaceMember[] = [
  {
    id: 'wm-1',
    userId: 'user-1',
    workspaceId: 'ws-1',
    role: 'OWNER',
    email: 'sarah@acme.com',
    name: 'Sarah Chen',
    avatar: '👩‍💼',
    status: 'online',
    joinedAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'wm-2',
    userId: 'user-2',
    workspaceId: 'ws-1',
    role: 'ADMIN',
    email: 'james@acme.com',
    name: 'James Smith',
    avatar: '👨‍💼',
    status: 'online',
    joinedAt: new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'wm-3',
    userId: 'user-3',
    workspaceId: 'ws-1',
    role: 'MEMBER',
    email: 'alex@acme.com',
    name: 'Alex Rodriguez',
    avatar: '👨‍🎨',
    status: 'away',
    joinedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'wm-4',
    userId: 'user-4',
    workspaceId: 'ws-1',
    role: 'MEMBER',
    email: 'maya@acme.com',
    name: 'Maya Patel',
    avatar: '👩‍💻',
    status: 'offline',
    joinedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
  },
];

export const mockInvitations: WorkspaceInvitation[] = [
  {
    id: 'inv-1',
    workspaceId: 'ws-1',
    email: 'david@external.com',
    role: 'MEMBER',
    status: 'pending',
    invitedBy: 'user-1',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    expiresAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
  },
];
