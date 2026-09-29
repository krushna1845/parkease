import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';

const tabs = ['Dashboard', 'Areas', 'Slots', 'Bookings', 'Users', 'Payments'];
const th = 'text-left p-2 border-b';
const td = 'p-2 border-b';

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded ${tab === t ? 'bg-blue-700 text-white' : 'bg-white'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Dashboard' && <Dashboard />}
      {tab === 'Areas' && <ManageAreas />}
      {tab === 'Slots' && <ManageSlots />}
      {tab === 'Bookings' && <Bookings />}
      {tab === 'Users' && <Users />}
      {tab === 'Payments' && <Payments />}
    </div>
  );
}

function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then((r) => setS(r.data)); }, []);
  if (!s) return null;
  const cards = [['Users', s.users], ['Areas', s.areas], ['Slots', s.slots], ['Total bookings', s.bookings],
    ['Confirmed', s.confirmed], ['Cancelled', s.cancelled], ['Revenue (Rs)', s.revenue]];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([k, v]) => <div key={k} className="bg-white p-4 rounded shadow"><p className="text-sm text-gray-500">{k}</p><p className="text-2xl font-bold">{v}</p></div>)}
      </div>
      <div className="bg-white p-4 rounded shadow mt-4">
        <h3 className="font-bold mb-2">Confirmed bookings per area</h3>
        {s.perArea.map((a) => <p key={a._id}>{a.name}: {a.count}</p>)}
        {!s.perArea.length && <p className="text-sm text-gray-500">No confirmed bookings yet.</p>}
      </div>
    </div>
  );
}

function ManageAreas() {
  const empty = { name: '', address: '', city: '', pricePerHour: '' };
  const [areas, setAreas] = useState([]);
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get('/areas').then((r) => setAreas(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      editId ? await api.put('/areas/' + editId, f) : await api.post('/areas', f);
      setF(empty); setEditId(null); setErr(''); load();
    } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (id) => { try { await api.delete('/areas/' + id); load(); } catch (e) { setErr(errMsg(e)); } };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow grid md:grid-cols-5 gap-2">
        {['name', 'address', 'city', 'pricePerHour'].map((k) => (
          <input key={k} className="border p-2 rounded" placeholder={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        ))}
        <button onClick={save} className="bg-blue-700 text-white rounded">{editId ? 'Update' : 'Add area'}</button>
        {err && <p className="text-red-600 text-sm md:col-span-5">{err}</p>}
      </div>
      <table className="bg-white w-full rounded shadow text-sm">
        <thead><tr><th className={th}>Name</th><th className={th}>City</th><th className={th}>Price/hr</th><th className={th}></th></tr></thead>
        <tbody>{areas.map((a) => (
          <tr key={a._id}><td className={td}>{a.name}</td><td className={td}>{a.city}</td><td className={td}>{a.pricePerHour}</td>
            <td className={td}>
              <button className="text-blue-700 mr-3" onClick={() => { setEditId(a._id); setF({ name: a.name, address: a.address, city: a.city, pricePerHour: a.pricePerHour }); }}>Edit</button>
              <button className="text-red-600" onClick={() => del(a._id)}>Delete</button>
            </td></tr>))}
        </tbody>
      </table>
    </div>
  );
}

function ManageSlots() {
  const [areas, setAreas] = useState([]);
  const [areaId, setAreaId] = useState('');
  const [slots, setSlots] = useState([]);
  const [num, setNum] = useState('');
  const [type, setType] = useState('car');
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/areas').then((r) => { setAreas(r.data); if (r.data[0]) setAreaId(r.data[0]._id); }); }, []);
  const load = () => areaId && api.get('/slots/area/' + areaId).then((r) => setSlots(r.data));
  useEffect(() => { load(); }, [areaId]);

  const run = async (fn) => { try { await fn(); setErr(''); load(); } catch (e) { setErr(errMsg(e)); } };
  const add = () => run(async () => { await api.post('/slots', { area: areaId, slotNumber: num, type }); setNum(''); });
  const rename = (s) => { const n = window.prompt('New slot number', s.slotNumber); if (n) run(() => api.put('/slots/' + s._id, { slotNumber: n })); };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded shadow flex gap-2 flex-wrap">
        <select className="border p-2 rounded" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          {areas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
        <input className="border p-2 rounded" placeholder="Slot number e.g. B7" value={num} onChange={(e) => setNum(e.target.value)} />
        <select className="border p-2 rounded" value={type} onChange={(e) => setType(e.target.value)}><option>car</option><option>bike</option></select>
        <button onClick={add} className="bg-blue-700 text-white px-3 rounded">Add slot</button>
        {err && <p className="text-red-600 text-sm w-full">{err}</p>}
      </div>
      <table className="bg-white w-full rounded shadow text-sm">
        <thead><tr><th className={th}>Slot</th><th className={th}>Type</th><th className={th}>Active</th><th className={th}></th></tr></thead>
        <tbody>{slots.map((s) => (
          <tr key={s._id}><td className={td}>{s.slotNumber}</td><td className={td}>{s.type}</td><td className={td}>{s.isActive ? 'Yes' : 'No'}</td>
            <td className={td}>
              <button className="text-blue-700 mr-3" onClick={() => rename(s)}>Rename</button>
              <button className="text-orange-600 mr-3" onClick={() => run(() => api.put('/slots/' + s._id, { isActive: !s.isActive }))}>{s.isActive ? 'Disable' : 'Enable'}</button>
              <button className="text-red-600" onClick={() => run(() => api.delete('/slots/' + s._id))}>Delete</button>
            </td></tr>))}
        </tbody>
      </table>
    </div>
  );
}

function Bookings() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/admin/bookings').then((r) => setRows(r.data)); }, []);
  return (
    <table className="bg-white w-full rounded shadow text-sm">
      <thead><tr><th className={th}>User</th><th className={th}>Area / Slot</th><th className={th}>Vehicle</th><th className={th}>Time</th><th className={th}>Amount</th><th className={th}>Status</th></tr></thead>
      <tbody>{rows.map((b) => (
        <tr key={b._id}><td className={td}>{b.user?.name}</td><td className={td}>{b.area?.name} / {b.slot?.slotNumber}</td><td className={td}>{b.vehicleNumber}</td>
          <td className={td}>{new Date(b.startTime).toLocaleString()}</td><td className={td}>{b.amount}</td><td className={td}>{b.status}</td></tr>))}
      </tbody>
    </table>
  );
}

function Users() {
  const [rows, setRows] = useState([]);
  const load = () => api.get('/admin/users').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (window.confirm('Delete this user?')) { try { await api.delete('/admin/users/' + id); load(); } catch (e) { alert(errMsg(e)); } } };
  return (
    <table className="bg-white w-full rounded shadow text-sm">
      <thead><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Phone</th><th className={th}>Role</th><th className={th}></th></tr></thead>
      <tbody>{rows.map((u) => (
        <tr key={u._id}><td className={td}>{u.name}</td><td className={td}>{u.email}</td><td className={td}>{u.phone}</td><td className={td}>{u.role}</td>
          <td className={td}>{u.role !== 'admin' && <button className="text-red-600" onClick={() => del(u._id)}>Delete</button>}</td></tr>))}
      </tbody>
    </table>
  );
}

function Payments() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/admin/payments').then((r) => setRows(r.data)); }, []);
  return (
    <table className="bg-white w-full rounded shadow text-sm">
      <thead><tr><th className={th}>Txn ID</th><th className={th}>User</th><th className={th}>Vehicle</th><th className={th}>Method</th><th className={th}>Amount</th><th className={th}>Status</th></tr></thead>
      <tbody>{rows.map((p) => (
        <tr key={p._id}><td className={td}>{p.transactionId}</td><td className={td}>{p.user?.name}</td><td className={td}>{p.booking?.vehicleNumber}</td>
          <td className={td}>{p.method}</td><td className={td}>{p.amount}</td><td className={td}>{p.status}</td></tr>))}
      </tbody>
    </table>
  );
}
