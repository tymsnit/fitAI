import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

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

const DashboardPage = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const profileResponse = await apiClient.get('/profile');
      setProfile(profileResponse.data.profile);

      try {
        const planResponse = await apiClient.get('/workout-plan/current');
        setPlan(planResponse.data.plan);
      } catch (planError) {
        if (planError.response?.status === 404) {
          setPlan(null);
        } else {
          throw planError;
        }
      }

      const recommendationsResponse = await apiClient.get('/recommendations');

      setRecommendations(
        recommendationsResponse.data.recommendations || []
      );

      setStatistics(recommendationsResponse.data.statistics || null);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося завантажити дані особистого кабінету'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getProfileCompleteness = () => {
    if (!profile) {
      return 0;
    }

    const fields = [
      profile.name,
      profile.age,
      profile.gender,
      profile.height,
      profile.weight,
      profile.fitnessLevel,
      profile.goal,
      profile.trainingsPerWeek,
    ];

    const filled = fields.filter(Boolean).length;

    return Math.round((filled / fields.length) * 100);
  };

  const getPlanProgress = () => {
    if (!statistics) {
      return 0;
    }

    return statistics.completionRate || 0;
  };

  const getCompletedText = () => {
    if (!statistics) {
      return '0 з 0';
    }

    return `${statistics.completedWorkouts} з ${statistics.totalWorkouts}`;
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>Особистий кабінет</h1>
        <p>Завантаження даних...</p>
      </section>
    );
  }

  return (
    <section className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1>Особистий кабінет FitAI</h1>

          <p className="page-description">
            Вітаємо{profile?.name ? `, ${profile.name}` : user?.email ? `, ${user.email}` : ''}.
            Тут зібрано основну інформацію про профіль, активний план,
            виконання тренувань і персональні рекомендації.
          </p>
        </div>

        <button type="button" onClick={loadDashboardData}>
          Оновити дані
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="dashboard-summary">
        <div className="summary-card">
          <span>Заповнення профілю</span>
          <strong>{getProfileCompleteness()}%</strong>
        </div>

        <div className="summary-card">
          <span>Ціль</span>
          <strong>
            {profile?.goal
              ? goalLabels[profile.goal] || profile.goal
              : 'Не вказано'}
          </strong>
        </div>

        <div className="summary-card">
          <span>Рівень</span>
          <strong>
            {profile?.fitnessLevel
              ? fitnessLevelLabels[profile.fitnessLevel] ||
                profile.fitnessLevel
              : 'Не вказано'}
          </strong>
        </div>

        <div className="summary-card">
          <span>Виконання плану</span>
          <strong>{getPlanProgress()}%</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-panel">
          <div className="panel-header">
            <h2>Профіль</h2>
            <Link to="/profile">Редагувати</Link>
          </div>

          {profile ? (
            <div className="profile-preview">
              <p>
                <strong>Ім’я:</strong> {profile.name || 'Не вказано'}
              </p>

              <p>
                <strong>Вік:</strong> {profile.age || 'Не вказано'}
              </p>

              <p>
                <strong>Зріст:</strong>{' '}
                {profile.height ? `${profile.height} см` : 'Не вказано'}
              </p>

              <p>
                <strong>Вага:</strong>{' '}
                {profile.weight ? `${profile.weight} кг` : 'Не вказано'}
              </p>

              <p>
                <strong>Тренувань на тиждень:</strong>{' '}
                {profile.trainingsPerWeek || 'Не вказано'}
              </p>
            </div>
          ) : (
            <p>Профіль ще не створено.</p>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <h2>Активний план</h2>
            <Link to="/workout-plan">Перейти</Link>
          </div>

          {plan ? (
            <>
              <p>
                <strong>{plan.title}</strong>
              </p>

              <p>
                Ціль:{' '}
                {goalLabels[plan.goal] || plan.goal || 'Не вказано'}
              </p>

              <p>
                Рівень:{' '}
                {fitnessLevelLabels[plan.fitnessLevel] ||
                  plan.fitnessLevel ||
                  'Не вказано'}
              </p>

              <p>
                Тренувань у плані: {plan.workouts?.length || 0}
              </p>

              <p>
                Виконано: {getCompletedText()}
              </p>

              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${getPlanProgress()}%` }}
                />
              </div>
            </>
          ) : (
            <div>
              <p>Активного плану ще немає.</p>

              <Link to="/workout-plan" className="button">
                Згенерувати план
              </Link>
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="panel-header">
            <h2>Останні рекомендації</h2>
            <Link to="/recommendations">Усі рекомендації</Link>
          </div>

          {recommendations.length === 0 ? (
            <p>
              Рекомендації поки не сформовано. Заповніть профіль, згенеруйте
              план і позначте хоча б одне тренування як виконане.
            </p>
          ) : (
            <div className="dashboard-recommendations">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <div
                  key={`${recommendation.type}-${index}`}
                  className="dashboard-recommendation-item"
                >
                  <span>{recommendation.type}</span>

                  <h3>{recommendation.title}</h3>

                  <p>{recommendation.description}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <h2>Швидкі дії</h2>

          <div className="quick-actions">
            <Link to="/profile" className="button">
              Заповнити профіль
            </Link>

            <Link to="/exercises" className="button secondary">
              Переглянути вправи
            </Link>

            <Link to="/workout-plan" className="button secondary">
              Мій план
            </Link>

            <Link to="/history" className="button secondary">
              Історія тренувань
            </Link>

            <Link to="/recommendations" className="button secondary">
              AI-рекомендації
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
};

export default DashboardPage;