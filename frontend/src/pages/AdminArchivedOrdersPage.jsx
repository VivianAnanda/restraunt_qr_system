import { useEffect, useMemo, useState } from 'react';
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

const getOrderKitchenStatus = (order) => {
  if (order.completedAt) {
    return 'completed';
  }

  return (order.kitchenStatus || 'pending').toLowerCase();
};

const normalizeLower = (value) => String(value ?? '').trim().toLowerCase();

const toDateStart = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateEnd = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const initialFilters = {
  search: '',
  table: '',
  paymentMethod: 'all',
  paymentStatus: 'all',
  kitchenStatus: 'all',
  orderType: 'all',
  dateField: 'archivedAt',
  fromDate: '',
  toDate: '',
  sortBy: 'archivedAt',
  sortDir: 'desc',
};

const AdminArchivedOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialFilters);

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

  const paymentMethods = useMemo(() => {
    const uniqueMethods = Array.from(new Set(orders.map((order) => normalizeLower(order.paymentMethod)).filter(Boolean)));
    return uniqueMethods.sort();
  }, [orders]);

  const paymentStatuses = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(orders.map((order) => normalizeLower(order.paymentStatus)).filter(Boolean)));
    return uniqueStatuses.sort();
  }, [orders]);

  const kitchenStatuses = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(orders.map((order) => getOrderKitchenStatus(order)).filter(Boolean)));
    return uniqueStatuses.sort();
  }, [orders]);

  const orderTypes = useMemo(() => {
    const uniqueTypes = Array.from(new Set(orders.map((order) => normalizeLower(order.orderType)).filter(Boolean)));
    return uniqueTypes.sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = normalizeLower(filters.search);
    const tableQuery = normalizeLower(filters.table);
    const fromDate = toDateStart(filters.fromDate);
    const toDate = toDateEnd(filters.toDate);

    return orders
      .filter((order) => {
        const orderId = String(order._id || '');
        const shortId = orderId.slice(-6).toLowerCase();
        const tableId = normalizeLower(order.tableId);
        const paymentMethod = normalizeLower(order.paymentMethod);
        const paymentStatus = normalizeLower(order.paymentStatus);
        const orderType = normalizeLower(order.orderType);
        const kitchenStatus = getOrderKitchenStatus(order);

        const itemText = (order.items || [])
          .map((item) => `${item.quantity || 0} ${item.menuItem?.name || ''} ${item.optionLabel || ''} ${item.specialInstructions || ''}`)
          .join(' ')
          .toLowerCase();

        const matchesSearch = !query
          || shortId.includes(query)
          || orderId.toLowerCase().includes(query)
          || tableId.includes(query)
          || itemText.includes(query);

        if (!matchesSearch) {
          return false;
        }

        if (tableQuery && !tableId.includes(tableQuery)) {
          return false;
        }

        if (filters.paymentMethod !== 'all' && paymentMethod !== filters.paymentMethod) {
          return false;
        }

        if (filters.paymentStatus !== 'all' && paymentStatus !== filters.paymentStatus) {
          return false;
        }

        if (filters.kitchenStatus !== 'all' && kitchenStatus !== filters.kitchenStatus) {
          return false;
        }

        if (filters.orderType !== 'all' && orderType !== filters.orderType) {
          return false;
        }

        if (fromDate || toDate) {
          const rawDate = order[filters.dateField];
          const orderDate = rawDate ? new Date(rawDate) : null;

          if (!orderDate || Number.isNaN(orderDate.getTime())) {
            return false;
          }

          if (fromDate && orderDate < fromDate) {
            return false;
          }

          if (toDate && orderDate > toDate) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const sortField = filters.sortBy;
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'totalAmount' || sortField === 'estimatedPrepTime') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          const aDate = aValue ? new Date(aValue).getTime() : 0;
          const bDate = bValue ? new Date(bValue).getTime() : 0;
          aValue = Number.isFinite(aDate) ? aDate : 0;
          bValue = Number.isFinite(bDate) ? bDate : 0;
        }

        const direction = filters.sortDir === 'asc' ? 1 : -1;

        if (aValue === bValue) {
          return 0;
        }

        return aValue > bValue ? direction : -direction;
      });
  }, [orders, filters]);

  const summary = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    const cashOrders = filteredOrders.filter((order) => normalizeLower(order.paymentMethod) === 'cash').length;
    const cardOrders = filteredOrders.filter((order) => normalizeLower(order.paymentMethod) === 'card').length;
    const bkashOrders = filteredOrders.filter((order) => normalizeLower(order.paymentMethod) === 'bkash').length;

    return {
      count: filteredOrders.length,
      totalRevenue,
      cashOrders,
      cardOrders,
      bkashOrders,
    };
  }, [filteredOrders]);

  const updateFilter = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="archived-orders-page">
      <div className="archived-orders-header">
        <h2>Archived Orders</h2>
        <p className="archived-orders-subtitle">
          Filter historical orders by date, table, payment and status to quickly track specific records.
        </p>
      </div>

      <div className="card archived-filters-card">
        <div className="archived-filters-grid">
          <div>
            <label className="admin-menu-field-label" htmlFor="archived-search">Search</label>
            <input
              id="archived-search"
              placeholder="Order ID, table, item name"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-table">Table</label>
            <input
              id="archived-table"
              placeholder="e.g. T2"
              value={filters.table}
              onChange={(event) => updateFilter('table', event.target.value)}
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-payment-method">Payment Mode</label>
            <select
              id="archived-payment-method"
              value={filters.paymentMethod}
              onChange={(event) => updateFilter('paymentMethod', event.target.value)}
            >
              <option value="all">All</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-payment-status">Payment Status</label>
            <select
              id="archived-payment-status"
              value={filters.paymentStatus}
              onChange={(event) => updateFilter('paymentStatus', event.target.value)}
            >
              <option value="all">All</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-kitchen-status">Kitchen Status</label>
            <select
              id="archived-kitchen-status"
              value={filters.kitchenStatus}
              onChange={(event) => updateFilter('kitchenStatus', event.target.value)}
            >
              <option value="all">All</option>
              {kitchenStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-order-type">Order Type</label>
            <select
              id="archived-order-type"
              value={filters.orderType}
              onChange={(event) => updateFilter('orderType', event.target.value)}
            >
              <option value="all">All</option>
              {orderTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-date-field">Date Field</label>
            <select
              id="archived-date-field"
              value={filters.dateField}
              onChange={(event) => updateFilter('dateField', event.target.value)}
            >
              <option value="archivedAt">Archived Date</option>
              <option value="completedAt">Completed Date</option>
              <option value="updatedAt">Last Updated</option>
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-from">From</label>
            <input
              id="archived-from"
              type="date"
              value={filters.fromDate}
              onChange={(event) => updateFilter('fromDate', event.target.value)}
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-to">To</label>
            <input
              id="archived-to"
              type="date"
              value={filters.toDate}
              onChange={(event) => updateFilter('toDate', event.target.value)}
            />
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-sort-by">Sort By</label>
            <select
              id="archived-sort-by"
              value={filters.sortBy}
              onChange={(event) => updateFilter('sortBy', event.target.value)}
            >
              <option value="archivedAt">Archived Date</option>
              <option value="completedAt">Completed Date</option>
              <option value="updatedAt">Last Updated</option>
              <option value="totalAmount">Total Amount</option>
              <option value="estimatedPrepTime">Estimated Time</option>
            </select>
          </div>

          <div>
            <label className="admin-menu-field-label" htmlFor="archived-sort-dir">Sort Direction</label>
            <select
              id="archived-sort-dir"
              value={filters.sortDir}
              onChange={(event) => updateFilter('sortDir', event.target.value)}
            >
              <option value="desc">Newest / Highest first</option>
              <option value="asc">Oldest / Lowest first</option>
            </select>
          </div>
        </div>

        <div className="archived-filter-actions">
          <button type="button" className="btn secondary" onClick={resetFilters}>Reset Filters</button>
          <button type="button" className="btn" onClick={fetchArchivedOrders}>Refresh Data</button>
        </div>
      </div>

      <div className="card archived-summary-card">
        <div className="archived-summary-grid">
          <div><strong>{summary.count}</strong><span>Orders</span></div>
          <div><strong>Tk {Math.round(summary.totalRevenue)}</strong><span>Total Value</span></div>
          <div><strong>{summary.cashOrders}</strong><span>Cash</span></div>
          <div><strong>{summary.cardOrders}</strong><span>Card</span></div>
          <div><strong>{summary.bkashOrders}</strong><span>bKash</span></div>
        </div>
      </div>

      <div className="card">
        {error && <p className="error">{error}</p>}
        {loading && <p>Loading archived orders...</p>}

        {!loading && filteredOrders.length === 0 && <p>No archived orders found for current filters.</p>}

        {!loading && filteredOrders.length > 0 && (
          <div className="list">
            {filteredOrders.map((order) => (
              <div key={order._id} className="list-item block">
                <div className="order-card-grid archived-order-card-grid">
                  <div className="order-card-main">
                    <strong className="order-card-title">Order #{order._id.slice(-6)}</strong>
                    <div className="order-card-meta-line">
                      Table: {order.tableId || 'N/A'} | Type: {order.orderType || 'N/A'} | Payment: {order.paymentMethod || 'N/A'}
                    </div>
                    <div className="order-card-meta-line">
                      Items: {(order.items || []).length} | Total: Tk {Math.round(order.totalAmount || 0)} | Est. Time: {order.estimatedPrepTime || 0} min
                    </div>

                    <div className="order-card-items">
                      {(order.items || []).map((item, index) => (
                        <div key={`${order._id}-${index}`}>
                          {item.quantity}x {item.menuItem?.name || 'Unknown item'}
                          {item.optionLabel ? ` (${item.optionLabel})` : ''}
                          {item.specialInstructions ? ` - Note: ${item.specialInstructions}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-card-side archived-order-side">
                    <div className="status-chip status-payment">Payment: {order.paymentStatus || 'n/a'}</div>
                    <div className="status-chip status-completed">Kitchen: {getOrderKitchenStatus(order)}</div>
                    <div className="archived-time-metadata">
                      <strong>Completed:</strong> {formatDateTime(order.completedAt)}
                    </div>
                    <div className="archived-time-metadata">
                      <strong>Archived:</strong> {formatDateTime(order.archivedAt)}
                    </div>
                    <div className="archived-time-metadata">
                      <strong>Updated:</strong> {formatDateTime(order.updatedAt)}
                    </div>
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
