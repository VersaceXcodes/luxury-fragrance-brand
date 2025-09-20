import request from 'supertest';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { app, pool } from './server';
// Test database setup
const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'luxescent_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
};
let testPool;
// Test data
const testUser = {
    email: 'test@example.com',
    password: 'password123',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+1234567890'
};
const testAdmin = {
    email: 'admin@example.com',
    password: 'admin123',
    first_name: 'Admin',
    last_name: 'User'
};
const testProduct = {
    brand_id: 'brand_001',
    category_id: 'cat_001',
    product_name: 'Test Fragrance',
    description: 'A test fragrance for testing purposes',
    fragrance_families: '["floral", "fresh"]',
    concentration: 'Eau de Parfum',
    gender_category: 'Unisex',
    base_price: 99.99,
    sku_prefix: 'TEST'
};
let authToken;
let testUserId;
let testProductId;
let testCartId;
let testAddressId;
// Setup and teardown
beforeAll(async () => {
    testPool = new Pool(testDbConfig);
    // Clean up test database
    await testPool.query('TRUNCATE TABLE users, products, brands, categories, carts, cart_items, addresses, orders, reviews, wishlists CASCADE');
    // Insert test data
    await seedTestData();
});
afterAll(async () => {
    await testPool.query('TRUNCATE TABLE users, products, brands, categories, carts, cart_items, addresses, orders, reviews, wishlists CASCADE');
    await testPool.end();
});
beforeEach(async () => {
    // Reset any test-specific data if needed
});
afterEach(async () => {
    // Clean up after each test if needed
});
// Seed test data
async function seedTestData() {
    // Insert test brands
    await testPool.query(`
    INSERT INTO brands (brand_id, brand_name, description, is_active, display_order, created_at)
    VALUES ('brand_001', 'Test Brand', 'A test brand', true, 1, $1)
  `, [new Date().toISOString()]);
    // Insert test categories
    await testPool.query(`
    INSERT INTO categories (category_id, category_name, description, display_order, is_active)
    VALUES ('cat_001', 'Test Category', 'A test category', 1, true)
  `);
    // Insert shipping methods
    await testPool.query(`
    INSERT INTO shipping_methods (shipping_method_id, method_name, cost, estimated_days_min, estimated_days_max, is_active, sort_order)
    VALUES ('ship_001', 'Standard Shipping', 9.99, 3, 5, true, 1)
  `);
}
// Helper function to create authenticated user
async function createAuthenticatedUser(userData = testUser) {
    const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
    testUserId = response.body.user.user_id;
    authToken = response.body.token;
    return { user: response.body.user, token: response.body.token };
}
// Helper function to create test product
async function createTestProduct(productData = testProduct) {
    const result = await testPool.query(`
    INSERT INTO products (product_id, brand_id, category_id, product_name, description, fragrance_families, concentration, gender_category, base_price, sku_prefix, availability_status, is_featured, is_new_arrival, is_limited_edition, sort_order, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_stock', false, false, false, 0, $10, $10)
    RETURNING product_id
  `, [
        productData.brand_id,
        productData.category_id,
        productData.product_name,
        productData.description,
        productData.fragrance_families,
        productData.concentration,
        productData.gender_category,
        productData.base_price,
        productData.sku_prefix,
        new Date().toISOString()
    ]);
    testProductId = result.rows[0].product_id;
    // Add product size
    await testPool.query(`
    INSERT INTO product_sizes (size_id, product_id, size_ml, price, stock_quantity, sku, is_active, created_at)
    VALUES (gen_random_uuid(), $1, 50, $2, 100, $3, true, $4)
  `, [testProductId, productData.base_price, `${productData.sku_prefix}-50ML`, new Date().toISOString()]);
    return testProductId;
}
describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'newuser@example.com',
                password: 'password123',
                first_name: 'New',
                last_name: 'User'
            };
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toMatchObject({
                email: userData.email,
                first_name: userData.first_name,
                last_name: userData.last_name
            });
            expect(response.body.user.password_hash).toBe(userData.password);
        });
        it('should return 400 for invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                email: 'invalid-email',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                email: 'test@example.com'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 409 for duplicate email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            };
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);
            // Second registration with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(409);
            expect(response.body.error).toContain('already exists');
        });
    });
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await createAuthenticatedUser();
        });
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: testUser.password
            })
                .expect(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.user.email).toBe(testUser.email);
        });
        it('should return 401 for invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                email: testUser.email,
                password: 'wrongpassword'
            })
                .expect(401);
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should return 401 for non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            })
                .expect(401);
            expect(response.body.error).toContain('Invalid credentials');
        });
        it('should return 400 for missing email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                password: 'password123'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
});
describe('User Management Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
    });
    describe('GET /api/users/profile', () => {
        it('should get user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toMatchObject({
                user_id: testUserId,
                email: testUser.email,
                first_name: testUser.first_name,
                last_name: testUser.last_name
            });
        });
        it('should return 401 without token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .expect(401);
            expect(response.body.error).toContain('No token provided');
        });
        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
            expect(response.body.error).toContain('Invalid token');
        });
    });
    describe('PUT /api/users/profile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                first_name: 'Updated',
                last_name: 'Name',
                phone_number: '+9876543210'
            };
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body).toMatchObject({
                first_name: updateData.first_name,
                last_name: updateData.last_name,
                phone_number: updateData.phone_number
            });
        });
        it('should validate email format on update', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                email: 'invalid-email-format'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should not allow updating to existing email', async () => {
            // Create another user
            const anotherUser = {
                email: 'another@example.com',
                password: 'password123',
                first_name: 'Another',
                last_name: 'User'
            };
            await request(app)
                .post('/api/auth/register')
                .send(anotherUser);
            // Try to update to existing email
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                email: anotherUser.email
            })
                .expect(409);
            expect(response.body.error).toContain('email already exists');
        });
    });
});
describe('Product Endpoints', () => {
    beforeEach(async () => {
        await createTestProduct();
    });
    describe('GET /api/products', () => {
        it('should get products with default pagination', async () => {
            const response = await request(app)
                .get('/api/products')
                .expect(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.pagination).toHaveProperty('total');
            expect(response.body.pagination).toHaveProperty('page');
            expect(response.body.pagination).toHaveProperty('per_page');
        });
        it('should filter products by brand', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ brand_ids: 'brand_001' })
                .expect(200);
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((product) => {
                expect(product.brand_id).toBe('brand_001');
            });
        });
        it('should filter products by gender category', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ gender_category: 'Unisex' })
                .expect(200);
            response.body.data.forEach((product) => {
                expect(product.gender_category).toBe('Unisex');
            });
        });
        it('should filter products by price range', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ price_min: 50, price_max: 150 })
                .expect(200);
            response.body.data.forEach((product) => {
                expect(product.base_price).toBeGreaterThanOrEqual(50);
                expect(product.base_price).toBeLessThanOrEqual(150);
            });
        });
        it('should sort products by price', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ sort_by: 'base_price', sort_order: 'asc' })
                .expect(200);
            const prices = response.body.data.map((p) => p.base_price);
            for (let i = 1; i < prices.length; i++) {
                expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
            }
        });
        it('should handle pagination correctly', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ page: 1, per_page: 5 })
                .expect(200);
            expect(response.body.data.length).toBeLessThanOrEqual(5);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.per_page).toBe(5);
        });
    });
    describe('GET /api/products/:product_id', () => {
        it('should get product by ID', async () => {
            const response = await request(app)
                .get(`/api/products/${testProductId}`)
                .expect(200);
            expect(response.body).toMatchObject({
                product_id: testProductId,
                product_name: testProduct.product_name,
                brand_id: testProduct.brand_id
            });
        });
        it('should return 404 for non-existent product', async () => {
            const fakeId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .get(`/api/products/${fakeId}`)
                .expect(404);
            expect(response.body.error).toContain('Product not found');
        });
        it('should return 400 for invalid product ID format', async () => {
            const response = await request(app)
                .get('/api/products/invalid-id')
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/products/:product_id/sizes', () => {
        it('should get product sizes', async () => {
            const response = await request(app)
                .get(`/api/products/${testProductId}/sizes`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            if (response.body.length > 0) {
                expect(response.body[0]).toHaveProperty('size_ml');
                expect(response.body[0]).toHaveProperty('price');
                expect(response.body[0]).toHaveProperty('stock_quantity');
            }
        });
        it('should return empty array for product without sizes', async () => {
            // Create product without sizes
            const productWithoutSizes = await testPool.query(`
        INSERT INTO products (product_id, brand_id, category_id, product_name, description, fragrance_families, concentration, gender_category, base_price, sku_prefix, availability_status, is_featured, is_new_arrival, is_limited_edition, sort_order, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'No Sizes Product', 'Product without sizes', '["test"]', 'Eau de Toilette', 'Unisex', 50, 'NS', 'in_stock', false, false, false, 0, $3, $3)
        RETURNING product_id
      `, [testProduct.brand_id, testProduct.category_id, new Date().toISOString()]);
            const response = await request(app)
                .get(`/api/products/${productWithoutSizes.rows[0].product_id}/sizes`)
                .expect(200);
            expect(response.body).toEqual([]);
        });
    });
    describe('GET /api/products/:product_id/recommendations', () => {
        it('should get product recommendations', async () => {
            const response = await request(app)
                .get(`/api/products/${testProductId}/recommendations`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeLessThanOrEqual(8); // Default limit
        });
        it('should respect recommendation limit', async () => {
            const response = await request(app)
                .get(`/api/products/${testProductId}/recommendations`)
                .query({ limit: 3 })
                .expect(200);
            expect(response.body.length).toBeLessThanOrEqual(3);
        });
        it('should handle different recommendation types', async () => {
            const types = ['similar', 'complementary', 'frequently_bought'];
            for (const type of types) {
                const response = await request(app)
                    .get(`/api/products/${testProductId}/recommendations`)
                    .query({ type })
                    .expect(200);
                expect(Array.isArray(response.body)).toBe(true);
            }
        });
    });
});
describe('Cart Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
        await createTestProduct();
    });
    describe('GET /api/cart', () => {
        it('should get empty cart for new user', async () => {
            const response = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('cart_id');
            expect(response.body.items).toEqual([]);
        });
        it('should create cart automatically if none exists', async () => {
            const response = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('cart_id');
            expect(response.body.user_id).toBe(testUserId);
        });
    });
    describe('POST /api/cart/items', () => {
        beforeEach(async () => {
            // Get or create cart
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            testCartId = cartResponse.body.cart_id;
        });
        it('should add item to cart successfully', async () => {
            const cartItem = {
                product_id: testProductId,
                size_ml: 50,
                quantity: 1,
                unit_price: testProduct.base_price
            };
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send(cartItem)
                .expect(201);
            expect(response.body).toMatchObject({
                product_id: cartItem.product_id,
                size_ml: cartItem.size_ml,
                quantity: cartItem.quantity,
                unit_price: cartItem.unit_price
            });
        });
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId
                // Missing size_ml, quantity, unit_price
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate product exists', async () => {
            const fakeProductId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: fakeProductId,
                size_ml: 50,
                quantity: 1,
                unit_price: 99.99
            })
                .expect(404);
            expect(response.body.error).toContain('Product not found');
        });
        it('should validate positive quantity', async () => {
            const response = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId,
                size_ml: 50,
                quantity: 0,
                unit_price: testProduct.base_price
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('PUT /api/cart/items/:cart_item_id', () => {
        let cartItemId;
        beforeEach(async () => {
            // Get cart
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            testCartId = cartResponse.body.cart_id;
            // Add item to cart
            const itemResponse = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId,
                size_ml: 50,
                quantity: 1,
                unit_price: testProduct.base_price
            });
            cartItemId = itemResponse.body.cart_item_id;
        });
        it('should update cart item quantity', async () => {
            const response = await request(app)
                .put(`/api/cart/items/${cartItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                quantity: 3
            })
                .expect(200);
            expect(response.body.quantity).toBe(3);
        });
        it('should update gift wrap option', async () => {
            const response = await request(app)
                .put(`/api/cart/items/${cartItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                gift_wrap: true
            })
                .expect(200);
            expect(response.body.gift_wrap).toBe(true);
        });
        it('should return 404 for non-existent cart item', async () => {
            const fakeItemId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .put(`/api/cart/items/${fakeItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                quantity: 2
            })
                .expect(404);
            expect(response.body.error).toContain('Cart item not found');
        });
    });
    describe('DELETE /api/cart/items/:cart_item_id', () => {
        let cartItemId;
        beforeEach(async () => {
            // Get cart and add item
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            testCartId = cartResponse.body.cart_id;
            const itemResponse = await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId,
                size_ml: 50,
                quantity: 1,
                unit_price: testProduct.base_price
            });
            cartItemId = itemResponse.body.cart_item_id;
        });
        it('should remove item from cart', async () => {
            await request(app)
                .delete(`/api/cart/items/${cartItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            // Verify item is removed
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${authToken}`);
            expect(cartResponse.body.items).toHaveLength(0);
        });
        it('should return 404 for non-existent cart item', async () => {
            const fakeItemId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .delete(`/api/cart/items/${fakeItemId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
            expect(response.body.error).toContain('Cart item not found');
        });
    });
});
describe('Address Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
    });
    describe('POST /api/addresses', () => {
        it('should create address successfully', async () => {
            const addressData = {
                address_type: 'shipping',
                first_name: 'John',
                last_name: 'Doe',
                address_line_1: '123 Main St',
                city: 'New York',
                state_province: 'NY',
                postal_code: '10001',
                country: 'USA',
                phone_number: '+1234567890'
            };
            const response = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(addressData)
                .expect(201);
            expect(response.body).toMatchObject(addressData);
            expect(response.body).toHaveProperty('address_id');
            testAddressId = response.body.address_id;
        });
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                address_type: 'shipping',
                first_name: 'John'
                // Missing required fields
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate address type enum', async () => {
            const response = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                address_type: 'invalid_type',
                first_name: 'John',
                last_name: 'Doe',
                address_line_1: '123 Main St',
                city: 'New York',
                state_province: 'NY',
                postal_code: '10001',
                country: 'USA'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/addresses', () => {
        beforeEach(async () => {
            // Create test address
            const addressData = {
                address_type: 'shipping',
                first_name: 'John',
                last_name: 'Doe',
                address_line_1: '123 Main St',
                city: 'New York',
                state_province: 'NY',
                postal_code: '10001',
                country: 'USA'
            };
            const response = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(addressData);
            testAddressId = response.body.address_id;
        });
        it('should get user addresses', async () => {
            const response = await request(app)
                .get('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('address_id');
        });
        it('should filter by address type', async () => {
            const response = await request(app)
                .get('/api/addresses')
                .query({ address_type: 'shipping' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            response.body.forEach((address) => {
                expect(address.address_type).toBe('shipping');
            });
        });
    });
    describe('PUT /api/addresses/:address_id', () => {
        beforeEach(async () => {
            const addressData = {
                address_type: 'shipping',
                first_name: 'John',
                last_name: 'Doe',
                address_line_1: '123 Main St',
                city: 'New York',
                state_province: 'NY',
                postal_code: '10001',
                country: 'USA'
            };
            const response = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${authToken}`)
                .send(addressData);
            testAddressId = response.body.address_id;
        });
        it('should update address successfully', async () => {
            const updateData = {
                address_type: 'billing',
                first_name: 'Jane',
                last_name: 'Smith',
                address_line_1: '456 Oak Ave',
                city: 'Los Angeles',
                state_province: 'CA',
                postal_code: '90210',
                country: 'USA'
            };
            const response = await request(app)
                .put(`/api/addresses/${testAddressId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);
            expect(response.body).toMatchObject(updateData);
        });
        it('should return 404 for non-existent address', async () => {
            const fakeAddressId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .put(`/api/addresses/${fakeAddressId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Updated'
            })
                .expect(404);
            expect(response.body.error).toContain('Address not found');
        });
    });
});
describe('Order Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
        await createTestProduct();
        // Create address for orders
        const addressData = {
            address_type: 'both',
            first_name: 'John',
            last_name: 'Doe',
            address_line_1: '123 Main St',
            city: 'New York',
            state_province: 'NY',
            postal_code: '10001',
            country: 'USA'
        };
        const addressResponse = await request(app)
            .post('/api/addresses')
            .set('Authorization', `Bearer ${authToken}`)
            .send(addressData);
        testAddressId = addressResponse.body.address_id;
    });
    describe('POST /api/orders', () => {
        it('should create order successfully', async () => {
            const orderData = {
                subtotal: 99.99,
                tax_amount: 8.00,
                shipping_cost: 9.99,
                total_amount: 117.98,
                shipping_address_id: testAddressId,
                billing_address_id: testAddressId,
                shipping_method_id: 'ship_001',
                customer_email: testUser.email
            };
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData)
                .expect(201);
            expect(response.body).toMatchObject(orderData);
            expect(response.body).toHaveProperty('order_id');
            expect(response.body).toHaveProperty('order_number');
            expect(response.body.order_status).toBe('pending');
            expect(response.body.payment_status).toBe('pending');
        });
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                subtotal: 99.99
                // Missing required fields
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate positive amounts', async () => {
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                subtotal: -10,
                total_amount: -10,
                shipping_address_id: testAddressId,
                billing_address_id: testAddressId,
                shipping_method_id: 'ship_001',
                customer_email: testUser.email
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate email format', async () => {
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                subtotal: 99.99,
                total_amount: 117.98,
                shipping_address_id: testAddressId,
                billing_address_id: testAddressId,
                shipping_method_id: 'ship_001',
                customer_email: 'invalid-email'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/orders', () => {
        let testOrderId;
        beforeEach(async () => {
            const orderData = {
                subtotal: 99.99,
                tax_amount: 8.00,
                shipping_cost: 9.99,
                total_amount: 117.98,
                shipping_address_id: testAddressId,
                billing_address_id: testAddressId,
                shipping_method_id: 'ship_001',
                customer_email: testUser.email
            };
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData);
            testOrderId = response.body.order_id;
        });
        it('should get user orders', async () => {
            const response = await request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
        it('should filter orders by status', async () => {
            const response = await request(app)
                .get('/api/orders')
                .query({ order_status: 'pending' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            response.body.data.forEach((order) => {
                expect(order.order_status).toBe('pending');
            });
        });
        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/orders')
                .query({ page: 1, per_page: 5 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.per_page).toBe(5);
        });
    });
    describe('GET /api/orders/track', () => {
        let testOrderNumber;
        beforeEach(async () => {
            const orderData = {
                subtotal: 99.99,
                tax_amount: 8.00,
                shipping_cost: 9.99,
                total_amount: 117.98,
                shipping_address_id: testAddressId,
                billing_address_id: testAddressId,
                shipping_method_id: 'ship_001',
                customer_email: testUser.email
            };
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .send(orderData);
            testOrderNumber = response.body.order_number;
        });
        it('should track order by order number', async () => {
            const response = await request(app)
                .get('/api/orders/track')
                .query({
                order_number: testOrderNumber,
                email: testUser.email
            })
                .expect(200);
            expect(response.body.order).toHaveProperty('order_number', testOrderNumber);
            expect(response.body).toHaveProperty('tracking_events');
        });
        it('should return 404 for non-existent order number', async () => {
            const response = await request(app)
                .get('/api/orders/track')
                .query({
                order_number: 'FAKE-ORDER-123',
                email: testUser.email
            })
                .expect(404);
            expect(response.body.error).toContain('Order not found');
        });
        it('should validate email for guest orders', async () => {
            const response = await request(app)
                .get('/api/orders/track')
                .query({
                order_number: testOrderNumber,
                email: 'wrong@email.com'
            })
                .expect(401);
            expect(response.body.error).toContain('Invalid email');
        });
    });
});
describe('Review Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
        await createTestProduct();
    });
    describe('POST /api/reviews', () => {
        it('should create review successfully', async () => {
            const reviewData = {
                product_id: testProductId,
                rating: 5,
                title: 'Amazing fragrance!',
                review_text: 'This fragrance is absolutely wonderful. Great longevity and sillage.',
                longevity_rating: 8,
                sillage_rating: 7,
                occasion_tags: '["evening", "special_occasions"]',
                season_tags: '["fall", "winter"]'
            };
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send(reviewData)
                .expect(201);
            expect(response.body).toMatchObject(reviewData);
            expect(response.body).toHaveProperty('review_id');
            expect(response.body.user_id).toBe(testUserId);
            expect(response.body.moderation_status).toBe('pending');
        });
        it('should validate rating range', async () => {
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId,
                rating: 6 // Invalid rating > 5
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId
                // Missing rating
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should validate product exists', async () => {
            const fakeProductId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: fakeProductId,
                rating: 5
            })
                .expect(404);
            expect(response.body.error).toContain('Product not found');
        });
    });
    describe('GET /api/reviews', () => {
        let testReviewId;
        beforeEach(async () => {
            const reviewData = {
                product_id: testProductId,
                rating: 5,
                title: 'Test Review',
                review_text: 'This is a test review.'
            };
            const response = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${authToken}`)
                .send(reviewData);
            testReviewId = response.body.review_id;
            // Approve the review for testing
            await testPool.query(`
        UPDATE reviews SET moderation_status = 'approved' WHERE review_id = $1
      `, [testReviewId]);
        });
        it('should get reviews with default filters', async () => {
            const response = await request(app)
                .get('/api/reviews')
                .expect(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should filter reviews by product', async () => {
            const response = await request(app)
                .get('/api/reviews')
                .query({ product_id: testProductId })
                .expect(200);
            response.body.data.forEach((review) => {
                expect(review.product_id).toBe(testProductId);
            });
        });
        it('should filter reviews by rating', async () => {
            const response = await request(app)
                .get('/api/reviews')
                .query({ rating: 5 })
                .expect(200);
            response.body.data.forEach((review) => {
                expect(review.rating).toBe(5);
            });
        });
        it('should only return approved reviews by default', async () => {
            const response = await request(app)
                .get('/api/reviews')
                .expect(200);
            response.body.data.forEach((review) => {
                expect(review.moderation_status).toBe('approved');
            });
        });
    });
});
describe('Wishlist Endpoints', () => {
    beforeEach(async () => {
        await createAuthenticatedUser();
        await createTestProduct();
    });
    describe('POST /api/wishlists', () => {
        it('should create wishlist successfully', async () => {
            const wishlistData = {
                wishlist_name: 'My Favorite Fragrances',
                is_public: false
            };
            const response = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${authToken}`)
                .send(wishlistData)
                .expect(201);
            expect(response.body).toMatchObject(wishlistData);
            expect(response.body).toHaveProperty('wishlist_id');
            expect(response.body.user_id).toBe(testUserId);
        });
        it('should create default wishlist name if not provided', async () => {
            const response = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${authToken}`)
                .send({})
                .expect(201);
            expect(response.body.wishlist_name).toBe('My Wishlist');
        });
    });
    describe('GET /api/wishlists', () => {
        let testWishlistId;
        beforeEach(async () => {
            const response = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                wishlist_name: 'Test Wishlist'
            });
            testWishlistId = response.body.wishlist_id;
        });
        it('should get user wishlists', async () => {
            const response = await request(app)
                .get('/api/wishlists')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('wishlist_id');
            expect(response.body[0].user_id).toBe(testUserId);
        });
    });
    describe('POST /api/wishlists/:wishlist_id/items', () => {
        let testWishlistId;
        beforeEach(async () => {
            const response = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                wishlist_name: 'Test Wishlist'
            });
            testWishlistId = response.body.wishlist_id;
        });
        it('should add item to wishlist successfully', async () => {
            const itemData = {
                product_id: testProductId,
                size_ml: 50,
                notes: 'Want to try this fragrance'
            };
            const response = await request(app)
                .post(`/api/wishlists/${testWishlistId}/items`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(itemData)
                .expect(201);
            expect(response.body).toMatchObject(itemData);
            expect(response.body).toHaveProperty('wishlist_item_id');
            expect(response.body.wishlist_id).toBe(testWishlistId);
        });
        it('should validate product exists', async () => {
            const fakeProductId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .post(`/api/wishlists/${testWishlistId}/items`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: fakeProductId
            })
                .expect(404);
            expect(response.body.error).toContain('Product not found');
        });
        it('should not allow adding to non-owned wishlist', async () => {
            // Create another user and their wishlist
            const anotherUser = await createAuthenticatedUser({
                email: 'another@example.com',
                password: 'password123',
                first_name: 'Another',
                last_name: 'User',
                phone_number: '+1234567891'
            });
            const anotherWishlistResponse = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${anotherUser.token}`)
                .send({
                wishlist_name: 'Another Wishlist'
            });
            // Try to add to another user's wishlist
            const response = await request(app)
                .post(`/api/wishlists/${anotherWishlistResponse.body.wishlist_id}/items`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                product_id: testProductId
            })
                .expect(403);
            expect(response.body.error).toContain('Access denied');
        });
    });
});
describe('Error Handling', () => {
    describe('Authentication Errors', () => {
        it('should return 401 for missing authorization header', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .expect(401);
            expect(response.body.error).toContain('No token provided');
        });
        it('should return 401 for malformed authorization header', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'InvalidFormat token')
                .expect(401);
            expect(response.body.error).toContain('Invalid token format');
        });
        it('should return 401 for expired token', async () => {
            const expiredToken = jwt.sign({ user_id: 'test-user-id' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '-1h' } // Expired 1 hour ago
            );
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);
            expect(response.body.error).toContain('Token expired');
        });
    });
    describe('Validation Errors', () => {
        beforeEach(async () => {
            await createAuthenticatedUser();
        });
        it('should return 400 for invalid UUID format', async () => {
            const response = await request(app)
                .get('/api/products/invalid-uuid')
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for invalid enum values', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ gender_category: 'InvalidGender' })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for negative pagination values', async () => {
            const response = await request(app)
                .get('/api/products')
                .query({ page: -1, per_page: -5 })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Database Errors', () => {
        beforeEach(async () => {
            await createAuthenticatedUser();
        });
        it('should handle database connection errors gracefully', async () => {
            // Mock database error
            jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Database connection failed'));
            const response = await request(app)
                .get('/api/products')
                .expect(500);
            expect(response.body.error).toContain('Internal server error');
            // Restore original implementation
            jest.restoreAllMocks();
        });
        it('should handle constraint violations', async () => {
            // Try to create user with duplicate email
            await request(app)
                .post('/api/auth/register')
                .send({
                email: 'duplicate@example.com',
                password: 'password123',
                first_name: 'First',
                last_name: 'User'
            });
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                email: 'duplicate@example.com',
                password: 'password123',
                first_name: 'Second',
                last_name: 'User'
            })
                .expect(409);
            expect(response.body.error).toContain('already exists');
        });
    });
    describe('Rate Limiting', () => {
        it('should handle rate limit exceeded', async () => {
            // Make multiple rapid requests to trigger rate limiting
            const requests = Array(100).fill(0).map(() => request(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@example.com',
                password: 'wrong'
            }));
            const responses = await Promise.all(requests);
            // At least some should be rate limited
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });
});
describe('Search and Analytics', () => {
    beforeEach(async () => {
        await createTestProduct();
    });
    describe('GET /api/search/suggestions', () => {
        it('should return search suggestions', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'test' })
                .expect(200);
            expect(response.body).toHaveProperty('products');
            expect(response.body).toHaveProperty('brands');
            expect(response.body).toHaveProperty('categories');
            expect(Array.isArray(response.body.products)).toBe(true);
        });
        it('should limit suggestions based on query parameter', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .query({ query: 'test', limit: 3 })
                .expect(200);
            expect(response.body.products.length).toBeLessThanOrEqual(3);
        });
        it('should require query parameter', async () => {
            const response = await request(app)
                .get('/api/search/suggestions')
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /api/analytics/product-views', () => {
        it('should track product view', async () => {
            const viewData = {
                product_id: testProductId,
                session_id: 'test-session-123',
                referrer_url: 'https://google.com'
            };
            const response = await request(app)
                .post('/api/analytics/product-views')
                .send(viewData)
                .expect(200);
            expect(response.body.success).toBe(true);
        });
        it('should validate product exists for tracking', async () => {
            const fakeProductId = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
            const response = await request(app)
                .post('/api/analytics/product-views')
                .send({
                product_id: fakeProductId
            })
                .expect(404);
            expect(response.body.error).toContain('Product not found');
        });
    });
});
describe('Utility Endpoints', () => {
    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('database', 'connected');
        });
    });
    describe('GET /api/config/frontend', () => {
        it('should return frontend configuration', async () => {
            const response = await request(app)
                .get('/api/config/frontend')
                .expect(200);
            expect(response.body).toHaveProperty('free_shipping_threshold');
            expect(response.body).toHaveProperty('currency');
            expect(response.body).toHaveProperty('supported_countries');
            expect(response.body).toHaveProperty('payment_methods');
            expect(Array.isArray(response.body.supported_countries)).toBe(true);
        });
    });
});
describe('Integration Test Scenarios', () => {
    describe('Complete Purchase Flow', () => {
        let user;
        let product;
        let address;
        let cart;
        it('should complete full purchase flow', async () => {
            // 1. Register user
            user = await createAuthenticatedUser();
            product = await createTestProduct();
            // 2. Create address
            const addressResponse = await request(app)
                .post('/api/addresses')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                address_type: 'both',
                first_name: 'John',
                last_name: 'Doe',
                address_line_1: '123 Main St',
                city: 'New York',
                state_province: 'NY',
                postal_code: '10001',
                country: 'USA'
            });
            address = addressResponse.body;
            // 3. Get cart
            const cartResponse = await request(app)
                .get('/api/cart')
                .set('Authorization', `Bearer ${user.token}`);
            cart = cartResponse.body;
            // 4. Add item to cart
            await request(app)
                .post('/api/cart/items')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                product_id: product,
                size_ml: 50,
                quantity: 1,
                unit_price: 99.99
            });
            // 5. Create order
            const orderResponse = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                subtotal: 99.99,
                tax_amount: 8.00,
                shipping_cost: 9.99,
                total_amount: 117.98,
                shipping_address_id: address.address_id,
                billing_address_id: address.address_id,
                shipping_method_id: 'ship_001',
                customer_email: user.user.email
            });
            expect(orderResponse.status).toBe(201);
            expect(orderResponse.body).toHaveProperty('order_number');
            // 6. Track order
            const trackResponse = await request(app)
                .get('/api/orders/track')
                .query({
                order_number: orderResponse.body.order_number,
                email: user.user.email
            });
            expect(trackResponse.status).toBe(200);
            expect(trackResponse.body.order.order_number).toBe(orderResponse.body.order_number);
        });
    });
    describe('Product Discovery Flow', () => {
        it('should complete product discovery flow', async () => {
            await createTestProduct();
            // 1. Search products
            const searchResponse = await request(app)
                .get('/api/products')
                .query({ query: 'test' });
            expect(searchResponse.status).toBe(200);
            expect(searchResponse.body.data.length).toBeGreaterThan(0);
            const product = searchResponse.body.data[0];
            // 2. Get product details
            const detailResponse = await request(app)
                .get(`/api/products/${product.product_id}`);
            expect(detailResponse.status).toBe(200);
            expect(detailResponse.body.product_id).toBe(product.product_id);
            // 3. Get product sizes
            const sizesResponse = await request(app)
                .get(`/api/products/${product.product_id}/sizes`);
            expect(sizesResponse.status).toBe(200);
            expect(Array.isArray(sizesResponse.body)).toBe(true);
            // 4. Get recommendations
            const recommendationsResponse = await request(app)
                .get(`/api/products/${product.product_id}/recommendations`);
            expect(recommendationsResponse.status).toBe(200);
            expect(Array.isArray(recommendationsResponse.body)).toBe(true);
            // 5. Track product view
            const trackingResponse = await request(app)
                .post('/api/analytics/product-views')
                .send({
                product_id: product.product_id,
                session_id: 'test-session'
            });
            expect(trackingResponse.status).toBe(200);
        });
    });
    describe('User Engagement Flow', () => {
        let user;
        let product;
        beforeEach(async () => {
            user = await createAuthenticatedUser();
            product = await createTestProduct();
        });
        it('should complete user engagement flow', async () => {
            // 1. Create wishlist
            const wishlistResponse = await request(app)
                .post('/api/wishlists')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                wishlist_name: 'My Favorites'
            });
            expect(wishlistResponse.status).toBe(201);
            // 2. Add product to wishlist
            const wishlistItemResponse = await request(app)
                .post(`/api/wishlists/${wishlistResponse.body.wishlist_id}/items`)
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                product_id: product,
                notes: 'Want to try this'
            });
            expect(wishlistItemResponse.status).toBe(201);
            // 3. Create review
            const reviewResponse = await request(app)
                .post('/api/reviews')
                .set('Authorization', `Bearer ${user.token}`)
                .send({
                product_id: product,
                rating: 5,
                title: 'Amazing fragrance!',
                review_text: 'Love this scent!'
            });
            expect(reviewResponse.status).toBe(201);
            // 4. Subscribe to newsletter
            const newsletterResponse = await request(app)
                .post('/api/newsletter/subscribe')
                .send({
                email: user.user.email,
                subscription_source: 'website'
            });
            expect(newsletterResponse.status).toBe(201);
        });
    });
});
//# sourceMappingURL=server.test.js.map