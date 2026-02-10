import { useState } from 'react';
import { searchSchools, type GIASSchool } from '../services/gias';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GIASSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchSchools(query);
      setResults(data);
      if (data.length === 0) {
        setError('No schools found. Try a different search term.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to search schools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="ISF"
              className="w-16 h-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">School Assessment Tool</h1>
              <p className="text-sm text-slate-400">Independent Schools Futures</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
              title="View Reports"
            >
              <FileText className="w-4 h-4" />
              Reports
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
              <span className="text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-slate-300 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by School Name or URN..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 shadow-lg shadow-cyan-900/30"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="space-y-4">
          {results.map((school) => (
            <div
              key={school.URN}
              onClick={() => navigate(`/assessment/${school.URN}`, { state: { school } })}
              className="bg-slate-800 p-4 rounded-lg shadow-xl border border-slate-700 hover:border-cyan-500 hover:shadow-cyan-900/30 cursor-pointer transition-all"
            >
              <h3 className="text-lg font-semibold text-white">{school.EstablishmentName}</h3>
              <div className="flex gap-4 text-sm text-slate-400 mt-1">
                <span>URN: {school.URN}</span>
                {school.Town && <span>{school.Town}{school.Postcode ? `, ${school.Postcode}` : ''}</span>}
                {school.TypeOfEstablishment && <span>Type: {school.TypeOfEstablishment}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
