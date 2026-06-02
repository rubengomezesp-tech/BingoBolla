#!/bin/bash
# ============================================================
#  BINGOBOLLA · Instalar WorldMap.tsx (diseño imagen 1)
#  - Hace BACKUP automatico antes de tocar nada
#  - Reemplaza el componente
#  - Compila local. Si el build falla -> NO se sube nada.
# ============================================================
set -e
cd ~/bingobolla

echo "1/4 · Backup del WorldMap.tsx actual..."
cp src/components/WorldMap.tsx "src/components/WorldMap.tsx.bak.preassets-$(date +%Y%m%d-%H%M%S)"
echo "    Backup creado (WorldMap.tsx.bak.preassets-*)"

echo "2/4 · Instalando componente nuevo..."
cp ~/Downloads/WorldMap.tsx src/components/WorldMap.tsx
echo "    Componente reemplazado."

echo "3/4 · Compilando (npm run build)... esto tarda un poco."
if npm run build; then
  echo ""
  echo "4/4 · BUILD OK ✅"
  echo "----------------------------------------------------"
  echo "Si quieres ver en local antes de subir:"
  echo "   npm run dev   ->   abre http://localhost:3000/mundo"
  echo ""
  echo "Cuando lo apruebes, SUBE A PRODUCCION con:"
  echo '   git add -A && git commit -m "WorldMap imagen 1 + world_assets" && git push origin main && vercel --prod'
  echo "----------------------------------------------------"
else
  echo ""
  echo "BUILD FALLO ❌ — NO se sube nada."
  echo "Restaurando backup..."
  cp "$(ls -t src/components/WorldMap.tsx.bak.preassets-* | head -1)" src/components/WorldMap.tsx
  echo "Restaurado. Estas como antes, prod intacto."
  echo "Pega el error de arriba y lo arreglo."
  exit 1
fi
