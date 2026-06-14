import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/apiClient';

const mealTypeLabels = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
  water: 'Вода',
};

const todayIsoDate = () => {
  return new Date().toISOString().slice(0, 10);
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

const getProgressWidth = (actual, target) => {
  return `${Math.min(getPercent(actual, target), 100)}%`;
};

const NutritionPage = () => {
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());

  const [targets, setTargets] = useState(null);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [logForm, setLogForm] = useState({
    mealType: 'breakfast',
    productName: '',
    calories: '',
    protein: '',
    fats: '',
    carbs: '',
    waterMl: '',
  });

  const [targetForm, setTargetForm] = useState({
    dailyCalories: '',
    dailyProtein: '',
    dailyFats: '',
    dailyCarbs: '',
    dailyWaterMl: '',
  });

  const loadNutritionData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      const [targetsResponse, summaryResponse, logsResponse] =
        await Promise.all([
          apiClient.get('/nutrition/targets'),
          apiClient.get(`/nutrition/summary?date=${selectedDate}`),
          apiClient.get(`/nutrition/logs?date=${selectedDate}`),
        ]);

      const loadedTargets =
        targetsResponse.data.targets || summaryResponse.data.targets || null;

      setTargets(loadedTargets);
      setSummary(summaryResponse.data.summary || null);
      setLogs(logsResponse.data.logs || []);

      if (loadedTargets) {
        setTargetForm({
          dailyCalories: loadedTargets.dailyCalories || '',
          dailyProtein: loadedTargets.dailyProtein || '',
          dailyFats: loadedTargets.dailyFats || '',
          dailyCarbs: loadedTargets.dailyCarbs || '',
          dailyWaterMl: loadedTargets.dailyWaterMl || '',
        });
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося завантажити дані харчування'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNutritionData();
  }, [selectedDate]);

  const progress = useMemo(() => {
    if (!summary || !targets) {
      return {
        calories: 0,
        protein: 0,
        fats: 0,
        carbs: 0,
        water: 0,
      };
    }

    return {
      calories: getPercent(summary.totalCalories, targets.dailyCalories),
      protein: getPercent(summary.totalProtein, targets.dailyProtein),
      fats: getPercent(summary.totalFats, targets.dailyFats),
      carbs: getPercent(summary.totalCarbs, targets.dailyCarbs),
      water: getPercent(summary.totalWaterMl, targets.dailyWaterMl),
    };
  }, [summary, targets]);

  const handleLogChange = (event) => {
    const { name, value } = event.target;

    setLogForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTargetChange = (event) => {
    const { name, value } = event.target;

    setTargetForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetLogForm = () => {
    setLogForm({
      mealType: 'breakfast',
      productName: '',
      calories: '',
      protein: '',
      fats: '',
      carbs: '',
      waterMl: '',
    });
  };

  const handleCreateLog = async (event) => {
    event.preventDefault();

    try {
      setIsSavingLog(true);
      setError('');
      setSuccess('');

      if (!logForm.productName.trim()) {
        setError('Вкажіть назву продукту або запису');
        return;
      }

      await apiClient.post('/nutrition/logs', {
        mealType: logForm.mealType,
        productName: logForm.productName.trim(),
        calories: toNumber(logForm.calories),
        protein: toNumber(logForm.protein),
        fats: toNumber(logForm.fats),
        carbs: toNumber(logForm.carbs),
        waterMl: toNumber(logForm.waterMl),
        loggedAt: selectedDate,
      });

      setSuccess('Запис харчування додано');
      resetLogForm();
      await loadNutritionData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося додати запис харчування'
      );
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleQuickWater = async (amount) => {
    try {
      setError('');
      setSuccess('');

      await apiClient.post('/nutrition/logs', {
        mealType: 'water',
        productName: `Вода ${amount} мл`,
        calories: 0,
        protein: 0,
        fats: 0,
        carbs: 0,
        waterMl: amount,
        loggedAt: selectedDate,
      });

      setSuccess(`Додано ${amount} мл води`);
      await loadNutritionData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося додати запис води'
      );
    }
  };

  const handleUpdateTargets = async (event) => {
    event.preventDefault();

    try {
      setIsSavingTargets(true);
      setError('');
      setSuccess('');

      await apiClient.put('/nutrition/targets', {
        dailyCalories: toNumber(targetForm.dailyCalories),
        dailyProtein: toNumber(targetForm.dailyProtein),
        dailyFats: toNumber(targetForm.dailyFats),
        dailyCarbs: toNumber(targetForm.dailyCarbs),
        dailyWaterMl: toNumber(targetForm.dailyWaterMl),
      });

      setSuccess('Добові цілі харчування оновлено');
      await loadNutritionData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося оновити добові цілі харчування'
      );
    } finally {
      setIsSavingTargets(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    try {
      setError('');
      setSuccess('');

      await apiClient.delete(`/nutrition/logs/${logId}`);

      setSuccess('Запис видалено');
      await loadNutritionData();
    } catch (error) {
      setError(
        error.response?.data?.message ||
          'Не вдалося видалити запис'
      );
    }
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return '—';
    }

    return new Date(dateValue).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>Харчування</h1>
        <p>Завантаження даних харчування...</p>
      </section>
    );
  }

  return (
    <section className="page nutrition-page">
      <div className="page-header">
        <div>
          <h1>Харчування</h1>

          <p className="page-description">
            На цій сторінці користувач може фіксувати прийоми їжі, воду,
            калорії та макронутрієнти. Ці дані використовуються FitAI для
            формування персоналізованих рекомендацій.
          </p>
        </div>

        <div className="date-picker">
          <label htmlFor="nutrition-date">Дата</label>
          <input
            id="nutrition-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>
      </div>

      <div className="notice">
        Дані харчування в межах MVP мають інформаційний характер і не є
        медичною або дієтологічною рекомендацією.
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div className="nutrition-grid">
        <article className="nutrition-panel">
          <h2>Добові цілі</h2>

          {targets ? (
            <>
              <div className="nutrition-targets">
                <div>
                  <span>Калорії</span>
                  <strong>{targets.dailyCalories || 0} ккал</strong>
                </div>

                <div>
                  <span>Білки</span>
                  <strong>{targets.dailyProtein || 0} г</strong>
                </div>

                <div>
                  <span>Жири</span>
                  <strong>{targets.dailyFats || 0} г</strong>
                </div>

                <div>
                  <span>Вуглеводи</span>
                  <strong>{targets.dailyCarbs || 0} г</strong>
                </div>

                <div>
                  <span>Вода</span>
                  <strong>{targets.dailyWaterMl || 0} мл</strong>
                </div>
              </div>

              <p className="small-muted">
                Джерело:{' '}
                {targets.source === 'calculated'
                  ? 'розраховано автоматично'
                  : 'вказано вручну'}
              </p>
            </>
          ) : (
            <p>
              Добові цілі ще не сформовано. Заповніть профіль або вкажіть
              значення вручну.
            </p>
          )}

          <form className="nutrition-form" onSubmit={handleUpdateTargets}>
            <h3>Редагувати цілі</h3>

            <div className="form-row">
              <label>
                Калорії, ккал
                <input
                  type="number"
                  name="dailyCalories"
                  min="1"
                  value={targetForm.dailyCalories}
                  onChange={handleTargetChange}
                />
              </label>

              <label>
                Вода, мл
                <input
                  type="number"
                  name="dailyWaterMl"
                  min="0"
                  value={targetForm.dailyWaterMl}
                  onChange={handleTargetChange}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Білки, г
                <input
                  type="number"
                  name="dailyProtein"
                  min="0"
                  step="0.1"
                  value={targetForm.dailyProtein}
                  onChange={handleTargetChange}
                />
              </label>

              <label>
                Жири, г
                <input
                  type="number"
                  name="dailyFats"
                  min="0"
                  step="0.1"
                  value={targetForm.dailyFats}
                  onChange={handleTargetChange}
                />
              </label>

              <label>
                Вуглеводи, г
                <input
                  type="number"
                  name="dailyCarbs"
                  min="0"
                  step="0.1"
                  value={targetForm.dailyCarbs}
                  onChange={handleTargetChange}
                />
              </label>
            </div>

            <button type="submit" disabled={isSavingTargets}>
              {isSavingTargets ? 'Збереження...' : 'Зберегти цілі'}
            </button>
          </form>
        </article>

        <article className="nutrition-panel">
          <h2>Підсумок за день</h2>

          <div className="nutrition-summary">
            <div>
              <span>Калорії</span>
              <strong>{summary?.totalCalories || 0} ккал</strong>
              <p>{progress.calories}% від цілі</p>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: getProgressWidth(
                      summary?.totalCalories,
                      targets?.dailyCalories
                    ),
                  }}
                />
              </div>
            </div>

            <div>
              <span>Білки</span>
              <strong>{summary?.totalProtein || 0} г</strong>
              <p>{progress.protein}% від цілі</p>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: getProgressWidth(
                      summary?.totalProtein,
                      targets?.dailyProtein
                    ),
                  }}
                />
              </div>
            </div>

            <div>
              <span>Жири</span>
              <strong>{summary?.totalFats || 0} г</strong>
              <p>{progress.fats}% від цілі</p>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: getProgressWidth(
                      summary?.totalFats,
                      targets?.dailyFats
                    ),
                  }}
                />
              </div>
            </div>

            <div>
              <span>Вуглеводи</span>
              <strong>{summary?.totalCarbs || 0} г</strong>
              <p>{progress.carbs}% від цілі</p>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: getProgressWidth(
                      summary?.totalCarbs,
                      targets?.dailyCarbs
                    ),
                  }}
                />
              </div>
            </div>

            <div>
              <span>Вода</span>
              <strong>{summary?.totalWaterMl || 0} мл</strong>
              <p>{progress.water}% від цілі</p>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: getProgressWidth(
                      summary?.totalWaterMl,
                      targets?.dailyWaterMl
                    ),
                  }}
                />
              </div>
            </div>
          </div>

          <div className="quick-water">
            <button type="button" onClick={() => handleQuickWater(250)}>
              +250 мл води
            </button>

            <button type="button" onClick={() => handleQuickWater(500)}>
              +500 мл води
            </button>
          </div>
        </article>
      </div>

      <div className="nutrition-grid">
        <article className="nutrition-panel">
          <h2>Додати запис</h2>

          <form className="nutrition-form" onSubmit={handleCreateLog}>
            <label>
              Тип запису
              <select
                name="mealType"
                value={logForm.mealType}
                onChange={handleLogChange}
              >
                <option value="breakfast">Сніданок</option>
                <option value="lunch">Обід</option>
                <option value="dinner">Вечеря</option>
                <option value="snack">Перекус</option>
                <option value="water">Вода</option>
              </select>
            </label>

            <label>
              Назва продукту / запису
              <input
                type="text"
                name="productName"
                value={logForm.productName}
                onChange={handleLogChange}
                placeholder="Наприклад: Вівсянка з бананом"
              />
            </label>

            <div className="form-row">
              <label>
                Калорії
                <input
                  type="number"
                  name="calories"
                  min="0"
                  value={logForm.calories}
                  onChange={handleLogChange}
                />
              </label>

              <label>
                Білки, г
                <input
                  type="number"
                  name="protein"
                  min="0"
                  step="0.1"
                  value={logForm.protein}
                  onChange={handleLogChange}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                Жири, г
                <input
                  type="number"
                  name="fats"
                  min="0"
                  step="0.1"
                  value={logForm.fats}
                  onChange={handleLogChange}
                />
              </label>

              <label>
                Вуглеводи, г
                <input
                  type="number"
                  name="carbs"
                  min="0"
                  step="0.1"
                  value={logForm.carbs}
                  onChange={handleLogChange}
                />
              </label>

              <label>
                Вода, мл
                <input
                  type="number"
                  name="waterMl"
                  min="0"
                  value={logForm.waterMl}
                  onChange={handleLogChange}
                />
              </label>
            </div>

            <button type="submit" disabled={isSavingLog}>
              {isSavingLog ? 'Додавання...' : 'Додати запис'}
            </button>
          </form>
        </article>

        <article className="nutrition-panel">
          <h2>Журнал за день</h2>

          {logs.length === 0 ? (
            <div className="empty-state compact">
              <p>За обрану дату записів харчування ще немає.</p>
            </div>
          ) : (
            <div className="nutrition-log-list">
              {logs.map((log) => (
                <div key={log.id} className="nutrition-log-item">
                  <div>
                    <span className="meal-badge">
                      {mealTypeLabels[log.mealType] || log.mealType}
                    </span>

                    <h3>{log.productName}</h3>

                    <p>{formatDateTime(log.loggedAt)}</p>

                    <p>
                      {log.calories || 0} ккал · Б: {log.protein || 0} г · Ж:{' '}
                      {log.fats || 0} г · В: {log.carbs || 0} г · Вода:{' '}
                      {log.waterMl || 0} мл
                    </p>
                  </div>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteLog(log.id)}
                  >
                    Видалити
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
};

export default NutritionPage;