import React from 'react';
import { User, UserType } from '../types';
import { Briefcase, GraduationCap, Globe, Linkedin, Twitter, ExternalLink, MapPin, FlaskConical } from 'lucide-react';

interface ProfileCardProps {
  user: User;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 select-none">
      {/* Image Header */}
      <div className="relative h-80 bg-slate-200">
        <img 
          src={user.imageUrl} 
          alt={user.name} 
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 pt-16">
          <h2 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
            {user.name}
            {user.type === UserType.COMPANY ? 
              <Briefcase className="w-6 h-6 text-indigo-400" /> : 
              <GraduationCap className="w-6 h-6 text-emerald-400" />
            }
          </h2>
          <p className="text-slate-200 text-lg font-medium">{user.tagline}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 h-[400px] overflow-y-auto">
        
        {/* Description */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">About</h3>
          <p className="text-slate-700 leading-relaxed text-lg">
            {user.description}
          </p>
        </div>

        {/* Focus Areas */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Focus Areas
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.focusAreas.map(tag => (
              <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-100">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Specifics: Projects or Skills */}
        {user.type === UserType.COMPANY && user.projects && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Active Projects</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {user.projects.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        )}

        {user.type === UserType.RESEARCHER && user.skills && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Skills</h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-4">
            {user.links.website && (
              <a href={user.links.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors">
                <Globe className="w-4 h-4" /> Website
              </a>
            )}
            {user.links.linkedin && (
              <a href={`https://${user.links.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-600 hover:text-blue-700 transition-colors">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            )}
            {user.links.twitter && (
              <a href={`https://twitter.com/${user.links.twitter}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-600 hover:text-sky-500 transition-colors">
                <Twitter className="w-4 h-4" /> Twitter
              </a>
            )}
            {user.links.universityProfile && (
              <a href={`https://${user.links.universityProfile}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors">
                <ExternalLink className="w-4 h-4" /> University Profile
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
