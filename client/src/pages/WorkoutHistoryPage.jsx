import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';

const goalLabels = {
  weight_loss: 'Зниження ваги',
  muscle_gain: 'Набір м’язової маси',
  maintenance: 'Підтримка форми',
  general_health: 'Загальне покращення здоров’я',
};

const fitnessLevelLabels = {
  beginner: 'Початковий',
  intermediate: 'Середній',
  advanced: 'Просунутий',
};

const difficultyFeedbackLabels = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Складно',
  too_hard: 'Занадто складно',
};

const WorkoutHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await apiClient.get('/workout-history');

      setHistory(response.data.history || []);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося завантажити історію тренувань'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const total = history.length;

    const easy = history.filter(
      (item) => item.difficultyFeedback === 'easy'
    ).length;

    const normal = history.filter(
      (item) => item.difficultyFeedback === 'normal'
    ).length;

    const hard = history.filter(
      (item) => item.difficultyFeedback === 'hard'
    ).length;

    const tooHard = history.filter(
      (item) => item.difficultyFeedback === 'too_hard'
    ).length;

    const totalMinutes = history.reduce((sum, item) => {
      return sum + Number(item.estimatedDuration || 0);
    }, 0);

    return {
      total,
      easy,
      normal,
      hard,
      tooHard,
      totalMinutes,
    };
  }, [history]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return 'Дата не вказана';
    }

    return new Date(dateValue).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDifficultyClassName = (difficultyFeedback) => {
    if (difficultyFeedback === 'easy') {
      return 'history-easy';
    }

    if (difficultyFeedback === 'normal') {
      return 'history-normal';
    }

    if (difficultyFeedback === 'hard') {
      return 'history-hard';
    }

    if (difficultyFeedback === 'too_hard') {
      return 'history-too-hard';
    }

    return '';
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>Історія тренувань</h1>
        <p>Завантаження історії тренувань...</p>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Історія тренувань</h1>

      <p className="page-description">
        Тут відображаються тренування, які користувач позначив як виконані.
        Ці дані використовуються FitAI для формування персональних рекомендацій.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="history-summary">
        <div className="summary-card">
          <span>Виконано тренувань</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="summary-card">
          <span>Орієнтовний час</span>
          <strong>{stats.totalMinutes} хв.</strong>
        </div>

        <div className="summary-card">
          <span>Нормальна складність</span>
          <strong>{stats.normal}</strong>
        </div>

        <div className="summary-card">
          <span>Складні / занадто складні</span>
          <strong>{stats.hard + stats.tooHard}</strong>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <h2>Історія поки порожня</h2>

          <p>
            Позначте хоча б одне тренування як виконане на сторінці “Мій план”,
            і воно з’явиться тут.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <article key={item.id} className="history-card">
              <div className="history-card-header">
                <div>
                  <h2>{item.workoutTitle}</h2>

                  <p>
                    День {item.dayNumber} · {formatDate(item.completedAt)}
                  </p>
                </div>

                <span
                  className={`history-difficulty ${getDifficultyClassName(
                    item.difficultyFeedback
                  )}`}
                >
                  {difficultyFeedbackLabels[item.difficultyFeedback] ||
                    item.difficultyFeedback ||
                    'Не вказано'}
                </span>
              </div>

              <div className="history-details">
                <span>
                  <strong>План:</strong> {item.planTitle}
                </span>

                <span>
                  <strong>Ціль:</strong>{' '}
                  {goalLabels[item.goal] || item.goal || 'Не вказано'}
                </span>

                <span>
                  <strong>Рівень:</strong>{' '}
                  {fitnessLevelLabels[item.fitnessLevel] ||
                    item.fitnessLevel ||
                    'Не вказано'}
                </span>

                <span>
                  <strong>Орієнтовна тривалість:</strong>{' '}
                  {item.estimatedDuration || '—'} хв.
                </span>
              </div>

              {item.comment && (
                <div className="history-comment">
                  <strong>Коментар:</strong>
                  <p>{item.comment}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default WorkoutHistoryPage;