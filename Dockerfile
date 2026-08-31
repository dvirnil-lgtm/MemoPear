FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_MEASUREMENT_ID=""
ARG VITE_GOOGLE_OAUTH_CLIENT_ID=""
ARG VITE_HUBSPOT_CLIENT_ID=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID \
    VITE_HUBSPOT_CLIENT_ID=$VITE_HUBSPOT_CLIENT_ID

RUN npm run build

FROM nginx:alpine
# Origin of the blog SEO server-renderer (functions/blogSsr.js). Override this
# on the Cloud Run service if the Firebase project / region changes. The
# nginx:alpine entrypoint runs envsubst over templates in /etc/nginx/templates
# at startup; NGINX_ENVSUBST_FILTER restricts substitution to this one variable
# so nginx's own runtime variables ($uri, $request_uri, …) are left intact.
ENV BLOG_SSR_ORIGIN=https://us-central1-my-new-memopear.cloudfunctions.net
ENV NGINX_ENVSUBST_FILTER=BLOG_SSR_ORIGIN
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
