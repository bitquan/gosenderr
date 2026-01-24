#!/bin/bash
# Migrate Next.js imports to React Router equivalents

APP_DIR=$1

if [ -z "$APP_DIR" ]; then
  echo "Usage: $0 <app-directory>"
  exit 1
fi

echo "Migrating $APP_DIR from Next.js to React Router..."

# Replace next/navigation imports
find "$APP_DIR/src" -type f -name "*.tsx" -o -name "*.ts" | while read file; do
  # Replace useRouter, useSearchParams, usePathname imports
  sed -i '' "s/import { useRouter } from 'next\/navigation'/import { useNavigate } from 'react-router-dom'/g" "$file"
  sed -i '' "s/import { useRouter, useSearchParams } from 'next\/navigation'/import { useNavigate, useSearchParams } from 'react-router-dom'/g" "$file"
  sed -i '' "s/import { usePathname } from 'next\/navigation'/import { useLocation } from 'react-router-dom'/g" "$file"
  sed -i '' "s/import { useRouter, usePathname } from 'next\/navigation'/import { useNavigate, useLocation } from 'react-router-dom'/g" "$file"
  
  # Replace router.push with navigate
  sed -i '' "s/const router = useRouter()/const navigate = useNavigate()/g" "$file"
  sed -i '' "s/router\.push(/navigate(/g" "$file"
  sed -i '' "s/router\.replace(/navigate(/g" "$file"
  sed -i '' "s/router\.back()/navigate(-1)/g" "$file"
  
  # Replace usePathname with useLocation
  sed -i '' "s/const pathname = usePathname()/const location = useLocation(); const pathname = location.pathname/g" "$file"
  
  # Replace next/link with react-router-dom Link
  sed -i '' "s/import Link from 'next\/link'/import { Link } from 'react-router-dom'/g" "$file"
  sed -i '' "s/<Link href=/<Link to=/g" "$file"
done

echo "Migration complete!"
echo "Note: Review all changes manually, especially:"
echo "  - Dynamic routes (params)"
echo "  - useSearchParams usage"
echo "  - Image component replacements"
