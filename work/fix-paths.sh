#!/bin/bash
cd /var/www/demogo-preview/d/try-e632b536
sed -i 's|src="/assets/|src="./assets/|g' index.html
sed -i 's|href="/assets/|href="./assets/|g' index.html
cat index.html
