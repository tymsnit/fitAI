import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        FitAI
      </Link>

      <div className="nav-links">
        {user ? (
          <>
            <Link to="/dashboard">Кабінет</Link>
            <Link to="/profile">Профіль</Link>
            <Link to="/exercises">Вправи</Link>
            <Link to="/workout-plan">План</Link>
            <Link to="/nutrition">Харчування</Link>
            <Link to="/history">Історія</Link>
            <Link to="/recommendations">Рекомендації</Link>
            <button onClick={handleLogout}>Вийти</button>
          </>
        ) : (
          <>
            <Link to="/login">Вхід</Link>
            <Link to="/register">Реєстрація</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;