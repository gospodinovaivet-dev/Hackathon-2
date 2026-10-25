# kuso (JA Hack 2026) builds this file; a Dockerfile takes priority over package.json.
# It serves the single-file app on 0.0.0.0:$PORT. AI requests go to the chill-ai Supabase
# function, so no AI key is needed here: never pass ANTHROPIC_API_KEY to this service.
FROM node:22-alpine
RUN apk add --no-cache python3
WORKDIR /app
COPY . .
# Download the pinned browser libraries once, at build time
RUN python3 scripts/setup.py
ENV PORT=8080
EXPOSE 8080
# Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY at start, so changing them
# needs only a restart. Only public/index.html is served.
CMD python3 scripts/setup.py && node build.js --configured && mkdir -p public \
 && cp dist/chillcheck.local.html public/index.html \
 && exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory public
