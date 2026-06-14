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
  nutrition: 'Харчування',
  nutrition_calories: 'Калорії',
  nutrition_protein: 'Білки',
  nutrition_water: 'Вода',
  nutrition_balance: 'Баланс харчування',
  general: 'Загальна рекомендація',
};

const sourceLabels = {
  rule_based: 'На основі правил',
  rule_based_expert_system: 'Експертна система правил',
};

const toNumber = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
};

const RecommendationsPage = () => {
  const [data, setData] = useState({
    profile: null,
    plan: null,
    statistics: null,
    nutrition: null,
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
        nutrition: response.data.nutrition,
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

  const getSourceLabel = (source) => {
    return sourceLabels[source] || source || 'Джерело не вказано';
  };

  const getPriorityLabel = (priority) => {
    const value = Number(priority || 0);

    if (value >= 8) {
      return 'Високий пріоритет';
    }

    if (value >= 5) {
      return 'Середній пріоритет';
    }

    return 'Низький пріоритет';
  };

  const getProgressWidth = (value) => {
    return `${Math.min(toNumber(value), 100)}%`;
  };

  const nutritionTargets = data.nutrition?.targets || null;
  const nutritionSummary = data.nutrition?.summary || null;
  const nutritionProgress = data.nutrition?.progress || null;

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
            Система аналізує профіль користувача, тренувальний план, історію
            виконання тренувань, оцінку складності, а також дані харчування.
            У межах MVP рекомендації формуються пояснюваною експертною
            системою на основі правил.
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

      <div className="notice">
        Рекомендації FitAI мають інформаційний характер і не є медичною,
        дієтологічною або професійною спортивною консультацією.
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

      <div className="nutrition-ai-panel">
        <div className="panel-header">
          <h2>Дані харчування для рекомендацій</h2>
        </div>

        {!nutritionTargets ? (
          <div className="empty-state compact">
            <p>
              Добові цілі харчування ще не сформовано. Заповніть профіль або
              вкажіть цілі на сторінці “Харчування”.
            </p>
          </div>
        ) : (
          <>
            <div className="nutrition-ai-grid">
              <div className="nutrition-ai-card">
                <span>Ціль калорій</span>
                <strong>{nutritionTargets.dailyCalories || 0} ккал</strong>
                <p>
                  Фактично: {nutritionSummary?.totalCalories || 0} ккал ·{' '}
                  {nutritionProgress?.caloriesPercent || 0}%
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: getProgressWidth(
                        nutritionProgress?.caloriesPercent
                      ),
                    }}
                  />
                </div>
              </div>

              <div className="nutrition-ai-card">
                <span>Білки</span>
                <strong>{nutritionTargets.dailyProtein || 0} г</strong>
                <p>
                  Фактично: {nutritionSummary?.totalProtein || 0} г ·{' '}
                  {nutritionProgress?.proteinPercent || 0}%
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: getProgressWidth(
                        nutritionProgress?.proteinPercent
                      ),
                    }}
                  />
                </div>
              </div>

              <div className="nutrition-ai-card">
                <span>Жири</span>
                <strong>{nutritionTargets.dailyFats || 0} г</strong>
                <p>
                  Фактично: {nutritionSummary?.totalFats || 0} г ·{' '}
                  {nutritionProgress?.fatsPercent || 0}%
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: getProgressWidth(nutritionProgress?.fatsPercent),
                    }}
                  />
                </div>
              </div>

              <div className="nutrition-ai-card">
                <span>Вуглеводи</span>
                <strong>{nutritionTargets.dailyCarbs || 0} г</strong>
                <p>
                  Фактично: {nutritionSummary?.totalCarbs || 0} г ·{' '}
                  {nutritionProgress?.carbsPercent || 0}%
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: getProgressWidth(nutritionProgress?.carbsPercent),
                    }}
                  />
                </div>
              </div>

              <div className="nutrition-ai-card">
                <span>Вода</span>
                <strong>{nutritionTargets.dailyWaterMl || 0} мл</strong>
                <p>
                  Фактично: {nutritionSummary?.totalWaterMl || 0} мл ·{' '}
                  {nutritionProgress?.waterPercent || 0}%
                </p>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: getProgressWidth(nutritionProgress?.waterPercent),
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="small-muted">
              Дані за дату:{' '}
              {nutritionSummary?.date || data.nutrition?.summary?.date || 'сьогодні'}
            </p>
          </>
        )}
      </div>

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
              <article
                key={`${recommendation.ruleId || recommendation.type}-${index}`}
                className="recommendation-card"
              >
                <div className="recommendation-card-header">
                  <div className="recommendation-tags">
                    <span className="recommendation-type">
                      {getRecommendationTypeLabel(recommendation.type)}
                    </span>

                    {recommendation.ruleId && (
                      <span className="recommendation-rule">
                        {recommendation.ruleId}
                      </span>
                    )}
                  </div>

                  <div className="recommendation-tags">
                    <span className="recommendation-source">
                      {getSourceLabel(recommendation.source)}
                    </span>

                    {recommendation.priority !== undefined && (
                      <span className="recommendation-priority">
                        {getPriorityLabel(recommendation.priority)}
                      </span>
                    )}
                  </div>
                </div>

                <h3>{recommendation.title}</h3>

                <p>{recommendation.description}</p>

                {recommendation.explanation && (
                  <div className="recommendation-explanation">
                    <strong>Пояснення правила:</strong>
                    <p>{recommendation.explanation}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="ai-explanation">
        <h2>Як працює експертна система FitAI</h2>

        <p>
          У межах MVP елементи штучного інтелекту реалізовано як rule-based
          expert system — експертну систему на основі правил. Кожне правило має
          ідентифікатор, умову спрацювання, тип рекомендації, пріоритет і
          пояснення.
        </p>

        <p>
          Система аналізує тренувальні показники та дані харчування. Наприклад,
          якщо користувач виконує менше половини тренувального плану, формується
          рекомендація зменшити навантаження. Якщо за день внесено недостатньо
          води або білка відносно добової цілі, система формує відповідну
          рекомендацію щодо контролю харчування.
        </p>

        <p>
          Такий підхід не є нейронною мережею або моделлю машинного навчання,
          але забезпечує прозору алгоритмічну персоналізацію та дозволяє
          пояснити, чому користувач отримав конкретну пораду.
        </p>
      </div>
    </section>
  );
};

export default RecommendationsPage;