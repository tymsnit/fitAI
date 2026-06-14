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

const difficultyFeedbackLabels = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Складно',
  too_hard: 'Занадто складно',
};

const WorkoutPlanPage = () => {
  const [plan, setPlan] = useState(null);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState([]);
  const [feedbackByWorkout, setFeedbackByWorkout] = useState({});
  const [commentByWorkout, setCommentByWorkout] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingWorkoutId, setCompletingWorkoutId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadWorkoutHistory = async () => {
    try {
      const response = await apiClient.get('/workout-history');

      const ids = (response.data.history || []).map((item) => item.workoutId);

      setCompletedWorkoutIds(ids);
    } catch (error) {
      console.error('Не вдалося завантажити історію тренувань:', error);
    }
  };

  const loadWorkoutHistoryForPlan = async (currentPlan) => {
    try {
      const response = await apiClient.get('/workout-history');

      const currentPlanWorkoutIds = (currentPlan?.workouts || []).map(
        (workout) => workout.id
      );

      const ids = (response.data.history || [])
        .filter((item) => currentPlanWorkoutIds.includes(item.workoutId))
        .map((item) => item.workoutId);

      setCompletedWorkoutIds(ids);
    } catch (error) {
      console.error('Не вдалося завантажити історію тренувань:', error);
    }
  };

  const loadCurrentPlan = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      const response = await apiClient.get('/workout-plan/current');

      setPlan(response.data.plan);
      await loadWorkoutHistoryForPlan(response.data.plan);
    } catch (error) {
      if (error.response?.status === 404) {
        setPlan(null);
        setCompletedWorkoutIds([]);
      } else {
        setError(
          error.response?.data?.message || 'Не вдалося завантажити план'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setSuccess('');

      const response = await apiClient.post('/workout-plan/generate');

      setPlan(response.data.plan);
      setCompletedWorkoutIds([]);
      setFeedbackByWorkout({});
      setCommentByWorkout({});

      setSuccess('Новий тренувальний план успішно згенеровано');
    } catch (error) {
      setError(
        error.response?.data?.message || 'Не вдалося згенерувати план'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedbackChange = (workoutId, value) => {
    setFeedbackByWorkout({
      ...feedbackByWorkout,
      [workoutId]: value,
    });
  };

  const handleCommentChange = (workoutId, value) => {
    setCommentByWorkout({
      ...commentByWorkout,
      [workoutId]: value,
    });
  };

  const handleCompleteWorkout = async (workoutId) => {
    try {
      setCompletingWorkoutId(workoutId);
      setError('');
      setSuccess('');

      const difficultyFeedback = feedbackByWorkout[workoutId] || 'normal';
      const comment = commentByWorkout[workoutId] || '';

      await apiClient.post(`/workouts/${workoutId}/complete`, {
        difficultyFeedback,
        comment,
      });

      await loadWorkoutHistoryForPlan(plan);

      setSuccess('Тренування позначено як виконане');
    } catch (error) {
      setError(
        error.response?.data?.message || 'Не вдалося позначити тренування'
      );
    } finally {
      setCompletingWorkoutId(null);
    }
  };

  const isWorkoutCompleted = (workoutId) => {
    return completedWorkoutIds.includes(workoutId);
  };

  const getCompletionRate = () => {
    if (!plan?.workouts?.length) {
      return 0;
    }

    return Math.round((completedWorkoutIds.length / plan.workouts.length) * 100);
  };

  if (isLoading) {
    return (
      <section className="page">
        <h1>Мій план</h1>
        <p>Завантаження тренувального плану...</p>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Мій тренувальний план</h1>

          <p className="page-description">
            Тут можна згенерувати персональний план, переглянути тренування по
            днях і позначити виконані тренування.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGeneratePlan}
          disabled={isGenerating}
        >
          {isGenerating ? 'Генерація...' : plan ? 'Згенерувати новий план' : 'Згенерувати план'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {!plan ? (
        <div className="empty-state">
          <h2>Активного плану ще немає</h2>

          <p>
            Спочатку заповніть профіль користувача, а потім згенеруйте
            персональний тренувальний план FitAI.
          </p>
        </div>
      ) : (
        <>
          <div className="plan-summary">
            <div className="summary-card">
              <span>Назва плану</span>
              <strong>{plan.title}</strong>
            </div>

            <div className="summary-card">
              <span>Ціль</span>
              <strong>{goalLabels[plan.goal] || plan.goal}</strong>
            </div>

            <div className="summary-card">
              <span>Рівень</span>
              <strong>
                {fitnessLevelLabels[plan.fitnessLevel] || plan.fitnessLevel}
              </strong>
            </div>

            <div className="summary-card">
              <span>Виконання</span>
              <strong>{getCompletionRate()}%</strong>
            </div>
          </div>

          <div className="workout-list">
            {plan.workouts.map((workout) => {
              const completed = isWorkoutCompleted(workout.id);

              return (
                <article
                  key={workout.id}
                  className={`workout-card ${completed ? 'workout-completed' : ''}`}
                >
                  <div className="workout-card-header">
                    <div>
                      <h2>{workout.title}</h2>

                      <p>
                        День {workout.dayNumber} · Орієнтовна тривалість:{' '}
                        {workout.estimatedDuration || '—'} хв.
                      </p>
                    </div>

                    {completed && <span className="status-badge">Виконано</span>}
                  </div>

                  <p className="workout-description">{workout.description}</p>

                  <h3>Вправи</h3>

                  <div className="workout-exercises">
                    {workout.exercises.map((item) => (
                      <div key={item.id} className="workout-exercise-item">
                        <div>
                          <strong>{item.exercise.name}</strong>

                          <p>{item.exercise.description}</p>
                        </div>

                        <div className="exercise-load">
                          {item.sets && item.reps && (
                            <span>
                              {item.sets} підходи × {item.reps} повторень
                            </span>
                          )}

                          {item.durationMinutes && (
                            <span>{item.durationMinutes} хв.</span>
                          )}

                          {item.restSeconds && (
                            <span>Відпочинок: {item.restSeconds} сек.</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {!completed && (
                    <div className="complete-panel">
                      <label>
                        Складність
                        <select
                          value={feedbackByWorkout[workout.id] || 'normal'}
                          onChange={(event) =>
                            handleFeedbackChange(workout.id, event.target.value)
                          }
                        >
                          {Object.entries(difficultyFeedbackLabels).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        Коментар
                        <input
                          type="text"
                          value={commentByWorkout[workout.id] || ''}
                          onChange={(event) =>
                            handleCommentChange(workout.id, event.target.value)
                          }
                          placeholder="Наприклад: виконано без проблем"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handleCompleteWorkout(workout.id)}
                        disabled={completingWorkoutId === workout.id}
                      >
                        {completingWorkoutId === workout.id
                          ? 'Збереження...'
                          : 'Позначити як виконане'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};

export default WorkoutPlanPage;