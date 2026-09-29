import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const { saveSession } = useAuth();
  const nav = useNavigate();

  const submit = async () => {
    try {
      const { data } = await api.post('/auth/register', f);
      saveSession(data);
      nav('/');
    } catch (e) { setErr(errMsg(e)); }
  };
  const field = (k, p, type = 'text') =>
    <input className="border w-full p-2 rounded" type={type} placeholder={p} onChange={(e) => setF({ ...f, [k]: e.target.value })} />;

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded shadow mt-10 space-y-3">
      <h2 className="text-xl font-bold">Register</h2>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {field('name', 'Full name')}{field('email', 'Email')}{field('phone', 'Phone')}{field('password', 'Password', 'password')}
      <button onClick={submit} className="bg-blue-700 text-white w-full p-2 rounded">Create account</button>
    </div>
  );
}
