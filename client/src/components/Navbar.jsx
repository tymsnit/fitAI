import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          FitAI
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Відкрити або закрити меню"
          aria-expanded={isOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`navbar-links ${isOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <NavLink to="/dashboard" onClick={closeMenu}>
                Кабінет
              </NavLink>

              <NavLink to="/profile" onClick={closeMenu}>
                Профіль
              </NavLink>

              <NavLink to="/exercises" onClick={closeMenu}>
                Вправи
              </NavLink>

              <NavLink to="/workout-plan" onClick={closeMenu}>
                План
              </NavLink>

              <NavLink to="/nutrition" onClick={closeMenu}>
                Харчування
              </NavLink>

              <NavLink to="/history" onClick={closeMenu}>
                Історія
              </NavLink>

              <NavLink to="/recommendations" onClick={closeMenu}>
                Рекомендації
              </NavLink>

              <button
                type="button"
                className="navbar-logout"
                onClick={handleLogout}
              >
                Вийти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={closeMenu}>
                Вхід
              </NavLink>

              <NavLink to="/register" onClick={closeMenu}>
                Реєстрація
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;