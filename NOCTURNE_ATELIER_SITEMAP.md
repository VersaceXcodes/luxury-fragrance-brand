# Nocturne Atelier - Sitemap & User Flows

## Brand Identity
- **Name**: Nocturne Atelier
- **Tagline**: "Scent After Dark"
- **Vibe**: Refined, sensual, modern with minimal layouts and generous negative space
- **Target**: Style-conscious 25-45, mobile-first, skims copy, compares notes and longevity

## Information Architecture

### Primary Navigation
```
Home / Shop / About / Journal / FAQ / Contact
```

### Site Structure
```
├── Home (/)
│   ├── Hero: "Scent After Dark"
│   ├── Bestsellers Carousel
│   ├── Notes Explorer
│   ├── Brand Story
│   ├── Reviews
│   └── Newsletter Signup
│
├── Shop (/products)
│   ├── Grid View (default)
│   ├── Filters (Family, Gender, Size, Price, Notes)
│   ├── Sort (Newest, Price, Popularity, Rating)
│   └── Quick Add to Cart
│
├── Product Detail (/products/:id)
│   ├── Image Gallery (pinch-zoom)
│   ├── Product Info & Hook
│   ├── Olfactory Pyramid (Top/Heart/Base)
│   ├── Longevity & Sillage
│   ├── Size Selector (10/50/100ml)
│   ├── Quantity Stepper
│   ├── Add to Cart (sticky)
│   ├── Reviews & Ratings
│   └── "Pairs well with..." recommendations
│
├── Cart (/cart)
│   ├── Line Items
│   ├── Free Shipping Progress (€120 threshold)
│   ├── Gift Wrap Option
│   ├── Promo Code
│   └── Checkout CTA
│
├── Checkout (/checkout)
│   ├── Address Form
│   ├── Shipping Method (2-5 business days)
│   ├── Payment (Apple Pay/Google Pay/Card)
│   └── Order Summary
│
├── About (/about)
│   ├── Brand Story
│   ├── Craftsmanship
│   ├── Sustainability
│   └── Team
│
├── Journal (/journal)
│   ├── Fragrance Education
│   ├── Behind the Scenes
│   └── Seasonal Collections
│
├── Account (/account)
│   ├── Dashboard
│   ├── Order History
│   ├── Wishlist
│   └── Profile Settings
│
└── System Pages
    ├── Search Results (/search)
    ├── 404 Error
    ├── Empty States
    └── Loading States
```

### Footer Links
```
├── Customer Care
│   ├── Shipping & Returns
│   ├── Size Guide
│   ├── FAQ
│   └── Contact
│
├── Company
│   ├── About Us
│   ├── Careers
│   ├── Press
│   └── Sustainability
│
├── Legal
│   ├── Privacy Policy
│   ├── Terms of Service
│   └── Cookie Policy
│
└── Social
    ├── Instagram
    └── TikTok
```

## Key User Flows

### Flow 1: Discovery → Purchase
```
Home → Shop Grid → Apply Filters → PDP → Size Selection → Add to Cart → Cart Review → Checkout → Order Confirmation
```

**Success Metrics**: PDP→Add to Cart ≥12%, Checkout completion ≥65% desktop / ≥55% mobile

### Flow 2: Notes Explorer
```
Home → Notes Explorer → Filter by Family (Citrus/Floral/Amber/Woody/Green) → PDP → Purchase
```

### Flow 3: Sample First (Try Before Buy)
```
PDP → Size Selector (10ml) → Add to Cart → Checkout
OR
PDP → "Try 10ml first" CTA → Sample Cart → Checkout
```

### Flow 4: Gift Experience
```
PDP → Add to Cart → Cart → Gift Wrap Toggle → Checkout → Gift Message → Order Confirmation
```

### Flow 5: Empty State Recovery
```
Empty Cart → "It smells lonely in here" → Browse Bestsellers → PDP → Add to Cart
```

## Search & Filter System

### Search Features
- Autosuggest (product names, notes, families)
- Recent searches
- Quick filters
- Voice search (mobile)

### Filter Categories
- **Family**: Citrus, Floral, Amber, Woody, Green
- **Gender**: Unisex, Feminine, Masculine  
- **Size**: 10ml, 50ml, 100ml
- **Price**: €0-50, €50-100, €100-150, €150+
- **Notes**: Top/Heart/Base note tags
- **Features**: New, Bestseller, Limited Edition

## Sample Product Catalog

### Core Collection (5 SKUs)
1. **Aurora No. 1** (Citrus/Floral) - €45/85/120
2. **Midnight Saffron** (Amber/Spice) - €50/90/130  
3. **Coastal Fig** (Green/Woody) - €48/88/125
4. **Cinder Oud** (Woody/Smoky) - €55/95/140
5. **Citrus Atlas** (Citrus/Aromatic) - €42/82/115

### Product Attributes
- Longevity: Light (2-4h), Moderate (4-6h), Long (6-8h), Very Long (8h+)
- Sillage: Intimate, Moderate, Strong, Enormous
- Season: Spring, Summer, Fall, Winter, Year-round
- Occasion: Day, Evening, Special, Casual

## Responsive Breakpoints
- **Mobile**: 375px (primary design target)
- **Tablet**: 768px 
- **Desktop**: 1280px
- **Large Desktop**: 1440px

## Performance Targets
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Mobile Performance**: >90 Lighthouse score
- **Conversion Funnel**: 
  - Homepage → PDP: >25%
  - PDP → Add to Cart: >12%
  - Cart → Checkout: >80%
  - Checkout Completion: >65% desktop, >55% mobile

## Accessibility Requirements
- WCAG 2.1 AA compliance
- Contrast ratio ≥4.5:1
- 44×44px minimum touch targets
- Keyboard navigation support
- Screen reader optimization
- Focus management