import { useEffect, useRef, useState } from 'react';
import api from '../api';

const StatusChip = ({ className, icon, children }) => (
  <span className={`status-chip ${className}`}>
    <span className="status-chip-icon" aria-hidden="true">
      {icon}
    </span>
    <span className="status-chip-text">{children}</span>
  </span>
);

const CashBundleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="3.5" y="7" width="17" height="10" rx="2" />
    <path d="M7 10h10M7 14h6" />
    <path d="M8.5 5.5h9a2 2 0 0 1 2 2V15" />
  </svg>
);

const ChefHatIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 10a5 5 0 0 1 10 0c1.7 0 3 1.3 3 3s-1.3 3-3 3H7c-1.7 0-3-1.3-3-3s1.3-3 3-3Z" />
    <path d="M8 16h8v3H8z" />
    <path d="M9 7.5 8 5.5M12 6V4M15 7.5 16 5.5" />
  </svg>
);

const StopwatchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="13" r="7" />
    <path d="M12 13l3-2" />
    <path d="M10 2h4M12 4V6" />
    <path d="M16.5 5.5 18 4" />
  </svg>
);

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

  const getPaymentLabel = (order) => (order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending');

  const getKitchenLabel = (order) => {
    if (order.completedAt) {
      return 'Completed';
    }

    if (!order.sentToKitchen) {
      return 'Not sent to chef';
    }

    if (order.kitchenStatus === 'queued') {
      return 'Queued';
    }

    if (order.kitchenStatus === 'started') {
      return 'Cooking started';
    }

    if (order.kitchenStatus === 'cooking') {
      return 'Cooking';
    }

    if (order.kitchenStatus === 'almost-done') {
      return 'Almost done';
    }

    return 'Ready to serve';
  };

  const getTimerLabel = (order) => {
    if (order.completedAt) {
      return 'Completed';
    }

    const remainingSeconds = getRemainingSeconds(order);
    if (remainingSeconds !== null) {
      return formatDuration(remainingSeconds);
    }

    return order.sentToKitchen ? 'Waiting for chef to start' : 'Not active yet';
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
                <div className="order-card-grid">
                  <div className="order-card-main">
                    <strong className="order-card-title">Order #{order._id.slice(-6)}</strong>
                    <div className="order-card-meta-line">
                      Table: {order.tableId} | Type: {order.orderType} | Payment: {order.paymentMethod}
                    </div>
                    <div className="order-card-meta-line">
                      Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                    </div>
                    <div className="order-card-items">
                      {order.items.map((item, index) => (
                        <div key={index}>
                          {item.quantity}x {item.menuItem.name}
                          {item.optionLabel ? ` (${item.optionLabel})` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-card-side">
                    <StatusChip className="status-payment" icon={<CashBundleIcon />}>
                      {getPaymentLabel(order)}
                    </StatusChip>
                    <StatusChip className="status-kitchen" icon={<ChefHatIcon />}>
                      {getKitchenLabel(order)}
                    </StatusChip>
                    <StatusChip className="status-timer" icon={<StopwatchIcon />}>
                      {getTimerLabel(order)}
                    </StatusChip>
                    {order.completedAt && (
                      <button
                        type="button"
                        className="status-chip status-archive status-chip-button"
                        onClick={() => removeCompletedOrder(order._id)}
                        title="Archive completed order"
                        aria-label="Archive completed order"
                      >
                        <span className="status-chip-text">Archive</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="order-card-actions">
                  <div className="order-card-actions-row">
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
