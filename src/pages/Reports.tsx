import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { FileText } from 'lucide-react';

export default function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, 'assess_reports'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Saved Assessments</h1>
        
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{report.schoolName}</h3>
                  <p className="text-gray-500 text-sm">{new Date(report.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold
                    ${report.score.decision === 'GO' ? 'bg-green-100 text-green-800' : 
                      report.score.decision === 'INVESTIGATE' ? 'bg-amber-100 text-amber-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {report.score.decision}
                  </span>
                  <button className="p-2 text-gray-400 hover:text-blue-600">
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
