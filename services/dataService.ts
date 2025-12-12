import { supabase } from './supabaseClient';
import { User, UserType, Match, Message } from '../types';

class DataService {
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    const stored = localStorage.getItem('rc_current_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem('rc_current_user');
      }
    }
  }

  // --- Auth ---

  async login(username: string, password?: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
       console.error("Login DB Error:", error);
       throw new Error("Database connection failed");
    }

    if (!data) return null;

    if (data.isBlocked) throw new Error("Account blocked by administrator.");
    
    // Simple password check (Note: Use Supabase Auth in production)
    if (data.password !== password) return null;

    this.currentUser = data;
    localStorage.setItem('rc_current_user', JSON.stringify(data));
    return data;
  }

  async register(user: Omit<User, 'id' | 'isBlocked'>): Promise<User> {
    // 1. Check if username exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', user.username)
      .maybeSingle();

    if (checkError) {
        console.error("Check user error:", checkError);
        throw new Error("Could not verify username availability.");
    }

    if (existing) {
      throw new Error("Username is already taken");
    }

    // 2. Insert new user
    const payload = {
      ...user,
      isBlocked: false,
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
      console.error("Register Error details:", error);
      throw new Error(`Registration failed: ${error.message}`);
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
    // Note: We use quoted identifiers in SQL, so select("targetId") should map correctly if table was created with quotes
    const { data: swipes, error: swipeError } = await supabase
      .from('swipes')
      .select('targetId')
      .eq('actorId', this.currentUser.id);
    
    if (swipeError) {
        console.error("Error fetching swipes:", swipeError);
        // Fail gracefully by assuming no swipes
    }

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

    const { data: candidates, error: userError } = await query;
    if (userError) {
        console.error("Error fetching potentials:", userError);
        throw userError;
    }

    let results = candidates || [];
    
    // Filter out swiped IDs
    results = results.filter((u: User) => !swipedIds.includes(u.id));

    // Filter by Focus Area
    if (filterFocusArea) {
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
    
    if (insertError) {
        console.error("Swipe insert error:", insertError);
        throw insertError;
    }

    if (action === 'pass') return null;

    // 2. Check for Match (Reciprocal Like)
    const { data: reciprocal } = await supabase
      .from('swipes')
      .select('*')
      .eq('actorId', targetId)
      .eq('targetId', this.currentUser.id)
      .eq('action', 'like')
      .maybeSingle();

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

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .contains('users', [this.currentUser.id]);

    if (error) {
        console.error("Get matches error:", error);
        return [];
    }
    if (!matches) return [];

    const results: { match: Match, otherUser: User }[] = [];

    for (const m of matches) {
      const otherId = m.users.find((id: string) => id !== this.currentUser!.id);
      if (otherId) {
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
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(senderId.eq.${this.currentUser.id},receiverId.eq.${partnerId}),and(senderId.eq.${partnerId},receiverId.eq.${this.currentUser.id})`)
      .order('timestamp', { ascending: true });

    if (error) {
        console.error("Get conversation error:", error);
        return [];
    }
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
    const { data: user } = await supabase.from('users').select('isBlocked').eq('id', userId).single();
    if (!user) return;

    await supabase
      .from('users')
      .update({ isBlocked: !user.isBlocked })
      .eq('id', userId);
  }

  async deleteUser(userId: string): Promise<void> {
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('swipes').delete().or(`actorId.eq.${userId},targetId.eq.${userId}`);
    await supabase.from('matches').delete().contains('users', [userId]);
    await supabase.from('messages').delete().or(`senderId.eq.${userId},receiverId.eq.${userId}`);
  }
}

export const dataService = new DataService();