import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
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

    if (form.password !== form.confirmPassword) {
      setError('Паролі не збігаються');
      return;
    }

    try {
      await register(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
      setError(
        error.response?.data?.message || 'Помилка під час реєстрації'
      );
    }
  };

  return (
    <section className="page auth-page">
      <h1>Реєстрація</h1>

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

        <label>
          Повторіть пароль
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </label>

        <button type="submit">Зареєструватися</button>
      </form>

      <p>
        Уже маєте акаунт? <Link to="/login">Увійти</Link>
      </p>
    </section>
  );
};

export default RegisterPage;