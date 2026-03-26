import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'chef',
  });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', formData);
      login(response.data.user, response.data.token);

      if (response.data.user.role === 'admin') {
        navigate('/admin/menu');
      } else {
        navigate('/chef/orders');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="card form-card">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={6}
        />
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="chef">Chef</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="btn">
          Register
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default RegisterPage;
