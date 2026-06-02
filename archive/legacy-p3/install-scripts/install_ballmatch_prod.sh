#!/bin/bash
# ============================================================
#  BINGOBOLLA · Integrar Ball Match a Producción
#  1. Copia el juego a public/ballmatch/
#  2. Crea src/app/play/ballmatch/page.tsx (KYC protegido)
#  3. Crea src/components/BallMatchClient.tsx (iframe)
#  4. Actualiza WorldMap.tsx: nodos → /play/ballmatch?level=N
#  5. Build local. Si OK → instrucciones de deploy.
# ============================================================
set -e
cd ~/bingobolla || { echo "No existe ~/bingobolla"; exit 1; }

TS=$(date +%Y%m%d-%H%M%S)
echo "============================================"
echo "BALL MATCH → PRODUCCIÓN · $TS"
echo "============================================"

# ---- 1. Backup archivos que se van a tocar ----
echo "1/5 · Backups..."
cp src/components/WorldMap.tsx "src/components/WorldMap.tsx.bak.ballmatch-$TS"
echo "    WorldMap.tsx.bak.ballmatch-$TS"

# ---- 2. Copiar juego a public/ ----
echo "2/5 · Instalando juego en public/ballmatch/..."
mkdir -p public/ballmatch
cp ~/Downloads/ballmatch-obstacles.html public/ballmatch/index.html
echo "    public/ballmatch/index.html ($(wc -l < public/ballmatch/index.html) líneas)"

# ---- 3. Crear página KYC-protegida ----
echo "3/5 · Creando src/app/play/ballmatch/page.tsx..."
mkdir -p src/app/play/ballmatch
cat > src/app/play/ballmatch/page.tsx << 'PAGE_EOF'
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import BallMatchClient from "@/components/BallMatchClient";

export const dynamic = "force-dynamic";

export default async function BallMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const params = await searchParams;
  const level = Math.max(1, parseInt(params.level || "1") || 1);

  return <BallMatchClient level={level} />;
}
PAGE_EOF
echo "    page.tsx creado."

# Crear componente cliente
cat > src/components/BallMatchClient.tsx << 'CLIENT_EOF'
"use client";

import { useRouter } from "next/navigation";

export default function BallMatchClient({ level }: { level: number }) {
  const router = useRouter();

  return (
    <div style={{ position:"fixed", inset:0, background:"#08080C", zIndex:50 }}>
      <button
        onClick={() => router.push("/mundo")}
        style={{
          position:"absolute", top:"env(safe-area-inset-top, 12px)", left:12,
          zIndex:60, background:"rgba(20,8,40,.92)", border:"1.5px solid rgba(255,200,90,.4)",
          borderRadius:14, color:"#FFD98A", fontFamily:"'Fredoka',system-ui",
          fontWeight:700, fontSize:13, padding:"8px 14px", cursor:"pointer",
          backdropFilter:"blur(6px)", boxShadow:"0 4px 12px rgba(0,0,0,.5)",
        }}
      >
        ← Mundo
      </button>
      <iframe
        src={`/ballmatch/index.html?level=${level}`}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }}
        allow="autoplay"
        title={`Ball Match — Nivel ${level}`}
      />
    </div>
  );
}
CLIENT_EOF
echo "    BallMatchClient.tsx creado."

# ---- 4. Actualizar WorldMap.tsx: playNode → Ball Match ----
echo "4/5 · Actualizando WorldMap.tsx (nodos → /play/ballmatch)..."
python3 - << 'PYEOF'
import re, sys

path = "src/components/WorldMap.tsx"
with open(path, "r") as f:
    content = f.read()

# Patrón del playNode actual (rutas a /room/)
old = r'function playNode\(n: Node\) \{[^}]+if \(n\.node_type === "bingo"\) \{[^}]+(?:router\.push[^}]+\}[^}]+\}|router\.push[^}]+\})[^}]*\} else \{[^}]+setSelected[^}]+\}\s*\}'
new = '''function playNode(n: Node) {
    if (n.node_type === "bingo") {
      // Ball Match: lanza el juego en el nivel del nodo
      router.push(`/play/ballmatch?level=${n.node_index}`);
    } else {
      setSelected(null);
    }
  }'''

# Intentar reemplazo con regex
result = re.sub(old, new, content, flags=re.DOTALL)
if result == content:
    # Si el regex no machó (versión distinta), buscar playNode manualmente
    if "router.push(`/room/" in content:
        # Reemplazar el cuerpo de playNode más simple
        result = re.sub(
            r'(function playNode\(n: Node\) \{)[^}]*if \(n\.node_type === "bingo"\)[^{]*\{.*?router\.push.*?\}.*?(\} else \{[^}]*setSelected[^}]*\}\s*\})',
            r'\1\n    if (n.node_type === "bingo") {\n      router.push(`/play/ballmatch?level=${n.node_index}`);\n    } else {\n      setSelected(null);\n    }\n  }',
            result,
            flags=re.DOTALL
        )

with open(path, "w") as f:
    f.write(result)

# Verificar el cambio
if "/play/ballmatch" in result:
    print("    playNode actualizado -> /play/ballmatch ✅")
elif "/room/" not in result:
    print("    /room/ ya no está en playNode ✅")
else:
    print("    AVISO: cambio manual necesario en playNode")
    print("    Cambia manualmente: router.push(`/room/...`) -> router.push(`/play/ballmatch?level=\${n.node_index}`)")
PYEOF

# ---- 5. Build ----
echo "5/5 · Compilando..."
if npm run build; then
  echo ""
  echo "============================================"
  echo "BUILD OK ✅ — Ball Match integrado"
  echo "============================================"
  echo ""
  echo "Probar en local:"
  echo "  npm run dev"
  echo "  → bingobolla.com/mundo → toca nodo 1 → debe abrir Ball Match"
  echo "  → /play/ballmatch?level=1 directo"
  echo ""
  echo "Si todo bien, SUBIR A PRODUCCIÓN:"
  echo '  git add -A && git commit -m "Ball Match integrado a /mundo (nodos → /play/ballmatch)" && git push origin main && vercel --prod'
else
  echo ""
  echo "BUILD FALLO ❌"
  echo "Restaurar WorldMap si hace falta:"
  echo "  cp src/components/WorldMap.tsx.bak.ballmatch-$TS src/components/WorldMap.tsx"
  echo ""
  echo "Pega el error completo y lo arreglo."
fi
