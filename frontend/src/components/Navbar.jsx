import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand home-icon-btn" aria-label="Go to homepage" onClick={closeMenu}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3 3 11h2v9h5v-6h4v6h5v-9h2Z" />
        </svg>
      </Link>

      <button
        type="button"
        className="menu-toggle"
        aria-label="Toggle navigation menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((prev) => !prev)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/customer/order" onClick={closeMenu}>
          Customer Order
        </Link>
        {!user && (
          <Link to="/login" onClick={closeMenu}>
            Login
          </Link>
        )}
        {!user && (
          <Link to="/register" onClick={closeMenu}>
            Register
          </Link>
        )}

        {user?.role === 'admin' && (
          <Link to="/admin/menu" onClick={closeMenu}>
            Admin Menu
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin/orders" onClick={closeMenu}>
            Admin Orders
          </Link>
        )}
        {user?.role === 'chef' && (
          <Link to="/chef/orders" onClick={closeMenu}>
            Chef Orders
          </Link>
        )}

        {user && (
          <button
            onClick={() => {
              closeMenu();
              logout();
            }}
            className="btn secondary"
            type="button"
          >
            Logout ({user.role})
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
