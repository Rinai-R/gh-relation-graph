export interface UserNode {
  login: string;
  id: number;
  avatarUrl: string;
  name: string;
  bio: string;
  company: string;
  location: string;
  followers: number;
  following: number;
  depth: number;
}

export interface Edge {
  source: string;
  target: string;
}

export interface Graph {
  nodes: UserNode[];
  edges: Edge[];
  centerUser: string;
  maxDepth: number;
}

export interface MutualFollowResult {
  userA: string;
  userB: string;
  mutualUsers: UserNode[];
  count: number;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  mutualFollows: number;
  nodesByDepth: Record<number, number>;
  topFollowed: UserNode[];
  topFollowing: UserNode[];
  avgFollowers: number;
  avgFollowing: number;
}

export interface FollowListResult {
  followers: UserNode[];
  following: UserNode[];
}

export interface BFSProgress {
  currentUser: string;
  currentDepth: number;
  nodesFound: number;
  edgesFound: number;
  queueSize: number;
  status: 'running' | 'rate_limited' | 'completed' | 'error';
}

export interface AuthStatus {
  isAuthenticated: boolean;
  user: UserNode | null;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: string;
}

export interface DeviceFlowResult {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}
