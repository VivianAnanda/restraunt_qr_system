import { useEffect, useState } from 'react';
import api from '../api';

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString();
};

const AdminArchivedOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchArchivedOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/archived/list');
      setOrders(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load archived orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedOrders();
  }, []);

  return (
    <div>
      <h2>Archived Orders</h2>
      <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
        Historical orders archived from the live admin orders list.
      </p>

      <div className="card">
        {error && <p className="error">{error}</p>}
        {loading && <p>Loading archived orders...</p>}

        {!loading && orders.length === 0 && <p>No archived orders found.</p>}

        {!loading && orders.length > 0 && (
          <div className="list">
            {orders.map((order) => (
              <div key={order._id} className="list-item block">
                <div>
                  <strong>Order #{order._id.slice(-6)}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                    Table: {order.tableId} | Type: {order.orderType} | Payment: {order.paymentMethod}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem' }}>
                    {order.items.map((item, index) => (
                      <div key={`${order._id}-${index}`}>
                        {item.quantity}x {item.menuItem?.name || 'Unknown item'}
                        {item.optionLabel ? ` (${item.optionLabel})` : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.2rem' }}>
                    <strong>Payment Status: {order.paymentStatus}</strong>
                    <strong>Kitchen Status: {order.completedAt ? 'completed' : order.kitchenStatus || 'n/a'}</strong>
                    <strong>Completed At: {formatDateTime(order.completedAt)}</strong>
                    <strong>Archived At: {formatDateTime(order.archivedAt)}</strong>
                    <strong>Last Updated: {formatDateTime(order.updatedAt)}</strong>
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

export default AdminArchivedOrdersPage;
