import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <section className="page">
      <h1>FitAI</h1>

      <p>
        FitAI — це вебзастосунок для формування персональних тренувальних
        планів та рекомендацій на основі профілю користувача.
      </p>

      <div className="actions">
        <Link to="/register" className="button">
          Почати
        </Link>

        <Link to="/login" className="button secondary">
          Увійти
        </Link>
      </div>
    </section>
  );
};

export default HomePage;