const MenuItem = require('../models/MenuItem');

const toNonEmptyString = (value) => String(value ?? '').trim();

const toNumberOrNull = (value) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatVariantLabelFromKey = (key) => key
  .split('-')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const normalizeVariants = (variantsInput) => {
  let parsedInput = variantsInput;

  // Accept stringified payloads from older/alternate clients.
  if (typeof parsedInput === 'string') {
    try {
      parsedInput = JSON.parse(parsedInput);
    } catch (_error) {
      return [];
    }
  }

  // Support object maps like { small: 120, medium: 180 }.
  if (parsedInput && typeof parsedInput === 'object' && !Array.isArray(parsedInput)) {
    parsedInput = Object.entries(parsedInput).map(([key, price]) => ({
      key,
      label: formatVariantLabelFromKey(String(key)),
      price,
    }));
  }

  if (!Array.isArray(parsedInput)) {
    return [];
  }

  return parsedInput
    .map((variant) => {
      const key = toNonEmptyString(variant?.key);
      const label = toNonEmptyString(variant?.label);
      const price = toNumberOrNull(variant?.price);

      if (!key || !label || price == null || price < 0) {
        return null;
      }

      return {
        key,
        label,
        price,
      };
    })
    .filter(Boolean);
};

const getBasePriceFromVariants = (variants) => {
  if (!variants.length) {
    return null;
  }

  return variants.reduce((minPrice, variant) => Math.min(minPrice, variant.price), variants[0].price);
};

const buildMenuItemPayload = (body) => {
  const name = toNonEmptyString(body?.name);
  const description = toNonEmptyString(body?.description);
  const category = toNonEmptyString(body?.category);
  const image = toNonEmptyString(body?.image);
  const prepTime = toNumberOrNull(body?.prepTime);
  const variants = normalizeVariants(body?.variants);
  const fallbackPrice = toNumberOrNull(body?.price);
  const derivedPrice = getBasePriceFromVariants(variants);
  const price = derivedPrice ?? fallbackPrice;

  return {
    name,
    description,
    category,
    prepTime,
    variants,
    price,
    isAvailable: body?.isAvailable ?? true,
    ...(image ? { image } : {}),
  };
};

const getAllMenuItems = async (_req, res) => {
  try {
    const menuItems = await MenuItem.find().sort({ createdAt: -1 });
    return res.status(200).json(menuItems);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const payload = buildMenuItemPayload(req.body);

    if (!payload.name || !payload.description || !payload.category || !payload.image || payload.prepTime == null) {
      return res.status(400).json({ message: 'name, description, category, image and prepTime are required' });
    }

    if (!payload.variants.length) {
      return res.status(400).json({ message: 'At least one size/piece option with price is required' });
    }

    if (payload.price == null || payload.price < 0 || payload.prepTime < 1) {
      return res.status(400).json({ message: 'Invalid variant prices or prepTime value' });
    }

    const menuItem = await MenuItem.create(payload);

    return res.status(201).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const payload = buildMenuItemPayload(req.body);

    if (!payload.name || !payload.description || !payload.category || payload.prepTime == null) {
      return res.status(400).json({ message: 'name, description, category and prepTime are required' });
    }

    if (!payload.variants.length) {
      return res.status(400).json({ message: 'At least one size/piece option with price is required' });
    }

    if (payload.price == null || payload.price < 0 || payload.prepTime < 1) {
      return res.status(400).json({ message: 'Invalid variant prices or prepTime value' });
    }

    const menuItem = await MenuItem.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.status(200).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.status(200).json({ message: 'Menu item deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
