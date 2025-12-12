import { User, UserType, Match, Message, SwipeAction } from '../types';

class DataService {
  private users: User[] = [];
  private swipes: SwipeAction[] = [];
  private matches: Match[] = [];
  private messages: Message[] = [];
  private currentUser: User | null = null;
  private initialized = false;

  constructor() {
    this.loadState();
  }

  // Persist state to local storage (Simulation of DB write)
  private saveState() {
    // We only save 'dynamic' data to local storage. 
    // New registered users are saved to 'custom_users'.
    // Blocked status is saved to 'blocked_users'.
    // Swipes and matches are saved.
    
    // In a real file-system app, we would write to users.json here.
    // Since browsers can't write to disk, we use LocalStorage to simulate persistence for new users.
    localStorage.setItem('rc_swipes', JSON.stringify(this.swipes));
    localStorage.setItem('rc_matches', JSON.stringify(this.matches));
    localStorage.setItem('rc_messages', JSON.stringify(this.messages));
  }

  private loadState() {
    const s = localStorage.getItem('rc_swipes');
    if (s) this.swipes = JSON.parse(s);
    
    const m = localStorage.getItem('rc_matches');
    if (m) this.matches = JSON.parse(m);

    const msg = localStorage.getItem('rc_messages');
    if (msg) this.messages = JSON.parse(msg);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Fetch the external database (JSON file)
      const response = await fetch('/users.json');
      if (!response.ok) throw new Error('Failed to load user database');
      const fileUsers: User[] = await response.json();

      // 2. Load locally registered users (Simulation of writing to DB)
      const localUsersJson = localStorage.getItem('rc_custom_users');
      const localUsers: User[] = localUsersJson ? JSON.parse(localUsersJson) : [];

      // 3. Load blocked status overrides
      const blockedIdsJson = localStorage.getItem('rc_blocked_ids');
      const blockedIds: string[] = blockedIdsJson ? JSON.parse(blockedIdsJson) : [];
      const blockedSet = new Set(blockedIds);

      // 4. Merge
      // Start with file users, then add local users.
      // If a user exists in both, local takes precedence (simple update logic) or we append.
      // Here we assume IDs are unique enough or valid.
      
      const mergedUsers = [...fileUsers];
      
      localUsers.forEach(lu => {
         const existingIndex = mergedUsers.findIndex(u => u.id === lu.id);
         if (existingIndex >= 0) {
             mergedUsers[existingIndex] = lu;
         } else {
             mergedUsers.push(lu);
         }
      });

      // Apply blocked status
      this.users = mergedUsers.map(u => ({
          ...u,
          isBlocked: blockedSet.has(u.id) ? true : u.isBlocked
      }));

      this.initialized = true;
    } catch (e) {
      console.error("Initialization error:", e);
      // Fallback empty if file missing
      this.users = []; 
      this.initialized = true;
    }
  }

  // Auth
  login(username: string, password?: string): User | null {
    const user = this.users.find(u => u.username === username);
    if (!user) return null;
    if (user.isBlocked) throw new Error("Account blocked by administrator.");
    
    // Simple password check for admin
    if (user.type === UserType.ADMIN) {
      if (password !== user.password) return null;
    }
    
    this.currentUser = user;
    return user;
  }

  register(user: Omit<User, 'id' | 'isBlocked'>): User {
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      isBlocked: false
    };
    
    this.users.push(newUser);
    this.currentUser = newUser;
    
    // Persist new user to local storage
    const localUsersJson = localStorage.getItem('rc_custom_users');
    const localUsers: User[] = localUsersJson ? JSON.parse(localUsersJson) : [];
    localUsers.push(newUser);
    localStorage.setItem('rc_custom_users', JSON.stringify(localUsers));

    return newUser;
  }

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Matching Logic
  getPotentials(filterFocusArea?: string, targetType?: UserType): User[] {
    if (!this.currentUser) return [];

    // Filter out users already swiped
    const swipedIds = new Set(
      this.swipes
        .filter(s => s.actorId === this.currentUser?.id)
        .map(s => s.targetId)
    );

    let candidates = this.users.filter(u => 
      u.id !== this.currentUser?.id && 
      !u.isBlocked &&
      !swipedIds.has(u.id) &&
      u.type !== UserType.ADMIN
    );

    // Type Logic
    if (this.currentUser.type === UserType.COMPANY) {
      // Companies only see Researchers
      candidates = candidates.filter(u => u.type === UserType.RESEARCHER);
    } else if (this.currentUser.type === UserType.RESEARCHER) {
      if (targetType) {
        // Explicit choice by researcher
        candidates = candidates.filter(u => u.type === targetType);
      } else {
        // Fallback: Researchers see Companies AND other Researchers if no specific target set
        candidates = candidates.filter(u => 
          u.type === UserType.COMPANY || u.type === UserType.RESEARCHER
        );
      }
    }

    // Filter Logic
    if (filterFocusArea) {
      candidates = candidates.filter(u => u.focusAreas.includes(filterFocusArea));
    }

    // Shuffle simple
    return candidates.sort(() => Math.random() - 0.5);
  }

  swipe(targetId: string, action: 'like' | 'pass'): Match | null {
    if (!this.currentUser) return null;

    this.swipes.push({
      actorId: this.currentUser.id,
      targetId,
      action
    });

    let matchResult: Match | null = null;

    if (action === 'like') {
      // Check for match
      const isMatch = this.swipes.some(s => 
        s.actorId === targetId && 
        s.targetId === this.currentUser!.id && 
        s.action === 'like'
      );

      if (isMatch) {
        const newMatch: Match = {
          id: Math.random().toString(36).substr(2, 9),
          users: [this.currentUser.id, targetId],
          timestamp: Date.now()
        };
        this.matches.push(newMatch);
        matchResult = newMatch;
      }
    }
    
    this.saveState();
    return matchResult;
  }

  // Chat
  getMatches(): { match: Match, otherUser: User }[] {
    if (!this.currentUser) return [];
    
    const myMatches = this.matches.filter(m => m.users.includes(this.currentUser!.id));
    
    return myMatches.map(m => {
      const otherId = m.users.find(id => id !== this.currentUser!.id)!;
      // Handle case where user might be deleted or missing
      const otherUser = this.users.find(u => u.id === otherId);
      if (!otherUser) return null;
      return { match: m, otherUser };
    }).filter(item => item !== null) as { match: Match, otherUser: User }[];
  }

  getMessages(matchId: string): Message[] {
     // Placeholder
    return [];
  }

  // Refined get messages
  getConversation(partnerId: string): Message[] {
    if (!this.currentUser) return [];
    return this.messages.filter(m => 
      (m.senderId === this.currentUser!.id && m.receiverId === partnerId) ||
      (m.senderId === partnerId && m.receiverId === this.currentUser!.id)
    ).sort((a,b) => a.timestamp - b.timestamp);
  }

  sendMessage(receiverId: string, content: string) {
    if (!this.currentUser) return;
    this.messages.push({
      id: Math.random().toString(36).substr(2, 9),
      senderId: this.currentUser.id,
      receiverId,
      content,
      timestamp: Date.now()
    });
    this.saveState();
  }

  // Admin
  getAllUsers(): User[] {
    return this.users.filter(u => u.type !== UserType.ADMIN);
  }

  toggleBlock(userId: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.isBlocked = !user.isBlocked;
      
      // Persist blocked state
      const blockedIdsJson = localStorage.getItem('rc_blocked_ids');
      const blockedIds: string[] = blockedIdsJson ? JSON.parse(blockedIdsJson) : [];
      
      if (user.isBlocked) {
          if (!blockedIds.includes(userId)) blockedIds.push(userId);
      } else {
          const idx = blockedIds.indexOf(userId);
          if (idx > -1) blockedIds.splice(idx, 1);
      }
      localStorage.setItem('rc_blocked_ids', JSON.stringify(blockedIds));
    }
  }

  deleteUser(userId: string) {
    this.users = this.users.filter(u => u.id !== userId);
    // Cleanup matches
    this.matches = this.matches.filter(m => !m.users.includes(userId));
    this.swipes = this.swipes.filter(s => s.actorId !== userId && s.targetId !== userId);
    this.saveState();
  }
}

export const dataService = new DataService();
