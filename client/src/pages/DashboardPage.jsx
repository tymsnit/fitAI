import { useEffect, useMemo, useState } from 'react';
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
};

const toNumber = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return 0;
  }

  return number;
};

const getPercent = (actual, target) => {
  const actualNumber = toNumber(actual);
  const targetNumber = toNumber(target);

  if (!targetNumber) {
    return 0;
  }

  return Math.round((actualNumber / targetNumber) * 100);
};

const getProgressWidth = (value) => {
  return `${Math.min(toNumber(value), 100)}%`;
};

const DashboardPage = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [nutrition, setNutrition] = useState(null);

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

      setRecommendations(recommendationsResponse.data.recommendations || []);
      setStatistics(recommendationsResponse.data.statistics || null);
      setNutrition(recommendationsResponse.data.nutrition || null);
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

  const profileCompleteness = useMemo(() => {
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
  }, [profile]);

  const planProgress = statistics?.completionRate || 0;

  const completedText = statistics
    ? `${statistics.completedWorkouts} з ${statistics.totalWorkouts}`
    : '0 з 0';

  const nutritionTargets = nutrition?.targets || null;
  const nutritionSummary = nutrition?.summary || null;
  const nutritionProgress = nutrition?.progress || null;

  const calculatedNutritionProgress = {
    calories: nutritionProgress?.caloriesPercent ??
      getPercent(nutritionSummary?.totalCalories, nutritionTargets?.dailyCalories),
    protein: nutritionProgress?.proteinPercent ??
      getPercent(nutritionSummary?.totalProtein, nutritionTargets?.dailyProtein),
    fats: nutritionProgress?.fatsPercent ??
      getPercent(nutritionSummary?.totalFats, nutritionTargets?.dailyFats),
    carbs: nutritionProgress?.carbsPercent ??
      getPercent(nutritionSummary?.totalCarbs, nutritionTargets?.dailyCarbs),
    water: nutritionProgress?.waterPercent ??
      getPercent(nutritionSummary?.totalWaterMl, nutritionTargets?.dailyWaterMl),
  };

  const nutritionRecommendationsCount = recommendations.filter((item) =>
    item.type?.startsWith('nutrition')
  ).length;

  const trainingRecommendationsCount = recommendations.filter((item) =>
    !item.type?.startsWith('nutrition')
  ).length;

  const expertSystemRecommendationsCount = recommendations.filter(
    (item) => item.source === 'rule_based_expert_system'
  ).length;

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
            Тут зібрано дані профілю, тренувального плану, харчування,
            прогресу та рекомендацій експертної системи.
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
          <strong>{profileCompleteness}%</strong>
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
          <span>Виконання плану</span>
          <strong>{planProgress}%</strong>
        </div>

        <div className="summary-card">
          <span>Рекомендацій</span>
          <strong>{recommendations.length}</strong>
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
                <strong>Рівень:</strong>{' '}
                {fitnessLevelLabels[profile.fitnessLevel] ||
                  profile.fitnessLevel ||
                  'Не вказано'}
              </p>

              <p>
                <strong>Ціль:</strong>{' '}
                {goalLabels[profile.goal] || profile.goal || 'Не вказано'}
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
                Ціль: {goalLabels[plan.goal] || plan.goal || 'Не вказано'}
              </p>

              <p>
                Рівень:{' '}
                {fitnessLevelLabels[plan.fitnessLevel] ||
                  plan.fitnessLevel ||
                  'Не вказано'}
              </p>

              <p>Тренувань у плані: {plan.workouts?.length || 0}</p>

              <p>Виконано: {completedText}</p>

              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: getProgressWidth(planProgress) }}
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
            <h2>Харчування сьогодні</h2>
            <Link to="/nutrition">Перейти</Link>
          </div>

          {!nutritionTargets ? (
            <div>
              <p>
                Добові цілі харчування ще не сформовано. Заповніть профіль або
                задайте цілі вручну на сторінці харчування.
              </p>

              <Link to="/nutrition" className="button">
                Налаштувати харчування
              </Link>
            </div>
          ) : (
            <>
              <div className="dashboard-nutrition-grid">
                <div className="dashboard-nutrition-card">
                  <span>Калорії</span>
                  <strong>
                    {nutritionSummary?.totalCalories || 0} /{' '}
                    {nutritionTargets.dailyCalories || 0} ккал
                  </strong>
                  <p>{calculatedNutritionProgress.calories}% від цілі</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: getProgressWidth(
                          calculatedNutritionProgress.calories
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="dashboard-nutrition-card">
                  <span>Білки</span>
                  <strong>
                    {nutritionSummary?.totalProtein || 0} /{' '}
                    {nutritionTargets.dailyProtein || 0} г
                  </strong>
                  <p>{calculatedNutritionProgress.protein}% від цілі</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: getProgressWidth(
                          calculatedNutritionProgress.protein
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="dashboard-nutrition-card">
                  <span>Жири</span>
                  <strong>
                    {nutritionSummary?.totalFats || 0} /{' '}
                    {nutritionTargets.dailyFats || 0} г
                  </strong>
                  <p>{calculatedNutritionProgress.fats}% від цілі</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: getProgressWidth(
                          calculatedNutritionProgress.fats
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="dashboard-nutrition-card">
                  <span>Вуглеводи</span>
                  <strong>
                    {nutritionSummary?.totalCarbs || 0} /{' '}
                    {nutritionTargets.dailyCarbs || 0} г
                  </strong>
                  <p>{calculatedNutritionProgress.carbs}% від цілі</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: getProgressWidth(
                          calculatedNutritionProgress.carbs
                        ),
                      }}
                    />
                  </div>
                </div>

                <div className="dashboard-nutrition-card">
                  <span>Вода</span>
                  <strong>
                    {nutritionSummary?.totalWaterMl || 0} /{' '}
                    {nutritionTargets.dailyWaterMl || 0} мл
                  </strong>
                  <p>{calculatedNutritionProgress.water}% від цілі</p>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: getProgressWidth(
                          calculatedNutritionProgress.water
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>

              <p className="small-muted">
                Дані харчування використовуються експертною системою для
                формування персональних рекомендацій.
              </p>
            </>
          )}
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <h2>Expert system</h2>
            <Link to="/recommendations">Детальніше</Link>
          </div>

          <div className="expert-system-summary">
            <div>
              <span>Усього рекомендацій</span>
              <strong>{recommendations.length}</strong>
            </div>

            <div>
              <span>Тренування</span>
              <strong>{trainingRecommendationsCount}</strong>
            </div>

            <div>
              <span>Харчування</span>
              <strong>{nutritionRecommendationsCount}</strong>
            </div>

            <div>
              <span>Правила expert system</span>
              <strong>{expertSystemRecommendationsCount}</strong>
            </div>
          </div>

          <p className="small-muted">
            Рекомендації формуються на основі формалізованих правил, що
            аналізують тренувальні дані, харчування та профіль користувача.
          </p>
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <h2>Останні рекомендації</h2>
            <Link to="/recommendations">Усі рекомендації</Link>
          </div>

          {recommendations.length === 0 ? (
            <p>
              Рекомендації поки не сформовано. Заповніть профіль, згенеруйте
              план і додайте дані харчування.
            </p>
          ) : (
            <div className="dashboard-recommendations">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <div
                  key={`${recommendation.ruleId || recommendation.type}-${index}`}
                  className="dashboard-recommendation-item"
                >
                  <span>
                    {recommendation.ruleId
                      ? `${recommendation.ruleId} · `
                      : ''}
                    {recommendationTypeLabels[recommendation.type] ||
                      recommendation.type ||
                      'Рекомендація'}
                  </span>

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

            <Link to="/nutrition" className="button secondary">
              Харчування
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