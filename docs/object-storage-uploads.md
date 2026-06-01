# Object Storage Uploads

Last updated: 2026-05-28

## What Changed

- `POST /api/uploads` accepts authenticated, CSRF-protected multipart uploads.
- Files are tenant-scoped by company id and audited as `file.upload`.
- Supabase Storage is used when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.
- Local development falls back to private `.data/uploads` metadata and files.
- `GET /api/uploads?companyId=<id>&key=<objectKey>` returns a short-lived Supabase signed URL or serves the private local file.

## Covered Screens

- HR document library and document detail replacements.
- HR employee profile/new employee documents and profile photos.
- Employee portal documents, leave attachments, and allowance receipts.
- Project thumbnails and task attachments/evidence.
- Dataset file fields.
- HR messenger photos and voice notes.
- Warehouse/resource photos.

`npm run check:security` fails if these covered screens add new `readAsDataURL` browser payload storage.

## Production Setup

- Create a private Supabase Storage bucket named by `WISEFLOW_UPLOAD_BUCKET`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Set `NEXT_PUBLIC_APP_URL` so download URLs use the production origin.
- Keep local fallback paths unset in serverless production unless the runtime provides durable private storage.
