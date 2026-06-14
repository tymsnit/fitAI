import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

const initialFormState = {
  name: '',
  age: '',
  gender: '',
  height: '',
  weight: '',
  fitnessLevel: 'beginner',
  goal: 'maintenance',
  trainingsPerWeek: '3',
};

const ProfilePage = () => {
  const { loadCurrentUser } = useAuth();

  const [form, setForm] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await apiClient.get('/profile');
      const profile = response.data.profile;

      setForm({
        name: profile.name || '',
        age: profile.age || '',
        gender: profile.gender || '',
        height: profile.height || '',
        weight: profile.weight || '',
        fitnessLevel: profile.fitnessLevel || 'beginner',
        goal: profile.goal || 'maintenance',
        trainingsPerWeek: profile.trainingsPerWeek || '3',
      });
    } catch (error) {
      setError(
        error.response?.data?.message || 'Не вдалося завантажити профіль'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });

    setSuccess('');
    setError('');
  };

  const buildPayload = () => {
    const payload = {};

    if (form.name.trim()) {
      payload.name = form.name.trim();
    }

    if (form.age !== '') {
      payload.age = Number(form.age);
    }

    if (form.gender) {
      payload.gender = form.gender;
    }

    if (form.height !== '') {
      payload.height = Number(form.height);
    }

    if (form.weight !== '') {
      payload.weight = Number(form.weight);
    }

    if (form.fitnessLevel) {
      payload.fitnessLevel = form.fitnessLevel;
    }

    if (form.goal) {
      payload.goal = form.goal;
    }

    if (form.trainingsPerWeek !== '') {
      payload.trainingsPerWeek = Number(form.trainingsPerWeek);
    }

    return payload;
  };

  const validateForm = () => {
    if (form.age !== '' && (Number(form.age) <= 0 || Number(form.age) >= 120)) {
      return 'Вік має бути від 1 до 119 років';
    }

    if (form.height !== '' && Number(form.height) <= 0) {
      return 'Зріст має бути більшим за 0';
    }

    if (form.weight !== '' && Number(form.weight) <= 0) {
      return 'Вага має бути більшою за 0';
    }

    if (
      form.trainingsPerWeek !== '' &&
      (Number(form.trainingsPerWeek) < 1 || Number(form.trainingsPerWeek) > 7)
    ) {
      return 'Кількість тренувань на тиждень має бути від 1 до 7';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);

      const payload = buildPayload();

      const response = await apiClient.put('/profile', payload);

      const updatedProfile = response.data.profile;

      setForm({
        name: updatedProfile.name || '',
        age: updatedProfile.age || '',
        gender: updatedProfile.gender || '',
        height: updatedProfile.height || '',
        weight: updatedProfile.weight || '',
        fitnessLevel: updatedProfile.fitnessLevel || 'beginner',
        goal: updatedProfile.goal || 'maintenance',
        trainingsPerWeek: updatedProfile.trainingsPerWeek || '3',
      });

      await loadCurrentUser();

      setSuccess('Профіль успішно збережено');
    } catch (error) {
      setError(
        error.response?.data?.message || 'Не вдалося зберегти профіль'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>Профіль</h1>
        <p>Завантаження профілю...</p>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Профіль користувача</h1>

      <p className="page-description">
        Заповніть дані, які FitAI використовуватиме для формування
        персонального тренувального плану та рекомендацій.
      </p>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <form onSubmit={handleSubmit} className="form profile-form">
        <label>
          Ім’я
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Наприклад, Олександр"
          />
        </label>

        <div className="form-row">
          <label>
            Вік
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              min="1"
              max="119"
              placeholder="22"
            />
          </label>

          <label>
            Стать
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
            >
              <option value="">Не вказано</option>
              <option value="male">Чоловіча</option>
              <option value="female">Жіноча</option>
              <option value="other">Інше</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Зріст, см
            <input
              type="number"
              name="height"
              value={form.height}
              onChange={handleChange}
              min="1"
              placeholder="180"
            />
          </label>

          <label>
            Вага, кг
            <input
              type="number"
              name="weight"
              value={form.weight}
              onChange={handleChange}
              min="1"
              step="0.1"
              placeholder="78"
            />
          </label>
        </div>

        <label>
          Рівень підготовки
          <select
            name="fitnessLevel"
            value={form.fitnessLevel}
            onChange={handleChange}
            required
          >
            <option value="beginner">Початковий</option>
            <option value="intermediate">Середній</option>
            <option value="advanced">Просунутий</option>
          </select>
        </label>

        <label>
          Основна ціль
          <select
            name="goal"
            value={form.goal}
            onChange={handleChange}
            required
          >
            <option value="weight_loss">Зниження ваги</option>
            <option value="muscle_gain">Набір м’язової маси</option>
            <option value="maintenance">Підтримка форми</option>
            <option value="general_health">Загальне покращення здоров’я</option>
          </select>
        </label>

        <label>
          Кількість тренувань на тиждень
          <select
            name="trainingsPerWeek"
            value={form.trainingsPerWeek}
            onChange={handleChange}
            required
          >
            <option value="1">1 тренування</option>
            <option value="2">2 тренування</option>
            <option value="3">3 тренування</option>
            <option value="4">4 тренування</option>
            <option value="5">5 тренувань</option>
            <option value="6">6 тренувань</option>
            <option value="7">7 тренувань</option>
          </select>
        </label>

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Збереження...' : 'Зберегти профіль'}
        </button>
      </form>
    </section>
  );
};

export default ProfilePage;