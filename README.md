# Bezot Corp Site

Official website for Bezot Corp.

## Stack

- React
- TypeScript
- Vite
- React Router
- Custom prerender pipeline
- JSON-driven content
- Cascading content indexes

## Development

Run the development server:

    pnpm install
    pnpm dev

## Build

Create a production build:

    pnpm build

The build generates:

- prerendered static pages
- sitemap.xml
- robots.txt
- .htaccess
- 404.html

## Content

The source content lives in:

    content/index.json
    content/pages/index.json
    content/pages/<page-id>/index.json
    content/pages/<page-id>/<locale>.json
    content/blog/index.json
    content/blog/posts/<date>/<post>.json

The generated TypeScript content lives in:

    src/generated/site.ts

Generated files must not be edited manually.

## Content validation

Content indexes are validated before content generation:

    pnpm content:validate

The build runs validation automatically before generating content.

## Deployment

Deployment is handled by GitHub Actions.

On every push to main:

1. Dependencies are installed.
2. Content indexes are validated.
3. Content is generated.
4. The site is built and prerendered.
5. The dist folder is uploaded to OVH.
