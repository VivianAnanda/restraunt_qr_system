import { useEffect, useState } from 'react';
import api from '../api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const inProgressOrders = orders.filter((order) => order.status === 'in-progress');
  const completedOrders = orders.filter((order) => order.status === 'completed');

  const filterOrders = () => {
    if (filterStatus === 'all') return orders;
    return orders.filter((order) => order.status === filterStatus);
  };

  const displayedOrders = filterOrders();

  return (
    <div>
      <h2>Admin Orders Dashboard</h2>

      <div className="grid two-columns" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Pending</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {pendingOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>In Progress</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {inProgressOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Completed</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {completedOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Total Orders</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6b7280' }}>
            {orders.length}
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Filter Orders</h3>
        <div style={{ marginBottom: '1rem' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p>Loading orders...</p>}

        {!loading && displayedOrders.length === 0 && <p>No orders found.</p>}

        {!loading && displayedOrders.length > 0 && (
          <div className="list">
            {displayedOrders.map((order) => (
              <div key={order._id} className="list-item block">
                <div>
                  <strong>Order #{order._id.slice(-6)}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                    Table: {order.tableId} | Type: {order.orderType} | Payment: {order.paymentMethod}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Items: {order.items.length} | Total: Rs. {order.totalAmount} | Est. Time: {order.estimatedPrepTime} min
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem' }}>
                    {order.items.map((item, index) => (
                      <div key={index}>
                        {item.quantity}x {item.menuItem.name}
                        {item.optionLabel ? ` (${item.optionLabel})` : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Status: {order.status}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
