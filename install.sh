#!/bin/bash
# BingoBolla setup — run from ~/bingobolla
set -e

echo "🎯 BingoBolla setup..."

# 1. Clean rogue Xcode folder
if [ -d "BingoBolla" ]; then
  echo "→ Removing Xcode folder..."
  rm -rf BingoBolla
fi

# 2. Fix lucide-react (v1.16 is invalid; current is 0.5xx)
echo "→ Fixing lucide-react version..."
npm uninstall lucide-react
npm install lucide-react@latest

# 3. Confirm we're in the right place
if [ ! -f "package.json" ]; then
  echo "❌ Not in bingobolla folder. cd ~/bingobolla first."
  exit 1
fi

# 4. Note about .env.local
if [ ! -f ".env.local" ]; then
  echo "→ Copying .env.local.example → .env.local"
  cp .env.local.example .env.local
  echo "⚠️  You MUST edit .env.local with your real Supabase keys before running 'npm run dev'"
fi

echo ""
echo "✅ Files installed."
echo ""
echo "Next steps:"
echo "  1. Edit .env.local and paste your Supabase anon key and service role key"
echo "  2. Go to Supabase Dashboard → SQL Editor → New query"
echo "     Paste contents of supabase/schema.sql and Run"
echo "  3. npm run dev"
echo "  4. Open http://localhost:3000"
echo "  5. Click 'Play free demo' to test the bingo game"
