import React, { useState, useEffect } from 'react';
import { User, UserType } from './types';
import { dataService } from './services/dataService';
import { SwipeDeck } from './components/SwipeDeck';
import { ChatInterface } from './components/ChatInterface';
import { AdminDashboard } from './components/AdminDashboard';
import { Register } from './components/Register';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { MessageCircle, User as UserIcon, LogOut, Flame } from 'lucide-react';

enum View {
  LOGIN,
  REGISTER,
  SWIPE,
  CHAT,
  ADMIN
}

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(View.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [matchNotification, setMatchNotification] = useState<any>(null);

  useEffect(() => {
    // Initialize data from JSON file
    dataService.initialize().then(() => {
        setLoading(false);
    });
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = dataService.login(username, password);
      if (user) {
        setCurrentUser(user);
        if (user.type === UserType.ADMIN) {
          setView(View.ADMIN);
        } else {
          setView(View.SWIPE);
        }
        setLoginError('');
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    dataService.logout();
    setCurrentUser(null);
    setView(View.LOGIN);
    setUsername('');
    setPassword('');
  };

  const handleMatch = (match: any) => {
    setMatchNotification(match);
    // Auto-hide notification
    setTimeout(() => setMatchNotification(null), 3000);
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
      );
  }

  // --- Views ---

  if (view === View.ADMIN) {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (view === View.LOGIN) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <Flame className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">ResearchConnect</h1>
            <p className="text-slate-500 mt-2">Bridging Innovation & Science</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <Input 
              label="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="e.g. alice"
            />
            <Input 
              label="Password (optional)" 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="For admin use 'pass'"
            />
            
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            
            <Button fullWidth type="submit" size="lg">Log In</Button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">New here?</span>
              </div>
            </div>

            <Button variant="secondary" fullWidth onClick={() => setView(View.REGISTER)}>
              Create Account
            </Button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-400">
            <p>Admin Login: admin / pass</p>
            <p>Demo Users: c1, r1</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === View.REGISTER) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <Register 
          onSuccess={() => {
            const user = dataService.getCurrentUser();
            setCurrentUser(user);
            setView(View.SWIPE);
          }} 
          onCancel={() => setView(View.LOGIN)} 
        />
      </div>
    );
  }

  // --- Authenticated App Layout ---

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(View.SWIPE)}>
            <Flame className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-xl text-slate-800 hidden sm:block">ResearchConnect</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(View.SWIPE)}
              className={`p-2 rounded-full transition-colors ${view === View.SWIPE ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <UserIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setView(View.CHAT)}
              className={`p-2 rounded-full transition-colors ${view === View.CHAT ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-medium">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {view === View.SWIPE && <SwipeDeck onMatch={handleMatch} />}
        {view === View.CHAT && <ChatInterface onBack={() => setView(View.SWIPE)} />}
        
        {/* Match Notification Overlay */}
        {matchNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm mx-4 transform scale-100 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Flame className="w-10 h-10 text-green-600 fill-current" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">It's a Match!</h2>
                <p className="text-slate-600 mb-6">You and this profile have liked each other.</p>
                <Button onClick={() => {
                    setMatchNotification(null);
                    setView(View.CHAT);
                }} fullWidth className="mb-3">Send a Message</Button>
                <Button variant="secondary" fullWidth onClick={() => setMatchNotification(null)}>Keep Swiping</Button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
