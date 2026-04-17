import { useEffect, useRef, useState } from 'react';
import api from '../api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [now, setNow] = useState(Date.now());
  const pageRef = useRef(null);

  const getScrollContainer = () => {
    let current = pageRef.current?.parentElement || null;

    while (current) {
      const style = window.getComputedStyle(current);
      const isScrollable =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        current.scrollHeight > current.clientHeight;

      if (isScrollable) {
        return current;
      }

      current = current.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  };

  const fetchOrders = async ({ preserveScroll = true, showLoading = false } = {}) => {
    const scrollContainer = getScrollContainer();
    const scrollLeft = scrollContainer.scrollLeft;
    const scrollTop = scrollContainer.scrollTop;

    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      if (showLoading) {
        setLoading(false);
      }

      if (preserveScroll) {
        window.requestAnimationFrame(() => {
          if ('scrollTo' in scrollContainer && typeof scrollContainer.scrollTo === 'function') {
            scrollContainer.scrollTo(scrollLeft, scrollTop);
          } else {
            scrollContainer.scrollLeft = scrollLeft;
            scrollContainer.scrollTop = scrollTop;
          }
        });
      }
    }
  };

  useEffect(() => {
    fetchOrders({ preserveScroll: false, showLoading: true });
    const intervalId = window.setInterval(() => fetchOrders(), 5000);
    const clockId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearInterval(clockId);
    };
  }, []);

  const updatePaymentStatus = async (orderId, paymentStatus) => {
    try {
      await api.patch(`/orders/${orderId}/payment-status`, { paymentStatus });
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const sendToKitchen = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/send-to-kitchen`);
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send order to chef');
    }
  };

  const completeOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/complete`);
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete order');
    }
  };

  const removeCompletedOrder = async (orderId) => {
    const shouldRemove = window.confirm('Remove this completed order from the admin list?');

    if (!shouldRemove) {
      return;
    }

    try {
      await api.delete(`/orders/${orderId}`);
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to archive completed order');
    }
  };

  const pendingPaymentOrders = orders.filter((order) => order.paymentStatus === 'pending');
  const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
  const sentToKitchenOrders = orders.filter((order) => order.sentToKitchen && !order.completedAt);
  const readyOrders = orders.filter((order) => order.kitchenStatus === 'ready-to-serve' && !order.completedAt);
  const completedOrders = orders.filter((order) => order.completedAt);

  const getRemainingSeconds = (order) => {
    if (order.completedAt) {
      return 0;
    }

    if (!order.prepStartedAt || !order.prepEndsAt) {
      return null;
    }

    return Math.max(0, Math.ceil((new Date(order.prepEndsAt).getTime() - now) / 1000));
  };

  const formatDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const filterOrders = () => {
    if (filterStatus === 'all') return orders;
    if (filterStatus === 'pending-payment') {
      return orders.filter((order) => order.paymentStatus === 'pending');
    }
    if (filterStatus === 'paid-not-sent') {
      return orders.filter((order) => order.paymentStatus === 'paid' && !order.sentToKitchen);
    }
    if (filterStatus === 'in-kitchen') {
      return orders.filter((order) => order.sentToKitchen && order.kitchenStatus !== 'ready-to-serve');
    }
    if (filterStatus === 'ready') {
      return orders.filter((order) => order.kitchenStatus === 'ready-to-serve' && !order.completedAt);
    }
    if (filterStatus === 'completed') {
      return orders.filter((order) => order.completedAt);
    }

    return orders;
  };

  const displayedOrders = filterOrders();

  return (
    <div ref={pageRef}>
      <h2>Admin Orders Dashboard</h2>

      <div className="grid two-columns" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <h3>Payment Pending</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {pendingPaymentOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Paid</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
            {paidOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Sent To Chef</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {sentToKitchenOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Ready To Serve</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6b7280' }}>
            {readyOrders.length}
          </p>
        </div>
        <div className="card">
          <h3>Completed</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {completedOrders.length}
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Filter Orders</h3>
        <div style={{ marginBottom: '1rem' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Orders</option>
            <option value="pending-payment">Payment Pending</option>
            <option value="paid-not-sent">Paid, Not Sent To Chef</option>
            <option value="in-kitchen">In Kitchen</option>
            <option value="ready">Ready To Serve</option>
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
                    Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.35rem' }}>
                    {order.items.map((item, index) => (
                      <div key={index}>
                        {item.quantity}x {item.menuItem.name}
                        {item.optionLabel ? ` (${item.optionLabel})` : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.2rem' }}>
                    <strong>Payment: {order.paymentStatus}</strong>
                    <strong>Kitchen: {order.completedAt ? 'completed' : order.sentToKitchen ? order.kitchenStatus : 'Not sent to chef'}</strong>
                    <strong>
                      Timer:{' '}
                      {order.completedAt
                        ? 'Completed'
                        : getRemainingSeconds(order) !== null
                          ? formatDuration(getRemainingSeconds(order))
                          : order.sentToKitchen
                            ? 'Waiting for chef to start'
                            : 'Not active yet'}
                    </strong>
                  </div>

                  <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {order.paymentStatus === 'pending' && (
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => updatePaymentStatus(order._id, 'paid')}
                      >
                        Mark Paid
                      </button>
                    )}

                    {order.paymentStatus === 'paid' && !order.sentToKitchen && (
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => sendToKitchen(order._id)}
                      >
                        Send To Chef
                      </button>
                    )}

                    {order.kitchenStatus === 'ready-to-serve' && !order.completedAt && (
                      <button
                        type="button"
                        className="btn small"
                        onClick={() => completeOrder(order._id)}
                      >
                        Complete Order
                      </button>
                    )}

                    {order.completedAt && (
                      <button
                        type="button"
                        className="btn small"
                        style={{ backgroundColor: '#ef4444', color: '#fff' }}
                        onClick={() => removeCompletedOrder(order._id)}
                        title="Remove completed order"
                        aria-label="Remove completed order"
                      >
                        X
                      </button>
                    )}
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
