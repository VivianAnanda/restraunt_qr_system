import { useEffect, useState } from 'react';
import api from '../api';

const CATEGORY_OPTIONS = [
  'Burgers',
  'Snacks',
  'Fried Chicken',
  'Pizzas',
  'Drinks',
  'Meatboxes',
  'Pasta',
];

const CATEGORY_VARIANT_TEMPLATES = {
  Pizzas: [
    { key: '9-inch', label: '9 inch' },
    { key: '12-inch', label: '12 inch' },
    { key: '14-inch', label: '14 inch' },
  ],
  'Fried Chicken': [
    { key: '3-pieces', label: '3 pcs' },
    { key: '6-pieces', label: '6 pcs' },
    { key: '9-pieces', label: '9 pcs' },
  ],
};

const DEFAULT_SIZE_VARIANTS = [
  { key: 'small', label: 'Small' },
  { key: 'medium', label: 'Medium' },
  { key: 'large', label: 'Large' },
];

const getVariantTemplate = (category) => CATEGORY_VARIANT_TEMPLATES[category] || DEFAULT_SIZE_VARIANTS;

const initialForm = {
  name: '',
  description: '',
  category: '',
  prepTime: '',
  image: '',
  variants: {},
  isAvailable: true,
};

const AdminMenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/menu');
      setMenuItems(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'category') {
      const template = getVariantTemplate(value);

      setFormData((prev) => {
        const nextVariants = {};

        template.forEach((variant) => {
          nextVariants[variant.key] = prev.variants[variant.key] || '';
        });

        return {
          ...prev,
          category: value,
          variants: nextVariants,
        };
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleVariantPriceChange = (variantKey, value) => {
    setFormData((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        [variantKey]: value,
      },
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        image: String(reader.result || ''),
      }));
    };
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const name = formData.name.trim();
    const description = formData.description.trim();
    const category = formData.category.trim();
    const prepTime = Number(formData.prepTime);

    if (!name || !description || !category || (!editingId && !formData.image) || !Number.isFinite(prepTime) || prepTime < 1) {
      setError('Please fill in name, description, category, prep time and image');
      return;
    }

    const template = getVariantTemplate(category);
    const variants = template
      .map((variant) => {
        const parsedPrice = Number(formData.variants[variant.key]);

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          return null;
        }

        return {
          key: variant.key,
          label: variant.label,
          price: parsedPrice,
        };
      })
      .filter(Boolean);

    if (variants.length !== template.length) {
      setError('Please provide valid prices for all options');
      return;
    }

    const basePrice = Math.min(...variants.map((variant) => variant.price));

    const payload = {
      name,
      description,
      category,
      prepTime,
      image: formData.image,
      variants,
      price: basePrice,
      isAvailable: formData.isAvailable,
    };

    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/menu/${editingId}`, payload);
      } else {
        await api.post('/menu', payload);
      }

      resetForm();
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    const template = getVariantTemplate(item.category || '');
    const variantMap = {};

    if (Array.isArray(item.variants) && item.variants.length > 0) {
      item.variants.forEach((variant) => {
        variantMap[variant.key] = variant.price;
      });
    }

    template.forEach((variant) => {
      if (variantMap[variant.key] == null) {
        variantMap[variant.key] = item.price;
      }
    });

    setEditingId(item._id);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      prepTime: item.prepTime,
      image: item.image || '',
      variants: variantMap,
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
      <div className="card form-card admin-menu-form-card">
        <h2>{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <label className="admin-menu-field-label" htmlFor="menu-item-name">Name:</label>
            <input id="menu-item-name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="menu-item-description">Description:</label>
            <textarea
              id="menu-item-description"
              className="admin-menu-description-input"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="menu-item-category">Category:</label>
            <select id="menu-item-category" name="category" value={formData.category} onChange={handleChange} required>
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="menu-item-prep-time">Prep Time (min):</label>
            <input
              id="menu-item-prep-time"
              type="number"
              name="prepTime"
              value={formData.prepTime}
              onChange={handleChange}
              required
              min="1"
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="menu-item-image">Image:</label>
            <input id="menu-item-image" type="file" accept="image/*" onChange={handleImageChange} required={!editingId} />
          </div>

          {formData.image && (
            <img
              src={formData.image}
              alt="Menu preview"
              style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '0.5rem' }}
            />
          )}

          {formData.category && (
            <div className="card" style={{ margin: 0, padding: '0.8rem' }}>
              <h3 style={{ marginBottom: '0.6rem' }}>Price per option</h3>
              <div className="form-grid">
                {getVariantTemplate(formData.category).map((variant) => (
                  <input
                    key={variant.key}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`${variant.label} price`}
                    value={formData.variants[variant.key] ?? ''}
                    onChange={(event) => handleVariantPriceChange(variant.key, event.target.value)}
                    required
                  />
                ))}
              </div>
            </div>
          )}

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
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
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
        {loading ? (
          <p>Loading menu...</p>
        ) : menuItems.length === 0 ? (
          <p>No menu items yet.</p>
        ) : (
          <div className="list">
            {menuItems.map((item) => (
              <div key={item._id} className="list-item">
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.category} | {item.prepTime} min |{' '}
                    {item.isAvailable ? 'Available' : 'Not Available'}
                  </p>
                  <p>
                    {Array.isArray(item.variants) && item.variants.length > 0
                      ? item.variants.map((variant) => `${variant.label}: ৳${variant.price}`).join(' | ')
                      : `Base price: ৳${item.price}`}
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
