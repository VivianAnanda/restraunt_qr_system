import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        Restaurant QR System
      </Link>

      <div className="nav-links">
        <Link to="/customer/order">Customer Order</Link>
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/register">Register</Link>}

        {user?.role === 'admin' && <Link to="/admin/menu">Admin Menu</Link>}
        {user?.role === 'admin' && <Link to="/admin/orders">Admin Orders</Link>}
        {user?.role === 'chef' && <Link to="/chef/orders">Chef Orders</Link>}

        {user && (
          <button onClick={logout} className="btn secondary" type="button">
            Logout ({user.role})
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
