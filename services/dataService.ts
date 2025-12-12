import { supabase } from './supabaseClient';
import { User, UserType, Match, Message } from '../types';

// Helper to map Snake_Case DB columns to CamelCase App properties
const mapUser = (dbUser: any): User => ({
  id: dbUser.id.toString(),
  username: dbUser.username,
  password: dbUser.password,
  type: dbUser.type as UserType,
  name: dbUser.name,
  tagline: dbUser.tagline,
  description: dbUser.description,
  focusAreas: dbUser.focus_areas || [],
  skills: dbUser.skills || [],
  projects: dbUser.projects || [],
  imageUrl: dbUser.image_url,
  links: dbUser.links || {},
  isBlocked: dbUser.is_blocked
});

class DataService {
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    // Optional: Check for existing session if using Supabase Auth
    // For this simple version, we stick to the custom login flow
    return Promise.resolve();
  }

  // --- Auth ---

  async login(username: string, password?: string): Promise<User | null> {
    // Fetch user from DB
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error("Supabase Login Error:", error.message);
      // If table doesn't exist or connection fails, return null
    }

    if (error || !data) return null;
    
    // Check block status
    if (data.is_blocked) throw new Error("Account blocked by administrator.");

    // Simple password check (In production, use Supabase Auth or Hash)
    if (data.password && data.password !== password) return null;

    const user = mapUser(data);
    this.currentUser = user;
    return user;
  }

  async register(user: Omit<User, 'id' | 'isBlocked'>): Promise<User> {
    const dbUser = {
      username: user.username,
      password: user.password || 'pass', // Default simple pass
      type: user.type,
      name: user.name,
      tagline: user.tagline,
      description: user.description,
      focus_areas: user.focusAreas,
      skills: user.skills,
      projects: user.projects,
      image_url: user.imageUrl,
      links: user.links,
      is_blocked: false
    };

    const { data, error } = await supabase
      .from('users')
      .insert([dbUser])
      .select()
      .single();

    if (error) {
      console.error("Supabase Register Error:", error.message);
      throw error;
    }

    const newUser = mapUser(data);
    this.currentUser = newUser;
    return newUser;
  }

  logout() {
    this.currentUser = null;
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
      .select('target_id')
      .eq('actor_id', this.currentUser.id);

    if (swipeError) {
      console.error("Error fetching swipes:", swipeError.message);
      return [];
    }

    const swipedIds = swipes?.map(s => s.target_id) || [];
    swipedIds.push(this.currentUser.id); // Exclude self

    // 2. Determine target type
    let lookingFor: UserType[] = [];
    if (this.currentUser.type === UserType.COMPANY) {
      lookingFor = [UserType.RESEARCHER];
    } else {
      // Researcher
      if (targetTypePreference) {
        lookingFor = [targetTypePreference];
      } else {
        lookingFor = [UserType.COMPANY, UserType.RESEARCHER];
      }
    }

    // 3. Build Query
    let query = supabase
      .from('users')
      .select('*')
      .neq('type', UserType.ADMIN)
      .eq('is_blocked', false)
      .in('type', lookingFor);

    // 4. Execute to get candidates
    const { data: candidates, error } = await query;
    if (error) {
      console.error("Error fetching potentials:", error.message);
      return [];
    }

    let results = candidates.map(mapUser);

    // 5. Filter swiped IDs (Supabase .not('id', 'in', arr) fails on empty arrays sometimes, safer to filter in JS for MVP)
    results = results.filter(u => !swipedIds.includes(u.id));

    // 6. Filter Focus Area
    if (filterFocusArea) {
      results = results.filter(u => u.focusAreas.includes(filterFocusArea));
    }

    // Shuffle
    return results.sort(() => Math.random() - 0.5);
  }

  async swipe(targetId: string, action: 'like' | 'pass'): Promise<Match | null> {
    if (!this.currentUser) return null;

    // 1. Record Swipe
    const { error: swipeError } = await supabase.from('swipes').insert({
      actor_id: this.currentUser.id,
      target_id: targetId,
      action: action
    });

    if (swipeError) console.error("Error recording swipe:", swipeError.message);

    if (action === 'pass') return null;

    // 2. Check for Match (Did they like me?)
    const { data: reciprocal } = await supabase
      .from('swipes')
      .select('*')
      .eq('actor_id', targetId)
      .eq('target_id', this.currentUser.id)
      .eq('action', 'like')
      .single();

    if (reciprocal) {
      // It's a match!
      const { data: newMatch } = await supabase
        .from('matches')
        .insert({
          user1_id: this.currentUser.id,
          user2_id: targetId,
          timestamp: Date.now()
        })
        .select()
        .single();
        
       if (newMatch) {
           return {
               id: newMatch.id,
               users: [this.currentUser.id, targetId],
               timestamp: newMatch.timestamp
           };
       }
    }

    return null;
  }

  // --- Chat ---

  async getMatches(): Promise<{ match: Match, otherUser: User }[]> {
    if (!this.currentUser) return [];

    // Fetch matches where I am user1 or user2
    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${this.currentUser.id},user2_id.eq.${this.currentUser.id}`);

    if (error || !matches) {
        console.error("Error fetching matches:", error?.message);
        return [];
    }

    const results: { match: Match, otherUser: User }[] = [];

    for (const m of matches) {
      const otherId = m.user1_id === this.currentUser.id ? m.user2_id : m.user1_id;
      
      // Fetch the other user's details
      const { data: otherUserData } = await supabase
        .from('users')
        .select('*')
        .eq('id', otherId)
        .single();

      if (otherUserData) {
        results.push({
          match: {
            id: m.id,
            users: [m.user1_id, m.user2_id],
            timestamp: m.timestamp
          },
          otherUser: mapUser(otherUserData)
        });
      }
    }

    return results;
  }

  async getConversation(partnerId: string): Promise<Message[]> {
    if (!this.currentUser) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${this.currentUser.id})`)
      .order('timestamp', { ascending: true });

    if (error || !data) return [];

    return data.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        timestamp: m.timestamp
    }));
  }

  async sendMessage(receiverId: string, content: string): Promise<void> {
    if (!this.currentUser) return;

    await supabase.from('messages').insert({
      sender_id: this.currentUser.id,
      receiver_id: receiverId,
      content: content,
      timestamp: Date.now()
    });
  }

  // --- Admin ---

  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .neq('type', UserType.ADMIN);
      
    return data ? data.map(mapUser) : [];
  }

  async toggleBlock(userId: string): Promise<void> {
    // First get current status
    const { data } = await supabase.from('users').select('is_blocked').eq('id', userId).single();
    if (data) {
        await supabase
            .from('users')
            .update({ is_blocked: !data.is_blocked })
            .eq('id', userId);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await supabase.from('users').delete().eq('id', userId);
    // Supabase cascading delete should handle foreign keys if configured, 
    // otherwise we technically should delete swipes/matches first.
  }
}

export const dataService = new DataService();
