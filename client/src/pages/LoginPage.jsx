import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Помилка під час входу');
    }
  };

  return (
    <section className="page auth-page">
      <h1>Вхід</h1>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="form">
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <button type="submit">Увійти</button>
      </form>

      <p>
        Ще немає акаунта? <Link to="/register">Зареєструватися</Link>
      </p>
    </section>
  );
};

export default LoginPage;