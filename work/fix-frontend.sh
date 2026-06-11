#!/bin/bash
rm -f /var/www/demogo-preview/assets/main-*.js
rm -f /var/www/demogo-preview/assets/main-*.css
unzip -oq /tmp/demogo-site-preview.zip -d /tmp/site-preview-new
cp -r /tmp/site-preview-new/* /var/www/demogo-preview/
ls /var/www/demogo-preview/assets/
echo "=== Done ==="