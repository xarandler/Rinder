export enum UserType {
  COMPANY = 'COMPANY',
  RESEARCHER = 'RESEARCHER',
  ADMIN = 'ADMIN'
}

export interface SocialLinks {
  website?: string;
  linkedin?: string;
  twitter?: string;
  universityProfile?: string;
}

export interface User {
  id: string;
  username: string; // Used for login
  password?: string; // Simplistic auth
  type: UserType;
  name: string; // Company Name or Researcher Name
  tagline: string;
  description: string;
  focusAreas: string[];
  skills?: string[]; // Researcher specific
  projects?: string[]; // Company specific
  imageUrl: string;
  links: SocialLinks;
  isBlocked: boolean;
}

export interface Match {
  id: string;
  users: [string, string]; // User IDs
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
}

export interface SwipeAction {
  actorId: string;
  targetId: string;
  action: 'like' | 'pass';
}
