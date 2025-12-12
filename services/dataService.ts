import { supabase } from './supabaseClient';
import { User, UserType, Match, Message } from '../types';

class DataService {
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    // Recover session if exists in local storage (client-side cache of user details)
    const stored = localStorage.getItem('rc_current_user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  // --- Auth ---

  async login(username: string, password?: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
       console.error("Login error:", error);
       // If row not found
       if (error.code === 'PGRST116') return null;
       throw new Error(error.message);
    }

    if (data.isBlocked) throw new Error("Account blocked by administrator.");
    
    // Note: In a real production app, use Supabase Auth (GoTrue) instead of storing passwords in a table.
    // This maintains compatibility with the existing simplistic type structure.
    if (data.password !== password) return null;

    this.currentUser = data;
    localStorage.setItem('rc_current_user', JSON.stringify(data));
    return data;
  }

  async register(user: Omit<User, 'id' | 'isBlocked'>): Promise<User> {
    // 1. Check if username exists
    const { data: existing } = await supabase
      .from('users')
      .select('username')
      .eq('username', user.username)
      .maybeSingle();

    if (existing) {
      throw new Error("Username is already taken");
    }

    // 2. Insert new user
    // We explicitly set isBlocked false. Supabase can generate the ID if we omit it, 
    // or we can generate one. Let's rely on DB default or generate one if needed.
    // We will assume the DB handles ID generation (uuid) or we send one.
    // To match previous logic, let's generate a string ID or let the table default to uuid.
    // Here we let supabase return the created row.
    
    const payload = {
      ...user,
      isBlocked: false,
      // Ensure we don't send undefined for optional fields to avoid DB constraint issues if any
      links: user.links || {},
      focusAreas: user.focusAreas || [],
      skills: user.skills || [],
      projects: user.projects || []
    };

    const { data, error } = await supabase
      .from('users')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Register error:", error);
      throw error;
    }

    this.currentUser = data;
    localStorage.setItem('rc_current_user', JSON.stringify(data));
    return data;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('rc_current_user');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // --- Matching ---

  async getPotentials(filterFocusArea?: string, targetTypePreference?: UserType): Promise<User[]> {
    if (!this.currentUser) return [];

    // 1. Get IDs I have already swiped
    const { data: swipes, error: swipeError } = await supabase
      .from('swipes')
      .select('targetId')
      .eq('actorId', this.currentUser.id);
    
    if (swipeError) throw swipeError;

    const swipedIds = swipes?.map((s: any) => s.targetId) || [];
    swipedIds.push(this.currentUser.id); // Exclude self

    // 2. Determine target types
    let targetTypes: UserType[] = [];
    if (this.currentUser.type === UserType.COMPANY) {
      targetTypes = [UserType.RESEARCHER];
    } else {
      if (targetTypePreference) {
        targetTypes = [targetTypePreference];
      } else {
        targetTypes = [UserType.COMPANY, UserType.RESEARCHER];
      }
    }

    // 3. Build Query
    let query = supabase
      .from('users')
      .select('*')
      .neq('isBlocked', true)
      .neq('type', UserType.ADMIN)
      .in('type', targetTypes);

    // Note: Supabase .not('id', 'in', ...) can be tricky with large lists.
    // For a prototype, fetching and filtering client side is okay, but let's try to filter strictly.
    // If swipedIds is huge, this query might fail. For now it's fine.
    if (swipedIds.length > 0) {
        // 'not.in' expects a comma separated list or array
        // We handle this by filtering in JS to avoid URL length limits if list is huge,
        // or usage of a stored procedure. For this size, JS filter is safest/easiest.
    }

    const { data: candidates, error: userError } = await query;
    if (userError) throw userError;

    let results = candidates || [];
    
    // Filter out swiped IDs
    results = results.filter((u: User) => !swipedIds.includes(u.id));

    // Filter by Focus Area
    if (filterFocusArea) {
      // Assuming focusAreas is stored as JSONB or Array. 
      // If JSONB: results.filter...
      results = results.filter((u: User) => u.focusAreas && u.focusAreas.includes(filterFocusArea));
    }

    return results.sort(() => Math.random() - 0.5);
  }

  async swipe(targetId: string, action: 'like' | 'pass'): Promise<Match | null> {
    if (!this.currentUser) return null;

    // 1. Record Swipe
    const { error: insertError } = await supabase
      .from('swipes')
      .insert({
        actorId: this.currentUser.id,
        targetId: targetId,
        action: action
      });
    
    if (insertError) throw insertError;

    if (action === 'pass') return null;

    // 2. Check for Match (Reciprocal Like)
    const { data: reciprocal } = await supabase
      .from('swipes')
      .select('*')
      .eq('actorId', targetId)
      .eq('targetId', this.currentUser.id)
      .eq('action', 'like')
      .single();

    if (reciprocal) {
      // 3. Create Match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert({
          users: [this.currentUser.id, targetId],
          timestamp: Date.now()
        })
        .select()
        .single();
      
      if (matchError) throw matchError;
      return matchData;
    }

    return null;
  }

  // --- Chat ---

  async getMatches(): Promise<{ match: Match, otherUser: User }[]> {
    if (!this.currentUser) return [];

    // Fetches matches where current user is in the users array
    // Supabase Postgres: "users" @> '[myId]'
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .contains('users', [this.currentUser.id]);

    if (error) throw error;
    if (!matches) return [];

    const results: { match: Match, otherUser: User }[] = [];

    for (const m of matches) {
      const otherId = m.users.find((id: string) => id !== this.currentUser!.id);
      if (otherId) {
        // Fetch other user details
        const { data: otherUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', otherId)
          .single();
        
        if (otherUser) {
          results.push({ match: m, otherUser });
        }
      }
    }

    return results;
  }

  async getConversation(partnerId: string): Promise<Message[]> {
    if (!this.currentUser) return [];
    
    // OR query: (sender=me AND receiver=them) OR (sender=them AND receiver=me)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(senderId.eq.${this.currentUser.id},receiverId.eq.${partnerId}),and(senderId.eq.${partnerId},receiverId.eq.${this.currentUser.id})`)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async sendMessage(receiverId: string, content: string): Promise<void> {
    if (!this.currentUser) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        senderId: this.currentUser.id,
        receiverId,
        content,
        timestamp: Date.now()
      });
    
    if (error) throw error;
  }

  // --- Admin ---

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .neq('type', UserType.ADMIN);
    
    if (error) throw error;
    return data || [];
  }

  async toggleBlock(userId: string): Promise<void> {
    // First get current status
    const { data: user } = await supabase.from('users').select('isBlocked').eq('id', userId).single();
    if (!user) return;

    await supabase
      .from('users')
      .update({ isBlocked: !user.isBlocked })
      .eq('id', userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await supabase.from('users').delete().eq('id', userId);
    // Note: In real DB, cascading deletes on FKs would handle swipes/matches/messages
    // For this simple setup, we might leave orphans or delete manually
    await supabase.from('swipes').delete().or(`actorId.eq.${userId},targetId.eq.${userId}`);
    await supabase.from('matches').delete().contains('users', [userId]);
    await supabase.from('messages').delete().or(`senderId.eq.${userId},receiverId.eq.${userId}`);
  }
}

export const dataService = new DataService();