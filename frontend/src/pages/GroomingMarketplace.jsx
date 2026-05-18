import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import GroomerCard from '../components/GroomerCard';
import { getGroomers } from '../data/groomingData';

export default function GroomingMarketplace() {
  const [groomers, setGroomers] = useState([]);
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    // In a real app, this would fetch from /api/v1/groomers
    setGroomers(getGroomers(location, minRating));
  }, [location, minRating]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Pet Grooming Marketplace</h1>
          <p className="text-slate-500 mt-2">Find and book the perfect stylist for your furry friend.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by location..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-700"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value={0}>Any Rating</option>
            <option value={4}>4+ Stars</option>
            <option value={4.5}>4.5+ Stars</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groomers.length > 0 ? (
          groomers.map(g => <GroomerCard key={g.id} groomer={g} />)
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
            No groomers found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
