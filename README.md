# QR Code Restaurant Menu - Milestone 2

A full-stack web application using MERN stack (MongoDB, Express.js, React, Node.js) for restaurant table QR codes, digital menus, and order management.

## Features Implemented (Milestone 2)

✅ **Authentication**
- Admin & Chef registration and login
- JWT-based secure authentication
- Role-based access control

✅ **Admin Panel**
- Menu item management (Add/Edit/Delete)
- Set prices and preparation times
- View and manage all orders
- Order statistics dashboard

✅ **Chef Panel**
- View pending orders in real-time
- Update order status (Pending → In Progress → Completed)
- See order details and estimated prep times

✅ **Customer Interface**
- Browse digital menu
- Create orders with table selection
- Choose order type and payment method

## Project Structure

```
backend/
├── src/
│   ├── config/db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── MenuItem.js
│   │   └── Order.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── menuController.js
│   │   └── orderController.js
│   ├── middleware/authMiddleware.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── menuRoutes.js
│   │   └── orderRoutes.js
│   └── server.js
├── .env
└── package.json

frontend/
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── AdminMenuPage.jsx
│   │   ├── AdminOrdersPage.jsx
│   │   ├── ChefOrdersPage.jsx
│   │   └── CustomerOrderPage.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── context/AuthContext.jsx
│   ├── App.jsx
│   └── api.js
└── package.json
```

## Quick Start

### Backend Setup
```bash
cd backend
cp .env.example .env  # Update with your MongoDB URI and JWT secret
npm install
npm run dev  # Runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

## API Endpoints

**Auth**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

**Menu** (requires auth for write operations)
- `GET /api/menu` - Get all menu items
- `POST /api/menu` - Create menu item (admin only)
- `PUT /api/menu/:id` - Update menu item (admin only)
- `DELETE /api/menu/:id` - Delete menu item (admin only)

**Orders**
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get all orders (admin/chef only)
- `PATCH /api/orders/:id/status` - Update order status (admin/chef only)

## Test Accounts

**Admin:**
- Email: `admin@test.com`
- Password: `admin123`

**Chef:**
- Email: `chef@test.com`
- Password: `chef123`

## Tech Stack

- React 19 + Vite
- Express.js 5
- MongoDB + Mongoose
- JWT Authentication
- Bcryptjs for password hashing
- Axios for HTTP requests
- React Router for navigation

## Upcoming Features

- QR code scanning and table mapping
- Order countdown timer display
- Customer order tracking
- Review and rating system
- Advanced analytics dashboard
- Payment gateway integration
