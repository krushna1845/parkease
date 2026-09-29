import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';

export default function MyBookings() {
  const [list, setList] = useState([]);
  const [method, setMethod] = useState('upi');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/bookings/my').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const act = async (fn) => { setMsg(''); try { await fn(); await load(); } catch (e) { setMsg(errMsg(e)); } };
  const pay = (id) => act(() => api.post(`/payments/${id}/pay`, { method }));
  const cancel = (id) => window.confirm('Cancel this booking?') && act(() => api.put(`/bookings/${id}/cancel`));

  const color = { confirmed: 'text-green-700', pending_payment: 'text-orange-600', cancelled: 'text-red-600' };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Booking history</h2>
      {msg && <p className="text-red-600">{msg}</p>}
      {list.map((b) => (
        <div key={b._id} className="bg-white p-4 rounded shadow flex gap-4 justify-between flex-wrap">
          <div className="text-sm space-y-1">
            <p className="font-bold">{b.area?.name} · Slot {b.slot?.slotNumber}</p>
            <p>Vehicle: {b.vehicleNumber}</p>
            <p>{new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleString()}</p>
            <p>Amount: Rs {b.amount}</p>
            <p className={`font-semibold ${color[b.status]}`}>{b.status.replace('_', ' ').toUpperCase()}</p>
            {b.status === 'pending_payment' && (
              <div className="flex gap-2 items-center">
                <select className="border p-1 rounded" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="upi">UPI</option><option value="card">Card</option><option value="netbanking">Net banking</option>
                </select>
                <button onClick={() => pay(b._id)} className="bg-green-600 text-white px-3 py-1 rounded">Pay Rs {b.amount}</button>
                <span className="text-xs text-gray-500">(pay within 10 min)</span>
              </div>
            )}
            {b.status !== 'cancelled' && <button onClick={() => cancel(b._id)} className="text-red-600 underline">Cancel booking</button>}
          </div>
          {b.qrCode && <img src={b.qrCode} alt="QR" className="w-32 h-32" />}
        </div>
      ))}
      {!list.length && <p>No bookings yet.</p>}
    </div>
  );
}
