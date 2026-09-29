import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const { saveSession } = useAuth();
  const nav = useNavigate();

  const submit = async () => {
    try {
      const { data } = await api.post('/auth/login', f);
      saveSession(data);
      nav(data.user.role === 'admin' ? '/admin' : '/');
    } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <div className="max-w-sm mx-auto bg-white p-6 rounded shadow mt-10 space-y-3">
      <h2 className="text-xl font-bold">Login</h2>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <input className="border w-full p-2 rounded" placeholder="Email" onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="border w-full p-2 rounded" type="password" placeholder="Password" onChange={(e) => setF({ ...f, password: e.target.value })} />
      <button onClick={submit} className="bg-blue-700 text-white w-full p-2 rounded">Login</button>
      <p className="text-sm">New here? <Link className="text-blue-700" to="/register">Register</Link></p>
    </div>
  );
}
