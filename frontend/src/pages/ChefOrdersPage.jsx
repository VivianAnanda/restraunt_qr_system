import { useEffect, useState } from 'react';
import api from '../api';

const ChefOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order');
    }
  };

  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const inProgressOrders = orders.filter((order) => order.status === 'in-progress');

  return (
    <div>
      <h2>Kitchen Orders</h2>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading orders...</p>}

      {!loading && pendingOrders.length === 0 && inProgressOrders.length === 0 && (
        <p>No active orders.</p>
      )}

      {!loading && (pendingOrders.length > 0 || inProgressOrders.length > 0) && (
        <div className="grid two-columns">
          {/* Pending Orders */}
          <div className="card">
            <h3>Pending Orders ({pendingOrders.length})</h3>
            <div className="list">
              {pendingOrders.length === 0 && <p>No pending orders</p>}
              {pendingOrders.map((order) => (
                <div key={order._id} className="list-item block">
                  <div>
                    <strong>Table {order.tableId}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx}>{item.quantity}x {item.menuItem.name}</div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Est. {order.estimatedPrepTime} min
                    </div>
                  </div>
                  <button
                    onClick={() => updateStatus(order._id, 'in-progress')}
                    className="btn small"
                    type="button"
                  >
                    Start Cooking
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress Orders */}
          <div className="card">
            <h3>In Progress ({inProgressOrders.length})</h3>
            <div className="list">
              {inProgressOrders.length === 0 && <p>No orders cooking</p>}
              {inProgressOrders.map((order) => (
                <div key={order._id} className="list-item block">
                  <div>
                    <strong>Table {order.tableId}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx}>{item.quantity}x {item.menuItem.name}</div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Est. {order.estimatedPrepTime} min
                    </div>
                  </div>
                  <button
                    onClick={() => updateStatus(order._id, 'completed')}
                    className="btn small"
                    type="button"
                  >
                    Mark Ready
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChefOrdersPage;
