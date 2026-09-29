import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';

export default function AreaSlots() {
  const { id } = useParams();
  const nav = useNavigate();
  const [area, setArea] = useState(null);
  const [slots, setSlots] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selected, setSelected] = useState(null);
  const [vehicle, setVehicle] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/areas/' + id).then((r) => setArea(r.data)); }, [id]);

  // Load slot availability for the chosen time range and refresh every 10s ("near real-time" using polling)
  useEffect(() => {
    const load = () => {
      const params = start && end ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() } : {};
      api.get('/slots/area/' + id, { params }).then((r) => setSlots(r.data));
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id, start, end]);

  const hours = start && end ? Math.ceil((new Date(end) - new Date(start)) / 3600000) : 0;

  const book = async () => {
    setErr('');
    try {
      await api.post('/bookings', { slotId: selected, vehicleNumber: vehicle, startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() });
      nav('/bookings');
    } catch (e) { setErr(errMsg(e)); }
  };

  if (!area) return null;
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold">{area.name}</h2>
        <p className="text-sm text-gray-600">{area.address}, {area.city} | Rs {area.pricePerHour}/hour</p>
        <div className="flex gap-4 mt-3 flex-wrap">
          <label className="text-sm">From<input type="datetime-local" className="border p-1 rounded block" value={start} onChange={(e) => { setStart(e.target.value); setSelected(null); }} /></label>
          <label className="text-sm">To<input type="datetime-local" className="border p-1 rounded block" value={end} onChange={(e) => { setEnd(e.target.value); setSelected(null); }} /></label>
        </div>
        {!start || !end ? <p className="text-sm text-orange-600 mt-2">Select start and end time to see slot availability.</p> : null}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {slots.map((s) => (
          <button key={s._id} disabled={!s.available || !start || !end} onClick={() => setSelected(s._id)}
            className={`p-3 rounded text-center border ${selected === s._id ? 'bg-blue-700 text-white' : s.available ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-400 opacity-60'}`}>
            <div className="font-bold">{s.slotNumber}</div>
            <div className="text-xs">{s.type} · {s.available ? 'Free' : 'Booked'}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-white p-4 rounded shadow space-y-2">
          <p>Estimated amount: <b>Rs {hours * area.pricePerHour}</b> ({hours} hour{hours > 1 ? 's' : ''})</p>
          <input className="border p-2 rounded" placeholder="Vehicle number e.g. MH01AB1234" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button onClick={book} className="bg-blue-700 text-white px-4 py-2 rounded ml-2">Book slot</button>
        </div>
      )}
    </div>
  );
}
