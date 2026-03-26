import { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  prepTime: '',
  isAvailable: true,
};

const AdminMenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchMenuItems = async () => {
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu');
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const payload = {
      ...formData,
      price: Number(formData.price),
      prepTime: Number(formData.prepTime),
    };

    try {
      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
      } else {
        await api.post('/menu', payload);
      }

      resetForm();
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu item');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || '',
      prepTime: item.prepTime,
      isAvailable: item.isAvailable,
    });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/menu/${id}`);
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete menu item');
    }
  };

  return (
    <div className="grid two-columns">
      <div className="card form-card">
        <h2>{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
          <input
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
          />
          <input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
          <input
            type="number"
            name="prepTime"
            placeholder="Prep Time (min)"
            value={formData.prepTime}
            onChange={handleChange}
            required
            min="1"
          />
          <label className="check-row">
            <input
              type="checkbox"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
            />
            Available
          </label>
          <div className="actions-row">
            <button type="submit" className="btn">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" className="btn secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h2>Menu Items</h2>
        {menuItems.length === 0 ? (
          <p>No menu items yet.</p>
        ) : (
          <div className="list">
            {menuItems.map((item) => (
              <div key={item._id} className="list-item">
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    ৳{item.price} | {item.category} | {item.prepTime} min |{' '}
                    {item.isAvailable ? 'Available' : 'Not Available'}
                  </p>
                </div>
                <div className="actions-row">
                  <button className="btn small" onClick={() => handleEdit(item)}>
                    Edit
                  </button>
                  <button className="btn small danger" onClick={() => handleDelete(item._id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMenuPage;
