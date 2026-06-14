import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const categoryLabels = {
  strength: 'Силові вправи',
  cardio: 'Кардіо',
  core: 'Корпус / прес',
};

const difficultyLabels = {
  beginner: 'Початковий',
  intermediate: 'Середній',
  advanced: 'Просунутий',
};

const muscleGroupLabels = {
  legs: 'Ноги',
  chest: 'Груди',
  abs: 'Прес',
  full_body: 'Все тіло',
  glutes: 'Сідниці',
};

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    muscleGroup: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExercises = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = {};

      if (filters.category) {
        params.category = filters.category;
      }

      if (filters.difficulty) {
        params.difficulty = filters.difficulty;
      }

      if (filters.muscleGroup) {
        params.muscleGroup = filters.muscleGroup;
      }

      const response = await apiClient.get('/exercises', {
        params,
      });

      setExercises(response.data.exercises || []);
    } catch (error) {
      setError(
        error.response?.data?.message || 'Не вдалося завантажити вправи'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExercises();
  }, [filters]);

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      difficulty: '',
      muscleGroup: '',
    });
  };

  const formatValue = (map, value) => {
    return map[value] || value || 'Не вказано';
  };

  return (
    <section className="page">
      <h1>Вправи</h1>

      <p className="page-description">
        У цьому розділі показано базу вправ FitAI. Саме з цих вправ система
        формує персональний тренувальний план користувача.
      </p>

      <div className="filters-panel">
        <label>
          Категорія
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
          >
            <option value="">Усі категорії</option>
            <option value="strength">Силові</option>
            <option value="cardio">Кардіо</option>
            <option value="core">Корпус / прес</option>
          </select>
        </label>

        <label>
          Складність
          <select
            name="difficulty"
            value={filters.difficulty}
            onChange={handleFilterChange}
          >
            <option value="">Усі рівні</option>
            <option value="beginner">Початковий</option>
            <option value="intermediate">Середній</option>
            <option value="advanced">Просунутий</option>
          </select>
        </label>

        <label>
          Група м’язів
          <select
            name="muscleGroup"
            value={filters.muscleGroup}
            onChange={handleFilterChange}
          >
            <option value="">Усі групи</option>
            <option value="legs">Ноги</option>
            <option value="chest">Груди</option>
            <option value="abs">Прес</option>
            <option value="full_body">Все тіло</option>
            <option value="glutes">Сідниці</option>
          </select>
        </label>

        <button type="button" className="secondary-button" onClick={resetFilters}>
          Скинути фільтри
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {isLoading ? (
        <p>Завантаження вправ...</p>
      ) : (
        <>
          <p className="muted">
            Знайдено вправ: <strong>{exercises.length}</strong>
          </p>

          {exercises.length === 0 ? (
            <p>За вибраними фільтрами вправ не знайдено.</p>
          ) : (
            <div className="exercise-grid">
              {exercises.map((exercise) => (
                <article key={exercise.id} className="exercise-card">
                  <div className="exercise-card-header">
                    <h3>{exercise.name}</h3>

                    <span className={`badge badge-${exercise.difficulty}`}>
                      {formatValue(difficultyLabels, exercise.difficulty)}
                    </span>
                  </div>

                  <p>{exercise.description}</p>

                  <div className="exercise-meta">
                    <span>
                      <strong>Категорія:</strong>{' '}
                      {formatValue(categoryLabels, exercise.category)}
                    </span>

                    <span>
                      <strong>Група м’язів:</strong>{' '}
                      {formatValue(muscleGroupLabels, exercise.muscleGroup)}
                    </span>

                    <span>
                      <strong>Обладнання:</strong>{' '}
                      {exercise.equipment === 'none'
                        ? 'Не потрібне'
                        : exercise.equipment || 'Не вказано'}
                    </span>

                    <span>
                      <strong>Навантаження:</strong>{' '}
                      {exercise.repetitions
                        ? `${exercise.repetitions} повторень`
                        : exercise.durationMinutes
                          ? `${exercise.durationMinutes} хв.`
                          : 'Не вказано'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ExercisesPage;