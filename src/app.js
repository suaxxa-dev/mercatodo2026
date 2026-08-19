const express = require('express');
const session = require('express-session');
const path = require('path');
const { createApiRouter } = require('./adapters/in/routes/api');

// --- Repositories ---
const userRepository = require('./adapters/out/database/UserRepository');
const cartRepository = require('./adapters/out/database/CartRepository');
const orderRepository = require('./adapters/out/database/OrderRepository');
const addressRepository = require('./adapters/out/database/AddressRepository');
const productRepository = require('./adapters/out/database/ProductRepository');
const auditRepository = require('./adapters/out/database/AuditRepository');
const nodeSearchAdapter = require('./adapters/out/external/NodeSearchAdapter');

// --- Use Cases ---
const AuthUseCases = require('./core/useCases/AuthUseCases');
const CartUseCases = require('./core/useCases/CartUseCases');
const OrderUseCases = require('./core/useCases/OrderUseCases');
const ProfileUseCases = require('./core/useCases/ProfileUseCases');
const AddressUseCases = require('./core/useCases/AddressUseCases');
const SearchUseCases = require('./core/useCases/SearchUseCases');
const AdminUseCases = require('./core/useCases/AdminUseCases');

const authUseCases = new AuthUseCases(userRepository);
const cartUseCases = new CartUseCases(cartRepository, productRepository);
const orderUseCases = new OrderUseCases(orderRepository, cartRepository, productRepository);
const profileUseCases = new ProfileUseCases(userRepository);
const addressUseCases = new AddressUseCases(addressRepository);
const searchUseCases = new SearchUseCases(nodeSearchAdapter);
const adminUseCases = new AdminUseCases(orderRepository, userRepository, productRepository, auditRepository);

// --- Controllers ---
const AuthController = require('./adapters/in/controllers/AuthController');
const CartController = require('./adapters/in/controllers/CartController');
const OrderController = require('./adapters/in/controllers/OrderController');
const ProfileController = require('./adapters/in/controllers/ProfileController');
const AddressController = require('./adapters/in/controllers/AddressController');
const SearchController = require('./adapters/in/controllers/SearchController');
const ProductController = require('./adapters/in/controllers/ProductController');
const AdminController = require('./adapters/in/controllers/AdminController');

const controllers = {
  authController: new AuthController(authUseCases),
  cartController: new CartController(cartUseCases),
  orderController: new OrderController(orderUseCases),
  profileController: new ProfileController(profileUseCases),
  addressController: new AddressController(addressUseCases),
  searchController: new SearchController(searchUseCases),
  productController: new ProductController(productRepository),
  adminController: new AdminController(adminUseCases)
};

function createApp() {
  const app = express();

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use(session({
    secret: 'mercatodo-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      httpOnly: true,
      sameSite: 'lax',
    },
  }));

  // Archivos estáticos (desde public/)
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    extensions: ['html'],
  }));

  app.get('/', (req, res) => {
    res.redirect('/Mainpage.html');
  });

  // Rutas API
  const apiRouter = createApiRouter(controllers);
  app.use('/api', apiRouter);

  return app;
}

module.exports = { createApp };
