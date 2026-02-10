import { useState } from 'react';
import { searchSchools, type GIASSchool } from '../services/gias';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, LogOut } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            ISF School Assessment
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by School Name or URN..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="space-y-4">
          {results.map((school) => (
            <div
              key={school.URN}
              onClick={() => navigate(`/assessment/${school.URN}`, { state: { school } })}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:border-blue-500 cursor-pointer transition-all"
            >
              <h3 className="text-lg font-semibold text-gray-900">{school.EstablishmentName}</h3>
              <div className="flex gap-4 text-sm text-gray-500 mt-1">
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
