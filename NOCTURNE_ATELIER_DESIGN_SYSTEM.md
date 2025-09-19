# Nocturne Atelier Design System

## Brand Overview

**Brand Name**: Nocturne Atelier  
**Tagline**: "Scent After Dark"  
**Positioning**: Refined, sensual, modern luxury perfume brand  
**Target Audience**: Style-conscious 25-45, mobile-first users who appreciate artisanal quality

## Visual Identity

### Color Palette

#### Primary Colors
- **Onyx**: `#0E0E0E` - Primary dark, used for text and dramatic backgrounds
- **Porcelain**: `#F8F6F2` - Primary light, used for backgrounds and light text
- **Champagne**: `#D4C5A9` - Accent color, used for highlights and interactive elements
- **Warm Taupe**: `#7A6A56` - Secondary color, used for muted text and borders

#### Semantic Color Roles
```css
/* Foreground */
--color-fg-primary: var(--nocturne-onyx);
--color-fg-secondary: var(--nocturne-warm-taupe);
--color-fg-muted: #A8A29E;
--color-fg-inverse: var(--nocturne-porcelain);

/* Background */
--color-bg-primary: var(--nocturne-porcelain);
--color-bg-secondary: #FFFFFF;
--color-bg-muted: #F5F5F4;
--color-bg-inverse: var(--nocturne-onyx);

/* Interactive */
--color-interactive-primary: var(--nocturne-onyx);
--color-interactive-primary-hover: var(--nocturne-warm-taupe);
--color-interactive-secondary: var(--nocturne-champagne);
--color-interactive-secondary-hover: #C4B59A;
```

### Typography

#### Font Families
- **Headings**: Playfair Display (serif) - Elegant, sophisticated
- **Body**: Inter (sans-serif) - Clean, readable, modern

#### Type Scale
- **H1**: 64px/72px, Bold, -0.02em letter-spacing
- **H2**: 40px/48px, Semibold, -0.015em letter-spacing  
- **H3**: 28px/36px, Semibold, -0.01em letter-spacing
- **Subtitle**: 20px/28px, Medium
- **Body**: 16px/24px, Regular
- **Caption**: 12px/16px, Regular, 0.01em letter-spacing

#### Responsive Typography
```css
/* Mobile (375px) */
H1: 64px/72px
H2: 40px/48px

/* Tablet (768px) */
H1: 80px/88px
H2: 48px/56px

/* Desktop (1280px+) */
H1: 96px/104px
H2: 56px/64px
```

### Spacing System

8-point grid system for consistent spacing:
- **Base unit**: 8px
- **Common values**: 8px, 16px, 24px, 32px, 48px, 64px, 80px
- **Container max-widths**: 1112px (desktop), 1280px (large)
- **Gutters**: 16px (mobile), 20px (tablet), 24px (desktop)

### Layout & Grid

#### Breakpoints
- **Mobile**: 375px (primary design target)
- **Tablet**: 768px
- **Desktop**: 1280px  
- **Large Desktop**: 1440px

#### Container System
```css
.nocturne-container {
  width: 100%;
  max-width: var(--container-desktop); /* 1112px */
  margin: 0 auto;
  padding: 0 var(--gutter-mobile); /* 16px */
}

@media (min-width: 768px) {
  .nocturne-container {
    padding: 0 var(--gutter-tablet); /* 20px */
  }
}

@media (min-width: 1280px) {
  .nocturne-container {
    max-width: var(--container-large); /* 1280px */
    padding: 0 var(--gutter-desktop); /* 24px */
  }
}
```

### Border Radius
- **Small**: 4px - Form elements
- **Medium**: 8px - Buttons, inputs
- **Large**: 16px - Cards, modals
- **Full**: 999px - Pills, badges

### Shadows
- **Subtle**: `0 1px 2px 0 rgba(14, 14, 14, 0.05)`
- **Small**: `0 1px 3px 0 rgba(14, 14, 14, 0.1), 0 1px 2px -1px rgba(14, 14, 14, 0.1)`
- **Medium**: `0 4px 6px -1px rgba(14, 14, 14, 0.1), 0 2px 4px -2px rgba(14, 14, 14, 0.1)`
- **Large**: `0 10px 15px -3px rgba(14, 14, 14, 0.1), 0 4px 6px -4px rgba(14, 14, 14, 0.1)`
- **Elevated**: `0 20px 25px -5px rgba(14, 14, 14, 0.1), 0 8px 10px -6px rgba(14, 14, 14, 0.1)`

### Motion & Animation

#### Duration
- **Fast**: 120ms - Micro-interactions
- **Normal**: 200ms - Standard transitions
- **Slow**: 300ms - Complex animations

#### Easing
- **Ease Out**: `cubic-bezier(0.2, 0.8, 0.2, 1)` - Default
- **Ease In**: `cubic-bezier(0.4, 0, 1, 1)` - Exits
- **Ease In Out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Complex

## Component Library

### Buttons

#### Variants
- **Primary**: Dark background, light text
- **Secondary**: Champagne background, dark text  
- **Outline**: Transparent background, border
- **Ghost**: Transparent background, no border
- **Link**: Text-only with underline

#### Sizes
- **Small**: 36px height, 12px padding
- **Medium**: 44px height, 16px padding (default)
- **Large**: 52px height, 20px padding

#### States
- **Default**: Base styling
- **Hover**: Subtle color shift, scale transform
- **Active**: Pressed state with scale
- **Disabled**: 50% opacity, no interactions
- **Focus**: Ring outline for accessibility

### Cards

#### Structure
- **Container**: White background, subtle border, 16px border radius
- **Header**: Optional title and description area
- **Content**: Main content area with consistent padding
- **Footer**: Actions or metadata area

#### Variants
- **Default**: Standard card styling
- **Elevated**: Enhanced shadow on hover
- **Interactive**: Hover effects for clickable cards

### Product Cards

#### Features
- **Image**: Aspect ratio 1:1, hover zoom effect
- **Badges**: New, Bestseller, Limited Edition
- **Family Tag**: Fragrance family classification
- **Rating**: Star rating with review count
- **Price Range**: Multiple size options
- **Quick Actions**: Wishlist toggle, quick add to cart
- **Size Selector**: 10ml, 50ml, 100ml options

#### Interactions
- **Hover**: Card elevation, image zoom, overlay appearance
- **Quick Add**: Size selection and add to cart without navigation
- **Wishlist**: Heart icon toggle with animation

### Forms

#### Input Fields
- **Height**: 48px standard
- **Padding**: 12px horizontal, 12px vertical
- **Border**: 1px solid, rounded corners
- **Focus**: Ring outline, border color change
- **Error**: Red border, error message below

#### Validation
- **Real-time**: Validate on blur/change
- **Error States**: Clear messaging, visual indicators
- **Success States**: Subtle confirmation

### Navigation

#### Top Navigation
- **Height**: 64px fixed
- **Background**: Semi-transparent with backdrop blur
- **Logo**: Brand mark with company name
- **Menu**: Horizontal navigation with dropdowns
- **Search**: Integrated search bar
- **Actions**: Cart, account, wishlist icons

#### Mobile Navigation
- **Hamburger Menu**: Slide-out drawer
- **Full-Screen**: Overlay navigation
- **Touch Targets**: Minimum 44px for accessibility

## Content Strategy

### Voice & Tone
- **Sophisticated**: Elevated language without pretension
- **Intimate**: Personal, whispered secrets
- **Artisanal**: Emphasis on craft and quality
- **Sensual**: Evocative, emotional connection

### Microcopy Examples
- **Empty Cart**: "It smells lonely in here."
- **Free Shipping**: "€{remaining} to free EU shipping"
- **Product Assurance**: "30-day returns on unopened items"
- **Newsletter**: "Join the Atelier"
- **Hero**: "Scent After Dark"

### Product Information
- **Olfactory Pyramid**: Top, Heart, Base notes
- **Longevity**: Light (2-4h), Moderate (4-6h), Long (6-8h), Very Long (8h+)
- **Sillage**: Intimate, Moderate, Strong, Enormous
- **Families**: Citrus, Floral, Amber, Woody, Green

## Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio
- **Focus Management**: Visible focus indicators
- **Touch Targets**: Minimum 44×44px
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Semantic HTML, ARIA labels
- **Alt Text**: Descriptive image alternatives

### Implementation
- **Focus Rings**: 2px outline with offset
- **Skip Links**: Navigation shortcuts
- **Headings**: Proper hierarchy (H1 → H2 → H3)
- **Form Labels**: Associated with inputs
- **Error Messages**: Announced to screen readers

## Performance

### Core Web Vitals Targets
- **LCP**: < 2.5s (Largest Contentful Paint)
- **FID**: < 100ms (First Input Delay)  
- **CLS**: < 0.1 (Cumulative Layout Shift)

### Optimization Strategies
- **Images**: WebP format, lazy loading, responsive sizes
- **Fonts**: Preload critical fonts, font-display: swap
- **CSS**: Critical path optimization, unused code removal
- **JavaScript**: Code splitting, tree shaking
- **Caching**: Service worker, CDN optimization

## Brand Applications

### Product Catalog
- **Aurora No. 1**: Citrus/Floral - €45/85/120
- **Midnight Saffron**: Amber/Spice - €50/90/130
- **Coastal Fig**: Green/Woody - €48/88/125
- **Cinder Oud**: Woody/Smoky - €55/95/140
- **Citrus Atlas**: Citrus/Aromatic - €42/82/115

### Trust Indicators
- **Cruelty-Free**: Never tested on animals
- **IFRA Compliant**: International safety standards
- **Recyclable Packaging**: Sustainable materials
- **Free EU Shipping**: Orders over €120

### User Experience Flows

#### Discovery Flow
1. **Homepage Hero**: "Scent After Dark" introduction
2. **Notes Explorer**: Browse by fragrance families
3. **Product Grid**: Filter and sort options
4. **Product Detail**: Olfactory pyramid, reviews
5. **Add to Cart**: Size selection, quantity
6. **Checkout**: Streamlined purchase flow

#### Sample Program
1. **Try 10ml First**: Risk-free discovery
2. **Sample Sets**: Curated collections
3. **Full Size Upgrade**: Seamless transition

## Implementation Guidelines

### CSS Architecture
- **CSS Custom Properties**: Design tokens
- **Utility Classes**: Consistent spacing, typography
- **Component Classes**: Reusable UI patterns
- **Responsive Design**: Mobile-first approach

### Component Development
- **React + TypeScript**: Type-safe components
- **Storybook**: Component documentation
- **Testing**: Unit tests, accessibility tests
- **Performance**: Bundle size monitoring

### Quality Assurance
- **Design Review**: Figma to code comparison
- **Cross-browser Testing**: Modern browser support
- **Device Testing**: Mobile, tablet, desktop
- **Accessibility Audit**: WCAG compliance check

This design system ensures consistent, accessible, and performant implementation of the Nocturne Atelier brand across all digital touchpoints.