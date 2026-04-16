# Beginner UI Guide

This guide is for teammates implementing UI-only tasks.

## Safe edit zones

- [src/components/beginner-safe](../src/components/beginner-safe)
- [src/content](../src/content)
- [src/app/about/page.tsx](../src/app/about/page.tsx)
- [src/app/faq/page.tsx](../src/app/faq/page.tsx)

## Do not edit

- [src/app/api](../src/app/api)
- [src/lib/services](../src/lib/services)
- [prisma/schema.prisma](../prisma/schema.prisma)

## Pattern example

Use existing component contracts.

Example from lab card:
- keep prop names `lab.labName`, `lab.recruitingUndergrads`, `lab.updatedAt`
- only adjust presentation and copy

## Definition of done checklist

- Works on mobile and desktop
- Last-updated label remains visible
- No TypeScript errors
- No API path changes
