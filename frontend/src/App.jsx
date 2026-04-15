import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminMenuPage from './pages/AdminMenuPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import ChefOrdersPage from './pages/ChefOrdersPage';
import CustomerOrderPage from './pages/CustomerOrderPage';

const AppLayout = () => {
  const location = useLocation();
  const isHomeRoute = location.pathname === '/';

  return (
    <div className="app-shell">
      <Navbar />
      <main className={isHomeRoute ? 'home-main' : 'container'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/customer/order" element={<CustomerOrderPage />} />

          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminMenuPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chef/orders"
            element={
              <ProtectedRoute allowedRoles={['chef', 'admin']}>
                <ChefOrdersPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
