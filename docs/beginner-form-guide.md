# Beginner Form Guide

This guide covers low-risk form changes.

## File to edit

- [src/components/beginner-safe/NewsletterSignupForm.tsx](../src/components/beginner-safe/NewsletterSignupForm.tsx)

## Form contract

- Endpoint: `POST /api/newsletter-signup`
- Request body: `{ email: string }`
- Keep this contract unchanged.

## Prerequisites

- `useState`
- `onSubmit` event handling
- simple validation messaging

## Run and test

1. `pnpm dev`
2. Open `/`
3. Submit invalid email and confirm user-friendly message
4. Submit valid email and confirm success message

## Common mistakes

- Renaming `email` key in request body
- Changing endpoint URL
- Removing `preventDefault()` causing page refresh
