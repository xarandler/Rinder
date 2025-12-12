import React, { useState } from 'react';
import { UserType, User } from '../types';
import { dataService } from '../services/dataService';
import { Button } from './Button';
import { Input } from './Input';
import { FOCUS_AREAS } from '../constants';
import { Briefcase, GraduationCap } from 'lucide-react';

interface RegisterProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<User>>({
    type: UserType.COMPANY,
    focusAreas: [],
    links: {}
  });

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLinkChange = (key: string, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      links: { ...prev.links, [key]: value } 
    }));
  };

  const toggleFocusArea = (area: string) => {
    const current = formData.focusAreas || [];
    if (current.includes(area)) {
      handleChange('focusAreas', current.filter(a => a !== area));
    } else {
      handleChange('focusAreas', [...current, area]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        // Basic validation mock
        if (!formData.username || !formData.name || !formData.description) return;
        
        // Add random image if not provided
        const img = formData.type === UserType.COMPANY 
            ? `https://picsum.photos/400/400?random=${Date.now()}`
            : `https://picsum.photos/400/400?random=${Date.now()}`;
        
        dataService.register({
            ...formData as any,
            imageUrl: img,
            projects: formData.projects ? (formData.projects as any).split(',').map((s:string)=>s.trim()) : [],
            skills: formData.skills ? (formData.skills as any).split(',').map((s:string)=>s.trim()) : [],
        });
        onSuccess();
    } catch (err) {
        alert("Registration failed");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-slate-100 my-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Create Account</h2>
      
      {step === 1 && (
        <div className="space-y-6">
            <div className="flex gap-4 justify-center mb-8">
                <button 
                    onClick={() => handleChange('type', UserType.COMPANY)}
                    className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                        formData.type === UserType.COMPANY 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 hover:border-indigo-200 text-slate-500'
                    }`}
                >
                    <Briefcase className="w-8 h-8" />
                    <span className="font-bold">Company</span>
                </button>
                <button 
                    onClick={() => handleChange('type', UserType.RESEARCHER)}
                    className={`flex-1 p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                        formData.type === UserType.RESEARCHER 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 hover:border-emerald-200 text-slate-500'
                    }`}
                >
                    <GraduationCap className="w-8 h-8" />
                    <span className="font-bold">Researcher</span>
                </button>
            </div>
            
            <Input 
                label="Username" 
                value={formData.username || ''} 
                onChange={e => handleChange('username', e.target.value)} 
                placeholder="Choose a unique username"
            />

            <Button fullWidth onClick={() => {
                if (formData.username) setStep(2);
            }}>Next</Button>
            <Button variant="ghost" fullWidth onClick={onCancel} className="mt-2">Cancel</Button>
        </div>
      )}

      {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                  label={formData.type === UserType.COMPANY ? "Company Name" : "Full Name"}
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  required
              />
              <Input 
                  label="Tagline (Short & Catchy)"
                  value={formData.tagline || ''}
                  onChange={e => handleChange('tagline', e.target.value)}
                  placeholder="e.g. Innovating for the future"
                  required
              />
              <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
                    value={formData.description || ''}
                    onChange={e => handleChange('description', e.target.value)}
                    required
                  />
              </div>

              <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Focus Areas (Select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                      {FOCUS_AREAS.map(area => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => toggleFocusArea(area)}
                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                                formData.focusAreas?.includes(area)
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                            }`}
                          >
                              {area}
                          </button>
                      ))}
                  </div>
              </div>

            {formData.type === UserType.COMPANY ? (
                <Input 
                    label="Potential Projects (comma separated)"
                    value={(formData.projects as any) || ''}
                    onChange={e => handleChange('projects', e.target.value)}
                    placeholder="Project Alpha, Research Beta"
                />
            ) : (
                <Input 
                    label="Key Skills (comma separated)"
                    value={(formData.skills as any) || ''}
                    onChange={e => handleChange('skills', e.target.value)}
                    placeholder="Data Analysis, Molecular Biology"
                />
            )}

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Website URL"
                    value={formData.links?.website || ''}
                    onChange={e => handleLinkChange('website', e.target.value)}
                />
                <Input 
                    label="LinkedIn Handle"
                    value={formData.links?.linkedin || ''}
                    onChange={e => handleLinkChange('linkedin', e.target.value)}
                />
            </div>

            <div className="flex gap-2 pt-4">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1">Complete Profile</Button>
            </div>
          </form>
      )}
    </div>
  );
};
