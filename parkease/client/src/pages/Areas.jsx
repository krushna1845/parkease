import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Areas() {
  const [areas, setAreas] = useState([]);
  const [q, setQ] = useState('');

  // Search: re-fetch from the backend whenever the search text changes
  useEffect(() => { api.get('/areas', { params: { q } }).then((r) => setAreas(r.data)); }, [q]);

  return (
    <div>
      <input className="border p-2 rounded w-full mb-4" placeholder="Search by area, address or city..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid md:grid-cols-2 gap-4">
        {areas.map((a) => (
          <div key={a._id} className="bg-white p-4 rounded shadow">
            <h3 className="font-bold">{a.name}</h3>
            <p className="text-sm text-gray-600">{a.address}, {a.city}</p>
            <p className="my-2">Rs {a.pricePerHour} / hour</p>
            <Link to={`/area/${a._id}`} className="bg-blue-700 text-white px-3 py-1 rounded">View slots & book</Link>
          </div>
        ))}
        {!areas.length && <p>No parking areas found.</p>}
      </div>
    </div>
  );
}
