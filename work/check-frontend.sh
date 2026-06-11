#!/bin/bash
if grep -q "?????" /var/www/demogo-preview/assets/main-CIf18MJb.js; then
  echo "FOUND"
else
  echo "NOT FOUND"
fi
ls -la /var/www/demogo-preview/assets/