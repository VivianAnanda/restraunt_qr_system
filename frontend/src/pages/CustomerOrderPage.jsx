import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api';
import '../styles/CustomerOrderPage.css';

const PREFERRED_CATEGORY_ORDER = [
  'Burgers',
  'Snacks',
  'Fried Chicken',
  'Pizzas',
  'Drinks',
  'Meatboxes',
  'Wings',
  'Fries',
  'Sides',
];

const VARIANT_RULES = {
  Burgers: {
    label: 'Size',
    options: [
      { key: 'medium', label: 'Medium', priceFactor: 1 },
      { key: 'large', label: 'Large', priceFactor: 1.25 },
    ],
  },
  Meatboxes: {
    label: 'Size',
    options: [
      { key: 'medium', label: 'Medium', priceFactor: 1 },
      { key: 'large', label: 'Large', priceFactor: 1.3 },
    ],
  },
  Snacks: {
    label: 'Size',
    options: [
      { key: 'small', label: 'Small', priceFactor: 0.75 },
      { key: 'medium', label: 'Medium', priceFactor: 1 },
      { key: 'large', label: 'Large', priceFactor: 1.25 },
    ],
  },
  Drinks: {
    label: 'Size',
    options: [
      { key: 'small', label: 'Small', priceFactor: 0.65 },
      { key: 'medium', label: 'Medium', priceFactor: 1 },
      { key: 'large', label: 'Large', priceFactor: 1.35 },
    ],
  },
  'Fried Chicken': {
    label: 'Pieces',
    options: [
      { key: '3-pieces', label: '3 pcs', priceFactor: 3 },
      { key: '6-pieces', label: '6 pcs', priceFactor: 5.7 },
      { key: '9-pieces', label: '9 pcs', priceFactor: 8.1 },
    ],
  },
  Pizzas: {
    label: 'Size',
    options: [
      { key: '9-inch', label: '9 inch', priceFactor: 0.85 },
      { key: '12-inch', label: '12 inch', priceFactor: 1 },
      { key: '14-inch', label: '14 inch', priceFactor: 1.25 },
    ],
  },
};

const getVariantConfig = (item) => VARIANT_RULES[item?.category?.trim()] || null;

const getVariantOptions = (item) => {
  const variantConfig = getVariantConfig(item);
  if (!variantConfig) {
    return [];
  }

  return variantConfig.options.map((option) => ({
    ...option,
    price: Math.round((item.price || 0) * option.priceFactor),
  }));
};

const getDefaultVariant = (item) => getVariantOptions(item)[0] || null;

const getCartLineKey = (itemId, variantKey) => `${itemId}::${variantKey || 'default'}`;

const getTableIdFromQrValue = (rawValue) => {
  const trimmedValue = String(rawValue || '').trim();

  if (!trimmedValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(trimmedValue, 'https://scanner.local');
    const queryTableId =
      parsedUrl.searchParams.get('tableId') ||
      parsedUrl.searchParams.get('table') ||
      parsedUrl.searchParams.get('table_id');

    if (queryTableId) {
      return queryTableId.trim().toUpperCase();
    }

    const pathSegment = parsedUrl.pathname.split('/').filter(Boolean).pop();
    if (pathSegment) {
      return pathSegment.trim().toUpperCase();
    }
  } catch (_error) {
    // Fallback to the raw QR contents if it is not a full URL.
  }

  return trimmedValue.toUpperCase();
};

const CustomerOrderPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [tableId, setTableId] = useState('');
  const [orderType, setOrderType] = useState('dine-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cart, setCart] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedVariantKey, setSelectedVariantKey] = useState('');
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalInstructions, setModalInstructions] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerError, setScannerError] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sectionRefs = useRef({});
  const scannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerFrameRef = useRef(null);

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

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return menuItems;
    }

    return menuItems.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      const category = item.category?.toLowerCase() || '';
      return name.includes(query) || description.includes(query) || category.includes(query);
    });
  }, [menuItems, searchTerm]);

  const sections = useMemo(() => {
    const grouped = filteredItems.reduce((acc, item) => {
      const category = (item.category || 'General').trim() || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    const categories = Object.keys(grouped);
    const orderedCategories = [
      ...PREFERRED_CATEGORY_ORDER.filter((category) => categories.includes(category)),
      ...categories.filter((category) => !PREFERRED_CATEGORY_ORDER.includes(category)).sort((a, b) => a.localeCompare(b)),
    ];

    return orderedCategories.map((category) => ({
      category,
      items: grouped[category],
    }));
  }, [filteredItems]);

  useEffect(() => {
    if (!sections.length) {
      setActiveCategory('');
      return;
    }

    if (!activeCategory || !sections.find((section) => section.category === activeCategory)) {
      setActiveCategory(sections[0].category);
    }
  }, [sections, activeCategory]);

  useEffect(() => {
    const observedElements = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const matchedCategory = Object.keys(sectionRefs.current).find(
              (category) => sectionRefs.current[category] === entry.target
            );
            if (matchedCategory) {
              setActiveCategory(matchedCategory);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-140px 0px -50% 0px',
        threshold: 0.1,
      }
    );

    sections.forEach((section) => {
      const element = sectionRefs.current[section.category];
      if (element) {
        observer.observe(element);
        observedElements.push(element);
      }
    });

    return () => {
      observedElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    if (!selectedItem) {
      setSelectedVariantKey('');
      return;
    }

    const defaultVariant = getDefaultVariant(selectedItem);
    setSelectedVariantKey(defaultVariant?.key || '');
  }, [selectedItem]);

  useEffect(() => {
    if (!isScannerOpen) {
      return undefined;
    }

    let cancelled = false;
    let detector = null;

    const stopScannerStream = () => {
      if (scannerFrameRef.current) {
        window.cancelAnimationFrame(scannerFrameRef.current);
        scannerFrameRef.current = null;
      }

      if (scannerStreamRef.current) {
        scannerStreamRef.current.getTracks().forEach((track) => track.stop());
        scannerStreamRef.current = null;
      }

      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = null;
      }
    };

    const scanFrame = async () => {
      if (cancelled || !detector || !scannerVideoRef.current) {
        return;
      }

      try {
        const barcodes = await detector.detect(scannerVideoRef.current);
        if (barcodes.length > 0) {
          const scannedTableId = getTableIdFromQrValue(barcodes[0].rawValue);
          if (scannedTableId) {
            setTableId(scannedTableId);
            setScannerStatus(`Table set to ${scannedTableId}`);
          }

          stopScannerStream();
          setIsScannerOpen(false);
          return;
        }
      } catch (_error) {
        // Keep scanning until a valid QR is found or the modal is closed.
      }

      scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
    };

    const startScanner = async () => {
      try {
        setScannerError('');
        setScannerStatus('Opening camera...');

        if (!navigator.mediaDevices?.getUserMedia) {
          setScannerError('Camera access is not supported in this browser.');
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = mediaStream;

        if (!scannerVideoRef.current) {
          throw new Error('Scanner video element is unavailable.');
        }

        scannerVideoRef.current.srcObject = mediaStream;
        await scannerVideoRef.current.play();

        if (!('BarcodeDetector' in window)) {
          setScannerError('QR scanning is not supported in this browser. Use Chrome or Edge on mobile.');
          setScannerStatus('Camera opened, but QR detection is unavailable.');
          return;
        }

        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        setScannerStatus('Point the camera at the table QR code.');
        scannerFrameRef.current = window.requestAnimationFrame(scanFrame);
      } catch (cameraError) {
        setScannerError(cameraError.message || 'Could not access the camera.');
        setScannerStatus('');
        stopScannerStream();
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScannerStream();
    };
  }, [isScannerOpen]);

  const formatMoney = (value) => `Tk ${Math.round(value)}`;

  const getItemImage = (item) => {
    const image = item.imageUrl || item.image || '';
    return image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  };

  const getItemSubtitle = (item) => {
    if (item.description?.trim()) {
      return item.description;
    }
    return `${item.prepTime} min prep time`;
  };

  const addItemToCart = (
    item,
    quantityToAdd = 1,
    specialInstructions = '',
    variant = null,
    overwriteInstructions = false
  ) => {
    const unitPrice = variant?.price ?? item.price;
    const lineKey = getCartLineKey(item._id, variant?.key);

    setCart((prev) => {
      const existingQuantity = prev[lineKey]?.quantity || 0;
      const updatedQuantity = existingQuantity + quantityToAdd;
      const existingInstructions = prev[lineKey]?.specialInstructions || '';
      const nextInstructions = overwriteInstructions
        ? specialInstructions.trim()
        : existingInstructions || specialInstructions.trim();

      return {
        ...prev,
        [lineKey]: {
          lineKey,
          item,
          quantity: updatedQuantity,
          specialInstructions: nextInstructions,
          variant: variant
            ? {
                key: variant.key,
                label: variant.label,
                groupLabel: variant.groupLabel,
              }
            : null,
          unitPrice,
          lineTotal: unitPrice * updatedQuantity,
        },
      };
    });
  };

  const setCartItemQuantity = (lineKey, nextQuantity) => {
    setCart((prev) => {
      if (!prev[lineKey]) {
        return prev;
      }

      if (nextQuantity <= 0) {
        const updated = { ...prev };
        delete updated[lineKey];
        return updated;
      }

      return {
        ...prev,
        [lineKey]: {
          ...prev[lineKey],
          quantity: nextQuantity,
          lineTotal: prev[lineKey].unitPrice * nextQuantity,
        },
      };
    });
  };

  const removeFromCart = (lineKey) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[lineKey];
      return updated;
    });
  };

  const cartEntries = useMemo(() => Object.values(cart), [cart]);
  const subtotal = useMemo(
    () => cartEntries.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0),
    [cartEntries]
  );
  const deliveryFee = orderType === 'takeaway' || subtotal === 0 ? 0 : 9;
  const serviceFee = subtotal > 0 ? 9 : 0;
  const total = subtotal + deliveryFee + serviceFee;
  const itemCount = cartEntries.reduce((count, entry) => count + entry.quantity, 0);

  const handleTabClick = (category) => {
    setActiveCategory(category);
    const target = sectionRefs.current[category];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openItemModal = (item) => {
    const existingVariant = getDefaultVariant(item);
    const matchingCartEntry = cartEntries.find(
      (entry) =>
        entry.item._id === item._id &&
        (entry.variant?.key || 'default') === (existingVariant?.key || 'default')
    );

    setSelectedItem(item);
    setSelectedVariantKey(matchingCartEntry?.variant?.key || existingVariant?.key || '');
    setModalQuantity(matchingCartEntry?.quantity || 1);
    setModalInstructions(matchingCartEntry?.specialInstructions || '');
  };

  const closeItemModal = () => {
    setSelectedItem(null);
    setSelectedVariantKey('');
    setModalQuantity(1);
    setModalInstructions('');
  };

  const restartQrScanner = () => {
    setIsScannerOpen(false);
    window.setTimeout(() => setIsScannerOpen(true), 75);
  };

  const handleModalAddToCart = () => {
    if (!selectedItem) {
      return;
    }

    const quantityToAdd = Number(modalQuantity) || 1;
    const variantOptions = getVariantOptions(selectedItem);
    const selectedVariant =
      variantOptions.find((option) => option.key === selectedVariantKey) || variantOptions[0] || null;

    addItemToCart(
      selectedItem,
      quantityToAdd > 0 ? quantityToAdd : 1,
      modalInstructions,
      selectedVariant,
      true
    );
    closeItemModal();
  };

  const handleReviewPaymentAndAddress = async () => {
    setMessage('');
    setError('');

    const items = cartEntries.map((entry) => ({
      menuItem: entry.item._id,
      quantity: entry.quantity,
      optionKey: entry.variant?.key || '',
      optionLabel: entry.variant?.label || '',
      unitPrice: entry.unitPrice,
      lineTotal: entry.unitPrice * entry.quantity,
      ...(entry.specialInstructions ? { specialInstructions: entry.specialInstructions } : {}),
    }));

    if (items.length === 0) {
      setError('Add at least one item to the cart.');
      return;
    }

    if (!tableId.trim()) {
      setError('Please enter a table ID before placing the order.');
      return;
    }

    try {
      const response = await api.post('/orders', {
        tableId,
        orderType,
        paymentMethod,
        items,
      });

      setMessage(`Order placed. Status: ${response.data.status}. ETA: ${response.data.estimatedPrepTime} min.`);
      setCart({});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    }
  };

  return (
    <section className="customer-menu-page">
      <div className="customer-menu-left">
        <header className="restaurant-banner glass-panel">
          <div>
            <p className="restaurant-tags">Fast Food - Fresh - Quick Service</p>
            <h2>XYZ Fast Food</h2>
            <p className="restaurant-meta">Pick your favorites, customize quantity, and place your order instantly.</p>
          </div>
        </header>

        <div className="menu-search-row">
          <input
            type="text"
            className="menu-search-input"
            placeholder="Search in menu"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <nav className="menu-tabs" aria-label="Menu categories">
          {sections.map((section) => (
            <button
              key={section.category}
              type="button"
              className={`menu-tab ${activeCategory === section.category ? 'active' : ''}`}
              onClick={() => handleTabClick(section.category)}
            >
              {section.category} ({section.items.length})
            </button>
          ))}
        </nav>

        <div className="menu-sections">
          {sections.length === 0 ? (
            <div className="glass-panel empty-menu">No menu items match this search.</div>
          ) : (
            sections.map((section) => (
              <section
                key={section.category}
                ref={(element) => {
                  sectionRefs.current[section.category] = element;
                }}
                className="menu-category-section"
              >
                <h3>{section.category}</h3>
                <p className="section-subtitle">Top picks in this section</p>

                <div className="menu-card-grid">
                  {section.items.map((item) => (
                    <article
                      key={item._id}
                      className="menu-item-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => openItemModal(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openItemModal(item);
                        }
                      }}
                    >
                      <div className="menu-item-info">
                        <h4>{item.name}</h4>
                        <p className="menu-item-price">{formatMoney(item.price)}</p>
                        <p className="menu-item-description">{getItemSubtitle(item)}</p>
                      </div>
                      <div className="menu-item-media-wrap">
                        <img src={getItemImage(item)} alt={item.name} className="menu-item-media" />
                        <button
                          type="button"
                          className="menu-item-add"
                          onClick={(event) => {
                            event.stopPropagation();
                            const variantOptions = getVariantOptions(item);
                            if (variantOptions.length > 0) {
                              openItemModal(item);
                              return;
                            }

                            addItemToCart(item, 1);
                          }}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          +
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <aside className="customer-cart-sidebar glass-panel">
        <div className="cart-mode-switch">
          <button
            type="button"
            className={orderType === 'dine-in' ? 'active' : ''}
            onClick={() => setOrderType('dine-in')}
          >
            Dine-in
          </button>
          <button
            type="button"
            className={orderType === 'takeaway' ? 'active' : ''}
            onClick={() => setOrderType('takeaway')}
          >
            Pick-up
          </button>
        </div>

        <div className="cart-order-fields">
          <div className="table-scan-panel">
            {tableId ? (
              <div className="table-scan-status-success">
                <span className="table-scan-success-label">Table: {tableId}</span>
                <button type="button" className="table-scan-retry" onClick={() => setIsScannerOpen(true)} title="Retry scan">
                  ↻
                </button>
              </div>
            ) : (
              <>
                <div className="table-scan-status">
                  <span className="table-scan-label">Table</span>
                </div>
                <button type="button" className="table-scan-button" onClick={() => setIsScannerOpen(true)}>
                  Scan table QR
                </button>
              </>
            )}
          </div>
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bkash">bKash</option>
          </select>
        </div>

        <div className="cart-header">
          <h3>Your items</h3>
          <span>{itemCount} item(s)</span>
        </div>

        <div className="cart-items-list">
          {cartEntries.length === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            cartEntries.map((entry) => (
              <article className="cart-item" key={entry.lineKey || entry.item._id}>
                <img src={getItemImage(entry.item)} alt={entry.item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <p className="cart-item-name">{entry.item.name}</p>
                  {entry.variant && (
                    <p className="cart-item-variant">
                      {entry.variant.groupLabel}: {entry.variant.label}
                    </p>
                  )}
                  <p className="cart-item-price">{formatMoney(entry.unitPrice * entry.quantity)}</p>
                  {entry.specialInstructions && (
                    <p className="cart-item-note">Note: {entry.specialInstructions}</p>
                  )}
                </div>
                <div className="cart-item-actions">
                  <button type="button" onClick={() => removeFromCart(entry.lineKey)} className="cart-delete">
                    x
                  </button>
                  <div className="cart-qty-controls">
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(entry.lineKey, entry.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{entry.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setCartItemQuantity(entry.lineKey, entry.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="cart-summary">
          <div>
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div>
            <span>{orderType === 'dine-in' ? 'Table service' : 'Delivery fee'}</span>
            <strong>{formatMoney(deliveryFee)}</strong>
          </div>
          <div>
            <span>Service fee</span>
            <strong>{formatMoney(serviceFee)}</strong>
          </div>
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatMoney(total)}</strong>
          </div>
        </div>

        <button type="button" className="review-order-btn" onClick={handleReviewPaymentAndAddress}>
          Review Payment and Address
        </button>

        {message && <p className="success cart-feedback">{message}</p>}
        {error && <p className="error cart-feedback">{error}</p>}
      </aside>

      {cartEntries.length > 0 && (
        <div className="mobile-floating-cart" onClick={() => setIsCartModalOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setIsCartModalOpen(true)}>
          <div className="floating-cart-info">
            <span className="floating-cart-count">{cartEntries.reduce((sum, entry) => sum + entry.quantity, 0)} item(s)</span>
            <span className="floating-cart-total">{formatMoney(total)}</span>
          </div>
          <span className="floating-cart-arrow">›</span>
        </div>
      )}

      {isScannerOpen && (
        <div className="menu-modal-overlay qr-scanner-overlay" role="dialog" aria-modal="true" aria-label="Scan table QR code">
          <div className="menu-modal glass-panel qr-scanner-modal">
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsScannerOpen(false)}
              aria-label="Close scanner"
            >
              x
            </button>
            <h3>Scan Table QR</h3>
            <p className="modal-description">
              Point your phone camera at the QR code placed on the table. The table number will be filled in automatically.
            </p>

            <div className="qr-scanner-frame">
              <video ref={scannerVideoRef} className="qr-scanner-video" autoPlay playsInline muted />
            </div>

            {scannerStatus && <p className="qr-scanner-status">{scannerStatus}</p>}
            {scannerError && <p className="error cart-feedback">{scannerError}</p>}

            <div className="qr-scanner-actions">
              <button type="button" className="btn secondary" onClick={() => setIsScannerOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={restartQrScanner}>
                Restart scan
              </button>
            </div>
          </div>
        </div>
      )}

      {isCartModalOpen && (
        <div className="menu-modal-overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <div className="menu-modal glass-panel cart-modal-panel">
            <button type="button" className="modal-close" onClick={() => setIsCartModalOpen(false)} aria-label="Close cart">
              x
            </button>
            <h3>Your items</h3>

            <div className="cart-mode-switch">
              <button
                type="button"
                className={orderType === 'dine-in' ? 'active' : ''}
                onClick={() => setOrderType('dine-in')}
              >
                Dine-in
              </button>
              <button
                type="button"
                className={orderType === 'takeaway' ? 'active' : ''}
                onClick={() => setOrderType('takeaway')}
              >
                Pick-up
              </button>
            </div>

            <div className="cart-order-fields">
              <div className="table-scan-panel">
                {tableId ? (
                  <div className="table-scan-status-success">
                    <span className="table-scan-success-label">Table: {tableId}</span>
                    <button type="button" className="table-scan-retry" onClick={() => setIsScannerOpen(true)} title="Retry scan">
                      ↻
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="table-scan-status">
                      <span className="table-scan-label">Table</span>
                    </div>
                    <button type="button" className="table-scan-button" onClick={() => setIsScannerOpen(true)}>
                      Scan table QR
                    </button>
                  </>
                )}
              </div>
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bkash">bKash</option>
              </select>
            </div>

            <div className="cart-modal-items">
              {cartEntries.length === 0 ? (
                <p className="cart-empty">Your cart is empty.</p>
              ) : (
                cartEntries.map((entry) => (
                  <article className="cart-item" key={entry.lineKey || entry.item._id}>
                    <img src={getItemImage(entry.item)} alt={entry.item.name} className="cart-item-image" />
                    <div className="cart-item-details">
                      <p className="cart-item-name">{entry.item.name}</p>
                      {entry.variant && (
                        <p className="cart-item-variant">
                          {entry.variant.groupLabel}: {entry.variant.label}
                        </p>
                      )}
                      <p className="cart-item-price">{formatMoney(entry.unitPrice * entry.quantity)}</p>
                      {entry.specialInstructions && (
                        <p className="cart-item-note">Note: {entry.specialInstructions}</p>
                      )}
                    </div>
                    <div className="cart-item-actions">
                      <button type="button" onClick={() => removeFromCart(entry.lineKey)} className="cart-delete">
                        x
                      </button>
                      <div className="cart-qty-controls">
                        <button
                          type="button"
                          onClick={() => setCartItemQuantity(entry.lineKey, entry.quantity - 1)}
                        >
                          -
                        </button>
                        <span>{entry.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setCartItemQuantity(entry.lineKey, entry.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="cart-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
              <div>
                <span>{orderType === 'dine-in' ? 'Table service' : 'Delivery fee'}</span>
                <strong>{formatMoney(deliveryFee)}</strong>
              </div>
              <div>
                <span>Service fee</span>
                <strong>{formatMoney(serviceFee)}</strong>
              </div>
              <div className="cart-total">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>

            <button type="button" className="review-order-btn" onClick={handleReviewPaymentAndAddress}>
              Review Payment and Address
            </button>

            {message && <p className="success cart-feedback">{message}</p>}
            {error && <p className="error cart-feedback">{error}</p>}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="menu-modal-overlay" role="dialog" aria-modal="true" aria-label="Menu item details">
          <div className="menu-modal glass-panel">
            <button type="button" className="modal-close" onClick={closeItemModal} aria-label="Close item details">
              x
            </button>
            <img src={getItemImage(selectedItem)} alt={selectedItem.name} className="modal-image" />
            <h3>{selectedItem.name}</h3>
            {getVariantOptions(selectedItem).length > 0 ? (
              <p className="modal-price">
                {formatMoney(
                  getVariantOptions(selectedItem).find((option) => option.key === selectedVariantKey)?.price ||
                    getVariantOptions(selectedItem)[0].price
                )}
              </p>
            ) : (
              <p className="modal-price">{formatMoney(selectedItem.price)}</p>
            )}
            <p className="modal-description">{getItemSubtitle(selectedItem)}</p>

            {getVariantOptions(selectedItem).length > 0 && (
              <div className="modal-variant-section">
                <p className="modal-option-label">Choose {getVariantConfig(selectedItem).label.toLowerCase()}</p>
                <div className="modal-variant-grid">
                  {getVariantOptions(selectedItem).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className={`modal-variant-option ${selectedVariantKey === option.key ? 'active' : ''}`}
                      onClick={() => setSelectedVariantKey(option.key)}
                    >
                      <span>{option.label}</span>
                      <strong>{formatMoney(option.price)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="modal-instructions-label" htmlFor="special-instructions">
              Special instructions for chef
            </label>
            <textarea
              id="special-instructions"
              className="modal-instructions"
              placeholder="Example: less spicy, no onion, extra crispy"
              value={modalInstructions}
              onChange={(event) => setModalInstructions(event.target.value.slice(0, 280))}
            />

            <div className="modal-actions">
              <div className="modal-qty-controls">
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => Math.max(1, Number(prev || 1) - 1))}
                >
                  -
                </button>
                <span>{modalQuantity}</span>
                <button type="button" onClick={() => setModalQuantity((prev) => Number(prev || 1) + 1)}>
                  +
                </button>
              </div>
              <button type="button" className="modal-add-btn" onClick={handleModalAddToCart}>
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerOrderPage;
