import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Welcome to</h1>
          <h2 className="hero-brand">XYZ Fast Food</h2>
          <p className="hero-subtitle">Fresh. Fast. Delicious.</p>
          <p className="hero-description">
            Order your favorite meals directly from your table with our innovative QR code menu system.
          </p>
          <Link to="/customer/order" className="cta-button">
            View Menu & Order
          </Link>
        </div>
        <div className="hero-background"></div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="feature-card">
            <div className="feature-icon">🍔</div>
            <h3>Fresh Menu</h3>
            <p>Carefully curated selection of delicious dishes</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Quick Service</h3>
            <p>Order from your table, get served fast</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Easy Ordering</h3>
            <p>Simple QR code based digital menu system</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
