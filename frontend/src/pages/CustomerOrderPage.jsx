import { useEffect, useState } from 'react';
import api from '../api';

const CustomerOrderPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [tableId, setTableId] = useState('T1');
  const [orderType, setOrderType] = useState('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await api.get('/menu');
        setMenuItems(response.data.filter((item) => item.isAvailable));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load menu');
      }
    };

    fetchMenu();
  }, []);

  const handleQuantityChange = (menuItemId, value) => {
    setQuantities((prev) => ({
      ...prev,
      [menuItemId]: Number(value),
    }));
  };

  const handlePlaceOrder = async () => {
    setMessage('');
    setError('');

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([menuItem, quantity]) => ({ menuItem, quantity }));

    if (items.length === 0) {
      setError('Select at least one item quantity');
      return;
    }

    try {
      const response = await api.post('/orders', {
        tableId,
        orderType,
        paymentMethod,
        items,
      });
      setMessage(`Order placed! Status: ${response.data.status}, ETA: ${response.data.estimatedPrepTime} min`);
      setQuantities({});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <div className="card">
      <h2>Customer Order (Demo)</h2>

      <div className="grid two-columns">
        <input value={tableId} onChange={(event) => setTableId(event.target.value)} placeholder="Table ID" />
        <select value={orderType} onChange={(event) => setOrderType(event.target.value)}>
          <option value="dine-in">Dine-in</option>
          <option value="takeaway">Takeaway</option>
        </select>
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bkash">bKash</option>
        </select>
      </div>

      <h3>Menu</h3>
      {menuItems.length === 0 ? (
        <p>No available menu items.</p>
      ) : (
        <div className="list">
          {menuItems.map((item) => (
            <div key={item._id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <p>
                  ৳{item.price} | {item.prepTime} min
                </p>
              </div>
              <input
                type="number"
                min="0"
                value={quantities[item._id] || 0}
                onChange={(event) => handleQuantityChange(item._id, event.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <button className="btn" type="button" onClick={handlePlaceOrder}>
        Place Order
      </button>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default CustomerOrderPage;
