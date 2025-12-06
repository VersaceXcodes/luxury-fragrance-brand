-- Create tables in dependency order

-- Independent tables first
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255),
    date_of_birth VARCHAR(255),
    loyalty_tier VARCHAR(255),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    notification_preferences TEXT NOT NULL DEFAULT '{"email_marketing": false, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}',
    fragrance_profile TEXT,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS brands (
    brand_id VARCHAR(255) PRIMARY KEY,
    brand_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(255),
    heritage_story TEXT,
    country_origin VARCHAR(255),
    is_niche_brand BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    category_id VARCHAR(255) PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    parent_category_id VARCHAR(255) REFERENCES categories(category_id),
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shipping_methods (
    shipping_method_id VARCHAR(255) PRIMARY KEY,
    method_name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2) NOT NULL,
    free_threshold DECIMAL(10,2),
    estimated_days_min INTEGER NOT NULL,
    estimated_days_max INTEGER NOT NULL,
    is_express BOOLEAN NOT NULL DEFAULT FALSE,
    requires_signature BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Tables with one level dependencies
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(255) PRIMARY KEY,
    brand_id VARCHAR(255) NOT NULL REFERENCES brands(brand_id),
    category_id VARCHAR(255) NOT NULL REFERENCES categories(category_id),
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    fragrance_families TEXT NOT NULL,
    concentration VARCHAR(255) NOT NULL,
    gender_category VARCHAR(255) NOT NULL,
    top_notes TEXT,
    middle_notes TEXT,
    base_notes TEXT,
    complete_notes_list TEXT,
    occasion_tags TEXT,
    season_suitability TEXT,
    longevity_hours INTEGER,
    sillage_rating INTEGER,
    intensity_level VARCHAR(255),
    ingredients_list TEXT,
    care_instructions TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    availability_status VARCHAR(255) NOT NULL DEFAULT 'in_stock',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
    is_limited_edition BOOLEAN NOT NULL DEFAULT FALSE,
    sku_prefix VARCHAR(255) NOT NULL,
    weight_grams INTEGER,
    launch_date VARCHAR(255),
    meta_title VARCHAR(255),
    meta_description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
    address_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    address_type VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(255) NOT NULL,
    state_province VARCHAR(255) NOT NULL,
    postal_code VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    phone_number VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_methods (
    payment_method_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    payment_type VARCHAR(255) NOT NULL,
    card_last_four VARCHAR(255),
    card_brand VARCHAR(255),
    card_expiry_month VARCHAR(255),
    card_expiry_year VARCHAR(255),
    cardholder_name VARCHAR(255),
    billing_address_id VARCHAR(255) REFERENCES addresses(address_id),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlists (
    wishlist_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    wishlist_name VARCHAR(255) NOT NULL DEFAULT 'My Wishlist',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    share_token VARCHAR(255) UNIQUE,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    subscription_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    user_id VARCHAR(255) REFERENCES users(user_id),
    subscription_source VARCHAR(255) NOT NULL,
    preferences TEXT NOT NULL DEFAULT '{"new_arrivals": true, "sales": true, "exclusive_offers": true}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    confirmed_at VARCHAR(255),
    unsubscribed_at VARCHAR(255),
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
    cart_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    session_id VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
    promotion_id VARCHAR(255) PRIMARY KEY,
    promotion_code VARCHAR(255) UNIQUE NOT NULL,
    promotion_name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(255) NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_amount DECIMAL(10,2),
    maximum_discount DECIMAL(10,2),
    start_date VARCHAR(255) NOT NULL,
    end_date VARCHAR(255) NOT NULL,
    usage_limit INTEGER,
    current_usage INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    applicable_products TEXT,
    applicable_categories TEXT,
    created_at VARCHAR(255) NOT NULL
);

-- Tables with two level dependencies
CREATE TABLE IF NOT EXISTS product_sizes (
    size_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    size_ml INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    sku VARCHAR(255) UNIQUE NOT NULL,
    is_sample_available BOOLEAN NOT NULL DEFAULT FALSE,
    sample_price DECIMAL(10,2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_images (
    image_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    image_url VARCHAR(255) NOT NULL,
    image_type VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    order_number VARCHAR(255) UNIQUE NOT NULL,
    order_status VARCHAR(255) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(255) NOT NULL DEFAULT 'pending',
    fulfillment_status VARCHAR(255) NOT NULL DEFAULT 'unfulfilled',
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(255) NOT NULL DEFAULT 'USD',
    shipping_address_id VARCHAR(255) NOT NULL REFERENCES addresses(address_id),
    billing_address_id VARCHAR(255) NOT NULL REFERENCES addresses(address_id),
    shipping_method_id VARCHAR(255) NOT NULL REFERENCES shipping_methods(shipping_method_id),
    payment_method_id VARCHAR(255) REFERENCES payment_methods(payment_method_id),
    tracking_number VARCHAR(255),
    shipped_at VARCHAR(255),
    delivered_at VARCHAR(255),
    gift_message TEXT,
    special_instructions TEXT,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id),
    order_id VARCHAR(255) REFERENCES orders(order_id),
    rating INTEGER NOT NULL,
    title VARCHAR(255),
    review_text TEXT,
    longevity_rating INTEGER,
    sillage_rating INTEGER,
    occasion_tags TEXT,
    season_tags TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_status VARCHAR(255) NOT NULL DEFAULT 'pending',
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_items (
    wishlist_item_id VARCHAR(255) PRIMARY KEY,
    wishlist_id VARCHAR(255) NOT NULL REFERENCES wishlists(wishlist_id),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    size_ml INTEGER,
    notes TEXT,
    added_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id VARCHAR(255) PRIMARY KEY,
    cart_id VARCHAR(255) NOT NULL REFERENCES carts(cart_id),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    size_ml INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    gift_wrap BOOLEAN NOT NULL DEFAULT FALSE,
    sample_included BOOLEAN NOT NULL DEFAULT FALSE,
    added_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sample_orders (
    sample_order_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    sample_order_number VARCHAR(255) UNIQUE NOT NULL,
    order_status VARCHAR(255) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    customer_email VARCHAR(255) NOT NULL,
    shipping_address_id VARCHAR(255) NOT NULL REFERENCES addresses(address_id),
    tracking_number VARCHAR(255),
    shipped_at VARCHAR(255),
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_results (
    quiz_result_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    session_id VARCHAR(255),
    personality_type VARCHAR(255) NOT NULL,
    quiz_answers TEXT NOT NULL,
    recommended_families TEXT NOT NULL,
    recommended_products TEXT,
    intensity_preference VARCHAR(255),
    occasion_preferences TEXT,
    season_preferences TEXT,
    completed_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS gift_cards (
    gift_card_id VARCHAR(255) PRIMARY KEY,
    gift_card_code VARCHAR(255) UNIQUE NOT NULL,
    initial_amount DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,
    currency VARCHAR(255) NOT NULL DEFAULT 'USD',
    purchaser_email VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    gift_message TEXT,
    delivery_date VARCHAR(255),
    expiry_date VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_id VARCHAR(255) REFERENCES orders(order_id),
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_service_tickets (
    ticket_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    ticket_number VARCHAR(255) UNIQUE NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(255) NOT NULL,
    priority VARCHAR(255) NOT NULL DEFAULT 'medium',
    status VARCHAR(255) NOT NULL DEFAULT 'open',
    assigned_agent_id VARCHAR(255),
    order_id VARCHAR(255) REFERENCES orders(order_id),
    resolution_notes TEXT,
    resolved_at VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_tracking (
    tracking_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    size_ml INTEGER NOT NULL,
    change_type VARCHAR(255) NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type VARCHAR(255),
    reference_id VARCHAR(255),
    notes TEXT,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS abandoned_carts (
    abandoned_cart_id VARCHAR(255) PRIMARY KEY,
    cart_id VARCHAR(255) NOT NULL REFERENCES carts(cart_id),
    user_id VARCHAR(255) REFERENCES users(user_id),
    email VARCHAR(255),
    total_items INTEGER NOT NULL,
    cart_value DECIMAL(10,2) NOT NULL,
    abandoned_at VARCHAR(255) NOT NULL,
    first_reminder_sent VARCHAR(255),
    second_reminder_sent VARCHAR(255),
    recovered_at VARCHAR(255),
    recovery_order_id VARCHAR(255) REFERENCES orders(order_id)
);

CREATE TABLE IF NOT EXISTS product_views (
    view_id VARCHAR(255) PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    user_id VARCHAR(255) REFERENCES users(user_id),
    session_id VARCHAR(255),
    ip_address VARCHAR(255),
    user_agent TEXT,
    referrer_url TEXT,
    viewed_at VARCHAR(255) NOT NULL
);

-- Tables with three+ level dependencies
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    product_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    size_ml INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    gift_wrap BOOLEAN NOT NULL DEFAULT FALSE,
    sample_included BOOLEAN NOT NULL DEFAULT FALSE,
    sku VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS review_photos (
    review_photo_id VARCHAR(255) PRIMARY KEY,
    review_id VARCHAR(255) NOT NULL REFERENCES reviews(review_id),
    photo_url VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    uploaded_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS sample_order_items (
    sample_item_id VARCHAR(255) PRIMARY KEY,
    sample_order_id VARCHAR(255) NOT NULL REFERENCES sample_orders(sample_order_id),
    product_id VARCHAR(255) NOT NULL REFERENCES products(product_id),
    sample_size_ml INTEGER NOT NULL DEFAULT 2,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gift_card_transactions (
    transaction_id VARCHAR(255) PRIMARY KEY,
    gift_card_id VARCHAR(255) NOT NULL REFERENCES gift_cards(gift_card_id),
    order_id VARCHAR(255) REFERENCES orders(order_id),
    transaction_type VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    created_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS promotion_uses (
    promotion_use_id VARCHAR(255) PRIMARY KEY,
    promotion_id VARCHAR(255) NOT NULL REFERENCES promotions(promotion_id),
    order_id VARCHAR(255) NOT NULL REFERENCES orders(order_id),
    user_id VARCHAR(255) REFERENCES users(user_id),
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    ticket_id VARCHAR(255) NOT NULL REFERENCES customer_service_tickets(ticket_id),
    sender_type VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at VARCHAR(255) NOT NULL
);

-- Seed data
-- Users
INSERT INTO users (user_id, email, password_hash, first_name, last_name, phone_number, date_of_birth, loyalty_tier, email_verified, notification_preferences, fragrance_profile, created_at, updated_at) VALUES 
('user_001', 'alice.smith@email.com', 'password123', 'Alice', 'Smith', '+1234567890', '1990-05-15', 'gold', TRUE, '{"email_marketing": true, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}', '{"preferred_families": ["floral", "fresh"], "intensity": "moderate"}', '2024-01-15T09:00:00Z', '2024-01-15T09:00:00Z'),
('user_002', 'bob.jones@email.com', 'admin123', 'Bob', 'Jones', '+1234567891', '1985-08-22', 'silver', TRUE, '{"email_marketing": false, "sms_updates": true, "restock_alerts": true, "price_drop_alerts": false}', '{"preferred_families": ["woody", "oriental"], "intensity": "strong"}', '2024-01-16T10:30:00Z', '2024-01-16T10:30:00Z'),
('user_003', 'carol.white@email.com', 'user123', 'Carol', 'White', '+1234567892', '1992-12-03', 'bronze', FALSE, '{"email_marketing": true, "sms_updates": true, "restock_alerts": true, "price_drop_alerts": true}', '{"preferred_families": ["citrus", "aquatic"], "intensity": "light"}', '2024-01-17T11:15:00Z', '2024-01-17T11:15:00Z'),
('user_004', 'david.brown@email.com', 'secure456', 'David', 'Brown', '+1234567893', '1988-03-18', 'platinum', TRUE, '{"email_marketing": true, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}', '{"preferred_families": ["spicy", "leather"], "intensity": "very_strong"}', '2024-01-18T14:20:00Z', '2024-01-18T14:20:00Z'),
('user_005', 'emma.davis@email.com', 'mypass789', 'Emma', 'Davis', '+1234567894', '1995-07-09', 'gold', TRUE, '{"email_marketing": false, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": false}', '{"preferred_families": ["gourmand", "vanilla"], "intensity": "moderate"}', '2024-01-19T16:45:00Z', '2024-01-19T16:45:00Z'),
('user_006', 'sarah.thompson@email.com', 'guestpass123', 'Sarah', 'Thompson', '+1234567895', '1993-11-25', 'gold', TRUE, '{"email_marketing": true, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}', '{"preferred_families": ["floral", "fresh"], "intensity": "moderate"}', '2024-01-20T09:00:00Z', '2024-01-20T09:00:00Z'),
('user_007', 'versacecodes@gmail.com', 'Airplanes@99', 'Guest', 'User', '+1234567896', '1990-01-01', 'bronze', TRUE, '{"email_marketing": true, "sms_updates": false, "restock_alerts": true, "price_drop_alerts": true}', '{"preferred_families": ["fresh", "citrus"], "intensity": "moderate"}', '2024-01-21T10:00:00Z', '2024-01-21T10:00:00Z')
ON CONFLICT (user_id) DO NOTHING;

-- Brands
INSERT INTO brands (brand_id, brand_name, description, logo_url, heritage_story, country_origin, is_niche_brand, display_order, is_active, created_at) VALUES 
('brand_001', 'Chanel', 'Iconic French luxury brand known for timeless elegance and sophisticated fragrances.', 'https://picsum.photos/300/200?random=1', 'Founded by Gabrielle Chanel in 1910, revolutionizing women''s fashion and fragrance.', 'France', FALSE, 1, TRUE, '2024-01-01T00:00:00Z'),
('brand_002', 'Tom Ford', 'Modern luxury brand creating bold, sensual, and sophisticated fragrances.', 'https://picsum.photos/300/200?random=2', 'Launched in 2006, quickly became synonymous with luxury and glamour.', 'USA', TRUE, 2, TRUE, '2024-01-01T00:00:00Z'),
('brand_003', 'Dior', 'French luxury goods company with a rich heritage in haute couture and perfumery.', 'https://picsum.photos/300/200?random=3', 'Christian Dior founded the house in 1946, establishing new standards of elegance.', 'France', FALSE, 3, TRUE, '2024-01-01T00:00:00Z'),
('brand_004', 'Creed', 'Historic fragrance house creating bespoke scents for royalty and discerning clientele.', 'https://picsum.photos/300/200?random=4', 'Established in 1760, serving generations of royal families and celebrities.', 'UK', TRUE, 4, TRUE, '2024-01-01T00:00:00Z'),
('brand_005', 'Maison Margiela', 'Avant-garde fashion house known for conceptual and innovative fragrance creations.', 'https://picsum.photos/300/200?random=5', 'Founded by Martin Margiela in 1988, challenging conventional beauty standards.', 'France', TRUE, 5, TRUE, '2024-01-01T00:00:00Z');

-- Categories
INSERT INTO categories (category_id, category_name, parent_category_id, description, display_order, is_active) VALUES 
('cat_001', 'Women''s Fragrance', NULL, 'Perfumes designed specifically for women', 1, TRUE),
('cat_002', 'Men''s Fragrance', NULL, 'Colognes and perfumes designed for men', 2, TRUE),
('cat_003', 'Unisex Fragrance', NULL, 'Gender-neutral scents suitable for everyone', 3, TRUE),
('cat_004', 'Floral', 'cat_001', 'Fresh and feminine floral compositions', 1, TRUE),
('cat_005', 'Woody', 'cat_002', 'Warm and sophisticated woody fragrances', 1, TRUE),
('cat_006', 'Fresh', 'cat_003', 'Clean and invigorating fresh scents', 1, TRUE),
('cat_007', 'Oriental', 'cat_001', 'Exotic and sensual oriental fragrances', 2, TRUE),
('cat_008', 'Citrus', 'cat_002', 'Bright and energizing citrus-based scents', 2, TRUE);

-- Shipping Methods
INSERT INTO shipping_methods (shipping_method_id, method_name, description, cost, free_threshold, estimated_days_min, estimated_days_max, is_express, requires_signature, is_active, sort_order) VALUES 
('ship_001', 'Standard Shipping', 'Regular ground shipping', 9.99, 75.00, 5, 7, FALSE, FALSE, TRUE, 1),
('ship_002', 'Express Shipping', 'Expedited 2-3 day delivery', 19.99, 150.00, 2, 3, TRUE, FALSE, TRUE, 2),
('ship_003', 'Overnight Shipping', 'Next business day delivery', 34.99, 200.00, 1, 1, TRUE, TRUE, TRUE, 3),
('ship_004', 'International Standard', 'Standard international shipping', 24.99, 100.00, 10, 15, FALSE, FALSE, TRUE, 4),
('ship_005', 'International Express', 'Fast international delivery', 49.99, 200.00, 5, 8, TRUE, TRUE, TRUE, 5);

-- Products
INSERT INTO products (product_id, brand_id, category_id, product_name, description, short_description, fragrance_families, concentration, gender_category, top_notes, middle_notes, base_notes, complete_notes_list, occasion_tags, season_suitability, longevity_hours, sillage_rating, intensity_level, ingredients_list, care_instructions, base_price, sale_price, availability_status, is_featured, is_new_arrival, is_limited_edition, sku_prefix, weight_grams, launch_date, meta_title, meta_description, sort_order, created_at, updated_at) VALUES 
('prod_001', 'brand_001', 'cat_001', 'Chanel No. 5', 'The world''s most iconic fragrance, a timeless blend of florals and aldehydes.', 'Iconic aldehyde floral fragrance', '["floral", "aldehyde"]', 'Eau de Parfum', 'Women', 'Aldehydes, Ylang-Ylang, Neroli', 'Jasmine, Rose, Lily of the Valley', 'Sandalwood, Vanilla, Amber', 'Aldehydes, Ylang-Ylang, Neroli, Bergamot, Lemon, Jasmine, Rose, Lily of the Valley, Iris, Sandalwood, Vanilla, Amber, Vetiver, Patchouli', '["evening", "special_occasions", "formal"]', '["spring", "fall", "winter"]', 8, 8, 'Strong', 'Alcohol Denat., Parfum, Aqua, Limonene, Linalool, Benzyl Salicylate', 'Store in a cool, dry place away from direct sunlight', 165.00, NULL, 'in_stock', TRUE, FALSE, FALSE, 'CH5', 50, '1921-05-05', 'Chanel No. 5 - The Iconic Fragrance', 'Experience the legendary Chanel No. 5, the world''s most famous perfume', 1, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('prod_002', 'brand_002', 'cat_002', 'Tom Ford Oud Wood', 'A sophisticated blend of exotic woods and spices for the modern gentleman.', 'Sophisticated oud and wood composition', '["woody", "oriental"]', 'Eau de Parfum', 'Men', 'Agarwood, Rosewood, Cardamom', 'Sandalwood, Sichuan Pepper, Fir', 'Vanilla, Amber', 'Agarwood, Rosewood, Cardamom, Sandalwood, Sichuan Pepper, Fir, Vanilla, Amber', '["evening", "formal", "business"]', '["fall", "winter"]', 10, 9, 'Very Strong', 'Alcohol Denat., Parfum, Aqua, Eugenol, Cinnamal, Coumarin', 'Keep away from heat and light', 285.00, 255.00, 'in_stock', TRUE, FALSE, TRUE, 'TFOW', 50, '2007-03-15', 'Tom Ford Oud Wood - Luxury Oud Fragrance', 'Discover the luxurious Tom Ford Oud Wood, a masterpiece of oud and exotic woods', 2, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('prod_003', 'brand_003', 'cat_001', 'Miss Dior Blooming Bouquet', 'A fresh and tender interpretation of Miss Dior with peony and rose.', 'Fresh floral bouquet fragrance', '["floral", "fresh"]', 'Eau de Toilette', 'Women', 'Sicilian Mandarin, Peony', 'Peony, Rose, Apricot', 'White Musk', 'Sicilian Mandarin, Peony, Rose, Apricot, White Musk', '["daily", "spring", "romantic"]', '["spring", "summer"]', 6, 6, 'Moderate', 'Alcohol Denat., Parfum, Aqua, Hydroxycitronellal, Citronellol, Alpha-Isomethyl Ionone', 'Store upright in original packaging', 95.00, NULL, 'in_stock', FALSE, TRUE, FALSE, 'MDBB', 30, '2014-02-14', 'Miss Dior Blooming Bouquet - Fresh Floral EDT', 'Experience the tender freshness of Miss Dior Blooming Bouquet', 3, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('prod_004', 'brand_004', 'cat_003', 'Creed Aventus', 'A bold and contemporary fragrance inspired by strength and success.', 'Bold fruity and woody unisex fragrance', '["fruity", "woody", "fresh"]', 'Eau de Parfum', 'Unisex', 'Blackcurrant, Italian Bergamot, Apple', 'Pineapple, Patchouli, Rose', 'Birch, Musk, Oak Moss', 'Blackcurrant, Italian Bergamot, Apple, Pineapple, Patchouli, Rose, Birch, Musk, Oak Moss, Ambergris', '["business", "daily", "confidence"]', '["spring", "summer", "fall"]', 9, 9, 'Strong', 'Alcohol Denat., Parfum, Water, Limonene, Linalool, Citronellol', 'Avoid extreme temperatures', 365.00, NULL, 'in_stock', TRUE, FALSE, FALSE, 'CRAV', 50, '2010-01-01', 'Creed Aventus - Legendary Unisex Fragrance', 'The legendary Creed Aventus, a symbol of strength and success', 4, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
('prod_005', 'brand_005', 'cat_003', 'Maison Margiela REPLICA Beach Walk', 'Captures the essence of a summer day at the beach with sun and sand.', 'Summery beach-inspired fragrance', '["aquatic", "fresh", "solar"]', 'Eau de Toilette', 'Unisex', 'Bergamot, Pink Pepper, Lemon', 'Ylang-Ylang, Coconut Milk, Heliotrope', 'Cedar, Benzoin, Musk', 'Bergamot, Pink Pepper, Lemon, Ylang-Ylang, Coconut Milk, Heliotrope, Cedar, Benzoin, Musk', '["casual", "summer", "vacation"]', '["spring", "summer"]', 5, 5, 'Light', 'Alcohol Denat., Parfum, Aqua, Limonene, Linalool, Citral', 'Protect from direct sunlight', 135.00, 120.00, 'in_stock', FALSE, TRUE, FALSE, 'MMBW', 30, '2012-06-21', 'Maison Margiela REPLICA Beach Walk - Summer Escape', 'Transport yourself to a perfect beach day with REPLICA Beach Walk', 5, '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z');

-- Addresses
INSERT INTO addresses (address_id, user_id, address_type, first_name, last_name, company, address_line_1, address_line_2, city, state_province, postal_code, country, phone_number, is_default, created_at) VALUES 
('addr_001', 'user_001', 'shipping', 'Alice', 'Smith', NULL, '123 Main Street', 'Apt 4B', 'New York', 'NY', '10001', 'USA', '+1234567890', TRUE, '2024-01-15T09:30:00Z'),
('addr_002', 'user_001', 'billing', 'Alice', 'Smith', NULL, '123 Main Street', 'Apt 4B', 'New York', 'NY', '10001', 'USA', '+1234567890', FALSE, '2024-01-15T09:31:00Z'),
('addr_003', 'user_002', 'shipping', 'Bob', 'Jones', 'Tech Corp', '456 Oak Avenue', 'Suite 200', 'Los Angeles', 'CA', '90210', 'USA', '+1234567891', TRUE, '2024-01-16T10:45:00Z'),
('addr_004', 'user_003', 'shipping', 'Carol', 'White', NULL, '789 Pine Road', NULL, 'Chicago', 'IL', '60601', 'USA', '+1234567892', TRUE, '2024-01-17T11:30:00Z'),
('addr_005', 'user_004', 'shipping', 'David', 'Brown', 'Finance Inc', '321 Elm Street', 'Floor 15', 'Houston', 'TX', '77001', 'USA', '+1234567893', TRUE, '2024-01-18T14:30:00Z');

-- Product Sizes
INSERT INTO product_sizes (size_id, product_id, size_ml, price, sale_price, stock_quantity, reserved_quantity, low_stock_threshold, sku, is_sample_available, sample_price, is_active, created_at) VALUES 
('size_001', 'prod_001', 50, 165.00, NULL, 45, 2, 5, 'CH5-50ML-001', TRUE, 8.00, TRUE, '2024-01-01T00:00:00Z'),
('size_002', 'prod_001', 100, 245.00, NULL, 38, 5, 5, 'CH5-100ML-001', TRUE, 8.00, TRUE, '2024-01-01T00:00:00Z'),
('size_003', 'prod_002', 50, 285.00, 255.00, 25, 3, 3, 'TFOW-50ML-001', TRUE, 12.00, TRUE, '2024-01-01T00:00:00Z'),
('size_004', 'prod_002', 100, 445.00, 395.00, 18, 2, 3, 'TFOW-100ML-001', TRUE, 12.00, TRUE, '2024-01-01T00:00:00Z'),
('size_005', 'prod_003', 30, 95.00, NULL, 55, 8, 10, 'MDBB-30ML-001', FALSE, NULL, TRUE, '2024-01-01T00:00:00Z'),
('size_006', 'prod_003', 50, 135.00, NULL, 42, 5, 8, 'MDBB-50ML-001', TRUE, 6.00, TRUE, '2024-01-01T00:00:00Z'),
('size_007', 'prod_004', 50, 365.00, NULL, 22, 1, 3, 'CRAV-50ML-001', TRUE, 15.00, TRUE, '2024-01-01T00:00:00Z'),
('size_008', 'prod_004', 100, 545.00, NULL, 15, 2, 3, 'CRAV-100ML-001', TRUE, 15.00, TRUE, '2024-01-01T00:00:00Z'),
('size_009', 'prod_005', 30, 135.00, 120.00, 35, 4, 5, 'MMBW-30ML-001', TRUE, 7.00, TRUE, '2024-01-01T00:00:00Z'),
('size_010', 'prod_005', 100, 225.00, 195.00, 28, 3, 5, 'MMBW-100ML-001', TRUE, 7.00, TRUE, '2024-01-01T00:00:00Z');

-- Product Images
INSERT INTO product_images (image_id, product_id, image_url, image_type, alt_text, display_order, is_primary) VALUES 
('img_001', 'prod_001', 'https://picsum.photos/400/400?random=11', 'main', 'Chanel No. 5 Eau de Parfum bottle', 1, TRUE),
('img_002', 'prod_001', 'https://picsum.photos/400/400?random=12', 'detail', 'Chanel No. 5 bottle close-up detail', 2, FALSE),
('img_003', 'prod_001', 'https://picsum.photos/400/400?random=13', 'lifestyle', 'Chanel No. 5 lifestyle image', 3, FALSE),
('img_004', 'prod_002', 'https://picsum.photos/400/400?random=14', 'main', 'Tom Ford Oud Wood bottle', 1, TRUE),
('img_005', 'prod_002', 'https://picsum.photos/400/400?random=15', 'detail', 'Tom Ford Oud Wood label detail', 2, FALSE),
('img_006', 'prod_003', 'https://picsum.photos/400/400?random=16', 'main', 'Miss Dior Blooming Bouquet bottle', 1, TRUE),
('img_007', 'prod_003', 'https://picsum.photos/400/400?random=17', 'packaging', 'Miss Dior Blooming Bouquet box', 2, FALSE),
('img_008', 'prod_004', 'https://picsum.photos/400/400?random=18', 'main', 'Creed Aventus bottle', 1, TRUE),
('img_009', 'prod_004', 'https://picsum.photos/400/400?random=19', 'lifestyle', 'Creed Aventus lifestyle shot', 2, FALSE),
('img_010', 'prod_005', 'https://picsum.photos/400/400?random=20', 'main', 'Maison Margiela REPLICA Beach Walk bottle', 1, TRUE);

-- Payment Methods
INSERT INTO payment_methods (payment_method_id, user_id, payment_type, card_last_four, card_brand, card_expiry_month, card_expiry_year, cardholder_name, billing_address_id, is_default, created_at) VALUES 
('pay_001', 'user_001', 'credit_card', '4242', 'Visa', '12', '2027', 'Alice Smith', 'addr_002', TRUE, '2024-01-15T09:45:00Z'),
('pay_002', 'user_002', 'credit_card', '5555', 'Mastercard', '08', '2026', 'Bob Jones', 'addr_003', TRUE, '2024-01-16T11:00:00Z'),
('pay_003', 'user_003', 'credit_card', '3782', 'American Express', '03', '2028', 'Carol White', 'addr_004', TRUE, '2024-01-17T12:00:00Z'),
('pay_004', 'user_004', 'credit_card', '6011', 'Discover', '11', '2025', 'David Brown', 'addr_005', TRUE, '2024-01-18T15:00:00Z'),
('pay_005', 'user_005', 'paypal', NULL, NULL, NULL, NULL, 'Emma Davis', NULL, TRUE, '2024-01-19T17:00:00Z');

-- Carts
INSERT INTO carts (cart_id, user_id, session_id, created_at, updated_at) VALUES 
('cart_001', 'user_001', NULL, '2024-01-20T10:00:00Z', '2024-01-20T10:30:00Z'),
('cart_002', 'user_002', NULL, '2024-01-20T11:00:00Z', '2024-01-20T11:15:00Z'),
('cart_003', NULL, 'sess_12345', '2024-01-20T12:00:00Z', '2024-01-20T12:05:00Z'),
('cart_004', 'user_003', NULL, '2024-01-20T13:00:00Z', '2024-01-20T13:20:00Z'),
('cart_005', 'user_004', NULL, '2024-01-20T14:00:00Z', '2024-01-20T14:10:00Z');

-- Cart Items
INSERT INTO cart_items (cart_item_id, cart_id, product_id, size_ml, quantity, unit_price, gift_wrap, sample_included, added_at) VALUES 
('cart_item_001', 'cart_001', 'prod_001', 50, 1, 165.00, FALSE, TRUE, '2024-01-20T10:15:00Z'),
('cart_item_002', 'cart_001', 'prod_003', 30, 2, 95.00, TRUE, FALSE, '2024-01-20T10:30:00Z'),
('cart_item_003', 'cart_002', 'prod_002', 50, 1, 255.00, FALSE, TRUE, '2024-01-20T11:10:00Z'),
('cart_item_004', 'cart_003', 'prod_005', 30, 1, 120.00, FALSE, FALSE, '2024-01-20T12:05:00Z'),
('cart_item_005', 'cart_004', 'prod_004', 50, 1, 365.00, TRUE, TRUE, '2024-01-20T13:15:00Z');

-- Orders
INSERT INTO orders (order_id, user_id, order_number, order_status, payment_status, fulfillment_status, subtotal, tax_amount, shipping_cost, discount_amount, total_amount, currency, shipping_address_id, billing_address_id, shipping_method_id, payment_method_id, tracking_number, shipped_at, delivered_at, gift_message, special_instructions, customer_email, customer_phone, created_at, updated_at) VALUES 
('order_001', 'user_001', 'ORD-2024-001', 'completed', 'paid', 'fulfilled', 260.00, 20.80, 9.99, 0.00, 290.79, 'USD', 'addr_001', 'addr_002', 'ship_001', 'pay_001', 'TRK123456789', '2024-01-16T09:00:00Z', '2024-01-19T15:30:00Z', 'Happy Birthday!', 'Handle with care', 'alice.smith@email.com', '+1234567890', '2024-01-15T15:00:00Z', '2024-01-19T15:30:00Z'),
('order_002', 'user_002', 'ORD-2024-002', 'processing', 'paid', 'unfulfilled', 255.00, 20.40, 19.99, 25.50, 269.89, 'USD', 'addr_003', 'addr_003', 'ship_002', 'pay_002', NULL, NULL, NULL, NULL, 'Please include samples', 'bob.jones@email.com', '+1234567891', '2024-01-18T14:00:00Z', '2024-01-18T14:00:00Z'),
('order_003', 'user_003', 'ORD-2024-003', 'shipped', 'paid', 'partial', 135.00, 10.80, 9.99, 13.50, 142.29, 'USD', 'addr_004', 'addr_004', 'ship_001', 'pay_003', 'TRK987654321', '2024-01-19T10:00:00Z', NULL, 'Treat yourself!', NULL, 'carol.white@email.com', '+1234567892', '2024-01-17T16:00:00Z', '2024-01-19T10:00:00Z'),
('order_004', 'user_004', 'ORD-2024-004', 'pending', 'pending', 'unfulfilled', 365.00, 29.20, 0.00, 0.00, 394.20, 'USD', 'addr_005', 'addr_005', 'ship_001', 'pay_004', NULL, NULL, NULL, NULL, NULL, 'david.brown@email.com', '+1234567893', '2024-01-20T09:00:00Z', '2024-01-20T09:00:00Z'),
('order_005', 'user_005', 'ORD-2024-005', 'cancelled', 'refunded', 'unfulfilled', 120.00, 9.60, 9.99, 12.00, 127.59, 'USD', 'addr_001', 'addr_001', 'ship_001', 'pay_005', NULL, NULL, NULL, 'Gift for mom', NULL, 'emma.davis@email.com', '+1234567894', '2024-01-19T20:00:00Z', '2024-01-20T08:00:00Z');

-- Order Items
INSERT INTO order_items (order_item_id, order_id, product_id, product_name, brand_name, size_ml, quantity, unit_price, line_total, gift_wrap, sample_included, sku) VALUES 
('order_item_001', 'order_001', 'prod_001', 'Chanel No. 5', 'Chanel', 50, 1, 165.00, 165.00, FALSE, TRUE, 'CH5-50ML-001'),
('order_item_002', 'order_001', 'prod_003', 'Miss Dior Blooming Bouquet', 'Dior', 30, 1, 95.00, 95.00, TRUE, FALSE, 'MDBB-30ML-001'),
('order_item_003', 'order_002', 'prod_002', 'Tom Ford Oud Wood', 'Tom Ford', 50, 1, 255.00, 255.00, FALSE, TRUE, 'TFOW-50ML-001'),
('order_item_004', 'order_003', 'prod_005', 'Maison Margiela REPLICA Beach Walk', 'Maison Margiela', 30, 1, 135.00, 135.00, FALSE, FALSE, 'MMBW-30ML-001'),
('order_item_005', 'order_004', 'prod_004', 'Creed Aventus', 'Creed', 50, 1, 365.00, 365.00, TRUE, TRUE, 'CRAV-50ML-001');

-- Wishlists
INSERT INTO wishlists (wishlist_id, user_id, wishlist_name, is_public, is_default, share_token, created_at) VALUES 
('wish_001', 'user_001', 'My Favorites', FALSE, TRUE, NULL, '2024-01-15T09:30:00Z'),
('wish_002', 'user_002', 'Gift Ideas', TRUE, TRUE, 'share_abc123', '2024-01-16T10:30:00Z'),
('wish_003', 'user_003', 'Summer Scents', FALSE, TRUE, NULL, '2024-01-17T11:30:00Z'),
('wish_004', 'user_004', 'Luxury Collection', TRUE, TRUE, 'share_def456', '2024-01-18T14:30:00Z'),
('wish_005', 'user_005', 'Wishlist', FALSE, TRUE, NULL, '2024-01-19T16:30:00Z');

-- Wishlist Items
INSERT INTO wishlist_items (wishlist_item_id, wishlist_id, product_id, size_ml, notes, added_at) VALUES 
('wish_item_001', 'wish_001', 'prod_002', 50, 'For special occasions', '2024-01-15T10:00:00Z'),
('wish_item_002', 'wish_001', 'prod_004', 100, 'Save for anniversary', '2024-01-15T10:30:00Z'),
('wish_item_003', 'wish_002', 'prod_001', 50, 'Classic choice', '2024-01-16T11:00:00Z'),
('wish_item_004', 'wish_003', 'prod_005', 30, 'Perfect for vacation', '2024-01-17T12:00:00Z'),
('wish_item_005', 'wish_004', 'prod_002', 100, 'Investment piece', '2024-01-18T15:00:00Z');

-- Reviews
INSERT INTO reviews (review_id, product_id, user_id, order_id, rating, title, review_text, longevity_rating, sillage_rating, occasion_tags, season_tags, is_verified_purchase, helpful_votes, total_votes, is_featured, moderation_status, created_at, updated_at) VALUES 
('review_001', 'prod_001', 'user_001', 'order_001', 5, 'Timeless Classic', 'Chanel No. 5 is truly a masterpiece. The aldehydes give it such a unique sparkle that makes it instantly recognizable. Perfect for special occasions and formal events.', 8, 8, '["evening", "formal", "special_occasions"]', '["fall", "winter"]', TRUE, 15, 18, TRUE, 'approved', '2024-01-20T10:00:00Z', '2024-01-20T10:00:00Z'),
('review_002', 'prod_002', 'user_002', 'order_002', 4, 'Rich and Sophisticated', 'Tom Ford Oud Wood is incredibly rich and warm. The oud is not overpowering, making it wearable for Western tastes. Great longevity but quite expensive.', 9, 7, '["evening", "formal"]', '["fall", "winter"]', TRUE, 8, 12, FALSE, 'approved', '2024-01-19T14:30:00Z', '2024-01-19T14:30:00Z'),
('review_003', 'prod_003', 'user_003', 'order_003', 4, 'Fresh and Feminine', 'Love this fresh take on Miss Dior. The peony and rose create a beautiful bouquet that''s perfect for spring. Not as long-lasting as I''d hoped but lovely while it lasts.', 5, 6, '["daily", "romantic", "spring"]', '["spring", "summer"]', TRUE, 6, 8, FALSE, 'approved', '2024-01-18T16:30:00Z', '2024-01-18T16:30:00Z'),
('review_004', 'prod_004', 'user_004', NULL, 5, 'Worth Every Penny', 'Creed Aventus lives up to all the hype. The pineapple opening is amazing and it dries down to this beautiful smoky wood. Compliment magnet for sure!', 9, 9, '["business", "daily", "confidence"]', '["spring", "summer", "fall"]', FALSE, 22, 25, TRUE, 'approved', '2024-01-20T15:00:00Z', '2024-01-20T15:00:00Z'),
('review_005', 'prod_005', 'user_005', NULL, 3, 'Nice but Not Amazing', 'Beach Walk is pleasant and does capture that summer beach vibe. However, it''s quite linear and doesn''t have much development. Good for casual summer wear.', 4, 4, '["casual", "summer"]', '["spring", "summer"]', FALSE, 3, 7, FALSE, 'approved', '2024-01-20T17:00:00Z', '2024-01-20T17:00:00Z');

-- Review Photos
INSERT INTO review_photos (review_photo_id, review_id, photo_url, alt_text, display_order, uploaded_at) VALUES 
('review_photo_001', 'review_001', 'https://picsum.photos/300/300?random=21', 'Chanel No. 5 on vanity', 1, '2024-01-20T10:15:00Z'),
('review_photo_002', 'review_002', 'https://picsum.photos/300/300?random=22', 'Tom Ford Oud Wood collection', 1, '2024-01-19T14:45:00Z'),
('review_photo_003', 'review_003', 'https://picsum.photos/300/300?random=23', 'Miss Dior with flowers', 1, '2024-01-18T16:45:00Z'),
('review_photo_004', 'review_004', 'https://picsum.photos/300/300?random=24', 'Creed Aventus bottle close-up', 1, '2024-01-20T15:15:00Z'),
('review_photo_005', 'review_005', 'https://picsum.photos/300/300?random=25', 'Beach Walk summer setup', 1, '2024-01-20T17:15:00Z');

-- Sample Orders
INSERT INTO sample_orders (sample_order_id, user_id, sample_order_number, order_status, total_amount, shipping_cost, customer_email, shipping_address_id, tracking_number, shipped_at, created_at) VALUES 
('sample_001', 'user_001', 'SAMP-2024-001', 'delivered', 16.00, 4.99, 'alice.smith@email.com', 'addr_001', 'STRK123456', '2024-01-16T10:00:00Z', '2024-01-15T14:00:00Z'),
('sample_002', 'user_003', 'SAMP-2024-002', 'shipped', 12.00, 4.99, 'carol.white@email.com', 'addr_004', 'STRK789012', '2024-01-19T11:00:00Z', '2024-01-18T13:00:00Z'),
('sample_003', NULL, 'SAMP-2024-003', 'processing', 20.00, 4.99, 'guest@email.com', 'addr_001', NULL, NULL, '2024-01-20T16:00:00Z'),
('sample_004', 'user_005', 'SAMP-2024-004', 'pending', 15.00, 4.99, 'emma.davis@email.com', 'addr_001', NULL, NULL, '2024-01-20T18:00:00Z'),
('sample_005', 'user_002', 'SAMP-2024-005', 'cancelled', 24.00, 4.99, 'bob.jones@email.com', 'addr_003', NULL, NULL, '2024-01-19T09:00:00Z');

-- Sample Order Items
INSERT INTO sample_order_items (sample_item_id, sample_order_id, product_id, sample_size_ml, price, quantity) VALUES 
('sample_item_001', 'sample_001', 'prod_001', 2, 8.00, 1),
('sample_item_002', 'sample_001', 'prod_003', 2, 8.00, 1),
('sample_item_003', 'sample_002', 'prod_002', 2, 12.00, 1),
('sample_item_004', 'sample_003', 'prod_004', 2, 15.00, 1),
('sample_item_005', 'sample_003', 'prod_005', 2, 5.00, 1),
('sample_item_006', 'sample_004', 'prod_001', 2, 8.00, 1),
('sample_item_007', 'sample_004', 'prod_005', 2, 7.00, 1),
('sample_item_008', 'sample_005', 'prod_002', 2, 12.00, 2);

-- Quiz Results
INSERT INTO quiz_results (quiz_result_id, user_id, session_id, personality_type, quiz_answers, recommended_families, recommended_products, intensity_preference, occasion_preferences, season_preferences, completed_at) VALUES 
('quiz_001', 'user_001', NULL, 'Romantic Dreamer', '{"q1": "floral", "q2": "moderate", "q3": "evening", "q4": "spring", "q5": "elegant"}', '["floral", "oriental"]', '["prod_001", "prod_003"]', 'moderate', '["romantic", "evening"]', '["spring", "fall"]', '2024-01-15T08:30:00Z'),
('quiz_002', 'user_002', NULL, 'Bold Adventurer', '{"q1": "woody", "q2": "strong", "q3": "business", "q4": "winter", "q5": "confident"}', '["woody", "oriental"]', '["prod_002", "prod_004"]', 'strong', '["business", "evening"]', '["fall", "winter"]', '2024-01-16T09:15:00Z'),
('quiz_003', NULL, 'sess_54321', 'Fresh Explorer', '{"q1": "fresh", "q2": "light", "q3": "daily", "q4": "summer", "q5": "energetic"}', '["fresh", "aquatic"]', '["prod_005", "prod_003"]', 'light', '["daily", "casual"]', '["spring", "summer"]', '2024-01-18T15:45:00Z'),
('quiz_004', 'user_004', NULL, 'Sophisticated Connoisseur', '{"q1": "complex", "q2": "very_strong", "q3": "formal", "q4": "all_seasons", "q5": "luxurious"}', '["oriental", "woody"]', '["prod_004", "prod_002"]', 'very_strong', '["formal", "special_occasions"]', '["fall", "winter"]', '2024-01-18T13:20:00Z'),
('quiz_005', 'user_003', NULL, 'Gentle Spirit', '{"q1": "soft", "q2": "light", "q3": "romantic", "q4": "spring", "q5": "feminine"}', '["floral", "fresh"]', '["prod_003", "prod_005"]', 'light', '["romantic", "daily"]', '["spring", "summer"]', '2024-01-17T10:30:00Z');

-- Gift Cards
INSERT INTO gift_cards (gift_card_id, gift_card_code, initial_amount, current_balance, currency, purchaser_email, recipient_email, recipient_name, gift_message, delivery_date, expiry_date, is_active, order_id, created_at) VALUES 
('gift_001', 'GC-2024-ABCD1234', 100.00, 85.00, 'USD', 'alice.smith@email.com', 'friend@email.com', 'Sarah Friend', 'Happy Birthday! Enjoy choosing your perfect scent!', '2024-01-25', '2025-01-25', TRUE, 'order_001', '2024-01-15T16:00:00Z'),
('gift_002', 'GC-2024-EFGH5678', 200.00, 200.00, 'USD', 'bob.jones@email.com', 'spouse@email.com', 'Partner Jones', 'Anniversary gift with love', '2024-02-14', '2025-02-14', TRUE, NULL, '2024-01-18T15:00:00Z'),
('gift_003', 'GC-2024-IJKL9012', 50.00, 0.00, 'USD', 'carol.white@email.com', 'sister@email.com', 'Lisa White', 'Just because!', '2024-01-20', '2025-01-20', TRUE, NULL, '2024-01-17T17:00:00Z'),
('gift_004', 'GC-2024-MNOP3456', 150.00, 150.00, 'USD', 'david.brown@email.com', NULL, NULL, NULL, NULL, '2025-12-31', TRUE, NULL, '2024-01-18T16:00:00Z'),
('gift_005', 'GC-2024-QRST7890', 75.00, 25.00, 'USD', 'emma.davis@email.com', 'mom@email.com', 'Mom Davis', 'Mother''s Day surprise!', '2024-05-12', '2025-05-12', TRUE, NULL, '2024-01-19T18:00:00Z');

-- Gift Card Transactions
INSERT INTO gift_card_transactions (transaction_id, gift_card_id, order_id, transaction_type, amount, balance_after, created_at) VALUES 
('trans_001', 'gift_001', NULL, 'redemption', -15.00, 85.00, '2024-01-26T10:00:00Z'),
('trans_002', 'gift_003', NULL, 'redemption', -25.00, 25.00, '2024-01-21T14:00:00Z'),
('trans_003', 'gift_003', NULL, 'redemption', -25.00, 0.00, '2024-01-22T16:00:00Z'),
('trans_004', 'gift_005', NULL, 'redemption', -50.00, 25.00, '2024-01-20T12:00:00Z'),
('trans_005', 'gift_001', NULL, 'issued', 100.00, 100.00, '2024-01-15T16:00:00Z');

-- Promotions
INSERT INTO promotions (promotion_id, promotion_code, promotion_name, description, discount_type, discount_value, minimum_order_amount, maximum_discount, start_date, end_date, usage_limit, current_usage, is_active, applicable_products, applicable_categories, created_at) VALUES 
('promo_001', 'WELCOME10', 'Welcome 10% Off', 'Get 10% off your first order', 'percentage', 10.00, 50.00, 50.00, '2024-01-01', '2024-12-31', NULL, 45, TRUE, NULL, NULL, '2024-01-01T00:00:00Z'),
('promo_002', 'SUMMER25', 'Summer Sale', '25% off summer fragrances', 'percentage', 25.00, 75.00, 100.00, '2024-06-01', '2024-08-31', 1000, 156, TRUE, '["prod_005", "prod_003"]', '["cat_006"]', '2024-01-01T00:00:00Z'),
('promo_003', 'FREESHIP', 'Free Shipping', 'Free shipping on orders over $75', 'free_shipping', 0.00, 75.00, NULL, '2024-01-01', '2024-12-31', NULL, 892, TRUE, NULL, NULL, '2024-01-01T00:00:00Z'),
('promo_004', 'LUXURY50', 'Luxury Discount', '$50 off luxury fragrances', 'fixed_amount', 50.00, 200.00, 50.00, '2024-02-01', '2024-02-29', 100, 23, TRUE, '["prod_002", "prod_004"]', NULL, '2024-01-01T00:00:00Z'),
('promo_005', 'BOGO50', 'Buy One Get 50% Off', 'Buy one, get second 50% off', 'percentage', 50.00, 100.00, NULL, '2024-03-01', '2024-03-31', 500, 0, FALSE, NULL, NULL, '2024-01-01T00:00:00Z');

-- Promotion Uses
INSERT INTO promotion_uses (promotion_use_id, promotion_id, order_id, user_id, discount_amount, used_at) VALUES 
('promo_use_001', 'promo_001', 'order_002', 'user_002', 25.50, '2024-01-18T14:00:00Z'),
('promo_use_002', 'promo_003', 'order_003', 'user_003', 9.99, '2024-01-17T16:00:00Z'),
('promo_use_003', 'promo_002', 'order_005', 'user_005', 12.00, '2024-01-19T20:00:00Z'),
('promo_use_004', 'promo_001', 'order_001', 'user_001', 26.00, '2024-01-15T15:00:00Z'),
('promo_use_005', 'promo_004', 'order_004', 'user_004', 50.00, '2024-01-20T09:00:00Z');

-- Customer Service Tickets
INSERT INTO customer_service_tickets (ticket_id, user_id, ticket_number, customer_email, customer_name, subject, message, category, priority, status, assigned_agent_id, order_id, resolution_notes, resolved_at, created_at, updated_at) VALUES 
('ticket_001', 'user_001', 'TKT-2024-001', 'alice.smith@email.com', 'Alice Smith', 'Delivery Issue', 'My order was supposed to arrive yesterday but I haven''t received it yet. Can you please check the status?', 'shipping', 'high', 'resolved', 'agent_001', 'order_001', 'Contacted shipping carrier, package was delayed due to weather. Customer notified and package delivered next day.', '2024-01-19T16:00:00Z', '2024-01-18T10:00:00Z', '2024-01-19T16:00:00Z'),
('ticket_002', 'user_002', 'TKT-2024-002', 'bob.jones@email.com', 'Bob Jones', 'Product Question', 'I''m interested in Tom Ford Oud Wood but I''m not sure about the longevity. Can you provide more details?', 'product_inquiry', 'medium', 'closed', 'agent_002', NULL, 'Provided detailed information about longevity, sillage, and notes. Customer satisfied with response.', '2024-01-19T11:00:00Z', '2024-01-18T15:00:00Z', '2024-01-19T11:00:00Z'),
('ticket_003', 'user_003', 'TKT-2024-003', 'carol.white@email.com', 'Carol White', 'Return Request', 'I received the wrong size. I ordered 50ml but received 30ml. Need to exchange.', 'returns', 'high', 'in_progress', 'agent_001', 'order_003', 'Return label sent. Awaiting return of incorrect item before shipping replacement.', NULL, '2024-01-20T09:00:00Z', '2024-01-20T14:00:00Z'),
('ticket_004', NULL, 'TKT-2024-004', 'guest@email.com', 'John Guest', 'General Inquiry', 'Do you offer samples of your fragrances before purchasing full bottles?', 'general', 'low', 'open', NULL, NULL, NULL, NULL, '2024-01-20T11:00:00Z', '2024-01-20T11:00:00Z'),
('ticket_005', 'user_005', 'TKT-2024-005', 'emma.davis@email.com', 'Emma Davis', 'Payment Issue', 'My payment was charged but my order shows as cancelled. Please help resolve this.', 'billing', 'high', 'open', 'agent_003', 'order_005', NULL, NULL, '2024-01-20T08:30:00Z', '2024-01-20T08:30:00Z');

-- Ticket Messages
INSERT INTO ticket_messages (message_id, ticket_id, sender_type, sender_name, sender_email, message_text, is_internal, created_at) VALUES 
('msg_001', 'ticket_001', 'customer', 'Alice Smith', 'alice.smith@email.com', 'My order was supposed to arrive yesterday but I haven''t received it yet. Can you please check the status?', FALSE, '2024-01-18T10:00:00Z'),
('msg_002', 'ticket_001', 'agent', 'Support Agent', 'support@fragranceshop.com', 'Hi Alice, I''m looking into your order status right now. Let me check with our shipping carrier.', FALSE, '2024-01-18T10:30:00Z'),
('msg_003', 'ticket_001', 'agent', 'Support Agent', 'support@fragranceshop.com', 'Checking with shipping partner for delivery status', TRUE, '2024-01-18T10:31:00Z'),
('msg_004', 'ticket_002', 'customer', 'Bob Jones', 'bob.jones@email.com', 'I''m interested in Tom Ford Oud Wood but I''m not sure about the longevity. Can you provide more details?', FALSE, '2024-01-18T15:00:00Z'),
('msg_005', 'ticket_002', 'agent', 'Product Expert', 'expert@fragranceshop.com', 'Tom Ford Oud Wood typically lasts 8-10 hours on skin with excellent projection for the first 4 hours. It''s one of our longest-lasting fragrances.', FALSE, '2024-01-18T16:00:00Z');

-- Newsletter Subscriptions
INSERT INTO newsletter_subscriptions (subscription_id, email, first_name, user_id, subscription_source, preferences, is_active, confirmed_at, unsubscribed_at, created_at) VALUES 
('news_001', 'alice.smith@email.com', 'Alice', 'user_001', 'account_signup', '{"new_arrivals": true, "sales": true, "exclusive_offers": true}', TRUE, '2024-01-15T09:15:00Z', NULL, '2024-01-15T09:00:00Z'),
('news_002', 'bob.jones@email.com', 'Bob', 'user_002', 'checkout', '{"new_arrivals": false, "sales": true, "exclusive_offers": true}', TRUE, '2024-01-16T11:00:00Z', NULL, '2024-01-16T10:30:00Z'),
('news_003', 'newsletter@email.com', 'Newsletter', NULL, 'footer_signup', '{"new_arrivals": true, "sales": true, "exclusive_offers": false}', TRUE, '2024-01-17T14:00:00Z', NULL, '2024-01-17T13:45:00Z'),
('news_004', 'unsubscribed@email.com', 'Former', NULL, 'popup', '{"new_arrivals": false, "sales": false, "exclusive_offers": false}', FALSE, '2024-01-10T10:00:00Z', '2024-01-18T15:00:00Z', '2024-01-10T09:45:00Z'),
('news_005', 'pending@email.com', 'Pending', NULL, 'referral', '{"new_arrivals": true, "sales": true, "exclusive_offers": true}', TRUE, NULL, NULL, '2024-01-20T12:00:00Z');

-- Inventory Tracking
INSERT INTO inventory_tracking (tracking_id, product_id, size_ml, change_type, quantity_change, quantity_after, reference_type, reference_id, notes, created_at) VALUES 
('inv_001', 'prod_001', 50, 'sale', -1, 45, 'order', 'order_001', 'Sold via order', '2024-01-15T15:00:00Z'),
('inv_002', 'prod_002', 50, 'sale', -1, 25, 'order', 'order_002', 'Sold via order', '2024-01-18T14:00:00Z'),
('inv_003', 'prod_003', 30, 'sale', -1, 55, 'order', 'order_003', 'Sold via order', '2024-01-17T16:00:00Z'),
('inv_004', 'prod_004', 50, 'reservation', -1, 22, 'order', 'order_004', 'Reserved for pending order', '2024-01-20T09:00:00Z'),
('inv_005', 'prod_001', 50, 'restock', 20, 65, 'purchase_order', 'PO-2024-001', 'Restocked from supplier', '2024-01-19T10:00:00Z'),
('inv_006', 'prod_002', 100, 'adjustment', -2, 16, 'inventory_count', 'IC-2024-001', 'Inventory discrepancy adjustment', '2024-01-20T11:00:00Z'),
('inv_007', 'prod_005', 30, 'return', 1, 36, 'return', 'RET-2024-001', 'Customer return processed', '2024-01-19T15:00:00Z'),
('inv_008', 'prod_003', 50, 'damage', -3, 39, 'quality_check', 'QC-2024-001', 'Damaged items removed from inventory', '2024-01-18T09:00:00Z');

-- Abandoned Carts
INSERT INTO abandoned_carts (abandoned_cart_id, cart_id, user_id, email, total_items, cart_value, abandoned_at, first_reminder_sent, second_reminder_sent, recovered_at, recovery_order_id) VALUES 
('abandon_001', 'cart_001', 'user_001', 'alice.smith@email.com', 2, 355.00, '2024-01-20T11:00:00Z', '2024-01-21T11:00:00Z', '2024-01-23T11:00:00Z', NULL, NULL),
('abandon_002', 'cart_002', 'user_002', 'bob.jones@email.com', 1, 255.00, '2024-01-20T12:00:00Z', '2024-01-21T12:00:00Z', NULL, '2024-01-22T10:00:00Z', 'order_002'),
('abandon_003', 'cart_003', NULL, 'guest@email.com', 1, 120.00, '2024-01-20T13:00:00Z', NULL, NULL, NULL, NULL),
('abandon_004', 'cart_004', 'user_003', 'carol.white@email.com', 1, 365.00, '2024-01-20T14:00:00Z', '2024-01-21T14:00:00Z', '2024-01-23T14:00:00Z', NULL, NULL),
('abandon_005', 'cart_005', 'user_004', 'david.brown@email.com', 1, 285.00, '2024-01-20T15:00:00Z', '2024-01-21T15:00:00Z', NULL, NULL, NULL);

-- Product Views
INSERT INTO product_views (view_id, product_id, user_id, session_id, ip_address, user_agent, referrer_url, viewed_at) VALUES 
('view_001', 'prod_001', 'user_001', NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://google.com', '2024-01-15T08:30:00Z'),
('view_002', 'prod_002', 'user_002', NULL, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'https://fragranceshop.com/categories/men', '2024-01-16T09:00:00Z'),
('view_003', 'prod_003', NULL, 'sess_12345', '192.168.1.102', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'https://instagram.com', '2024-01-17T10:30:00Z'),
('view_004', 'prod_004', 'user_004', NULL, '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://fragranceshop.com/search?q=aventus', '2024-01-18T11:45:00Z'),
('view_005', 'prod_005', 'user_005', NULL, '192.168.1.104', 'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/109.0 Firefox/118.0', 'https://facebook.com', '2024-01-19T14:15:00Z'),
('view_006', 'prod_001', NULL, 'sess_67890', '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://youtube.com', '2024-01-20T16:00:00Z'),
('view_007', 'prod_002', 'user_001', NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'https://fragranceshop.com/brands/tom-ford', '2024-01-20T17:30:00Z'),
('view_008', 'prod_003', 'user_003', NULL, '192.168.1.106', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15', 'https://fragranceshop.com', '2024-01-20T18:45:00Z');

-- Chat Tables
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id),
    agent_id VARCHAR(255),
    status VARCHAR(255) NOT NULL DEFAULT 'waiting',
    topic VARCHAR(255),
    created_at VARCHAR(255) NOT NULL,
    updated_at VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(session_id),
    sender_id VARCHAR(255) NOT NULL,
    sender_type VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(255) NOT NULL DEFAULT 'text',
    created_at VARCHAR(255) NOT NULL
);

-- Chat seed data
INSERT INTO chat_sessions (session_id, user_id, agent_id, status, topic, created_at, updated_at) VALUES 
('chat_001', 'user_001', 'agent-1', 'ended', 'product_inquiry', '2024-01-15T10:00:00Z', '2024-01-15T10:15:00Z'),
('chat_002', 'user_002', 'agent-1', 'ended', 'order_status', '2024-01-18T14:30:00Z', '2024-01-18T14:45:00Z')
ON CONFLICT (session_id) DO NOTHING;

INSERT INTO chat_messages (message_id, session_id, sender_id, sender_type, message, message_type, created_at) VALUES 
('msg_chat_001', 'chat_001', 'user_001', 'user', 'Hi, I have a question about Chanel No. 5', 'text', '2024-01-15T10:00:00Z'),
('msg_chat_002', 'chat_001', 'agent-1', 'agent', 'Hello! I\'d be happy to help you with questions about Chanel No. 5. What would you like to know?', 'text', '2024-01-15T10:01:00Z'),
('msg_chat_003', 'chat_001', 'user_001', 'user', 'What are the main notes and how long does it last?', 'text', '2024-01-15T10:02:00Z'),
('msg_chat_004', 'chat_001', 'agent-1', 'agent', 'Chanel No. 5 is an aldehyde floral fragrance with top notes of aldehydes, ylang-ylang, and neroli. The heart features jasmine, rose, and lily of the valley, while the base has sandalwood, vanilla, and amber. It typically lasts 8+ hours on skin.', 'text', '2024-01-15T10:03:00Z'),
('msg_chat_005', 'chat_002', 'user_002', 'user', 'I wanted to check on my recent order status', 'text', '2024-01-18T14:30:00Z'),
('msg_chat_006', 'chat_002', 'agent-1', 'agent', 'Of course! Can you please provide your order number so I can look that up for you?', 'text', '2024-01-18T14:31:00Z')
ON CONFLICT (message_id) DO NOTHING;