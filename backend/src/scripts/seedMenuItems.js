const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const MenuItem = require('../models/MenuItem');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const menuItems = [
  {
    name: 'Beef Classic Burger',
    description: 'Juicy grilled beef patty, lettuce, tomato, onion, and house burger sauce in a toasted bun.',
    price: 289,
    category: 'Burgers',
    image: '/items/Burgers/Beef Classic Burger.jpg',
    prepTime: 14,
  },
  {
    name: 'Chicken Crispy Burger',
    description: 'Buttermilk crispy chicken fillet with pickles, crunchy slaw, and smoky mayo.',
    price: 269,
    category: 'Burgers',
    image: '/items/Burgers/Chicken Crispy Burger.jpg',
    prepTime: 14,
  },
  {
    name: 'Beef Cheese Melt Burger',
    description: 'Beef patty loaded with cheddar cheese, caramelized onion, and creamy garlic aioli.',
    price: 319,
    category: 'Burgers',
    image: '/items/Burgers/Beef Cheese Melt Burger.jpg',
    prepTime: 16,
  },
  {
    name: 'Chicken Cheese Deluxe Burger',
    description: 'Crispy chicken, cheddar slice, fresh lettuce, tomato, and chipotle mayo.',
    price: 299,
    category: 'Burgers',
    image: '/items/Burgers/Chicken Cheese Deluxe Burger.jpg',
    prepTime: 15,
  },
  {
    name: 'Grilled Chicken Herb Burger',
    description: 'Flame-grilled chicken breast with herb butter and cool yogurt mint sauce.',
    price: 309,
    category: 'Burgers',
    image: '/items/Burgers/Grilled Chicken Herb Burger.jpg',
    prepTime: 16,
  },
  {
    name: 'Double Beef Fire Burger',
    description: 'Double beef patties with jalapeno, melted cheese, and spicy fire sauce.',
    price: 359,
    category: 'Burgers',
    image: '/items/Burgers/Double Beef Fire Burger.jpg',
    prepTime: 18,
  },
  {
    name: 'Mushroom Swiss Beef Burger',
    description: 'Beef burger with sauteed mushroom, swiss cheese, and black pepper mayo.',
    price: 339,
    category: 'Burgers',
    image: '/items/Burgers/Mushroom Swiss Beef Burger.jpg',
    prepTime: 17,
  },
  {
    name: 'BBQ Ranch Chicken Burger',
    description: 'Crispy chicken with onion rings, BBQ glaze, and ranch dressing.',
    price: 319,
    category: 'Burgers',
    image: '/items/Burgers/BBQ Ranch Chicken Burger.jpg',
    prepTime: 16,
  },
  {
    name: 'Loaded Cheese Fries',
    description: 'Crispy fries topped with cheddar cheese sauce and spring onion.',
    price: 189,
    category: 'Snacks',
    image: '/items/Snacks/Loaded Cheese Fries.jpg',
    prepTime: 10,
  },
  {
    name: 'Peri Peri Fries',
    description: 'Golden fries tossed with spicy peri peri seasoning and garlic dip.',
    price: 159,
    category: 'Snacks',
    image: '/items/Snacks/Peri Peri Fries.jpg',
    prepTime: 9,
  },
  {
    name: 'Mozzarella Sticks',
    description: 'Crispy mozzarella sticks served with tangy marinara sauce.',
    price: 229,
    category: 'Snacks',
    image: '/items/Snacks/Mozzarella Sticks.jpg',
    prepTime: 11,
  },
  {
    name: 'Crispy Onion Rings',
    description: 'Beer-battered onion rings with zesty mayo on the side.',
    price: 169,
    category: 'Snacks',
    image: '/items/Snacks/Crispy Onion Rings.jpg',
    prepTime: 10,
  },
  {
    name: 'Nacho Crunch Bowl',
    description: 'Corn nachos with salsa, jalapeno, and creamy cheese drizzle.',
    price: 219,
    category: 'Snacks',
    image: '/items/Snacks/Nacho Crunch Bowl.jpeg',
    prepTime: 11,
  },
  {
    name: 'Garlic Bread Bites',
    description: 'Toasted garlic butter bread cubes with parmesan topping.',
    price: 149,
    category: 'Snacks',
    image: '/items/Snacks/Garlic Bread Bites.jpg',
    prepTime: 8,
  },
  {
    name: 'Chicken Nuggets',
    description: 'Crispy chicken nuggets served with honey mustard dip.',
    price: 199,
    category: 'Snacks',
    image: '/items/Snacks/Chicken Nuggets.jpg',
    prepTime: 10,
  },
  {
    name: 'Spicy Potato Wedges',
    description: 'Seasoned potato wedges with chili flakes and ranch dip.',
    price: 169,
    category: 'Snacks',
    image: '/items/Snacks/Spicy Potato Wedges.jpg',
    prepTime: 10,
  },
  {
    name: 'Spicy Hot Fried Chicken (1 pc)',
    description: 'Crunchy and spicy marinated chicken. Price shown is per piece.',
    price: 159,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Spicy Hot Fried Chicken.jpg',
    prepTime: 12,
  },
  {
    name: 'Garlic Pepper Fried Chicken (1 pc)',
    description: 'Crispy chicken with garlic and black pepper glaze. Price shown is per piece.',
    price: 169,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Garlic Pepper Fried Chicken.jpg',
    prepTime: 12,
  },
  {
    name: 'Honey BBQ Fried Chicken (1 pc)',
    description: 'Crispy fried chicken with honey BBQ coating. Price shown is per piece.',
    price: 169,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Honey BBQ Fried Chicken.jpg',
    prepTime: 12,
  },
  {
    name: 'Korean Glazed Fried Chicken (1 pc)',
    description: 'Sweet spicy Korean style glazed chicken. Price shown is per piece.',
    price: 179,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Korean Glazed Fried Chicken.jpg',
    prepTime: 13,
  },
  {
    name: 'Nashville Style Fried Chicken (1 pc)',
    description: 'Bold cayenne heat chicken with crispy crust. Price shown is per piece.',
    price: 179,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Nashville Style Fried Chicken.jpg',
    prepTime: 13,
  },
  {
    name: 'Popcorn Chicken Bucket (per piece)',
    description: 'Bite-sized crispy chicken pieces. Quantity works as per piece pricing.',
    price: 39,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Popcorn Chicken Bucket.webp',
    prepTime: 9,
  },
  {
    name: 'Chicken Strips Meal (per strip)',
    description: 'Tender crunchy chicken strips with dip. Quantity works as per strip.',
    price: 79,
    category: 'Fried Chicken',
    image: '/items/Fried Chicken/Chicken Strips Meal.jpg',
    prepTime: 10,
  },
  {
    name: 'Margherita Classic Pizza',
    description: 'Classic tomato sauce, mozzarella, and fresh basil.',
    price: 499,
    category: 'Pizzas',
    image: '/items/Pizzas/Margherita Classic Pizza.jpeg',
    prepTime: 20,
  },
  {
    name: 'Pepperoni Blast Pizza',
    description: 'Loaded pepperoni slices with mozzarella and herbs.',
    price: 629,
    category: 'Pizzas',
    image: '/items/Pizzas/Pepperoni Blast Pizza.jpeg',
    prepTime: 22,
  },
  {
    name: 'BBQ Chicken Pizza',
    description: 'Smoky BBQ chicken, onion, and cheese on thin crust.',
    price: 599,
    category: 'Pizzas',
    image: '/items/Pizzas/BBQ Chicken Pizza.jpg',
    prepTime: 21,
  },
  {
    name: 'Meat Lovers Pizza',
    description: 'Pepperoni, beef crumble, and chicken sausage with extra mozzarella.',
    price: 719,
    category: 'Pizzas',
    image: '/items/Pizzas/Meat Lovers Pizza.jpg',
    prepTime: 23,
  },
  {
    name: 'Chicken Supreme Pizza',
    description: 'Chicken chunks, olive, onion, and capsicum with rich cheese.',
    price: 659,
    category: 'Pizzas',
    image: '/items/Pizzas/Chicken Supreme Pizza.webp',
    prepTime: 22,
  },
  {
    name: 'Four Cheese Pizza',
    description: 'Mozzarella, cheddar, parmesan, and cream cheese blend.',
    price: 669,
    category: 'Pizzas',
    image: '/items/Pizzas/Four Cheese Pizza.jpg',
    prepTime: 22,
  },
  {
    name: 'Spicy Beef Jalapeno Pizza',
    description: 'Seasoned beef, jalapeno, and chili flakes for extra kick.',
    price: 689,
    category: 'Pizzas',
    image: '/items/Pizzas/Spicy Beef Jalapeno Pizza.jpg',
    prepTime: 23,
  },
  {
    name: 'Veggie Garden Pizza',
    description: 'Bell pepper, mushroom, olive, sweet corn, and onion.',
    price: 569,
    category: 'Pizzas',
    image: '/items/Pizzas/Veggie Garden Pizza.jpg',
    prepTime: 20,
  },
  {
    name: 'Classic Cola',
    description: 'Chilled fizzy cola drink.',
    price: 60,
    category: 'Drinks',
    image: '/items/Drinks/Classic Cola.jpg',
    prepTime: 2,
  },
  {
    name: 'Lemon Mint Cooler',
    description: 'Fresh lemon and mint mixed with chilled soda.',
    price: 110,
    category: 'Drinks',
    image: '/items/Drinks/Lemon Mint Cooler.jpg',
    prepTime: 4,
  },
  {
    name: 'Orange Spark Soda',
    description: 'Sparkling orange soda served chilled.',
    price: 70,
    category: 'Drinks',
    image: '/items/Drinks/Orange Spark Soda.jpeg',
    prepTime: 2,
  },
  {
    name: 'Peach Iced Tea',
    description: 'Cold brewed iced tea with peach flavor.',
    price: 120,
    category: 'Drinks',
    image: '/items/Drinks/Peach Iced Tea.jpg',
    prepTime: 4,
  },
  {
    name: 'Mango Smoothie',
    description: 'Rich mango blend with creamy texture.',
    price: 170,
    category: 'Drinks',
    image: '/items/Drinks/Mango Smoothie.jpg',
    prepTime: 5,
  },
  {
    name: 'Chocolate Shake',
    description: 'Cold chocolate milkshake with cocoa syrup.',
    price: 180,
    category: 'Drinks',
    image: '/items/Drinks/Chocolate Shake.jpg',
    prepTime: 5,
  },
  {
    name: 'Bottled Water',
    description: 'Pure chilled mineral water.',
    price: 30,
    category: 'Drinks',
    image: '/items/Drinks/Bottled Water.jpg',
    prepTime: 1,
  },
  {
    name: 'Espresso Cold Coffee',
    description: 'Cold coffee blend with espresso and milk.',
    price: 190,
    category: 'Drinks',
    image: '/items/Drinks/Espresso Cold Coffee.jpg',
    prepTime: 5,
  },
  {
    name: 'Texas BBQ Meatbox',
    description: 'BBQ chicken cubes with fries and creamy house sauce.',
    price: 359,
    category: 'Meatboxes',
    image: '/items/Meatboxes/Texas BBQ Meatbox.jpg',
    prepTime: 18,
  },
  {
    name: 'Chicken Loaded Meatbox',
    description: 'Spiced chicken bites, potato fingers, and signature garlic sauce.',
    price: 339,
    category: 'Meatboxes',
    image: '/items/Meatboxes/Chicken Loaded Meatbox.jpg',
    prepTime: 17,
  },
].map((item) => ({ ...item, isAvailable: true }));

const seedMenuItems = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not configured in backend/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const operations = menuItems.map((item) => ({
      updateOne: {
        filter: { name: item.name },
        update: { $set: item },
        upsert: true,
      },
    }));

    await MenuItem.bulkWrite(operations);

    const categoryCounts = await MenuItem.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log(`Seed completed. Upserted ${menuItems.length} items.`);
    categoryCounts.forEach((row) => {
      console.log(`${row._id}: ${row.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
};

seedMenuItems();
