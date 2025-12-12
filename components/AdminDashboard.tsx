import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import { User, UserType } from '../types';
import { Button } from './Button';
import { Ban, Unlock, Trash2, LogOut } from 'lucide-react';

interface AdminProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>(dataService.getAllUsers());

  const handleToggleBlock = (id: string) => {
    dataService.toggleBlock(id);
    setUsers(dataService.getAllUsers()); // Refresh
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user? This cannot be undone.")) {
      dataService.deleteUser(id);
      setUsers(dataService.getAllUsers());
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          <Button variant="secondary" onClick={onLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-800 font-semibold border-b">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Focus Areas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={user.imageUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.type === UserType.COMPANY ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {user.type}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate">
                      {user.focusAreas.join(', ')}
                    </td>
                    <td className="p-4">
                      {user.isBlocked ? (
                        <span className="text-red-600 font-bold flex items-center gap-1"><Ban className="w-3 h-3"/> Blocked</span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => handleToggleBlock(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isBlocked ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        }`}
                        title={user.isBlocked ? "Unblock" : "Block"}
                      >
                        {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
