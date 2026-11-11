ARG ESPOCRM_VERSION=10.0.12
FROM espocrm/espocrm:${ESPOCRM_VERSION}-fpm AS app

FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf

# Copia inmutable del código oficial de la MISMA versión.
COPY --from=app /var/www/html /var/www/html

# Branding de presentación: el bundle de templates incluye el footer con la marca original.
# Se sustituye solo el texto visible; la licencia sigue en #About y LICENSE.txt.
RUN sed -i 's/Powered by EspoCRM/MATMAX CRM/g; s/EspoCRM, Inc\./MATMAX CRM/g' /var/www/html/client/lib/templates.tpl

COPY nginx/spa.conf /etc/nginx/conf.d/spa.conf
COPY nginx/native.conf /etc/nginx/conf.d/native.conf

EXPOSE 8080 8081
