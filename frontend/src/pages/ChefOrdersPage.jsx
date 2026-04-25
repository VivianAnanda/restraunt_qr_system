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

const getNextKitchenStatus = (currentStatus) => {
  if (currentStatus === 'started') return 'cooking';
  if (currentStatus === 'cooking') return 'almost-done';
  if (currentStatus === 'almost-done') return 'ready-to-serve';
  return null;
};

const getActionLabel = (currentStatus) => {
  if (currentStatus === 'started') return 'Move to Cooking';
  if (currentStatus === 'cooking') return 'Move to Almost Done';
  if (currentStatus === 'almost-done') return 'Mark Ready to Serve';
  return '';
};

const ChefOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const updateKitchenStatus = async (orderId, kitchenStatus) => {
    try {
      await api.patch(`/orders/${orderId}/kitchen-status`, { kitchenStatus });
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update order');
    }
  };

  const extendOrderTimer = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/extend-timer`);
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add time');
    }
  };

  const activeOrders = orders
    .filter((order) => order.sentToKitchen && order.kitchenStatus !== 'ready-to-serve' && order.kitchenStatus !== 'queued' && !order.completedAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const readyOrders = orders
    .filter((order) => order.sentToKitchen && order.kitchenStatus === 'ready-to-serve' && !order.completedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const queuedOrders = orders
    .filter((order) => order.sentToKitchen && order.kitchenStatus === 'queued' && !order.completedAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

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

  const getTimerText = (order) => {
    if (order.completedAt) {
      return 'Completed';
    }

    const remainingSeconds = getRemainingSeconds(order);
    if (remainingSeconds !== null) {
      return formatDuration(remainingSeconds);
    }

    if (order.kitchenStatus === 'queued') {
      return 'Waiting to start';
    }

    return 'Not active';
  };

  const getPaymentLabel = (order) => (order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending');

  const getKitchenLabel = (order) => {
    if (order.completedAt) {
      return 'Completed';
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

    return order.kitchenStatus === 'queued' ? 'Waiting to start' : 'Not active';
  };

  return (
    <div ref={pageRef}>
      <h2>Kitchen Orders</h2>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading orders...</p>}

      {!loading && activeOrders.length === 0 && readyOrders.length === 0 && (
        <p>No active orders.</p>
      )}

      {!loading && (queuedOrders.length > 0 || activeOrders.length > 0 || readyOrders.length > 0) && (
        <div className="grid two-columns">
          <div className="card">
            <h3>Kitchen Queue ({queuedOrders.length + activeOrders.length})</h3>
            <div className="list">
              {queuedOrders.length === 0 && activeOrders.length === 0 && <p>No orders in kitchen queue</p>}
              {queuedOrders.map((order) => (
                <div key={order._id} className="list-item block">
                  <div className="order-card-grid">
                    <div className="order-card-main">
                      <strong className="order-card-title">Table {order.tableId}</strong>
                      <div className="order-card-meta-line">
                        Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                      </div>
                      <div className="order-card-items">
                        {order.items.map((item, idx) => (
                          <div key={idx}>
                            {item.quantity}x {item.menuItem.name}
                            {item.optionLabel ? ` (${item.optionLabel})` : ''}
                            {item.specialInstructions?.trim()
                              ? ` - Note: ${item.specialInstructions.trim()}`
                              : ''}
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
                    </div>
                  </div>

                  <div className="order-card-actions">
                    <div className="order-card-actions-row">
                      <button
                        onClick={() => updateKitchenStatus(order._id, 'started')}
                        className="btn small"
                        type="button"
                      >
                        Start Cooking
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {activeOrders.map((order) => {
                const nextStatus = getNextKitchenStatus(order.kitchenStatus);

                return (
                  <div key={order._id} className="list-item block">
                    <div className="order-card-grid">
                      <div className="order-card-main">
                        <strong className="order-card-title">Table {order.tableId}</strong>
                        <div className="order-card-meta-line">
                          Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                        </div>
                        <div className="order-card-items">
                          {order.items.map((item, idx) => (
                            <div key={idx}>
                              {item.quantity}x {item.menuItem.name}
                              {item.optionLabel ? ` (${item.optionLabel})` : ''}
                              {item.specialInstructions?.trim()
                                ? ` - Note: ${item.specialInstructions.trim()}`
                                : ''}
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
                          <button
                            type="button"
                            className="status-chip status-time-extend status-chip-button"
                            onClick={() => extendOrderTimer(order._id)}
                            title="Add 5 minutes to this order timer"
                            aria-label="Add 5 minutes to this order timer"
                          >
                            <span className="status-chip-text">+5 min</span>
                          </button>
                      </div>
                    </div>

                    <div className="order-card-actions">
                      {nextStatus && (
                        <div className="order-card-actions-row">
                          <button
                            onClick={() => updateKitchenStatus(order._id, nextStatus)}
                            className="btn small"
                            type="button"
                          >
                            {getActionLabel(order.kitchenStatus)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3>Ready To Serve ({readyOrders.length})</h3>
            <div className="list">
              {readyOrders.length === 0 && <p>No ready orders</p>}
              {readyOrders.map((order) => (
                <div key={order._id} className="list-item block">
                  <div className="order-card-grid">
                    <div className="order-card-main">
                      <strong className="order-card-title">Table {order.tableId}</strong>
                      <div className="order-card-meta-line">
                        Items: {order.items.length} | Total: Tk {Math.round(order.totalAmount)} | Est. Time: {order.estimatedPrepTime} min
                      </div>
                      <div className="order-card-items">
                        {order.items.map((item, idx) => (
                          <div key={idx}>
                            {item.quantity}x {item.menuItem.name}
                            {item.optionLabel ? ` (${item.optionLabel})` : ''}
                            {item.specialInstructions?.trim()
                              ? ` - Note: ${item.specialInstructions.trim()}`
                              : ''}
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
                    </div>
                  </div>
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
