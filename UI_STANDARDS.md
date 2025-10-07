# FuckDB UI Standards

This document outlines the UI component standards and best practices for the FuckDB project.

## Button Standards

All buttons across the application must follow these consistent styling rules for a cohesive user experience.

### Standard Button Pattern

```tsx
<Button size="lg" className="rounded-lg" asChild>
  <Link href="/path" className="inline-flex items-center">
    Button Text
  </Link>
</Button>
```

### Button Variants

#### Primary Button (default)
```tsx
<Button size="lg" className="rounded-lg" asChild>
  <Link href="/path" className="inline-flex items-center">
    Primary Action
  </Link>
</Button>
```

#### Secondary/Outline Button
```tsx
<Button size="lg" variant="outline" className="rounded-lg" asChild>
  <Link href="/path" className="inline-flex items-center">
    Secondary Action
  </Link>
</Button>
```

#### Ghost Button (for navigation)
```tsx
<Button size="lg" variant="ghost" className="rounded-lg" asChild>
  <Link href="/path" className="inline-flex items-center">
    Navigation Link
  </Link>
</Button>
```

#### Button with Icon
```tsx
<Button size="lg" className="rounded-lg" asChild>
  <Link href="/path" className="inline-flex items-center">
    Action Text <ArrowRight className="ml-2 h-4 w-4" />
  </Link>
</Button>
```

#### Form Submit Button
```tsx
<Button
  type="submit"
  size="lg"
  className="w-full rounded-lg"
  loading={isLoading}
  loadingText="Processing..."
>
  Submit
</Button>
```

### Key Properties

1. **Size**: Always use `size="lg"` for consistent button sizing
2. **Border Radius**: Always use `rounded-lg` for smooth, prominent corners
3. **Text Size**: Buttons use `text-base` (16px) as defined in the base Button component
4. **Flex Layout**: Use `inline-flex items-center` on Links for proper text and icon alignment
5. **Width**: Buttons should fit their content naturally without fixed widths (except form buttons which use `w-full`)
6. **Icons**: When using icons, add `ml-2` (margin-left) for proper spacing

### Button States

The Button component automatically handles these states:
- **Loading**: Use the `loading` prop with optional `loadingText`
- **Disabled**: Automatically styled when `disabled={true}`
- **Hover**: Smooth hover transitions built-in
- **Active**: Scale animation (`active:scale-[0.98]`) for tactile feedback
- **Focus**: Visible focus ring for accessibility

### Examples in the Codebase

- **Navigation Bar**: `/apps/web/app/page.tsx` - Lines 20-25
- **Hero Section**: `/apps/web/app/page.tsx` - Lines 46-53
- **CTA Section**: `/apps/web/app/page.tsx` - Lines 170-174
- **Login Form**: `/apps/web/app/login/page.tsx` - Lines 172-180
- **Signup Form**: `/apps/web/app/signup/page.tsx` - Lines 311-319

### DO

- Use `size="lg"` for all buttons
- Use `rounded-lg` for border radius
- Use `inline-flex items-center` on Links within buttons
- Use `w-full` for form submit buttons
- Use the `loading` prop for async actions
- Include `loadingText` for better UX during loading states

### DO NOT

- Do not use fixed minimum widths unless absolutely necessary for design purposes
- Do not use different text sizes for buttons
- Do not use `rounded-md`, `rounded-sm`, or other border radius values
- Do not skip the `inline-flex items-center` class on Links within buttons
- Do not use different button sizes (sm, default, xl) for any actions
- Do not create custom button components that deviate from these standards

## Typography

### Buttons
- **Button Text**: 16px (`text-base`)
- **Font Weight**: medium (as defined in Button component)
- **Text Transform**: None (use natural case)

### Authentication Pages
- **Card Headings** (Login/Signup): 30px (`text-3xl font-bold`)
  - Example: "Welcome Back", "Create Account"
- **Card Descriptions**: 16px (`text-base`)
  - Example: "Enter your email and password to access your account."
- **Form Labels**: 16px (`text-base font-medium`)
- **Input Fields**: 
  - Height: `h-12` (48px) for better touch targets
  - No icons inside inputs for cleaner appearance
  - Eye icon only for password visibility toggle
- **Form Elements**:
  - Remember Me checkbox with "Forgot Your Password?" link (right-aligned) on login page
  - Terms and Conditions checkbox on signup page
- **Submit Buttons**:
  - Full width: `w-full`
  - Height: `h-12` (48px)
  - Rounded corners: `rounded-lg`
  - Text: "Log In" or "Create Account"
- **Navigation Links**:
  - Bottom of card: "Don't Have An Account? Register Now." (login) / "Already Have An Account? Login Now." (signup)
  - Bold styling for action link: `font-bold text-foreground`
  - Muted text for question part: `text-muted-foreground`

## Spacing

- **Button Groups**: Use `gap-4` for spacing between adjacent buttons
- **Icon Spacing**: Use `ml-2` for icons following text
- **Form Button Margins**: Use consistent spacing with form fields

## Accessibility

All buttons follow these accessibility best practices:
- Visible focus indicators with ring effect
- Proper disabled states with reduced opacity
- Loading states with visual feedback
- Semantic HTML with proper button/link elements
- Descriptive text for screen readers

---

Last Updated: October 2, 2025

