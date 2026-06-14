import { useEffect, useState } from 'react';
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

const recommendationTypeLabels = {
  profile: 'Профіль',
  workout_plan: 'План тренувань',
  consistency: 'Регулярність',
  training_load: 'Навантаження',
  progression: 'Прогрес',
  difficulty: 'Складність',
  goal: 'Ціль',
  general: 'Загальна рекомендація',
};

const RecommendationsPage = () => {
  const [data, setData] = useState({
    profile: null,
    plan: null,
    statistics: null,
    recommendations: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendations = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      const response = await apiClient.get('/recommendations');

      setData({
        profile: response.data.profile,
        plan: response.data.plan,
        statistics: response.data.statistics,
        recommendations: response.data.recommendations || [],
      });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося завантажити рекомендації'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const getCompletionText = () => {
    if (!data.statistics) {
      return 'Немає даних';
    }

    return `${data.statistics.completedWorkouts} з ${data.statistics.totalWorkouts}`;
  };

  const getFeedbackCount = (key) => {
    return data.statistics?.feedback?.[key] || 0;
  };

  const getRecommendationTypeLabel = (type) => {
    return recommendationTypeLabels[type] || type || 'Рекомендація';
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>AI-рекомендації</h1>
        <p>Завантаження рекомендацій...</p>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>AI-рекомендації FitAI</h1>

          <p className="page-description">
            Система аналізує профіль користувача, активний тренувальний план,
            історію виконання тренувань і суб’єктивну складність, після чого
            формує персональні рекомендації.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRecommendations(true)}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Оновлення...' : 'Оновити рекомендації'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="recommendation-overview">
        <div className="summary-card">
          <span>Ціль</span>
          <strong>
            {data.profile?.goal
              ? goalLabels[data.profile.goal] || data.profile.goal
              : 'Не вказано'}
          </strong>
        </div>

        <div className="summary-card">
          <span>Рівень</span>
          <strong>
            {data.profile?.fitnessLevel
              ? fitnessLevelLabels[data.profile.fitnessLevel] ||
                data.profile.fitnessLevel
              : 'Не вказано'}
          </strong>
        </div>

        <div className="summary-card">
          <span>Виконано тренувань</span>
          <strong>{getCompletionText()}</strong>
        </div>

        <div className="summary-card">
          <span>Відсоток виконання</span>
          <strong>
            {data.statistics ? `${data.statistics.completionRate}%` : '—'}
          </strong>
        </div>
      </div>

      {data.statistics && (
        <div className="feedback-panel">
          <h2>Оцінка складності тренувань</h2>

          <div className="feedback-grid">
            <div className="feedback-card">
              <span>Легко</span>
              <strong>{getFeedbackCount('easy')}</strong>
            </div>

            <div className="feedback-card">
              <span>Нормально</span>
              <strong>{getFeedbackCount('normal')}</strong>
            </div>

            <div className="feedback-card">
              <span>Складно</span>
              <strong>{getFeedbackCount('hard')}</strong>
            </div>

            <div className="feedback-card">
              <span>Занадто складно</span>
              <strong>{getFeedbackCount('too_hard')}</strong>
            </div>
          </div>
        </div>
      )}

      {!data.plan && (
        <div className="empty-state">
          <h2>Активного плану немає</h2>

          <p>
            Для повноцінних рекомендацій потрібно спочатку заповнити профіль і
            згенерувати персональний тренувальний план.
          </p>
        </div>
      )}

      <div className="recommendations-section">
        <h2>Персональні рекомендації</h2>

        {data.recommendations.length === 0 ? (
          <p>Рекомендації поки не сформовано.</p>
        ) : (
          <div className="recommendation-list">
            {data.recommendations.map((recommendation, index) => (
              <article key={`${recommendation.type}-${index}`} className="recommendation-card">
                <div className="recommendation-card-header">
                  <span className="recommendation-type">
                    {getRecommendationTypeLabel(recommendation.type)}
                  </span>

                  <span className="recommendation-source">
                    {recommendation.source === 'rule_based'
                      ? 'На основі правил'
                      : recommendation.source}
                  </span>
                </div>

                <h3>{recommendation.title}</h3>

                <p>{recommendation.description}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="ai-explanation">
        <h2>Як FitAI формує ці рекомендації</h2>

        <p>
          У межах MVP FitAI використовує рекомендаційну логіку на основі правил.
          Це означає, що система порівнює фактичні дані користувача з набором
          умов: відсотком виконання плану, кількістю виконаних тренувань,
          складністю тренувань і ціллю користувача.
        </p>

        <p>
          Наприклад, якщо користувач виконує менше половини плану, система
          рекомендує зменшити навантаження. Якщо користувач стабільно виконує
          більшість тренувань, FitAI може рекомендувати поступове підвищення
          складності.
        </p>
      </div>
    </section>
  );
};

export default RecommendationsPage;