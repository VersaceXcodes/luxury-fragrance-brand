# Motion Design System - Visual Guide

## 🎬 Animation Showcase

### 1. PAGE TRANSITIONS - "Nocturne Veil"
```
┌─────────────────────────────────────┐
│  Current Page                       │
│  ⤓ Scale: 1.0 → 0.98               │
│  ⤓ Opacity: 1 → 0                  │
│  ⤓ Duration: 0.4s                  │
│                                     │
│  [Deep Charcoal Fade]               │
│                                     │
│  ⤑ New Page Appears                │
│  ⤑ Scale: 0.98 → 1.0               │
│  ⤑ Opacity: 0 → 1                  │
│  ⤑ Duration: 0.6s                  │
└─────────────────────────────────────┘
```

### 2. SCROLL REVEAL - "Ethereal Rise"
```
Before Viewport:
┌─────────────────┐
│                 │
│                 │  ← Element Hidden
│    [Hidden]     │     Y: +30px
│                 │     Opacity: 0
│                 │
└─────────────────┘

Enters Viewport:
┌─────────────────┐
│                 │
│    ⤒ Rises      │  ← Element Reveals
│   [Visible]     │     Y: 0px
│                 │     Opacity: 1
│                 │     Duration: 0.6s
└─────────────────┘
```

### 3. PRODUCT CARD - "Museum" Hover
```
Rest State:
┌──────────────────────┐
│  [Product Image]     │  Scale: 1.0
│                      │  Glow: None
│  Product Name        │  Color: White
│  €120.00            │
└──────────────────────┘

Hover State:
┌──────────────────────┐
│  [Product Image]     │  Scale: 1.05 ✨
│     ✨ Gold Glow     │  Shadow: Pulsing
│  Product Name        │  Color: Gold #D4AF37
│  €120.00            │  Transition: 0.3s
└──────────────────────┘
      ╱╲╱╲╱╲
   Pulsing Glow
```

### 4. MAGNETIC BUTTON
```
Mouse Far Away:
     🖱️ (cursor)
     
     
     [  Button  ]  ← Normal position


Mouse Nearby (within 100px):
     🖱️ (cursor)
      ⤶
     [  Button  ]  ← Pulls towards cursor
                      Spring physics!

On Click:
     🖱️ 💥 (click)
      ╱│╲
     ⚡⚡⚡  Gold Ripple
    [Button]  ← Ripple expands
               from click point
```

### 5. CART DRAWER - "Ritual" Add
```
Closed:
┌─────────────────────────────────┐
│                                 │
│   Main Content                  │  [Cart Hidden]
│                                 │      ⟶
└─────────────────────────────────┘

Opening:
┌────────────────────┬────────────┐
│                    │ ⤶          │
│   Main Content     │ [Cart]     │
│                    │  Slides    │  Spring Physics:
└────────────────────┴────────────┘  Damping: 30
     [Backdrop Fades In]             Stiffness: 80

Items Appear:
┌────────────────────┬────────────┐
│ [Backdrop]         │ [Cart]     │
│  Opacity: 0.5      │            │
│                    │ Item 1 ⤶   │  Staggered
│                    │ Item 2 ⤶   │  0.05s delay
│                    │ Item 3 ⤶   │  each item
└────────────────────┴────────────┘
```

### 6. HERO PARALLAX
```
Scroll Position: 0
┌─────────────────────────────────┐
│  HERO BACKGROUND (Position 0)   │
│                                 │
│      Hero Text (Position 0)     │  ← Text/Background
│                                 │     aligned
└─────────────────────────────────┘

Scroll Position: 100px ↓
┌─────────────────────────────────┐
│  Background (moved 37.5px)      │  ← Moves slower
│                                 │
│      Text (moved 75px)          │  ← Moves faster
│                                 │     (2x speed)
└─────────────────────────────────┘
         Creates 3D Depth!
```

---

## 🎨 Color Palette

```
Deep Charcoal: #1A1A1A  ████████
Gold Accent:   #D4AF37  ████████
White:         #FFFFFF  ████████
```

---

## ⚡ Performance Metrics

```
Animation Targets (GPU Accelerated):
✅ transform: translateX, translateY, scale
✅ opacity
❌ AVOID: width, height, left, top (causes reflow)

Frame Rate Target: 60 FPS
Animation Duration: 0.6s - 0.8s (luxury feel)
Easing: Cubic Bezier [0.25, 0.1, 0.25, 1.0]
```

---

## 📐 Timing Diagram

```
Timeline (seconds):
0.0    0.2    0.4    0.6    0.8    1.0
├──────┼──────┼──────┼──────┼──────┤

Hero Reveal:
Image    ▓▓▓▓▓▓
Heading       ▓▓▓▓▓▓
Text               ▓▓▓▓▓▓
Buttons                 ▓▓▓▓▓▓

Product Cards:
Card 1   ▓▓▓▓▓▓
Card 2    ▓▓▓▓▓▓
Card 3     ▓▓▓▓▓▓
Card 4      ▓▓▓▓▓▓

Legend:
▓ = Animating
```

---

## 🎯 User Journey with Animations

```
1. Landing → Page Transition (0.6s)
   └─> Hero fades in
   
2. Scroll Down → Parallax Effect
   └─> Background moves slower
   └─> Text moves faster
   
3. Products Enter → Scroll Reveal (0.6s each)
   └─> Staggered 0.1s delay
   └─> Ethereal rise effect
   
4. Hover Product → Museum Effect
   └─> Image zooms to 1.05
   └─> Gold glow pulses
   └─> Title turns gold (0.3s)
   
5. Click "Add to Cart" → Magnetic Button
   └─> Button pulls towards cursor
   └─> Gold ripple on click
   └─> Cart drawer slides in (Spring)
   
6. Cart Opens → Ritual Animation
   └─> Drawer springs from right
   └─> Items slide in staggered
   └─> Backdrop fades to 50%
   
7. Navigate Away → Page Transition
   └─> Current page scales down
   └─> Fades to charcoal
   └─> New page scales up
```

---

## 💎 The "Digital Weight" Philosophy

Every animation follows these principles:

1. **Heavy** - Spring physics with high damping (30)
2. **Smooth** - Luxury easing curves [0.25, 0.1, 0.25, 1.0]
3. **Expensive** - Longer durations (0.6-0.8s vs typical 0.3s)
4. **Orchestrated** - Staggered reveals (0.1s delays)
5. **Cinematic** - Parallax, depth, and dimensional effects

---

## 🔧 Quick Reference

### Import Statement
```typescript
import { 
  ScrollReveal, 
  MagneticButton, 
  MuseumProductCard 
} from '@/components/ui/motion-components';
```

### Basic Usage
```tsx
// Scroll Reveal
<ScrollReveal delay={0.2}>
  <YourComponent />
</ScrollReveal>

// Magnetic Button
<MagneticButton onClick={handleClick}>
  Click Me
</MagneticButton>

// Museum Card
<MuseumProductCard>
  <ProductCard />
</MuseumProductCard>
```

---

**Status**: ✅ All Animations Implemented & Production Ready
