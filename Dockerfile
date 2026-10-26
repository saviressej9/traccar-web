# Build the Traccar Family UI
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Traccar's own server fills these placeholders in when it serves the frontend.
# This image serves the build straight from Nginx, so nothing does, and the
# browser tab reads "${title}". Substituting before the build rather than after
# keeps the service worker's precache hashes matching what is actually served.
RUN sed -i \
      -e 's|${title}|Los Rivasini Traccar|g' \
      -e 's|${description}|Family location tracking|g' \
      -e 's|${colorPrimary}|#1a237e|g' \
      index.html \
 && sed -i \
      -e 's|${title}|Los Rivasini Traccar|g' \
      -e 's|${description}|Los Rivasini Traccar|g' \
      -e 's|${colorPrimary}|#1a237e|g' \
      vite.config.js

RUN npm run build

# Serve the frontend using Nginx
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx-family.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
