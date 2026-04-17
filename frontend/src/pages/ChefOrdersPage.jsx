import { useEffect, useRef, useState } from 'react';
import api from '../api';

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
                  <div>
                    <strong>Table {order.tableId}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' }}>
                      Payment: {order.paymentStatus}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.quantity}x {item.menuItem.name}
                          {item.optionLabel ? ` (${item.optionLabel})` : ''}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Est. {order.estimatedPrepTime} min
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <strong>Kitchen Stage: queued</strong>
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                      Timer: waiting to start
                    </div>
                  </div>

                  <button
                    onClick={() => updateKitchenStatus(order._id, 'started')}
                    className="btn small"
                    type="button"
                  >
                    Start Cooking
                  </button>
                </div>
              ))}
              {activeOrders.map((order) => {
                const nextStatus = getNextKitchenStatus(order.kitchenStatus);

                return (
                <div key={order._id} className="list-item block">
                  <div>
                    <strong>Table {order.tableId}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.2rem' }}>
                      Payment: {order.paymentStatus}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.quantity}x {item.menuItem.name}
                          {item.optionLabel ? ` (${item.optionLabel})` : ''}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Est. {order.estimatedPrepTime} min
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <strong>Kitchen Stage: {order.kitchenStatus}</strong>
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#9ca3af', fontSize: '0.85rem' }}>
                      Timer: {getTimerText(order)}
                    </div>
                  </div>

                  {nextStatus && (
                    <button
                      onClick={() => updateKitchenStatus(order._id, nextStatus)}
                      className="btn small"
                      type="button"
                    >
                      {getActionLabel(order.kitchenStatus)}
                    </button>
                  )}
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
                  <div>
                    <strong>Table {order.tableId}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.quantity}x {item.menuItem.name}
                          {item.optionLabel ? ` (${item.optionLabel})` : ''}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Est. {order.estimatedPrepTime} min
                    </div>
                    <div style={{ marginTop: '0.4rem' }}>
                      <strong>Kitchen Stage: {order.kitchenStatus}</strong>
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
