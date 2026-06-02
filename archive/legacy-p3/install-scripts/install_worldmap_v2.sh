#!/bin/bash
# ============================================================
#  BINGOBOLLA · Instalar WorldMap.tsx v2
#  NO restaura automaticamente. Deja el componente nuevo
#  puesto para ver el error REAL si lo hay.
#  prod NO se toca (esto es solo local).
# ============================================================
cd ~/bingobolla

echo "1/3 · Backup..."
BACKUP="src/components/WorldMap.tsx.bak.preassets-$(date +%Y%m%d-%H%M%S)"
cp src/components/WorldMap.tsx "$BACKUP"
echo "    Backup: $BACKUP"

echo "2/3 · Instalando componente nuevo..."
cp ~/Downloads/WorldMap.tsx src/components/WorldMap.tsx
echo "    Hecho."

echo "3/3 · Compilando..."
npm run build
RESULT=$?

echo ""
echo "===================================================="
if [ $RESULT -eq 0 ]; then
  echo "BUILD OK ✅ — el componente nuevo compila."
  echo "Ver en local:  npm run dev  ->  localhost:3000/mundo"
  echo "Subir a prod:"
  echo '  git add -A && git commit -m "WorldMap imagen 1 + world_assets" && git push origin main && vercel --prod'
else
  echo "BUILD FALLO ❌ con el componente NUEVO."
  echo "El componente nuevo SIGUE PUESTO (para que veamos el error real)."
  echo "prod NO se ha tocado (esto es solo tu maquina local)."
  echo ""
  echo "Para restaurar manual si quieres:"
  echo "  cp $BACKUP src/components/WorldMap.tsx"
  echo ""
  echo "Pega el error de arriba completo y lo arreglo."
fi
echo "===================================================="
