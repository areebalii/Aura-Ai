import  { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios.instance';

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  // Input fields tracking state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status tracking states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    try {
      let response;

      if (isRegister) {
        //  Clean relative path
        response = await API.post('/auth/register', {
          fullName,
          email,
          password
        });
      } else {
        //  Clean relative path
        response = await API.post('/auth/login', {
          email,
          password
        });
      }

      // If successful, extract the token and user details
      const { token, user } = response.data;

      // Store credentials locally to keep the user signed in
      localStorage.setItem('aura_token', token);
      localStorage.setItem('aura_user', JSON.stringify(user));

      // Clear input fields
      setFullName('');
      setEmail('');
      setPassword('');

      // Redirect user back to the Main Chat Layout
      navigate('/');

    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#131314] px-4">
      <div className="max-w-md w-full bg-[#1e1f20] rounded-2xl p-8 border border-[#2d2f31] shadow-2xl text-center transition-all duration-300">

        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {isRegister ? 'Create an Account' : 'Welcome to Aura'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {isRegister
            ? 'Sign up to unlock unlimited chats and history tracking.'
            : 'Sign in to access your dashboard and saved chats.'}
        </p>

        {/* Dynamic Error Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* Full Name Input (Only shows up during Registration) */}
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-[#131314] border border-[#2d2f31] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none transition-all disabled:opacity-50"
            />
          )}

          {/* Email Input */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full bg-[#131314] border border-[#2d2f31] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none transition-all disabled:opacity-50"
          />

          {/* Password Input */}
          <input
            type="password"
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full bg-[#131314] border border-[#2d2f31] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all text-sm mt-2 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : isRegister ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-all">
            ← Back to Chat
          </button>

          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setFullName('');
              setPassword('');
            }}
            className="text-blue-400 hover:underline transition-all"
          >
            {isRegister ? 'Already have an account? Log In' : 'Create an account'}
          </button>
        </div>
      </div>
    </div>
  );
}