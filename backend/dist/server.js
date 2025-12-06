import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
// Import Zod schemas
import { createUserInputSchema, updateUserInputSchema, createCartItemInputSchema, updateCartItemInputSchema, createAddressInputSchema, createOrderInputSchema, createReviewInputSchema, createWishlistItemInputSchema } from './schema.js';
// Load environment variables
dotenv.config();
// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Database connection
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key' } = process.env;
const pool = new Pool(DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
// Test database connection
pool.on('connect', () => {
    console.log('Connected to the database');
});
pool.on('error', (err) => {
    console.error('Database connection error:', err);
});
// Test initial connection
(async () => {
    try {
        const client = await pool.connect();
        console.log('Database connection successful');
        client.release();
    }
    catch (err) {
        console.error('Failed to connect to database:', err);
    }
})();
// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);
// Initialize WebSocket server
const wss = new WebSocketServer({
    server,
    path: '/ws'
});
// Store active chat sessions and connections
const chatSessions = new Map();
const activeConnections = new Map();
const sessionConnections = new Map();
// Middleware
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'https://123luxury-fragrance-brand.launchpulse.ai',
        'http://localhost:3001',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: "5mb" }));
app.use(morgan('combined'));
// Set JSON response headers for all API routes
app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});
// Global error handler middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    // Ensure we always return JSON for API routes
    if (req.path.startsWith('/api') && !res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json(createErrorResponse('Internal server error', process.env.NODE_ENV === 'development' ? err : null, 'INTERNAL_SERVER_ERROR'));
    }
    else if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
    }
});
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// API health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Error response utility
function createErrorResponse(message, error = null, errorCode = null) {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };
    if (errorCode) {
        response.error_code = errorCode;
    }
    if (error && process.env.NODE_ENV === 'development') {
        response.details = {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }
    return response;
}
// Notification helper function
async function createAndBroadcastNotification(userId, notificationType, title, message, referenceType = null, referenceId = null, metadata = null) {
    try {
        const notification_id = uuidv4();
        const created_at = new Date().toISOString();
        const metadataJson = metadata ? JSON.stringify(metadata) : null;
        const client = await pool.connect();
        const result = await client.query(`INSERT INTO notifications (notification_id, user_id, notification_type, title, message, reference_type, reference_id, metadata, is_read, read_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NULL, $9)
       RETURNING *`, [notification_id, userId, notificationType, title, message, referenceType, referenceId, metadataJson, created_at]);
        client.release();
        const notification = result.rows[0];
        // Broadcast notification via WebSocket to user if connected
        const userWs = activeConnections.get(userId);
        if (userWs && userWs.readyState === WebSocket.OPEN) {
            userWs.send(JSON.stringify({
                type: 'notification',
                data: notification
            }));
        }
        return notification;
    }
    catch (error) {
        console.error('Create notification error:', error);
        return null;
    }
}
// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_REQUIRED'));
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'string') {
            return res.status(401).json(createErrorResponse('Invalid token format', null, 'AUTH_TOKEN_INVALID'));
        }
        const payload = decoded;
        const client = await pool.connect();
        const result = await client.query('SELECT user_id, email, first_name, last_name, loyalty_tier, email_verified, created_at FROM users WHERE user_id = $1', [payload.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
        }
        req.user = result.rows[0];
        next();
    }
    catch (error) {
        return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
    }
};
// Optional authentication middleware
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (typeof decoded === 'string') {
                return next();
            }
            const payload = decoded;
            const client = await pool.connect();
            const result = await client.query('SELECT user_id, email, first_name, last_name, loyalty_tier, email_verified, created_at FROM users WHERE user_id = $1', [payload.user_id]);
            client.release();
            if (result.rows.length > 0) {
                req.user = result.rows[0];
            }
        }
        catch (error) {
            // Ignore errors for optional auth
        }
    }
    next();
};
// Helper function to generate order numbers
function generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-6)}-${random}`;
}
// Helper function to generate gift card codes
function generateGiftCardCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'GC-';
    for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
// Helper function to convert decimal prices to numbers in product objects
function convertProductPrices(product) {
    return {
        ...product,
        base_price: typeof product.base_price === 'string' ? parseFloat(product.base_price) : product.base_price,
        sale_price: product.sale_price ? (typeof product.sale_price === 'string' ? parseFloat(product.sale_price) : product.sale_price) : null,
    };
}
// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================
/*
User registration endpoint - creates new user accounts with comprehensive profile information
including fragrance preferences and notification settings for luxury customer segmentation
*/
app.post('/api/auth/register', async (req, res) => {
    try {
        const validatedData = createUserInputSchema.parse(req.body);
        const client = await pool.connect();
        // Check if user already exists
        const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [validatedData.email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            client.release();
            return res.status(400).json(createErrorResponse('User with this email already exists', null, 'USER_ALREADY_EXISTS'));
        }
        // Create user (NO HASHING - store password directly for development)
        const userId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query(`INSERT INTO users (user_id, email, password_hash, first_name, last_name, phone_number, date_of_birth, 
       user_role, notification_preferences, email_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
       RETURNING user_id, email, first_name, last_name, phone_number, date_of_birth, user_role, loyalty_tier, email_verified, created_at`, [userId, validatedData.email.toLowerCase(), validatedData.password, validatedData.first_name, validatedData.last_name,
            validatedData.phone_number, validatedData.date_of_birth, 'customer', validatedData.notification_preferences, false, now, now]);
        client.release();
        const user = result.rows[0];
        // Generate JWT token
        const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: user
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
User authentication endpoint - validates email/password credentials and returns JWT token
for session management with complete user profile data
*/
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json(createErrorResponse('Email and password are required', null, 'MISSING_CREDENTIALS'));
        }
        const client = await pool.connect();
        // Find user and validate password (direct comparison for development)
        const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'INVALID_CREDENTIALS'));
        }
        const user = result.rows[0];
        // Direct password comparison for development
        if (password !== user.password_hash) {
            return res.status(401).json(createErrorResponse('Invalid email or password', null, 'INVALID_CREDENTIALS'));
        }
        // Generate JWT token
        const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        // Remove password from response
        delete user.password_hash;
        res.json({
            token,
            user: user
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Logout endpoint - invalidates JWT token (client-side token removal)
*/
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // In a real implementation, you might blacklist the token
    res.json({ message: 'Logout successful' });
});
/*
Token refresh endpoint - generates new JWT token with extended expiration
*/
app.post('/api/auth/refresh', authenticateToken, (req, res) => {
    try {
        const token = jwt.sign({ user_id: req.user.user_id, email: req.user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: req.user
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// USER PROFILE ROUTES
// ============================================================================
/*
Get user profile - retrieves complete authenticated user profile including preferences,
loyalty status, and fragrance profile data for personalization features
*/
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT user_id, email, first_name, last_name, phone_number, date_of_birth, user_role, loyalty_tier, email_verified, notification_preferences, fragrance_profile, created_at, updated_at FROM users WHERE user_id = $1', [req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update user profile - modifies user profile information including notification preferences,
fragrance profile for personalization, and contact details with data integrity maintenance
*/
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const validatedData = updateUserInputSchema.parse({ ...req.body, user_id: req.user.user_id });
        const client = await pool.connect();
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        if (validatedData.email) {
            // Check email uniqueness
            const emailCheck = await client.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [validatedData.email.toLowerCase(), req.user.user_id]);
            if (emailCheck.rows.length > 0) {
                client.release();
                return res.status(400).json(createErrorResponse('Email already in use', null, 'EMAIL_EXISTS'));
            }
            updateFields.push(`email = $${paramCount++}`);
            values.push(validatedData.email.toLowerCase());
        }
        if (validatedData.first_name) {
            updateFields.push(`first_name = $${paramCount++}`);
            values.push(validatedData.first_name);
        }
        if (validatedData.last_name) {
            updateFields.push(`last_name = $${paramCount++}`);
            values.push(validatedData.last_name);
        }
        if (validatedData.phone_number !== undefined) {
            updateFields.push(`phone_number = $${paramCount++}`);
            values.push(validatedData.phone_number);
        }
        if (validatedData.date_of_birth !== undefined) {
            updateFields.push(`date_of_birth = $${paramCount++}`);
            values.push(validatedData.date_of_birth);
        }
        if (validatedData.notification_preferences) {
            updateFields.push(`notification_preferences = $${paramCount++}`);
            values.push(validatedData.notification_preferences);
        }
        if (validatedData.fragrance_profile !== undefined) {
            updateFields.push(`fragrance_profile = $${paramCount++}`);
            values.push(validatedData.fragrance_profile);
        }
        updateFields.push(`updated_at = $${paramCount++}`);
        values.push(new Date().toISOString());
        values.push(req.user.user_id);
        const result = await client.query(`UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramCount} RETURNING user_id, email, first_name, last_name, phone_number, date_of_birth, loyalty_tier, email_verified, notification_preferences, fragrance_profile, created_at, updated_at`, values);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update profile error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get public user profile - retrieves limited public profile information by user ID
*/
app.get('/api/users/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('SELECT user_id, first_name, last_name, created_at FROM users WHERE user_id = $1', [user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// PRODUCT ROUTES
// ============================================================================
/*
Product search and filtering - comprehensive product search with multi-dimensional filtering
supporting luxury fragrance discovery including advanced filtering by fragrance families,
notes, occasions, seasons, and performance metrics
*/
app.get('/api/products', async (req, res) => {
    try {
        const { query, brand_ids, category_id, gender_category, concentration, fragrance_families, occasion_tags, season_suitability, availability_status, is_featured, is_new_arrival, is_limited_edition, price_min, price_max, size_options, sort_by = 'sort_order', sort_order = 'asc', page = 1, per_page = 20 } = req.query;
        const client = await pool.connect();
        let whereConditions = ['1=1'];
        let queryParams = [];
        let paramCount = 1;
        // Text search - search in product name, description, brand name, fragrance families, notes, and categories
        if (query) {
            // Enhanced search: Map common fragrance family searches to their note equivalents
            const fragranceFamilyKeywords = {
                'citrus': ['bergamot', 'lemon', 'orange', 'grapefruit', 'mandarin', 'lime', 'yuzu'],
                'floral': ['rose', 'jasmine', 'lily', 'peony', 'iris', 'tuberose', 'magnolia', 'gardenia'],
                'woody': ['sandalwood', 'cedarwood', 'cedar', 'vetiver', 'patchouli', 'agarwood', 'oud'],
                'oriental': ['vanilla', 'amber', 'musk', 'incense', 'spice'],
                'fresh': ['aquatic', 'marine', 'ozonic', 'clean'],
                'fruity': ['apple', 'pear', 'peach', 'berry', 'blackcurrant', 'pineapple', 'plum']
            };
            const lowerQuery = query.toLowerCase();
            const matchingKeywords = fragranceFamilyKeywords[lowerQuery];
            // Start with base search parameter
            queryParams.push(`%${query}%`);
            const baseParamIndex = paramCount;
            paramCount++;
            let searchConditions = `(
        p.product_name ILIKE $${baseParamIndex} 
        OR p.description ILIKE $${baseParamIndex} 
        OR p.short_description ILIKE $${baseParamIndex}
        OR b.brand_name ILIKE $${baseParamIndex}
        OR p.fragrance_families::text ILIKE $${baseParamIndex}
        OR p.top_notes ILIKE $${baseParamIndex}
        OR p.middle_notes ILIKE $${baseParamIndex}
        OR p.base_notes ILIKE $${baseParamIndex}
        OR p.complete_notes_list ILIKE $${baseParamIndex}
        OR c.category_name ILIKE $${baseParamIndex}
      `;
            // If the search matches a fragrance family, also search for related notes
            if (matchingKeywords && matchingKeywords.length > 0) {
                const keywordConditions = matchingKeywords.map((keyword) => {
                    queryParams.push(`%${keyword}%`);
                    const keywordParamIndex = paramCount;
                    paramCount++;
                    return `(p.complete_notes_list ILIKE $${keywordParamIndex} OR p.top_notes ILIKE $${keywordParamIndex} OR p.middle_notes ILIKE $${keywordParamIndex} OR p.base_notes ILIKE $${keywordParamIndex})`;
                });
                searchConditions += ` OR ${keywordConditions.join(' OR ')}`;
            }
            searchConditions += `)`;
            whereConditions.push(searchConditions);
        }
        // Brand filtering
        if (brand_ids) {
            const brands = brand_ids.split(',');
            whereConditions.push(`p.brand_id = ANY($${paramCount})`);
            queryParams.push(brands);
            paramCount++;
        }
        // Category filtering
        if (category_id) {
            whereConditions.push(`p.category_id = $${paramCount}`);
            queryParams.push(category_id);
            paramCount++;
        }
        // Gender filtering
        if (gender_category) {
            whereConditions.push(`p.gender_category = $${paramCount}`);
            queryParams.push(gender_category);
            paramCount++;
        }
        // Concentration filtering
        if (concentration) {
            whereConditions.push(`p.concentration = $${paramCount}`);
            queryParams.push(concentration);
            paramCount++;
        }
        // Fragrance family filtering
        if (fragrance_families) {
            whereConditions.push(`p.fragrance_families ILIKE $${paramCount}`);
            queryParams.push(`%${fragrance_families}%`);
            paramCount++;
        }
        // Occasion filtering
        if (occasion_tags) {
            whereConditions.push(`p.occasion_tags ILIKE $${paramCount}`);
            queryParams.push(`%${occasion_tags}%`);
            paramCount++;
        }
        // Season filtering
        if (season_suitability) {
            whereConditions.push(`p.season_suitability ILIKE $${paramCount}`);
            queryParams.push(`%${season_suitability}%`);
            paramCount++;
        }
        // Availability filtering
        if (availability_status) {
            whereConditions.push(`p.availability_status = $${paramCount}`);
            queryParams.push(availability_status);
            paramCount++;
        }
        // Boolean filters
        if (is_featured === 'true') {
            whereConditions.push('p.is_featured = true');
        }
        if (is_new_arrival === 'true') {
            whereConditions.push('p.is_new_arrival = true');
        }
        if (is_limited_edition === 'true') {
            whereConditions.push('p.is_limited_edition = true');
        }
        // Price filtering
        if (price_min) {
            whereConditions.push(`p.base_price >= $${paramCount}`);
            queryParams.push(parseFloat(price_min));
            paramCount++;
        }
        if (price_max) {
            whereConditions.push(`p.base_price <= $${paramCount}`);
            queryParams.push(parseFloat(price_max));
            paramCount++;
        }
        // Sorting
        let orderBy = 'p.sort_order ASC';
        if (sort_by === 'product_name') {
            orderBy = `p.product_name ${sort_order.toUpperCase()}`;
        }
        else if (sort_by === 'base_price') {
            orderBy = `p.base_price ${sort_order.toUpperCase()}`;
        }
        else if (sort_by === 'created_at') {
            orderBy = `p.created_at ${sort_order.toUpperCase()}`;
        }
        // Pagination
        const limit = Math.min(parseInt(per_page), 100);
        const offset = (parseInt(page) - 1) * limit;
        // Main query
        const mainQuery = `
      SELECT p.*, b.brand_name, b.logo_url as brand_logo, c.category_name,
             (SELECT json_agg(json_build_object('image_url', pi.image_url, 'is_primary', pi.is_primary, 'alt_text', pi.alt_text) ORDER BY pi.display_order)
              FROM product_images pi WHERE pi.product_id = p.product_id) as images
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
        queryParams.push(limit, offset);
        // Count query
        const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE ${whereConditions.join(' AND ')}
    `;
        const [results, countResult] = await Promise.all([
            client.query(mainQuery, queryParams),
            client.query(countQuery, queryParams.slice(0, -2))
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        // Convert decimal prices to numbers
        const products = results.rows.map(convertProductPrices);
        res.json({
            data: products,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Product search error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get featured products - retrieves featured products for homepage display
*/
app.get('/api/products/featured', async (req, res) => {
    try {
        const { limit = 12 } = req.query;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT p.*, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.is_featured = true AND p.availability_status = 'in_stock'
      ORDER BY p.sort_order ASC
      LIMIT $1
    `, [parseInt(limit)]);
        client.release();
        // Convert decimal prices to numbers
        const products = result.rows.map(convertProductPrices);
        res.json(products);
    }
    catch (error) {
        console.error('Get featured products error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get new arrival products - retrieves recently launched products
*/
app.get('/api/products/new-arrivals', async (req, res) => {
    try {
        const { limit = 12 } = req.query;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT p.*, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.is_new_arrival = true AND p.availability_status = 'in_stock'
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);
        client.release();
        // Convert decimal prices to numbers
        const products = result.rows.map(convertProductPrices);
        res.json(products);
    }
    catch (error) {
        console.error('Get new arrivals error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get best-selling products - retrieves top-performing products by sales volume
@@need:external-api: Sales analytics service to determine best-selling products based on order volume and revenue metrics
*/
app.get('/api/products/best-sellers', async (req, res) => {
    try {
        const { limit = 12, category } = req.query;
        const client = await pool.connect();
        let whereClause = "p.availability_status = 'in_stock'";
        const params = [parseInt(limit)];
        if (category) {
            whereClause += " AND c.category_name ILIKE $2";
            params.push(`%${category}%`);
        }
        const result = await client.query(`
      SELECT p.*, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image,
             COALESCE(sales.order_count, 0) as order_count
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN (
        SELECT product_id, COUNT(*) as order_count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE o.order_status NOT IN ('cancelled', 'refunded')
        GROUP BY product_id
      ) sales ON p.product_id = sales.product_id
      WHERE ${whereClause}
      ORDER BY sales.order_count DESC NULLS LAST, p.is_featured DESC, RANDOM()
      LIMIT $1
    `, params);
        client.release();
        // Convert decimal prices to numbers
        const products = result.rows.map(convertProductPrices);
        res.json(products);
    }
    catch (error) {
        console.error('Get best sellers error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get product details - retrieves comprehensive product information including fragrance notes,
performance metrics, care instructions, and related product data for detailed product pages
*/
app.get('/api/products/:product_id', async (req, res) => {
    try {
        const { product_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT p.*, b.brand_name, b.logo_url as brand_logo, b.heritage_story, b.country_origin,
             c.category_name, c.description as category_description,
             (SELECT json_agg(json_build_object(
               'image_id', pi.image_id,
               'image_url', pi.image_url,
               'image_type', pi.image_type,
               'alt_text', pi.alt_text,
               'display_order', pi.display_order,
               'is_primary', pi.is_primary
             ) ORDER BY pi.display_order) FROM product_images pi WHERE pi.product_id = p.product_id) as images
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = $1
    `, [product_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Product not found', null, 'PRODUCT_NOT_FOUND'));
        }
        // Convert decimal prices to numbers
        const product = convertProductPrices(result.rows[0]);
        res.json(product);
    }
    catch (error) {
        console.error('Get product error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get product sizes and pricing - retrieves available sizes, pricing, and inventory information
for a specific product including sample availability and stock levels for purchase decisions
*/
app.get('/api/products/:product_id/sizes', async (req, res) => {
    try {
        const { product_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT size_id, product_id, size_ml, price, sale_price, stock_quantity, 
             reserved_quantity, low_stock_threshold, sku, is_sample_available, 
             sample_price, is_active, created_at
      FROM product_sizes 
      WHERE product_id = $1 AND is_active = true
      ORDER BY size_ml ASC
    `, [product_id]);
        client.release();
        // Convert decimal prices to numbers
        const sizes = result.rows.map(row => ({
            ...row,
            price: parseFloat(row.price),
            sale_price: row.sale_price ? parseFloat(row.sale_price) : null,
            sample_price: row.sample_price ? parseFloat(row.sample_price) : null,
        }));
        res.json(sizes);
    }
    catch (error) {
        console.error('Get product sizes error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get product recommendations - generates personalized product recommendations based on
fragrance profiles, purchase history, and collaborative filtering algorithms supporting
multiple recommendation types for cross-selling and discovery
@@need:external-api: ML recommendation service for advanced personalization algorithms based on user preferences, purchase history, and fragrance profiles
*/
app.get('/api/products/:product_id/recommendations', optionalAuth, async (req, res) => {
    try {
        const { product_id } = req.params;
        const { type = 'similar', limit = 8 } = req.query;
        const client = await pool.connect();
        // Get current product info for similarity matching
        const productResult = await client.query('SELECT fragrance_families, category_id, brand_id FROM products WHERE product_id = $1', [product_id]);
        if (productResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Product not found', null, 'PRODUCT_NOT_FOUND'));
        }
        const currentProduct = productResult.rows[0];
        let query;
        let params;
        switch (type) {
            case 'similar':
                // Mock similar products based on fragrance families
                query = `
          SELECT p.*, b.brand_name, 
                 (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          WHERE p.product_id != $1 
            AND (p.fragrance_families LIKE $2 OR p.category_id = $3)
            AND p.availability_status = 'in_stock'
          ORDER BY p.is_featured DESC, RANDOM()
          LIMIT $4
        `;
                params = [product_id, `%${currentProduct.fragrance_families.split(',')[0].trim()}%`, currentProduct.category_id, parseInt(limit)];
                break;
            case 'complementary':
                // Mock complementary products from different families
                query = `
          SELECT p.*, b.brand_name,
                 (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          WHERE p.product_id != $1 
            AND p.fragrance_families NOT LIKE $2
            AND p.availability_status = 'in_stock'
          ORDER BY p.is_featured DESC, RANDOM()
          LIMIT $3
        `;
                params = [product_id, `%${currentProduct.fragrance_families.split(',')[0].trim()}%`, parseInt(limit)];
                break;
            case 'frequently_bought':
                // Mock frequently bought together based on order data
                query = `
          SELECT p.*, b.brand_name,
                 (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          WHERE p.product_id != $1 
            AND p.brand_id = $2
            AND p.availability_status = 'in_stock'
          ORDER BY p.base_price ASC, RANDOM()
          LIMIT $3
        `;
                params = [product_id, currentProduct.brand_id, parseInt(limit)];
                break;
            case 'recently_viewed':
                // Mock recently viewed products for authenticated users
                if (req.user) {
                    query = `
            SELECT DISTINCT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN product_views pv ON p.product_id = pv.product_id
            WHERE p.product_id != $1 
              AND pv.user_id = $2
              AND p.availability_status = 'in_stock'
            ORDER BY pv.viewed_at DESC
            LIMIT $3
          `;
                    params = [product_id, req.user.user_id, parseInt(limit)];
                }
                else {
                    // Fallback to similar for non-authenticated users
                    query = `
            SELECT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            WHERE p.product_id != $1 
              AND p.is_featured = true
              AND p.availability_status = 'in_stock'
            ORDER BY RANDOM()
            LIMIT $2
          `;
                    params = [product_id, parseInt(limit)];
                }
                break;
            default:
                query = `
          SELECT p.*, b.brand_name,
                 (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          WHERE p.product_id != $1 
            AND p.is_featured = true
            AND p.availability_status = 'in_stock'
          ORDER BY RANDOM()
          LIMIT $2
        `;
                params = [product_id, parseInt(limit)];
        }
        const result = await client.query(query, params);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get product recommendations based on user preferences - generates personalized product recommendations
based on purchase history, browsing behavior, or general preferences without requiring a specific product
*/
app.get('/api/products/recommendations', optionalAuth, async (req, res) => {
    try {
        const { based_on = 'general', limit = 8 } = req.query;
        const client = await pool.connect();
        let query;
        let params;
        switch (based_on) {
            case 'purchase_history':
                // Recommendations based on user's purchase history
                if (req.user) {
                    query = `
            SELECT DISTINCT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            WHERE p.availability_status = 'in_stock'
              AND p.product_id IN (
                SELECT DISTINCT product_id 
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.order_id
                WHERE o.user_id = $1 
                  AND o.order_status NOT IN ('cancelled', 'refunded')
                LIMIT 20
              )
            ORDER BY p.is_featured DESC, RANDOM()
            LIMIT $2
          `;
                    params = [req.user.user_id, parseInt(limit)];
                }
                else {
                    // Fallback to featured products for non-authenticated users
                    query = `
            SELECT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            WHERE p.is_featured = true 
              AND p.availability_status = 'in_stock'
            ORDER BY p.sort_order ASC
            LIMIT $1
          `;
                    params = [parseInt(limit)];
                }
                break;
            case 'browsing_history':
                // Recommendations based on browsing history
                if (req.user) {
                    query = `
            SELECT DISTINCT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN product_views pv ON p.product_id = pv.product_id
            WHERE pv.user_id = $1
              AND p.availability_status = 'in_stock'
            ORDER BY pv.viewed_at DESC
            LIMIT $2
          `;
                    params = [req.user.user_id, parseInt(limit)];
                }
                else {
                    // Fallback to new arrivals
                    query = `
            SELECT p.*, b.brand_name,
                   (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
            FROM products p
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            WHERE p.is_new_arrival = true 
              AND p.availability_status = 'in_stock'
            ORDER BY p.created_at DESC
            LIMIT $1
          `;
                    params = [parseInt(limit)];
                }
                break;
            case 'general':
            default:
                // General recommendations - mix of featured and best sellers
                query = `
          SELECT p.*, b.brand_name,
                 (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
          FROM products p
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          WHERE p.availability_status = 'in_stock'
            AND (p.is_featured = true OR p.is_new_arrival = true)
          ORDER BY p.is_featured DESC, p.sort_order ASC, RANDOM()
          LIMIT $1
        `;
                params = [parseInt(limit)];
        }
        const result = await client.query(query, params);
        client.release();
        // Convert decimal prices to numbers
        const products = result.rows.map(convertProductPrices);
        res.json(products);
    }
    catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// BRAND ROUTES
// ============================================================================
/*
Get all brands - retrieves brand catalog with filtering and sorting options
*/
app.get('/api/brands', async (req, res) => {
    try {
        const { is_active = true, is_niche_brand, query, sort_by = 'display_order', sort_order = 'asc' } = req.query;
        const client = await pool.connect();
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;
        if (is_active !== undefined) {
            whereConditions.push(`is_active = $${paramCount++}`);
            queryParams.push(is_active === 'true' || is_active === true);
        }
        if (is_niche_brand !== undefined) {
            whereConditions.push(`is_niche_brand = $${paramCount++}`);
            queryParams.push(is_niche_brand === 'true');
        }
        if (query) {
            whereConditions.push(`brand_name ILIKE $${paramCount++}`);
            queryParams.push(`%${query}%`);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        let orderBy = 'display_order ASC';
        if (sort_by === 'brand_name') {
            orderBy = `brand_name ${sort_order.toUpperCase()}`;
        }
        else if (sort_by === 'created_at') {
            orderBy = `created_at ${sort_order.toUpperCase()}`;
        }
        const result = await client.query(`
      SELECT brand_id, brand_name, description, logo_url, heritage_story, 
             country_origin, is_niche_brand, display_order, is_active, created_at,
             (SELECT COUNT(*) FROM products WHERE brand_id = brands.brand_id AND availability_status = 'in_stock') as product_count
      FROM brands
      ${whereClause}
      ORDER BY ${orderBy}
    `, queryParams);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get brand by ID - retrieves detailed brand information
*/
app.get('/api/brands/:brand_id', async (req, res) => {
    try {
        const { brand_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT brand_id, brand_name, description, logo_url, heritage_story, 
             country_origin, is_niche_brand, display_order, is_active, created_at,
             (SELECT COUNT(*) FROM products WHERE brand_id = brands.brand_id AND availability_status = 'in_stock') as product_count
      FROM brands 
      WHERE brand_id = $1
    `, [brand_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Brand not found', null, 'BRAND_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get brand error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get brand products - retrieves all products for a specific brand with pagination
*/
app.get('/api/brands/:brand_id/products', async (req, res) => {
    try {
        const { brand_id } = req.params;
        const { page = 1, per_page = 20, sort_by = 'sort_order' } = req.query;
        const client = await pool.connect();
        const limit = Math.min(parseInt(per_page), 100);
        const offset = (parseInt(page) - 1) * limit;
        let orderBy = 'p.sort_order ASC';
        if (sort_by === 'product_name') {
            orderBy = 'p.product_name ASC';
        }
        else if (sort_by === 'base_price') {
            orderBy = 'p.base_price ASC';
        }
        else if (sort_by === 'created_at') {
            orderBy = 'p.created_at DESC';
        }
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT p.*, b.brand_name,
               (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE p.brand_id = $1 AND p.availability_status = 'in_stock'
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `, [brand_id, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM products 
        WHERE brand_id = $1 AND availability_status = 'in_stock'
      `, [brand_id])
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get brand products error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// CATEGORY ROUTES
// ============================================================================
/*
Get all categories - retrieves category hierarchy with optional parent filtering
*/
app.get('/api/categories', async (req, res) => {
    try {
        const { parent_category_id, is_active = true } = req.query;
        const client = await pool.connect();
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;
        if (is_active !== undefined) {
            whereConditions.push(`is_active = $${paramCount++}`);
            queryParams.push(is_active === 'true' || is_active === true);
        }
        if (parent_category_id !== undefined) {
            if (parent_category_id === 'null' || parent_category_id === '') {
                whereConditions.push('parent_category_id IS NULL');
            }
            else {
                whereConditions.push(`parent_category_id = $${paramCount++}`);
                queryParams.push(parent_category_id);
            }
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const result = await client.query(`
      SELECT category_id, category_name, parent_category_id, description, display_order, is_active,
             (SELECT COUNT(*) FROM products WHERE category_id = categories.category_id AND availability_status = 'in_stock') as product_count
      FROM categories
      ${whereClause}
      ORDER BY display_order ASC, category_name ASC
    `, queryParams);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get category by ID - retrieves detailed category information
*/
app.get('/api/categories/:category_id', async (req, res) => {
    try {
        const { category_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT category_id, category_name, parent_category_id, description, display_order, is_active,
             (SELECT COUNT(*) FROM products WHERE category_id = categories.category_id AND availability_status = 'in_stock') as product_count
      FROM categories 
      WHERE category_id = $1
    `, [category_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Category not found', null, 'CATEGORY_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get category error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get category products - retrieves all products in a specific category with pagination
*/
app.get('/api/categories/:category_id/products', async (req, res) => {
    try {
        const { category_id } = req.params;
        const { page = 1, per_page = 20, sort_by = 'sort_order' } = req.query;
        const client = await pool.connect();
        const limit = Math.min(parseInt(per_page), 100);
        const offset = (parseInt(page) - 1) * limit;
        let orderBy = 'p.sort_order ASC';
        if (sort_by === 'product_name') {
            orderBy = 'p.product_name ASC';
        }
        else if (sort_by === 'base_price') {
            orderBy = 'p.base_price ASC';
        }
        else if (sort_by === 'created_at') {
            orderBy = 'p.created_at DESC';
        }
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT p.*, b.brand_name,
               (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE p.category_id = $1 AND p.availability_status = 'in_stock'
        ORDER BY ${orderBy}
        LIMIT $2 OFFSET $3
      `, [category_id, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM products 
        WHERE category_id = $1 AND availability_status = 'in_stock'
      `, [category_id])
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get category products error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// CART ROUTES
// ============================================================================
/*
Get cart - retrieves current cart contents supporting both authenticated users and guest sessions
including cart items with current pricing, gift options, and sample inclusions
*/
app.get('/api/cart', optionalAuth, async (req, res) => {
    try {
        const { session_id } = req.query;
        const client = await pool.connect();
        let cartQuery;
        let cartParams;
        if (req.user) {
            cartQuery = 'SELECT * FROM carts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1';
            cartParams = [req.user.user_id];
        }
        else if (session_id) {
            cartQuery = 'SELECT * FROM carts WHERE session_id = $1 AND user_id IS NULL ORDER BY updated_at DESC LIMIT 1';
            cartParams = [session_id];
        }
        else {
            client.release();
            return res.json({ cart_id: null, items: [], total: 0 });
        }
        const cartResult = await client.query(cartQuery, cartParams);
        if (cartResult.rows.length === 0) {
            client.release();
            return res.json({ cart_id: null, items: [], total: 0 });
        }
        const cart = cartResult.rows[0];
        // Get cart items with product details
        const itemsResult = await client.query(`
      SELECT ci.*, p.product_name, p.availability_status, b.brand_name,
             ps.price as current_price, ps.sale_price as current_sale_price, ps.stock_quantity,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as product_image
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.product_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN product_sizes ps ON p.product_id = ps.product_id AND ci.size_ml = ps.size_ml
      WHERE ci.cart_id = $1
      ORDER BY ci.added_at DESC
    `, [cart.cart_id]);
        // Calculate totals
        let subtotal = 0;
        let totalQuantity = 0;
        const items = itemsResult.rows.map(item => {
            const itemTotal = item.quantity * item.unit_price;
            subtotal += itemTotal;
            totalQuantity += item.quantity;
            return {
                ...item,
                line_total: itemTotal,
                is_price_changed: item.current_price !== item.unit_price
            };
        });
        client.release();
        res.json({
            ...cart,
            items,
            subtotal,
            item_count: totalQuantity
        });
    }
    catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create cart - creates new cart for guest or authenticated users
*/
app.post('/api/cart', optionalAuth, async (req, res) => {
    try {
        const { session_id } = req.body;
        const client = await pool.connect();
        const cartId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query('INSERT INTO carts (cart_id, user_id, session_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *', [cartId, req.user?.user_id || null, session_id || null, now, now]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create cart error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Add cart item - adds products to cart with size selection, quantity specification,
and optional gift services with cart creation for new sessions and inventory validation
*/
app.post('/api/cart/items', optionalAuth, async (req, res) => {
    try {
        const validatedData = createCartItemInputSchema.parse(req.body);
        const { cart_id, session_id } = req.query;
        const client = await pool.connect();
        let finalCartId = cart_id;
        // Find or create cart
        if (!finalCartId) {
            let cartQuery;
            let cartParams;
            if (req.user) {
                cartQuery = 'SELECT cart_id FROM carts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1';
                cartParams = [req.user.user_id];
            }
            else if (session_id) {
                cartQuery = 'SELECT cart_id FROM carts WHERE session_id = $1 AND user_id IS NULL ORDER BY updated_at DESC LIMIT 1';
                cartParams = [session_id];
            }
            if (cartQuery) {
                const cartResult = await client.query(cartQuery, cartParams);
                if (cartResult.rows.length > 0) {
                    finalCartId = cartResult.rows[0].cart_id;
                }
            }
            // Create cart if not exists
            if (!finalCartId) {
                finalCartId = uuidv4();
                const now = new Date().toISOString();
                await client.query('INSERT INTO carts (cart_id, user_id, session_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)', [finalCartId, req.user?.user_id || null, session_id || null, now, now]);
            }
        }
        // Check product availability and stock
        const productCheck = await client.query(`
      SELECT ps.stock_quantity, ps.price, ps.sale_price, p.availability_status
      FROM product_sizes ps
      LEFT JOIN products p ON ps.product_id = p.product_id
      WHERE ps.product_id = $1 AND ps.size_ml = $2 AND ps.is_active = true
    `, [validatedData.product_id, validatedData.size_ml]);
        if (productCheck.rows.length === 0) {
            client.release();
            return res.status(400).json(createErrorResponse('Product size not available', null, 'PRODUCT_SIZE_NOT_AVAILABLE'));
        }
        const productSize = productCheck.rows[0];
        if (productSize.availability_status !== 'in_stock') {
            client.release();
            return res.status(400).json(createErrorResponse('Product not in stock', null, 'PRODUCT_OUT_OF_STOCK'));
        }
        if (productSize.stock_quantity < validatedData.quantity) {
            client.release();
            return res.status(400).json(createErrorResponse('Insufficient stock', null, 'INSUFFICIENT_STOCK'));
        }
        // Check if item already exists in cart
        const existingItem = await client.query('SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size_ml = $3', [finalCartId, validatedData.product_id, validatedData.size_ml]);
        let result;
        const now = new Date().toISOString();
        if (existingItem.rows.length > 0) {
            // Update existing item
            const newQuantity = existingItem.rows[0].quantity + validatedData.quantity;
            result = await client.query('UPDATE cart_items SET quantity = $1, gift_wrap = $2, sample_included = $3 WHERE cart_item_id = $4 RETURNING *', [newQuantity, validatedData.gift_wrap, validatedData.sample_included, existingItem.rows[0].cart_item_id]);
        }
        else {
            // Create new item
            const cartItemId = uuidv4();
            result = await client.query('INSERT INTO cart_items (cart_item_id, cart_id, product_id, size_ml, quantity, unit_price, gift_wrap, sample_included, added_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [cartItemId, finalCartId, validatedData.product_id, validatedData.size_ml, validatedData.quantity, validatedData.unit_price, validatedData.gift_wrap, validatedData.sample_included, now]);
        }
        // Update cart timestamp
        await client.query('UPDATE carts SET updated_at = $1 WHERE cart_id = $2', [now, finalCartId]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Add cart item error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update cart item - modifies cart item quantities and gift service selections with inventory validation
*/
app.put('/api/cart/items/:cart_item_id', optionalAuth, async (req, res) => {
    try {
        const { cart_item_id } = req.params;
        const validatedData = updateCartItemInputSchema.parse(req.body);
        const client = await pool.connect();
        // Get current cart item
        const itemResult = await client.query('SELECT ci.*, c.user_id, c.session_id FROM cart_items ci LEFT JOIN carts c ON ci.cart_id = c.cart_id WHERE ci.cart_item_id = $1', [cart_item_id]);
        if (itemResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Cart item not found', null, 'CART_ITEM_NOT_FOUND'));
        }
        const item = itemResult.rows[0];
        // Verify ownership
        if (req.user && item.user_id !== req.user.user_id) {
            client.release();
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        // If quantity is 0, delete the item
        if (validatedData.quantity === 0) {
            await client.query('DELETE FROM cart_items WHERE cart_item_id = $1', [cart_item_id]);
            client.release();
            return res.json({ message: 'Item removed from cart' });
        }
        // Check stock if quantity is being increased
        if (validatedData.quantity && validatedData.quantity > item.quantity) {
            const stockCheck = await client.query('SELECT stock_quantity FROM product_sizes WHERE product_id = $1 AND size_ml = $2', [item.product_id, item.size_ml]);
            if (stockCheck.rows.length === 0 || stockCheck.rows[0].stock_quantity < validatedData.quantity) {
                client.release();
                return res.status(400).json(createErrorResponse('Insufficient stock', null, 'INSUFFICIENT_STOCK'));
            }
        }
        // Build update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        if (validatedData.quantity !== undefined) {
            updateFields.push(`quantity = $${paramCount++}`);
            values.push(validatedData.quantity);
        }
        if (validatedData.gift_wrap !== undefined) {
            updateFields.push(`gift_wrap = $${paramCount++}`);
            values.push(validatedData.gift_wrap);
        }
        if (validatedData.sample_included !== undefined) {
            updateFields.push(`sample_included = $${paramCount++}`);
            values.push(validatedData.sample_included);
        }
        values.push(cart_item_id);
        const result = await client.query(`UPDATE cart_items SET ${updateFields.join(', ')} WHERE cart_item_id = $${paramCount} RETURNING *`, values);
        // Update cart timestamp
        await client.query('UPDATE carts SET updated_at = $1 WHERE cart_id = $2', [new Date().toISOString(), item.cart_id]);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update cart item error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Remove cart item - removes specific item from cart
*/
app.delete('/api/cart/items/:cart_item_id', optionalAuth, async (req, res) => {
    try {
        const { cart_item_id } = req.params;
        const client = await pool.connect();
        // Get cart item with ownership info
        const itemResult = await client.query('SELECT ci.cart_id, c.user_id FROM cart_items ci LEFT JOIN carts c ON ci.cart_id = c.cart_id WHERE ci.cart_item_id = $1', [cart_item_id]);
        if (itemResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Cart item not found', null, 'CART_ITEM_NOT_FOUND'));
        }
        const item = itemResult.rows[0];
        // Verify ownership
        if (req.user && item.user_id !== req.user.user_id) {
            client.release();
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        await client.query('DELETE FROM cart_items WHERE cart_item_id = $1', [cart_item_id]);
        // Update cart timestamp
        await client.query('UPDATE carts SET updated_at = $1 WHERE cart_id = $2', [new Date().toISOString(), item.cart_id]);
        client.release();
        res.json({ message: 'Item removed from cart successfully' });
    }
    catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Clear cart - removes all items from cart
*/
app.delete('/api/cart/clear', optionalAuth, async (req, res) => {
    try {
        const { cart_id, session_id } = req.query;
        const client = await pool.connect();
        let finalCartId = cart_id;
        // Find cart if not provided
        if (!finalCartId) {
            let cartQuery;
            let cartParams;
            if (req.user) {
                cartQuery = 'SELECT cart_id FROM carts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1';
                cartParams = [req.user.user_id];
            }
            else if (session_id) {
                cartQuery = 'SELECT cart_id FROM carts WHERE session_id = $1 AND user_id IS NULL ORDER BY updated_at DESC LIMIT 1';
                cartParams = [session_id];
            }
            if (cartQuery) {
                const cartResult = await client.query(cartQuery, cartParams);
                if (cartResult.rows.length > 0) {
                    finalCartId = cartResult.rows[0].cart_id;
                }
            }
        }
        if (finalCartId) {
            await client.query('DELETE FROM cart_items WHERE cart_id = $1', [finalCartId]);
            await client.query('UPDATE carts SET updated_at = $1 WHERE cart_id = $2', [new Date().toISOString(), finalCartId]);
        }
        client.release();
        res.json({ message: 'Cart cleared successfully' });
    }
    catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// ADDRESS ROUTES
// ============================================================================
/*
Get user addresses - retrieves all addresses for authenticated user with optional type filtering
*/
app.get('/api/addresses', authenticateToken, async (req, res) => {
    try {
        const { address_type } = req.query;
        const client = await pool.connect();
        let query = 'SELECT * FROM addresses WHERE user_id = $1';
        const params = [req.user.user_id];
        if (address_type) {
            query += ' AND address_type = $2';
            params.push(address_type);
        }
        query += ' ORDER BY is_default DESC, created_at DESC';
        const result = await client.query(query, params);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create address - creates new shipping or billing addresses with comprehensive geographic data
and contact information for order fulfillment with default address management
*/
app.post('/api/addresses', authenticateToken, async (req, res) => {
    try {
        const validatedData = createAddressInputSchema.parse(req.body);
        const client = await pool.connect();
        // Use authenticated user's ID
        const userId = validatedData.user_id || req.user.user_id;
        // If setting as default, unset other defaults
        if (validatedData.is_default) {
            await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1 AND address_type = $2', [userId, validatedData.address_type]);
        }
        const addressId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query(`INSERT INTO addresses (address_id, user_id, address_type, first_name, last_name, company, 
       address_line_1, address_line_2, city, state_province, postal_code, country, phone_number, 
       is_default, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING *`, [addressId, userId, validatedData.address_type, validatedData.first_name,
            validatedData.last_name, validatedData.company || null, validatedData.address_line_1,
            validatedData.address_line_2 || null, validatedData.city, validatedData.state_province,
            validatedData.postal_code, validatedData.country, validatedData.phone_number || null,
            validatedData.is_default, now]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create address error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get address by ID - retrieves specific address with ownership verification
*/
app.get('/api/addresses/:address_id', authenticateToken, async (req, res) => {
    try {
        const { address_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2', [address_id, req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Address not found', null, 'ADDRESS_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get address error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update address - modifies existing address with ownership verification
*/
app.put('/api/addresses/:address_id', authenticateToken, async (req, res) => {
    try {
        const { address_id } = req.params;
        const validatedData = createAddressInputSchema.parse(req.body);
        const client = await pool.connect();
        // Verify ownership
        const ownershipCheck = await client.query('SELECT address_id FROM addresses WHERE address_id = $1 AND user_id = $2', [address_id, req.user.user_id]);
        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Address not found', null, 'ADDRESS_NOT_FOUND'));
        }
        // If setting as default, unset other defaults
        if (validatedData.is_default) {
            await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1 AND address_type = $2 AND address_id != $3', [req.user.user_id, validatedData.address_type, address_id]);
        }
        const result = await client.query(`UPDATE addresses SET address_type = $1, first_name = $2, last_name = $3, company = $4,
       address_line_1 = $5, address_line_2 = $6, city = $7, state_province = $8, 
       postal_code = $9, country = $10, phone_number = $11, is_default = $12
       WHERE address_id = $13 RETURNING *`, [validatedData.address_type, validatedData.first_name, validatedData.last_name,
            validatedData.company || null, validatedData.address_line_1, validatedData.address_line_2 || null,
            validatedData.city, validatedData.state_province, validatedData.postal_code,
            validatedData.country, validatedData.phone_number || null, validatedData.is_default, address_id]);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update address error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Delete address - removes address with ownership verification
*/
app.delete('/api/addresses/:address_id', authenticateToken, async (req, res) => {
    try {
        const { address_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('DELETE FROM addresses WHERE address_id = $1 AND user_id = $2 RETURNING address_id', [address_id, req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Address not found', null, 'ADDRESS_NOT_FOUND'));
        }
        res.json({ message: 'Address deleted successfully' });
    }
    catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// SHIPPING ROUTES
// ============================================================================
/*
Get shipping methods - retrieves available shipping methods with optional filtering
@@need:external-api: Shipping cost calculation service for real-time shipping rates based on destination and package weight
*/
app.get('/api/shipping-methods', async (req, res) => {
    try {
        const { is_active = true, destination_country, order_total } = req.query;
        const client = await pool.connect();
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;
        if (is_active !== undefined) {
            whereConditions.push(`is_active = $${paramCount++}`);
            queryParams.push(is_active === 'true' || is_active === true);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const result = await client.query(`
      SELECT shipping_method_id, method_name, description, cost, free_threshold,
             estimated_days_min, estimated_days_max, is_express, requires_signature,
             is_active, sort_order,
             CASE 
               WHEN free_threshold IS NOT NULL AND $${paramCount} >= free_threshold THEN 0
               ELSE cost
             END as calculated_cost
      FROM shipping_methods
      ${whereClause}
      ORDER BY sort_order ASC
    `, [...queryParams, parseFloat(order_total) || 0]);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get shipping methods error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get shipping method by ID - retrieves detailed shipping method information
*/
app.get('/api/shipping-methods/:shipping_method_id', async (req, res) => {
    try {
        const { shipping_method_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM shipping_methods WHERE shipping_method_id = $1', [shipping_method_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Shipping method not found', null, 'SHIPPING_METHOD_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get shipping method error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// ORDER ROUTES
// ============================================================================
/*
Get user orders - retrieves order history for authenticated users with filtering and pagination
*/
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { order_status, payment_status, date_from, date_to, page = 1, per_page = 10 } = req.query;
        const client = await pool.connect();
        let whereConditions = ['user_id = $1'];
        let queryParams = [req.user.user_id];
        let paramCount = 2;
        if (order_status) {
            whereConditions.push(`order_status = $${paramCount++}`);
            queryParams.push(order_status);
        }
        if (payment_status) {
            whereConditions.push(`payment_status = $${paramCount++}`);
            queryParams.push(payment_status);
        }
        if (date_from) {
            whereConditions.push(`created_at >= $${paramCount++}`);
            queryParams.push(date_from);
        }
        if (date_to) {
            whereConditions.push(`created_at <= $${paramCount++}`);
            queryParams.push(date_to);
        }
        const limit = Math.min(parseInt(per_page), 50);
        const offset = (parseInt(page) - 1) * limit;
        const whereClause = whereConditions.join(' AND ');
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT o.*, 
               (SELECT json_agg(json_build_object(
                 'order_item_id', oi.order_item_id,
                 'product_id', oi.product_id,
                 'product_name', oi.product_name,
                 'brand_name', oi.brand_name,
                 'size_ml', oi.size_ml,
                 'quantity', oi.quantity,
                 'unit_price', oi.unit_price,
                 'line_total', oi.line_total,
                 'sku', oi.sku
               )) FROM order_items oi WHERE oi.order_id = o.order_id) as items
        FROM orders o
        WHERE ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM orders
        WHERE ${whereClause}
      `, queryParams)
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create order - processes new orders from cart contents with comprehensive pricing calculation,
address assignment, shipping method selection, and payment processing integration
@@need:external-api: Payment processing API for payment method validation and charge processing
@@need:external-api: Tax calculation service for accurate tax computation based on shipping address
*/
app.post('/api/orders', optionalAuth, async (req, res) => {
    try {
        const validatedData = createOrderInputSchema.parse(req.body);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Generate order number and ID
            const orderId = uuidv4();
            const orderNumber = generateOrderNumber();
            const now = new Date().toISOString();
            // Get cart contents if user is authenticated
            let cartItems = [];
            if (req.user) {
                const cartResult = await client.query(`
          SELECT ci.*, p.product_name, b.brand_name, ps.sku
          FROM cart_items ci
          LEFT JOIN carts c ON ci.cart_id = c.cart_id
          LEFT JOIN products p ON ci.product_id = p.product_id
          LEFT JOIN brands b ON p.brand_id = b.brand_id
          LEFT JOIN product_sizes ps ON p.product_id = ps.product_id AND ci.size_ml = ps.size_ml
          WHERE c.user_id = $1
        `, [req.user.user_id]);
                cartItems = cartResult.rows;
            }
            // Create order
            const orderResult = await client.query(`
        INSERT INTO orders (order_id, user_id, order_number, order_status, payment_status, 
                          fulfillment_status, subtotal, tax_amount, shipping_cost, discount_amount, 
                          total_amount, currency, shipping_address_id, billing_address_id, 
                          shipping_method_id, payment_method_id, gift_message, special_instructions, 
                          customer_email, customer_phone, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `, [
                orderId, validatedData.user_id, orderNumber, 'pending', 'pending', 'unfulfilled',
                validatedData.subtotal, validatedData.tax_amount, validatedData.shipping_cost,
                validatedData.discount_amount, validatedData.total_amount, validatedData.currency,
                validatedData.shipping_address_id, validatedData.billing_address_id,
                validatedData.shipping_method_id, validatedData.payment_method_id,
                validatedData.gift_message, validatedData.special_instructions,
                validatedData.customer_email, validatedData.customer_phone, now, now
            ]);
            // Create order items from cart
            if (cartItems.length > 0) {
                for (const item of cartItems) {
                    const orderItemId = uuidv4();
                    await client.query(`
            INSERT INTO order_items (order_item_id, order_id, product_id, product_name, 
                                   brand_name, size_ml, quantity, unit_price, line_total, 
                                   gift_wrap, sample_included, sku)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `, [
                        orderItemId, orderId, item.product_id, item.product_name, item.brand_name,
                        item.size_ml, item.quantity, item.unit_price,
                        item.quantity * item.unit_price, item.gift_wrap, item.sample_included, item.sku
                    ]);
                    // Update inventory (reserve stock)
                    await client.query(`
            UPDATE product_sizes 
            SET reserved_quantity = reserved_quantity + $1
            WHERE product_id = $2 AND size_ml = $3
          `, [item.quantity, item.product_id, item.size_ml]);
                }
                // Clear cart after order creation
                await client.query('DELETE FROM cart_items WHERE cart_id IN (SELECT cart_id FROM carts WHERE user_id = $1)', [req.user.user_id]);
            }
            await client.query('COMMIT');
            res.status(201).json(orderResult.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Create order error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get order by ID - retrieves detailed order information with items
*/
app.get('/api/orders/:order_id', optionalAuth, async (req, res) => {
    try {
        const { order_id } = req.params;
        const client = await pool.connect();
        // Get order with items
        const result = await client.query(`
      SELECT o.*,
             (SELECT json_agg(json_build_object(
               'order_item_id', oi.order_item_id,
               'product_id', oi.product_id,
               'product_name', oi.product_name,
               'brand_name', oi.brand_name,
               'size_ml', oi.size_ml,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price,
               'line_total', oi.line_total,
               'gift_wrap', oi.gift_wrap,
               'sample_included', oi.sample_included,
               'sku', oi.sku
             )) FROM order_items oi WHERE oi.order_id = o.order_id) as items
      FROM orders o
      WHERE o.order_id = $1
    `, [order_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Order not found', null, 'ORDER_NOT_FOUND'));
        }
        const order = result.rows[0];
        // Verify access - user must own the order or provide matching email
        if (req.user && order.user_id !== req.user.user_id) {
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        res.json(order);
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Track order - provides order tracking information by order number with email verification
for guest users and authenticated customers with real-time shipment status
@@need:external-api: Shipping carrier API for real-time tracking updates and delivery status
*/
app.get('/api/orders/track', async (req, res) => {
    try {
        const { order_number, email } = req.query;
        if (!order_number) {
            return res.status(400).json(createErrorResponse('Order number is required', null, 'ORDER_NUMBER_REQUIRED'));
        }
        const client = await pool.connect();
        let query = 'SELECT * FROM orders WHERE order_number = $1';
        let params = [order_number];
        if (email) {
            query += ' AND customer_email = $2';
            params.push(email.toLowerCase());
        }
        const result = await client.query(query, params);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Order not found or email does not match', null, 'ORDER_NOT_FOUND'));
        }
        const order = result.rows[0];
        // Mock tracking events
        const trackingEvents = [
            {
                event_type: 'order_placed',
                description: 'Order has been placed',
                location: 'Online',
                timestamp: order.created_at
            }
        ];
        if (order.order_status === 'processing') {
            trackingEvents.push({
                event_type: 'processing',
                description: 'Order is being processed',
                location: 'Fulfillment Center',
                timestamp: order.updated_at
            });
        }
        if (order.shipped_at) {
            trackingEvents.push({
                event_type: 'shipped',
                description: 'Order has been shipped',
                location: 'Fulfillment Center',
                timestamp: order.shipped_at
            });
        }
        if (order.delivered_at) {
            trackingEvents.push({
                event_type: 'delivered',
                description: 'Order has been delivered',
                location: order.shipping_address_id,
                timestamp: order.delivered_at
            });
        }
        res.json({
            order: order,
            tracking_events: trackingEvents
        });
    }
    catch (error) {
        console.error('Track order error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// REVIEW ROUTES
// ============================================================================
/*
Get reviews - retrieves product reviews with filtering and pagination options
*/
app.get('/api/reviews', async (req, res) => {
    try {
        const { product_id, user_id, rating, is_verified_purchase, is_featured, moderation_status = 'approved', sort_by = 'created_at', sort_order = 'desc', page = 1, per_page = 20 } = req.query;
        const client = await pool.connect();
        let whereConditions = [];
        let queryParams = [];
        let paramCount = 1;
        if (product_id) {
            whereConditions.push(`product_id = $${paramCount++}`);
            queryParams.push(product_id);
        }
        if (user_id) {
            whereConditions.push(`user_id = $${paramCount++}`);
            queryParams.push(user_id);
        }
        if (rating) {
            whereConditions.push(`rating = $${paramCount++}`);
            queryParams.push(parseInt(rating));
        }
        if (is_verified_purchase !== undefined) {
            whereConditions.push(`is_verified_purchase = $${paramCount++}`);
            queryParams.push(is_verified_purchase === 'true');
        }
        if (is_featured !== undefined) {
            whereConditions.push(`is_featured = $${paramCount++}`);
            queryParams.push(is_featured === 'true');
        }
        whereConditions.push(`moderation_status = $${paramCount++}`);
        queryParams.push(moderation_status);
        const limit = Math.min(parseInt(per_page), 100);
        const offset = (parseInt(page) - 1) * limit;
        let orderBy = 'created_at DESC';
        if (sort_by === 'rating') {
            orderBy = `rating ${sort_order.toUpperCase()}`;
        }
        else if (sort_by === 'helpful_votes') {
            orderBy = `helpful_votes ${sort_order.toUpperCase()}`;
        }
        const whereClause = whereConditions.join(' AND ');
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT r.*, u.first_name, u.last_name,
               (SELECT json_agg(json_build_object(
                 'photo_url', rp.photo_url,
                 'alt_text', rp.alt_text
               )) FROM review_photos rp WHERE rp.review_id = r.review_id) as photos
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.user_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM reviews
        WHERE ${whereClause}
      `, queryParams)
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create review - creates product reviews with fragrance-specific ratings including longevity,
sillage, and usage context tags with verified purchase linking and moderation workflow
@@need:external-api: Content moderation service for inappropriate content detection and filtering
*/
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const validatedData = createReviewInputSchema.parse(req.body);
        const client = await pool.connect();
        // Check if user already reviewed this product
        const existingReview = await client.query('SELECT review_id FROM reviews WHERE product_id = $1 AND user_id = $2', [validatedData.product_id, req.user.user_id]);
        if (existingReview.rows.length > 0) {
            client.release();
            return res.status(400).json(createErrorResponse('You have already reviewed this product', null, 'REVIEW_EXISTS'));
        }
        // Check for verified purchase if order_id provided
        let isVerifiedPurchase = false;
        if (validatedData.order_id) {
            const purchaseCheck = await client.query(`
        SELECT oi.order_item_id 
        FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.order_id
        WHERE oi.order_id = $1 AND oi.product_id = $2 AND o.user_id = $3
      `, [validatedData.order_id, validatedData.product_id, req.user.user_id]);
            isVerifiedPurchase = purchaseCheck.rows.length > 0;
        }
        const reviewId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query(`
      INSERT INTO reviews (review_id, product_id, user_id, order_id, rating, title, 
                          review_text, longevity_rating, sillage_rating, occasion_tags, 
                          season_tags, is_verified_purchase, helpful_votes, total_votes,
                          is_featured, moderation_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
            reviewId, validatedData.product_id, req.user.user_id, validatedData.order_id,
            validatedData.rating, validatedData.title, validatedData.review_text,
            validatedData.longevity_rating, validatedData.sillage_rating,
            validatedData.occasion_tags, validatedData.season_tags, isVerifiedPurchase,
            0, 0, false, 'pending', now, now
        ]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create review error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get review by ID - retrieves detailed review information
*/
app.get('/api/reviews/:review_id', async (req, res) => {
    try {
        const { review_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT r.*, u.first_name, u.last_name,
             (SELECT json_agg(json_build_object(
               'photo_url', rp.photo_url,
               'alt_text', rp.alt_text
             )) FROM review_photos rp WHERE rp.review_id = r.review_id) as photos
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      WHERE r.review_id = $1 AND r.moderation_status = 'approved'
    `, [review_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get review error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update review - allows users to modify their own reviews
*/
app.put('/api/reviews/:review_id', authenticateToken, async (req, res) => {
    try {
        const { review_id } = req.params;
        const validatedData = createReviewInputSchema.parse(req.body);
        const client = await pool.connect();
        // Verify ownership
        const ownershipCheck = await client.query('SELECT review_id FROM reviews WHERE review_id = $1 AND user_id = $2', [review_id, req.user.user_id]);
        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Review not found or access denied', null, 'REVIEW_NOT_FOUND'));
        }
        const result = await client.query(`
      UPDATE reviews SET rating = $1, title = $2, review_text = $3, 
                        longevity_rating = $4, sillage_rating = $5, 
                        occasion_tags = $6, season_tags = $7, 
                        moderation_status = 'pending', updated_at = $8
      WHERE review_id = $9 RETURNING *
    `, [
            validatedData.rating, validatedData.title, validatedData.review_text,
            validatedData.longevity_rating, validatedData.sillage_rating,
            validatedData.occasion_tags, validatedData.season_tags,
            new Date().toISOString(), review_id
        ]);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update review error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Delete review - allows users to delete their own reviews
*/
app.delete('/api/reviews/:review_id', authenticateToken, async (req, res) => {
    try {
        const { review_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('DELETE FROM reviews WHERE review_id = $1 AND user_id = $2 RETURNING review_id', [review_id, req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Review not found or access denied', null, 'REVIEW_NOT_FOUND'));
        }
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Mark review helpful - allows users to vote on review helpfulness
*/
app.post('/api/reviews/:review_id/helpful', optionalAuth, async (req, res) => {
    try {
        const { review_id } = req.params;
        const { helpful } = req.body;
        const client = await pool.connect();
        // Update helpfulness votes
        if (helpful === true) {
            await client.query('UPDATE reviews SET helpful_votes = helpful_votes + 1, total_votes = total_votes + 1 WHERE review_id = $1', [review_id]);
        }
        else {
            await client.query('UPDATE reviews SET total_votes = total_votes + 1 WHERE review_id = $1', [review_id]);
        }
        client.release();
        res.json({ message: 'Review helpfulness recorded successfully' });
    }
    catch (error) {
        console.error('Mark review helpful error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// WISHLIST ROUTES
// ============================================================================
/*
Get user wishlists - retrieves all wishlists for authenticated user
*/
app.get('/api/wishlists', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
      SELECT w.*,
             (SELECT COUNT(*) FROM wishlist_items WHERE wishlist_id = w.wishlist_id) as item_count
      FROM wishlists w
      WHERE w.user_id = $1
      ORDER BY w.is_default DESC, w.created_at DESC
    `, [req.user.user_id]);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get wishlists error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create wishlist - creates new named wishlists with privacy controls and sharing capabilities
*/
app.post('/api/wishlists', authenticateToken, async (req, res) => {
    try {
        const { wishlist_name = 'My Wishlist', is_public = false } = req.body;
        const client = await pool.connect();
        // If this is the first wishlist, make it default
        const existingCount = await client.query('SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1', [req.user.user_id]);
        const isDefault = existingCount.rows[0].count === '0';
        const wishlistId = uuidv4();
        const shareToken = is_public ? uuidv4() : null;
        const now = new Date().toISOString();
        const result = await client.query(`
      INSERT INTO wishlists (wishlist_id, user_id, wishlist_name, is_public, is_default, share_token, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [wishlistId, req.user.user_id, wishlist_name, is_public, isDefault, shareToken, now]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create wishlist error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get wishlist by ID - retrieves wishlist details with items
*/
app.get('/api/wishlists/:wishlist_id', optionalAuth, async (req, res) => {
    try {
        const { wishlist_id } = req.params;
        const client = await pool.connect();
        // Get wishlist info
        const wishlistResult = await client.query(`
      SELECT w.*
      FROM wishlists w
      WHERE w.wishlist_id = $1 AND (w.is_public = true OR w.user_id = $2)
    `, [wishlist_id, req.user?.user_id]);
        if (wishlistResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Wishlist not found or access denied', null, 'WISHLIST_NOT_FOUND'));
        }
        const wishlist = wishlistResult.rows[0];
        // Get wishlist items
        const itemsResult = await client.query(`
      SELECT wi.*, p.product_name, p.base_price, p.sale_price, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as product_image
      FROM wishlist_items wi
      LEFT JOIN products p ON wi.product_id = p.product_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE wi.wishlist_id = $1
      ORDER BY wi.added_at DESC
    `, [wishlist_id]);
        client.release();
        res.json({
            ...wishlist,
            items: itemsResult.rows
        });
    }
    catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update wishlist - modifies wishlist name and privacy settings
*/
app.put('/api/wishlists/:wishlist_id', authenticateToken, async (req, res) => {
    try {
        const { wishlist_id } = req.params;
        const { wishlist_name, is_public } = req.body;
        const client = await pool.connect();
        // Verify ownership
        const ownershipCheck = await client.query('SELECT wishlist_id FROM wishlists WHERE wishlist_id = $1 AND user_id = $2', [wishlist_id, req.user.user_id]);
        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Wishlist not found or access denied', null, 'WISHLIST_NOT_FOUND'));
        }
        const shareToken = is_public ? uuidv4() : null;
        const result = await client.query('UPDATE wishlists SET wishlist_name = $1, is_public = $2, share_token = $3 WHERE wishlist_id = $4 RETURNING *', [wishlist_name, is_public, shareToken, wishlist_id]);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update wishlist error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Delete wishlist - removes wishlist with ownership verification
*/
app.delete('/api/wishlists/:wishlist_id', authenticateToken, async (req, res) => {
    try {
        const { wishlist_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('DELETE FROM wishlists WHERE wishlist_id = $1 AND user_id = $2 RETURNING wishlist_id', [wishlist_id, req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Wishlist not found or access denied', null, 'WISHLIST_NOT_FOUND'));
        }
        res.json({ message: 'Wishlist deleted successfully' });
    }
    catch (error) {
        console.error('Delete wishlist error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Add wishlist item - adds products to wishlists with optional size preferences and personal notes
*/
app.post('/api/wishlists/:wishlist_id/items', authenticateToken, async (req, res) => {
    try {
        const { wishlist_id } = req.params;
        const validatedData = createWishlistItemInputSchema.parse(req.body);
        const client = await pool.connect();
        // Verify wishlist ownership
        const ownershipCheck = await client.query('SELECT wishlist_id FROM wishlists WHERE wishlist_id = $1 AND user_id = $2', [wishlist_id, req.user.user_id]);
        if (ownershipCheck.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Wishlist not found or access denied', null, 'WISHLIST_NOT_FOUND'));
        }
        // Check if item already exists
        const existingItem = await client.query('SELECT wishlist_item_id FROM wishlist_items WHERE wishlist_id = $1 AND product_id = $2', [wishlist_id, validatedData.product_id]);
        if (existingItem.rows.length > 0) {
            client.release();
            return res.status(400).json(createErrorResponse('Product already in wishlist', null, 'ITEM_ALREADY_EXISTS'));
        }
        const wishlistItemId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query(`
      INSERT INTO wishlist_items (wishlist_item_id, wishlist_id, product_id, size_ml, notes, added_at)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [wishlistItemId, wishlist_id, validatedData.product_id, validatedData.size_ml, validatedData.notes || null, now]);
        // Get product details for notification
        const productResult = await client.query('SELECT product_name FROM products WHERE product_id = $1', [validatedData.product_id]);
        client.release();
        // Notify all host users about wishlist activity
        const hostUsersResult = await pool.query('SELECT user_id FROM users WHERE user_role = $1', ['host']);
        for (const hostUser of hostUsersResult.rows) {
            await createAndBroadcastNotification(hostUser.user_id, 'wishlist_activity', 'New Wishlist Activity', `${req.user.first_name} ${req.user.last_name} added "${productResult.rows[0].product_name}" to their wishlist`, 'wishlist_item', wishlistItemId, {
                guest_user_id: req.user.user_id,
                guest_name: `${req.user.first_name} ${req.user.last_name}`,
                product_id: validatedData.product_id,
                product_name: productResult.rows[0].product_name
            });
        }
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Add wishlist item error:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json(createErrorResponse('Invalid input data', error, 'VALIDATION_ERROR'));
        }
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Remove wishlist item - removes specific product from wishlist
*/
app.delete('/api/wishlists/:wishlist_id/items/:wishlist_item_id', authenticateToken, async (req, res) => {
    try {
        const { wishlist_id, wishlist_item_id } = req.params;
        const client = await pool.connect();
        // Verify ownership through wishlist
        const result = await client.query(`
      DELETE FROM wishlist_items 
      WHERE wishlist_item_id = $1 
        AND wishlist_id = $2 
        AND wishlist_id IN (SELECT wishlist_id FROM wishlists WHERE user_id = $3)
      RETURNING wishlist_item_id
    `, [wishlist_item_id, wishlist_id, req.user.user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Wishlist item not found or access denied', null, 'WISHLIST_ITEM_NOT_FOUND'));
        }
        res.json({ message: 'Item removed from wishlist successfully' });
    }
    catch (error) {
        console.error('Remove wishlist item error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get shared wishlist - retrieves public wishlist by share token
*/
app.get('/api/wishlists/shared/:share_token', async (req, res) => {
    try {
        const { share_token } = req.params;
        const client = await pool.connect();
        // Get wishlist by share token
        const wishlistResult = await client.query(`
      SELECT w.*
      FROM wishlists w
      WHERE w.share_token = $1 AND w.is_public = true
    `, [share_token]);
        if (wishlistResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Shared wishlist not found', null, 'WISHLIST_NOT_FOUND'));
        }
        const wishlist = wishlistResult.rows[0];
        // Get wishlist items
        const itemsResult = await client.query(`
      SELECT wi.*, p.product_name, p.base_price, p.sale_price, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as product_image
      FROM wishlist_items wi
      LEFT JOIN products p ON wi.product_id = p.product_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE wi.wishlist_id = $1
      ORDER BY wi.added_at DESC
    `, [wishlist.wishlist_id]);
        client.release();
        res.json({
            ...wishlist,
            items: itemsResult.rows
        });
    }
    catch (error) {
        console.error('Get shared wishlist error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// NOTIFICATIONS ROUTES
// ============================================================================
/*
Get user notifications - retrieves all notifications for authenticated user
*/
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user?.user_id;
        const { is_read, limit = 50, offset = 0 } = req.query;
        const client = await pool.connect();
        let query = `SELECT * FROM notifications WHERE user_id = $1`;
        const params = [user_id];
        let paramIndex = 2;
        if (is_read !== undefined) {
            query += ` AND is_read = $${paramIndex}`;
            params.push(is_read === 'true');
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Number(limit), Number(offset));
        const result = await client.query(query, params);
        // Get unread count
        const countResult = await client.query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false', [user_id]);
        client.release();
        res.json({
            notifications: result.rows,
            unread_count: parseInt(countResult.rows[0].unread_count),
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get unread notification count
*/
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user?.user_id;
        const client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = false', [user_id]);
        client.release();
        res.json({
            unread_count: parseInt(result.rows[0].unread_count)
        });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Mark notification as read
*/
app.put('/api/notifications/:notification_id/read', authenticateToken, async (req, res) => {
    try {
        const { notification_id } = req.params;
        const user_id = req.user?.user_id;
        const read_at = new Date().toISOString();
        const client = await pool.connect();
        // Verify notification belongs to user
        const checkResult = await client.query('SELECT * FROM notifications WHERE notification_id = $1 AND user_id = $2', [notification_id, user_id]);
        if (checkResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Notification not found', null, 'NOTIFICATION_NOT_FOUND'));
        }
        const result = await client.query('UPDATE notifications SET is_read = true, read_at = $1 WHERE notification_id = $2 AND user_id = $3 RETURNING *', [read_at, notification_id, user_id]);
        client.release();
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Mark all notifications as read
*/
app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user?.user_id;
        const read_at = new Date().toISOString();
        const client = await pool.connect();
        const result = await client.query('UPDATE notifications SET is_read = true, read_at = $1 WHERE user_id = $2 AND is_read = false RETURNING *', [read_at, user_id]);
        client.release();
        res.json({
            message: 'All notifications marked as read',
            updated_count: result.rows.length
        });
    }
    catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Delete notification
*/
app.delete('/api/notifications/:notification_id', authenticateToken, async (req, res) => {
    try {
        const { notification_id } = req.params;
        const user_id = req.user?.user_id;
        const client = await pool.connect();
        const result = await client.query('DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING *', [notification_id, user_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Notification not found', null, 'NOTIFICATION_NOT_FOUND'));
        }
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// FRAGRANCE QUIZ ROUTES
// ============================================================================
/*
Get quiz questions - retrieves fragrance discovery quiz questions with structured options
@@need:external-api: Fragrance personality analysis service to determine optimal quiz questions and response mappings
*/
app.get('/api/fragrance-quiz/questions', async (req, res) => {
    try {
        // Mock quiz questions structure
        const questions = [
            {
                question_id: 'personality',
                question_text: 'Which best describes your personality?',
                question_type: 'single_choice',
                options: [
                    { option_id: 'adventurous', option_text: 'Adventurous and bold', image_url: null },
                    { option_id: 'elegant', option_text: 'Elegant and sophisticated', image_url: null },
                    { option_id: 'fresh', option_text: 'Fresh and energetic', image_url: null },
                    { option_id: 'romantic', option_text: 'Romantic and feminine', image_url: null }
                ],
                step: 1
            },
            {
                question_id: 'occasion',
                question_text: 'When do you typically wear fragrance?',
                question_type: 'multiple_choice',
                options: [
                    { option_id: 'daily', option_text: 'Daily wear', image_url: null },
                    { option_id: 'work', option_text: 'Work/Professional', image_url: null },
                    { option_id: 'evening', option_text: 'Evening events', image_url: null },
                    { option_id: 'special', option_text: 'Special occasions', image_url: null }
                ],
                step: 2
            },
            {
                question_id: 'intensity',
                question_text: 'How strong do you prefer your fragrance?',
                question_type: 'scale',
                options: [
                    { option_id: '1', option_text: 'Very light', image_url: null },
                    { option_id: '2', option_text: 'Light', image_url: null },
                    { option_id: '3', option_text: 'Moderate', image_url: null },
                    { option_id: '4', option_text: 'Strong', image_url: null },
                    { option_id: '5', option_text: 'Very strong', image_url: null }
                ],
                step: 3
            },
            {
                question_id: 'scent_preference',
                question_text: 'Which scent family appeals to you most?',
                question_type: 'image_selection',
                options: [
                    { option_id: 'floral', option_text: 'Floral', image_url: 'https://picsum.photos/200/200?random=101' },
                    { option_id: 'woody', option_text: 'Woody', image_url: 'https://picsum.photos/200/200?random=102' },
                    { option_id: 'fresh', option_text: 'Fresh/Citrus', image_url: 'https://picsum.photos/200/200?random=103' },
                    { option_id: 'oriental', option_text: 'Oriental/Spicy', image_url: 'https://picsum.photos/200/200?random=104' }
                ],
                step: 4
            }
        ];
        res.json(questions);
    }
    catch (error) {
        console.error('Get quiz questions error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Submit quiz results - processes fragrance personality quiz responses to generate personalized
fragrance family recommendations and specific product suggestions for discovery
@@need:external-api: Fragrance recommendation AI/ML service for personality analysis and product matching algorithms
*/
app.post('/api/fragrance-quiz/submit', optionalAuth, async (req, res) => {
    try {
        const { personality_type, quiz_answers, recommended_families, intensity_preference, occasion_preferences, season_preferences } = req.body;
        const client = await pool.connect();
        // Generate recommendations based on quiz answers (mock algorithm)
        let productQuery = `
      SELECT p.*, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.availability_status = 'in_stock'
    `;
        const queryParams = [];
        let paramCount = 1;
        // Filter by recommended families
        if (recommended_families) {
            const families = JSON.parse(recommended_families);
            if (families.length > 0) {
                const familyConditions = families.map(family => `p.fragrance_families ILIKE $${paramCount++}`);
                queryParams.push(...families.map(family => `%${family}%`));
                productQuery += ` AND (${familyConditions.join(' OR ')})`;
            }
        }
        // Filter by intensity if specified
        if (intensity_preference) {
            productQuery += ` AND p.intensity_level = $${paramCount++}`;
            queryParams.push(intensity_preference);
        }
        productQuery += ' ORDER BY p.is_featured DESC, RANDOM() LIMIT 10';
        const [quizResult, productsResult] = await Promise.all([
            // Save quiz result
            client.query(`
        INSERT INTO quiz_results (quiz_result_id, user_id, session_id, personality_type, 
                                quiz_answers, recommended_families, intensity_preference, 
                                occasion_preferences, season_preferences, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `, [
                uuidv4(), req.user?.user_id, req.sessionId, personality_type,
                quiz_answers, recommended_families, intensity_preference,
                occasion_preferences, season_preferences, new Date().toISOString()
            ]),
            // Get recommended products
            client.query(productQuery, queryParams)
        ]);
        client.release();
        res.status(201).json({
            ...quizResult.rows[0],
            recommended_products: productsResult.rows
        });
    }
    catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get quiz results by ID - retrieves saved quiz results with recommendations
*/
app.get('/api/fragrance-quiz/results/:quiz_result_id', async (req, res) => {
    try {
        const { quiz_result_id } = req.params;
        const client = await pool.connect();
        const quizResult = await client.query('SELECT * FROM quiz_results WHERE quiz_result_id = $1', [quiz_result_id]);
        if (quizResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Quiz results not found', null, 'QUIZ_RESULTS_NOT_FOUND'));
        }
        const quiz = quizResult.rows[0];
        // Get recommended products based on saved preferences
        const productsResult = await client.query(`
      SELECT p.*, b.brand_name,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.availability_status = 'in_stock'
        AND p.fragrance_families ILIKE ANY($1)
      ORDER BY p.is_featured DESC, RANDOM()
      LIMIT 10
    `, [JSON.parse(quiz.recommended_families).map(family => `%${family}%`)]);
        client.release();
        res.json({
            ...quiz,
            recommended_products: productsResult.rows
        });
    }
    catch (error) {
        console.error('Get quiz results error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// SAMPLE ROUTES
// ============================================================================
/*
Get sample programs - retrieves available sample programs and sets with filtering options
*/
app.get('/api/samples', async (req, res) => {
    try {
        const { set_type, fragrance_family, brand_id } = req.query;
        // Mock sample sets data
        const sampleSets = [
            {
                set_id: 'discovery_floral',
                set_name: 'Floral Discovery Set',
                description: 'Explore the world of floral fragrances',
                price: 25.00,
                sample_count: 5,
                products: []
            },
            {
                set_id: 'niche_collection',
                set_name: 'Niche Brands Collection',
                description: 'Curated selection of niche fragrances',
                price: 45.00,
                sample_count: 8,
                products: []
            },
            {
                set_id: 'seasonal_summer',
                set_name: 'Summer Essentials',
                description: 'Fresh fragrances perfect for summer',
                price: 20.00,
                sample_count: 4,
                products: []
            }
        ];
        // Filter by type if specified
        let filteredSets = sampleSets;
        if (set_type) {
            filteredSets = sampleSets.filter(set => set.set_id.includes(set_type));
        }
        res.json(filteredSets);
    }
    catch (error) {
        console.error('Get sample programs error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get individual samples - retrieves individual sample options with availability
*/
app.get('/api/samples/individual', async (req, res) => {
    try {
        const { product_id, brand_id, page = 1, per_page = 20 } = req.query;
        const client = await pool.connect();
        let whereConditions = ['ps.is_sample_available = true', 'p.availability_status = \'in_stock\''];
        let queryParams = [];
        let paramCount = 1;
        if (product_id) {
            whereConditions.push(`p.product_id = $${paramCount++}`);
            queryParams.push(product_id);
        }
        if (brand_id) {
            whereConditions.push(`p.brand_id = $${paramCount++}`);
            queryParams.push(brand_id);
        }
        const limit = Math.min(parseInt(per_page), 100);
        const offset = (parseInt(page) - 1) * limit;
        const whereClause = whereConditions.join(' AND ');
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT p.*, b.brand_name, ps.sample_price, ps.is_sample_available,
               (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        LEFT JOIN product_sizes ps ON p.product_id = ps.product_id
        WHERE ${whereClause}
        GROUP BY p.product_id, b.brand_name, ps.sample_price, ps.is_sample_available
        ORDER BY p.product_name ASC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]),
            client.query(`
        SELECT COUNT(DISTINCT p.product_id) as total
        FROM products p
        LEFT JOIN product_sizes ps ON p.product_id = ps.product_id
        WHERE ${whereClause}
      `, queryParams)
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        const formattedResults = results.rows.map(row => ({
            product: {
                product_id: row.product_id,
                product_name: row.product_name,
                brand_name: row.brand_name,
                primary_image: row.primary_image,
                base_price: row.base_price
            },
            sample_size_ml: 2,
            sample_price: row.sample_price,
            is_available: row.is_sample_available
        }));
        res.json({
            data: formattedResults,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get individual samples error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get sample orders - retrieves user's sample order history
*/
app.get('/api/sample-orders', authenticateToken, async (req, res) => {
    try {
        const { order_status, page = 1, per_page = 10 } = req.query;
        const client = await pool.connect();
        let whereConditions = ['user_id = $1'];
        let queryParams = [req.user.user_id];
        let paramCount = 2;
        if (order_status) {
            whereConditions.push(`order_status = $${paramCount++}`);
            queryParams.push(order_status);
        }
        const limit = Math.min(parseInt(per_page), 50);
        const offset = (parseInt(page) - 1) * limit;
        const whereClause = whereConditions.join(' AND ');
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT so.*,
               (SELECT json_agg(json_build_object(
                 'sample_item_id', soi.sample_item_id,
                 'product_id', soi.product_id,
                 'sample_size_ml', soi.sample_size_ml,
                 'price', soi.price,
                 'quantity', soi.quantity
               )) FROM sample_order_items soi WHERE soi.sample_order_id = so.sample_order_id) as items
        FROM sample_orders so
        WHERE ${whereClause}
        ORDER BY so.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM sample_orders
        WHERE ${whereClause}
      `, queryParams)
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get sample orders error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create sample order - creates new sample orders for fragrance discovery with separate fulfillment workflow
*/
app.post('/api/sample-orders', optionalAuth, async (req, res) => {
    try {
        const { items, customer_email, shipping_address_id } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json(createErrorResponse('Order items are required', null, 'ITEMS_REQUIRED'));
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const sampleOrderId = uuidv4();
            const sampleOrderNumber = `SAMP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            const now = new Date().toISOString();
            let totalAmount = 0;
            const shippingCost = 4.99; // Fixed sample shipping cost
            // Calculate total and create sample order items
            for (const item of items) {
                const itemTotal = item.quantity * (item.price || 5.00); // Default sample price
                totalAmount += itemTotal;
                const sampleItemId = uuidv4();
                await client.query(`
          INSERT INTO sample_order_items (sample_item_id, sample_order_id, product_id, sample_size_ml, price, quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [sampleItemId, sampleOrderId, item.product_id, item.sample_size_ml || 2, item.price || 5.00, item.quantity || 1]);
            }
            // Create sample order
            const result = await client.query(`
        INSERT INTO sample_orders (sample_order_id, user_id, sample_order_number, order_status, 
                                 total_amount, shipping_cost, customer_email, shipping_address_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `, [sampleOrderId, req.user?.user_id, sampleOrderNumber, 'pending', totalAmount, shippingCost, customer_email, shipping_address_id, now]);
            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Create sample order error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get sample order by ID - retrieves detailed sample order information
*/
app.get('/api/sample-orders/:sample_order_id', optionalAuth, async (req, res) => {
    try {
        const { sample_order_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT so.*,
             (SELECT json_agg(json_build_object(
               'sample_item_id', soi.sample_item_id,
               'product_id', soi.product_id,
               'sample_size_ml', soi.sample_size_ml,
               'price', soi.price,
               'quantity', soi.quantity,
               'product_name', p.product_name,
               'brand_name', b.brand_name
             )) FROM sample_order_items soi 
             LEFT JOIN products p ON soi.product_id = p.product_id
             LEFT JOIN brands b ON p.brand_id = b.brand_id
             WHERE soi.sample_order_id = so.sample_order_id) as items
      FROM sample_orders so
      WHERE so.sample_order_id = $1
    `, [sample_order_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Sample order not found', null, 'SAMPLE_ORDER_NOT_FOUND'));
        }
        const sampleOrder = result.rows[0];
        // Verify access
        if (req.user && sampleOrder.user_id !== req.user.user_id) {
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        res.json(sampleOrder);
    }
    catch (error) {
        console.error('Get sample order error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// GIFT ROUTES
// ============================================================================
/*
Get gift guides - retrieves gift guides and recommendations with filtering options
*/
app.get('/api/gifts/guides', async (req, res) => {
    try {
        const { recipient, occasion, price_range, relationship } = req.query;
        const client = await pool.connect();
        // Mock gift guides based on filters
        let guides = [
            {
                guide_id: 'for_her_romantic',
                title: 'Romantic Gifts for Her',
                description: 'Elegant and feminine fragrances perfect for special occasions',
                products: []
            },
            {
                guide_id: 'for_him_classic',
                title: 'Classic Choices for Him',
                description: 'Timeless masculine fragrances that never go out of style',
                products: []
            },
            {
                guide_id: 'luxury_collection',
                title: 'Luxury Collection',
                description: 'Premium fragrances for the discerning recipient',
                products: []
            }
        ];
        // Get products for each guide
        for (let guide of guides) {
            let productQuery = `
        SELECT p.*, b.brand_name,
               (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE p.availability_status = 'in_stock'
      `;
            if (guide.guide_id.includes('her')) {
                productQuery += " AND p.gender_category IN ('Women', 'Unisex')";
            }
            else if (guide.guide_id.includes('him')) {
                productQuery += " AND p.gender_category IN ('Men', 'Unisex')";
            }
            if (price_range) {
                if (price_range === 'under_50') {
                    productQuery += ' AND p.base_price < 50';
                }
                else if (price_range === '50_100') {
                    productQuery += ' AND p.base_price BETWEEN 50 AND 100';
                }
                else if (price_range === '100_200') {
                    productQuery += ' AND p.base_price BETWEEN 100 AND 200';
                }
                else if (price_range === 'luxury') {
                    productQuery += ' AND p.base_price > 200';
                }
            }
            productQuery += ' ORDER BY p.is_featured DESC, RANDOM() LIMIT 6';
            const productResult = await client.query(productQuery);
            guide.products = productResult.rows;
        }
        client.release();
        // Filter guides based on criteria
        if (recipient) {
            guides = guides.filter(guide => (recipient === 'her' && guide.guide_id.includes('her')) ||
                (recipient === 'him' && guide.guide_id.includes('him')) ||
                (recipient === 'anyone' && guide.guide_id.includes('collection')));
        }
        res.json(guides);
    }
    catch (error) {
        console.error('Get gift guides error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get gift sets - retrieves available gift sets with filtering options
*/
app.get('/api/gifts/sets', async (req, res) => {
    try {
        const { occasion, price_min, price_max, brand_id } = req.query;
        // Mock gift sets data
        const giftSets = [
            {
                gift_set_id: 'luxury_duo',
                set_name: 'Luxury Fragrance Duo',
                description: 'Two complementary fragrances in elegant packaging',
                price: 180.00,
                savings_amount: 25.00,
                products: []
            },
            {
                gift_set_id: 'discovery_collection',
                set_name: 'Discovery Collection',
                description: 'A curated selection of mini fragrances',
                price: 95.00,
                savings_amount: 15.00,
                products: []
            },
            {
                gift_set_id: 'seasonal_special',
                set_name: 'Seasonal Special',
                description: 'Perfect fragrances for the current season',
                price: 135.00,
                savings_amount: 20.00,
                products: []
            }
        ];
        // Apply filters
        let filteredSets = giftSets;
        if (price_min || price_max) {
            filteredSets = filteredSets.filter(set => {
                if (price_min && set.price < parseFloat(price_min))
                    return false;
                if (price_max && set.price > parseFloat(price_max))
                    return false;
                return true;
            });
        }
        res.json(filteredSets);
    }
    catch (error) {
        console.error('Get gift sets error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get user gift cards - retrieves gift cards owned by authenticated user
*/
app.get('/api/gift-cards', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
      SELECT gift_card_id, gift_card_code, initial_amount, current_balance, currency,
             recipient_email, recipient_name, expiry_date, is_active, created_at
      FROM gift_cards 
      WHERE purchaser_email = $1 
      ORDER BY created_at DESC
    `, [req.user.email]);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get gift cards error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create gift card - creates digital gift cards with customizable amounts and delivery scheduling
@@need:external-api: Email service for gift card delivery to recipients
*/
app.post('/api/gift-cards', optionalAuth, async (req, res) => {
    try {
        const { initial_amount, purchaser_email, recipient_email, recipient_name, gift_message, delivery_date } = req.body;
        if (!initial_amount || !purchaser_email) {
            return res.status(400).json(createErrorResponse('Initial amount and purchaser email are required', null, 'REQUIRED_FIELDS_MISSING'));
        }
        if (initial_amount < 10 || initial_amount > 1000) {
            return res.status(400).json(createErrorResponse('Gift card amount must be between $10 and $1000', null, 'INVALID_AMOUNT'));
        }
        const client = await pool.connect();
        const giftCardId = uuidv4();
        const giftCardCode = generateGiftCardCode();
        const now = new Date().toISOString();
        const expiryDate = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString(); // 1 year from now
        const result = await client.query(`
      INSERT INTO gift_cards (gift_card_id, gift_card_code, initial_amount, current_balance, 
                            currency, purchaser_email, recipient_email, recipient_name, 
                            gift_message, delivery_date, expiry_date, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    `, [
            giftCardId, giftCardCode, initial_amount, initial_amount, 'USD',
            purchaser_email, recipient_email, recipient_name, gift_message,
            delivery_date, expiryDate, true, now
        ]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create gift card error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Check gift card balance - retrieves current balance and validity status
*/
app.get('/api/gift-cards/:gift_card_code/balance', async (req, res) => {
    try {
        const { gift_card_code } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT current_balance, currency, is_active, expiry_date
      FROM gift_cards 
      WHERE gift_card_code = $1
    `, [gift_card_code]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Gift card not found', null, 'GIFT_CARD_NOT_FOUND'));
        }
        const giftCard = result.rows[0];
        // Check if expired
        const isExpired = giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date();
        res.json({
            current_balance: giftCard.current_balance,
            currency: giftCard.currency,
            is_active: giftCard.is_active && !isExpired,
            expiry_date: giftCard.expiry_date
        });
    }
    catch (error) {
        console.error('Get gift card balance error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Redeem gift card - applies gift card balance to order payment
*/
app.post('/api/gift-cards/:gift_card_code/redeem', async (req, res) => {
    try {
        const { gift_card_code } = req.params;
        const { order_id, amount } = req.body;
        if (!order_id || !amount) {
            return res.status(400).json(createErrorResponse('Order ID and amount are required', null, 'REQUIRED_FIELDS_MISSING'));
        }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Get gift card
            const giftCardResult = await client.query(`
        SELECT gift_card_id, current_balance, is_active, expiry_date
        FROM gift_cards 
        WHERE gift_card_code = $1 FOR UPDATE
      `, [gift_card_code]);
            if (giftCardResult.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(404).json(createErrorResponse('Gift card not found', null, 'GIFT_CARD_NOT_FOUND'));
            }
            const giftCard = giftCardResult.rows[0];
            // Validate gift card
            if (!giftCard.is_active) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json(createErrorResponse('Gift card is not active', null, 'GIFT_CARD_INACTIVE'));
            }
            const isExpired = giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date();
            if (isExpired) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json(createErrorResponse('Gift card has expired', null, 'GIFT_CARD_EXPIRED'));
            }
            if (giftCard.current_balance < amount) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json(createErrorResponse('Insufficient gift card balance', null, 'INSUFFICIENT_BALANCE'));
            }
            // Update gift card balance
            const newBalance = giftCard.current_balance - amount;
            await client.query(`
        UPDATE gift_cards 
        SET current_balance = $1 
        WHERE gift_card_id = $2
      `, [newBalance, giftCard.gift_card_id]);
            // Record transaction
            const transactionId = uuidv4();
            await client.query(`
        INSERT INTO gift_card_transactions (transaction_id, gift_card_id, order_id, 
                                          transaction_type, amount, balance_after, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [transactionId, giftCard.gift_card_id, order_id, 'redemption', -amount, newBalance, new Date().toISOString()]);
            await client.query('COMMIT');
            res.json({
                redeemed_amount: amount,
                remaining_balance: newBalance
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Redeem gift card error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// PROMOTION ROUTES
// ============================================================================
/*
Validate promotion code - checks promotion code validity and calculates applicable discounts
*/
app.post('/api/promotions/validate', async (req, res) => {
    try {
        const { promotion_code, order_total = 0, products = [] } = req.body;
        if (!promotion_code) {
            return res.status(400).json(createErrorResponse('Promotion code is required', null, 'PROMOTION_CODE_REQUIRED'));
        }
        const client = await pool.connect();
        const result = await client.query(`
      SELECT * FROM promotions 
      WHERE promotion_code = $1 AND is_active = true
    `, [promotion_code.toUpperCase()]);
        if (result.rows.length === 0) {
            client.release();
            return res.json({
                is_valid: false,
                discount_amount: 0,
                discount_type: null,
                promotion: null,
                error_message: 'Invalid promotion code'
            });
        }
        const promotion = result.rows[0];
        const now = new Date();
        const startDate = new Date(promotion.start_date);
        const endDate = new Date(promotion.end_date);
        // Check date validity
        if (now < startDate || now > endDate) {
            client.release();
            return res.json({
                is_valid: false,
                discount_amount: 0,
                discount_type: null,
                promotion: promotion,
                error_message: 'Promotion code has expired or is not yet active'
            });
        }
        // Check usage limit
        if (promotion.usage_limit && promotion.current_usage >= promotion.usage_limit) {
            client.release();
            return res.json({
                is_valid: false,
                discount_amount: 0,
                discount_type: null,
                promotion: promotion,
                error_message: 'Promotion code usage limit reached'
            });
        }
        // Check minimum order amount
        if (promotion.minimum_order_amount && order_total < promotion.minimum_order_amount) {
            client.release();
            return res.json({
                is_valid: false,
                discount_amount: 0,
                discount_type: null,
                promotion: promotion,
                error_message: `Minimum order amount of $${promotion.minimum_order_amount} required`
            });
        }
        // Calculate discount
        let discountAmount = 0;
        if (promotion.discount_type === 'percentage') {
            discountAmount = (order_total * promotion.discount_value) / 100;
            if (promotion.maximum_discount) {
                discountAmount = Math.min(discountAmount, promotion.maximum_discount);
            }
        }
        else if (promotion.discount_type === 'fixed_amount') {
            discountAmount = promotion.discount_value;
        }
        else if (promotion.discount_type === 'free_shipping') {
            discountAmount = 0; // Shipping discount handled separately
        }
        client.release();
        res.json({
            is_valid: true,
            discount_amount: discountAmount,
            discount_type: promotion.discount_type,
            promotion: promotion,
            error_message: null
        });
    }
    catch (error) {
        console.error('Validate promotion error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get active promotions - retrieves currently active promotional offers
*/
app.get('/api/promotions/active', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`
      SELECT promotion_id, promotion_code, promotion_name, description, 
             discount_type, discount_value, minimum_order_amount, start_date, end_date
      FROM promotions 
      WHERE is_active = true 
        AND start_date <= NOW() 
        AND end_date >= NOW()
        AND (usage_limit IS NULL OR current_usage < usage_limit)
      ORDER BY created_at DESC
    `);
        client.release();
        res.json(result.rows);
    }
    catch (error) {
        console.error('Get active promotions error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// CUSTOMER SERVICE ROUTES
// ============================================================================
/*
Get user tickets - retrieves support tickets for authenticated user
*/
app.get('/api/support/tickets', authenticateToken, async (req, res) => {
    try {
        const { status, category, page = 1, per_page = 10 } = req.query;
        const client = await pool.connect();
        let whereConditions = ['user_id = $1'];
        let queryParams = [req.user.user_id];
        let paramCount = 2;
        if (status) {
            whereConditions.push(`status = $${paramCount++}`);
            queryParams.push(status);
        }
        if (category) {
            whereConditions.push(`category = $${paramCount++}`);
            queryParams.push(category);
        }
        const limit = Math.min(parseInt(per_page), 50);
        const offset = (parseInt(page) - 1) * limit;
        const whereClause = whereConditions.join(' AND ');
        const [results, countResult] = await Promise.all([
            client.query(`
        SELECT * FROM customer_service_tickets
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...queryParams, limit, offset]),
            client.query(`
        SELECT COUNT(*) as total
        FROM customer_service_tickets
        WHERE ${whereClause}
      `, queryParams)
        ]);
        client.release();
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / limit);
        res.json({
            data: results.rows,
            pagination: {
                total,
                page: parseInt(page),
                per_page: limit,
                total_pages: totalPages,
                has_next: parseInt(page) < totalPages,
                has_prev: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get support tickets error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Create support ticket - creates customer service tickets with categorization and priority assignment
@@need:external-api: Email notification service for ticket confirmation and CRM system integration
*/
app.post('/api/support/tickets', optionalAuth, async (req, res) => {
    try {
        const { customer_email, customer_name, subject, message, category, priority = 'medium', order_id } = req.body;
        if (!customer_email || !customer_name || !subject || !message || !category) {
            return res.status(400).json(createErrorResponse('All required fields must be provided', null, 'REQUIRED_FIELDS_MISSING'));
        }
        const client = await pool.connect();
        const ticketId = uuidv4();
        const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const now = new Date().toISOString();
        const result = await client.query(`
      INSERT INTO customer_service_tickets (ticket_id, user_id, ticket_number, customer_email, 
                                          customer_name, subject, message, category, priority, 
                                          status, order_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *
    `, [
            ticketId, req.user?.user_id, ticketNumber, customer_email, customer_name,
            subject, message, category, priority, 'open', order_id, now, now
        ]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Create support ticket error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get support ticket by ID - retrieves detailed ticket information
*/
app.get('/api/support/tickets/:ticket_id', optionalAuth, async (req, res) => {
    try {
        const { ticket_id } = req.params;
        const client = await pool.connect();
        const result = await client.query(`
      SELECT cst.*,
             (SELECT json_agg(json_build_object(
               'message_id', tm.message_id,
               'sender_type', tm.sender_type,
               'sender_name', tm.sender_name,
               'message_text', tm.message_text,
               'created_at', tm.created_at
             ) ORDER BY tm.created_at) FROM ticket_messages tm WHERE tm.ticket_id = cst.ticket_id) as messages
      FROM customer_service_tickets cst
      WHERE cst.ticket_id = $1
    `, [ticket_id]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Support ticket not found', null, 'TICKET_NOT_FOUND'));
        }
        const ticket = result.rows[0];
        // Verify access
        if (req.user && ticket.user_id !== req.user.user_id) {
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        res.json(ticket);
    }
    catch (error) {
        console.error('Get support ticket error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get FAQs - retrieves frequently asked questions with search and filtering
*/
app.get('/api/support/faq', async (req, res) => {
    try {
        const { category, query } = req.query;
        // Mock FAQ data
        const faqs = [
            {
                faq_id: 'shipping_1',
                question: 'How long does shipping take?',
                answer: 'Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.',
                category: 'shipping',
                helpful_votes: 45
            },
            {
                faq_id: 'returns_1',
                question: 'What is your return policy?',
                answer: 'We offer 30-day returns on unopened items in original packaging.',
                category: 'returns',
                helpful_votes: 38
            },
            {
                faq_id: 'products_1',
                question: 'Are your fragrances authentic?',
                answer: 'Yes, all our fragrances are 100% authentic and sourced directly from brands.',
                category: 'products',
                helpful_votes: 52
            },
            {
                faq_id: 'orders_1',
                question: 'Can I modify my order after placing it?',
                answer: 'Orders can be modified within 1 hour of placement. Contact customer service for assistance.',
                category: 'orders',
                helpful_votes: 29
            },
            {
                faq_id: 'account_1',
                question: 'How do I reset my password?',
                answer: 'Click "Forgot Password" on the login page and follow the email instructions.',
                category: 'account',
                helpful_votes: 33
            }
        ];
        let filteredFaqs = faqs;
        // Filter by category
        if (category) {
            filteredFaqs = filteredFaqs.filter(faq => faq.category === category);
        }
        // Filter by search query
        if (query) {
            const searchTerm = query.toLowerCase();
            filteredFaqs = filteredFaqs.filter(faq => faq.question.toLowerCase().includes(searchTerm) ||
                faq.answer.toLowerCase().includes(searchTerm));
        }
        res.json(filteredFaqs);
    }
    catch (error) {
        console.error('Get FAQs error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// NEWSLETTER ROUTES
// ============================================================================
/*
Subscribe to newsletter - creates newsletter subscriptions with granular preference controls
@@need:external-api: Email marketing platform API for list management and subscriber handling
*/
app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
        const { email, first_name, subscription_source, preferences = '{"new_arrivals": true, "sales": true, "exclusive_offers": true}' } = req.body;
        if (!email || !subscription_source) {
            return res.status(400).json(createErrorResponse('Email and subscription source are required', null, 'REQUIRED_FIELDS_MISSING'));
        }
        const client = await pool.connect();
        // Check if already subscribed
        const existingSubscription = await client.query('SELECT subscription_id, is_active FROM newsletter_subscriptions WHERE email = $1', [email.toLowerCase()]);
        if (existingSubscription.rows.length > 0) {
            const existing = existingSubscription.rows[0];
            if (existing.is_active) {
                client.release();
                return res.status(400).json(createErrorResponse('Email is already subscribed', null, 'ALREADY_SUBSCRIBED'));
            }
            else {
                // Reactivate subscription
                await client.query('UPDATE newsletter_subscriptions SET is_active = true, preferences = $1, unsubscribed_at = NULL WHERE email = $2', [preferences, email.toLowerCase()]);
                client.release();
                return res.json({ message: 'Subscription reactivated successfully' });
            }
        }
        const subscriptionId = uuidv4();
        const now = new Date().toISOString();
        const result = await client.query(`
      INSERT INTO newsletter_subscriptions (subscription_id, email, first_name, subscription_source, 
                                          preferences, is_active, confirmed_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [subscriptionId, email.toLowerCase(), first_name, subscription_source, preferences, true, now, now]);
        client.release();
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Newsletter subscribe error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Unsubscribe from newsletter - removes newsletter subscription
*/
app.post('/api/newsletter/unsubscribe', async (req, res) => {
    try {
        const { email, unsubscribe_token } = req.body;
        if (!email) {
            return res.status(400).json(createErrorResponse('Email is required', null, 'EMAIL_REQUIRED'));
        }
        const client = await pool.connect();
        const result = await client.query('UPDATE newsletter_subscriptions SET is_active = false, unsubscribed_at = $1 WHERE email = $2 RETURNING subscription_id', [new Date().toISOString(), email.toLowerCase()]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Email subscription not found', null, 'SUBSCRIPTION_NOT_FOUND'));
        }
        res.json({ message: 'Newsletter unsubscription successful' });
    }
    catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get newsletter preferences - retrieves user's newsletter subscription preferences
*/
app.get('/api/newsletter/preferences', authenticateToken, async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM newsletter_subscriptions WHERE user_id = $1 OR email = $2', [req.user.user_id, req.user.email]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Newsletter subscription not found', null, 'SUBSCRIPTION_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Get newsletter preferences error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Update newsletter preferences - modifies subscription preferences
*/
app.put('/api/newsletter/preferences', authenticateToken, async (req, res) => {
    try {
        const { preferences } = req.body;
        if (!preferences) {
            return res.status(400).json(createErrorResponse('Preferences are required', null, 'PREFERENCES_REQUIRED'));
        }
        const client = await pool.connect();
        const result = await client.query('UPDATE newsletter_subscriptions SET preferences = $1 WHERE user_id = $2 OR email = $3 RETURNING *', [preferences, req.user.user_id, req.user.email]);
        client.release();
        if (result.rows.length === 0) {
            return res.status(404).json(createErrorResponse('Newsletter subscription not found', null, 'SUBSCRIPTION_NOT_FOUND'));
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Update newsletter preferences error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// SEARCH ROUTES
// ============================================================================
/*
Get search suggestions - provides real-time search autocomplete suggestions across products,
brands, categories, and popular search terms for enhanced discovery experience
@@need:external-api: Search analytics service for popularity ranking and trending suggestions
*/
app.get('/api/search/suggestions', async (req, res) => {
    try {
        const { query, limit = 10 } = req.query;
        if (!query || query.length < 2) {
            return res.json({
                products: [],
                brands: [],
                categories: [],
                popular_searches: []
            });
        }
        const client = await pool.connect();
        const searchTerm = `%${query}%`;
        const resultLimit = Math.min(parseInt(limit), 20);
        const [productsResult, brandsResult, categoriesResult] = await Promise.all([
            // Product suggestions
            client.query(`
        SELECT product_id, product_name, b.brand_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE (p.product_name ILIKE $1 OR b.brand_name ILIKE $1)
          AND p.availability_status = 'in_stock'
        ORDER BY p.is_featured DESC, p.product_name ASC
        LIMIT $2
      `, [searchTerm, resultLimit]),
            // Brand suggestions
            client.query(`
        SELECT brand_id, brand_name
        FROM brands
        WHERE brand_name ILIKE $1 AND is_active = true
        ORDER BY brand_name ASC
        LIMIT $2
      `, [searchTerm, resultLimit]),
            // Category suggestions
            client.query(`
        SELECT category_id, category_name
        FROM categories
        WHERE category_name ILIKE $1 AND is_active = true
        ORDER BY category_name ASC
        LIMIT $2
      `, [searchTerm, resultLimit])
        ]);
        client.release();
        // Mock popular searches
        const popularSearches = [
            'Tom Ford Oud Wood',
            'Chanel No. 5',
            'Creed Aventus',
            'vanilla fragrances',
            'fresh citrus',
            'women\'s perfume',
            'men\'s cologne',
            'floral scents'
        ].filter(search => search.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
        res.json({
            products: productsResult.rows,
            brands: brandsResult.rows,
            categories: categoriesResult.rows,
            popular_searches: popularSearches
        });
    }
    catch (error) {
        console.error('Get search suggestions error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get trending searches - retrieves popular search terms and trending queries
@@need:external-api: Search analytics platform for real-time trending data and query popularity metrics
*/
app.get('/api/search/trending', async (req, res) => {
    try {
        // Mock trending searches based on typical fragrance search patterns
        const trendingSearches = [
            { search_term: 'summer fragrances', search_count: 1250 },
            { search_term: 'Tom Ford', search_count: 890 },
            { search_term: 'vanilla perfume', search_count: 675 },
            { search_term: 'citrus cologne', search_count: 520 },
            { search_term: 'Creed Aventus', search_count: 445 },
            { search_term: 'floral perfume', search_count: 398 },
            { search_term: 'woody fragrances', search_count: 356 },
            { search_term: 'unisex perfume', search_count: 287 }
        ];
        res.json(trendingSearches);
    }
    catch (error) {
        console.error('Get trending searches error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// ANALYTICS ROUTES
// ============================================================================
/*
Track product view - records product page views for analytics and recommendation engine training
*/
app.post('/api/analytics/product-views', optionalAuth, async (req, res) => {
    try {
        const { product_id, session_id, referrer_url } = req.body;
        if (!product_id) {
            return res.status(400).json(createErrorResponse('Product ID is required', null, 'PRODUCT_ID_REQUIRED'));
        }
        const client = await pool.connect();
        const viewId = uuidv4();
        const now = new Date().toISOString();
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        await client.query(`
      INSERT INTO product_views (view_id, product_id, user_id, session_id, ip_address, 
                               user_agent, referrer_url, viewed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [viewId, product_id, req.user?.user_id, session_id, ipAddress, userAgent, referrer_url, now]);
        client.release();
        res.json({ message: 'Product view tracked successfully' });
    }
    catch (error) {
        console.error('Track product view error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Track search query - records search queries for analytics and search optimization
@@need:external-api: Analytics platform for real-time data streaming and search behavior analysis
*/
app.post('/api/analytics/search-tracking', optionalAuth, async (req, res) => {
    try {
        const { search_query, results_count, session_id } = req.body;
        if (!search_query) {
            return res.status(400).json(createErrorResponse('Search query is required', null, 'SEARCH_QUERY_REQUIRED'));
        }
        // In a real implementation, this would send to analytics service
        // For now, just acknowledge the tracking
        res.json({ message: 'Search query tracked successfully' });
    }
    catch (error) {
        console.error('Track search query error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// UTILITY ROUTES
// ============================================================================
/*
Health check endpoint - verifies API service status
*/
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});
/*
Get frontend configuration - provides client-side configuration settings
*/
app.get('/api/config/frontend', async (req, res) => {
    try {
        const config = {
            free_shipping_threshold: 75.00,
            currency: 'USD',
            supported_countries: ['US', 'CA', 'UK', 'FR', 'DE', 'IT', 'ES', 'AU'],
            payment_methods: ['credit_card', 'paypal', 'apple_pay', 'google_pay', 'klarna'],
            max_cart_items: 50,
            max_wishlist_items: 100
        };
        res.json(config);
    }
    catch (error) {
        console.error('Get frontend config error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// Placeholder image endpoints
app.get('/api/placeholder/:width/:height', (req, res) => {
    const { width, height } = req.params;
    const w = parseInt(width) || 400;
    const h = parseInt(height) || 400;
    // Generate a simple SVG placeholder
    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">
      ${w} × ${h}
    </text>
  </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
});
// Favicon endpoint
app.get('/favicon.png', (req, res) => {
    // Generate a simple SVG favicon
    const svg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#0E0E0E"/>
    <circle cx="16" cy="16" r="8" fill="#F8F6F2"/>
  </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(svg);
});
// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json(createErrorResponse(`API endpoint not found: ${req.method} ${req.path}`, null, 'ENDPOINT_NOT_FOUND'));
});
// ============================================================================
// LIVE CHAT ROUTES
// ============================================================================
/*
Start chat session - creates new chat session for user
*/
app.post('/api/chat/start', optionalAuth, async (req, res) => {
    try {
        const { topic, message } = req.body;
        const client = await pool.connect();
        const sessionId = uuidv4();
        const now = new Date().toISOString();
        // Create chat session
        await client.query(`INSERT INTO chat_sessions (session_id, user_id, status, topic, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6)`, [sessionId, req.user?.user_id || null, 'waiting', topic || 'general', now, now]);
        // Add initial message if provided
        if (message) {
            const messageId = uuidv4();
            await client.query(`INSERT INTO chat_messages (message_id, session_id, sender_id, sender_type, message, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`, [messageId, sessionId, req.user?.user_id || 'guest', 'user', message, now]);
        }
        // Store session in memory
        const session = {
            session_id: sessionId,
            user_id: req.user?.user_id,
            status: 'waiting',
            created_at: now,
            updated_at: now
        };
        chatSessions.set(sessionId, session);
        client.release();
        res.status(201).json({
            session_id: sessionId,
            status: 'waiting',
            message: 'Chat session started. Connecting you to an agent...'
        });
    }
    catch (error) {
        console.error('Start chat session error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
Get chat session - retrieves chat session details
*/
app.get('/api/chat/:session_id', optionalAuth, async (req, res) => {
    try {
        const { session_id } = req.params;
        const client = await pool.connect();
        const sessionResult = await client.query('SELECT * FROM chat_sessions WHERE session_id = $1', [session_id]);
        if (sessionResult.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Chat session not found', null, 'CHAT_SESSION_NOT_FOUND'));
        }
        const session = sessionResult.rows[0];
        // Check if user has access to this session
        if (req.user && session.user_id && session.user_id !== req.user.user_id) {
            client.release();
            return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
        }
        // Get messages for this session
        const messagesResult = await client.query(`SELECT cm.*, u.first_name, u.last_name 
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.user_id AND cm.sender_type = 'user'
       WHERE cm.session_id = $1 
       ORDER BY cm.created_at ASC`, [session_id]);
        client.release();
        res.json({
            session: session,
            messages: messagesResult.rows
        });
    }
    catch (error) {
        console.error('Get chat session error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
/*
End chat session - marks chat session as ended
*/
app.post('/api/chat/:session_id/end', optionalAuth, async (req, res) => {
    try {
        const { session_id } = req.params;
        const client = await pool.connect();
        const result = await client.query('UPDATE chat_sessions SET status = $1, updated_at = $2 WHERE session_id = $3 RETURNING *', ['ended', new Date().toISOString(), session_id]);
        if (result.rows.length === 0) {
            client.release();
            return res.status(404).json(createErrorResponse('Chat session not found', null, 'CHAT_SESSION_NOT_FOUND'));
        }
        // Update memory store
        if (chatSessions.has(session_id)) {
            const session = chatSessions.get(session_id);
            session.status = 'ended';
            session.updated_at = new Date().toISOString();
        }
        // Notify connected clients
        const sessionConns = sessionConnections.get(session_id);
        if (sessionConns) {
            const endMessage = {
                type: 'session_ended',
                session_id: session_id,
                timestamp: new Date().toISOString()
            };
            sessionConns.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(endMessage));
                }
            });
        }
        client.release();
        res.json({ message: 'Chat session ended successfully' });
    }
    catch (error) {
        console.error('End chat session error:', error);
        res.status(500).json(createErrorResponse('Internal server error', error, 'INTERNAL_SERVER_ERROR'));
    }
});
// ============================================================================
// WEBSOCKET HANDLING
// ============================================================================
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    // Handle authentication via query parameters or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const sessionId = url.searchParams.get('session_id');
    let user = null;
    // Authenticate user if token provided
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // In a real app, you'd fetch user details from DB here
            user = { user_id: decoded.user_id, email: decoded.email };
            ws.userId = user.user_id;
        }
        catch (error) {
            console.error('WebSocket auth error:', error);
            ws.close(4001, 'Authentication failed');
            return;
        }
    }
    if (sessionId) {
        ws.sessionId = sessionId;
        ws.userType = 'user';
        // Add to session connections
        if (!sessionConnections.has(sessionId)) {
            sessionConnections.set(sessionId, new Set());
        }
        sessionConnections.get(sessionId).add(ws);
        // Send connection acknowledgment
        ws.send(JSON.stringify({
            type: 'connected',
            session_id: sessionId,
            timestamp: new Date().toISOString()
        }));
        // Auto-connect to agent (simulate agent availability)
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const session = chatSessions.get(sessionId);
                if (session && session.status === 'waiting') {
                    session.status = 'active';
                    session.agent_id = 'agent-1'; // Mock agent ID
                    session.updated_at = new Date().toISOString();
                    // Notify user that agent connected
                    ws.send(JSON.stringify({
                        type: 'agent_connected',
                        session_id: sessionId,
                        agent_name: 'Sarah from Customer Service',
                        timestamp: new Date().toISOString()
                    }));
                    // Send welcome message from agent
                    const welcomeMessage = {
                        type: 'message',
                        message_id: uuidv4(),
                        session_id: sessionId,
                        sender_type: 'agent',
                        sender_name: 'Sarah',
                        message: 'Hi! I\'m Sarah from customer service. How can I help you with your fragrance needs today?',
                        timestamp: new Date().toISOString()
                    };
                    ws.send(JSON.stringify(welcomeMessage));
                    // Store message in database
                    pool.connect().then(client => {
                        client.query(`INSERT INTO chat_messages (message_id, session_id, sender_id, sender_type, message, created_at) 
               VALUES ($1, $2, $3, $4, $5, $6)`, [welcomeMessage.message_id, sessionId, 'agent-1', 'agent', welcomeMessage.message, welcomeMessage.timestamp]).catch(console.error).finally(() => client.release());
                    }).catch(console.error);
                }
            }
        }, 2000); // 2 second delay to simulate agent connection
    }
    // Handle incoming messages
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            if (message.type === 'chat_message' && ws.sessionId) {
                const messageId = uuidv4();
                const timestamp = new Date().toISOString();
                // Store message in database
                const client = await pool.connect();
                await client.query(`INSERT INTO chat_messages (message_id, session_id, sender_id, sender_type, message, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`, [messageId, ws.sessionId, ws.userId || 'guest', 'user', message.message, timestamp]);
                client.release();
                // Broadcast to all connections in this session
                const sessionConns = sessionConnections.get(ws.sessionId);
                if (sessionConns) {
                    const broadcastMessage = {
                        type: 'message',
                        message_id: messageId,
                        session_id: ws.sessionId,
                        sender_type: 'user',
                        sender_name: user ? `${user.first_name} ${user.last_name}` : 'Guest',
                        message: message.message,
                        timestamp: timestamp
                    };
                    sessionConns.forEach(conn => {
                        if (conn.readyState === WebSocket.OPEN) {
                            conn.send(JSON.stringify(broadcastMessage));
                        }
                    });
                }
                // Simulate agent response after a delay
                setTimeout(async () => {
                    if (ws.readyState === WebSocket.OPEN && sessionConns) {
                        const responses = [
                            "I understand your concern. Let me help you with that.",
                            "That's a great question! Here's what I recommend...",
                            "I can definitely assist you with that. Let me check our options.",
                            "Thank you for reaching out. I'll be happy to help you find the perfect fragrance.",
                            "That's one of our popular products! Here are some details..."
                        ];
                        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                        const agentMessageId = uuidv4();
                        const agentTimestamp = new Date().toISOString();
                        // Store agent response
                        try {
                            const client = await pool.connect();
                            await client.query(`INSERT INTO chat_messages (message_id, session_id, sender_id, sender_type, message, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6)`, [agentMessageId, ws.sessionId, 'agent-1', 'agent', randomResponse, agentTimestamp]);
                            client.release();
                            const agentMessage = {
                                type: 'message',
                                message_id: agentMessageId,
                                session_id: ws.sessionId,
                                sender_type: 'agent',
                                sender_name: 'Sarah',
                                message: randomResponse,
                                timestamp: agentTimestamp
                            };
                            sessionConns.forEach(conn => {
                                if (conn.readyState === WebSocket.OPEN) {
                                    conn.send(JSON.stringify(agentMessage));
                                }
                            });
                        }
                        catch (error) {
                            console.error('Agent response error:', error);
                        }
                    }
                }, 1500 + Math.random() * 2000); // Random delay between 1.5-3.5 seconds
            }
            if (message.type === 'typing' && ws.sessionId) {
                // Broadcast typing indicator
                const sessionConns = sessionConnections.get(ws.sessionId);
                if (sessionConns) {
                    const typingMessage = {
                        type: 'typing',
                        session_id: ws.sessionId,
                        sender_type: 'user',
                        is_typing: message.is_typing,
                        timestamp: new Date().toISOString()
                    };
                    sessionConns.forEach(conn => {
                        if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                            conn.send(JSON.stringify(typingMessage));
                        }
                    });
                }
            }
        }
        catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    // Handle connection close
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        // Remove from session connections
        if (ws.sessionId && sessionConnections.has(ws.sessionId)) {
            sessionConnections.get(ws.sessionId).delete(ws);
            if (sessionConnections.get(ws.sessionId).size === 0) {
                sessionConnections.delete(ws.sessionId);
            }
        }
        // Remove from active connections
        if (ws.userId) {
            activeConnections.delete(ws.userId);
        }
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});
// Catch-all route for SPA routing (excluding API routes)
// Only serve index.html for navigations (no file extension). If a file-like path
// is requested and doesn't exist, return 404 instead of HTML to avoid MIME issues.
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api'))
        return next();
    const hasExtension = path.extname(req.path) !== '';
    if (hasExtension) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Export app and pool for testing
export { app, pool };
// Start the server
server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port} and listening on 0.0.0.0`);
    console.log(`WebSocket server running on ws://localhost:${port}/ws`);
});
//# sourceMappingURL=server.js.map