#!/bin/bash
# ═══════════════════════════════════════════════════════
# Bolão na Copa - Limpeza de código morto
# Rodar na raiz do projeto: bash cleanup.sh
# ═══════════════════════════════════════════════════════

echo "🧹 Iniciando limpeza..."

# ── 1. Remover componentes UI shadcn não utilizados (36 arquivos, ~3.364 linhas) ──
echo "📦 Removendo 36 componentes UI não utilizados..."
UI_TO_DELETE=(
  accordion.tsx
  alert-dialog.tsx
  alert.tsx
  aspect-ratio.tsx
  avatar.tsx
  breadcrumb.tsx
  calendar.tsx
  carousel.tsx
  chart.tsx
  checkbox.tsx
  collapsible.tsx
  command.tsx
  context-menu.tsx
  drawer.tsx
  dropdown-menu.tsx
  form.tsx
  hover-card.tsx
  input-otp.tsx
  menubar.tsx
  navigation-menu.tsx
  pagination.tsx
  popover.tsx
  progress.tsx
  radio-group.tsx
  resizable.tsx
  scroll-area.tsx
  select.tsx
  sidebar.tsx
  slider.tsx
  switch.tsx
  table.tsx
  tabs.tsx
  textarea.tsx
  toaster.tsx
  toggle-group.tsx
)

for f in "${UI_TO_DELETE[@]}"; do
  rm -f "src/components/ui/$f"
done

# use-toast.ts na pasta ui (3 linhas, re-export redundante)
rm -f "src/components/ui/use-toast.ts"

echo "  ✅ 36 componentes UI removidos"

# ── 2. Remover hooks não utilizados ──
echo "📦 Removendo hooks mortos..."
# use-mobile.tsx só era usado pelo sidebar.tsx (deletado acima)
rm -f "src/hooks/use-mobile.tsx"
echo "  ✅ use-mobile.tsx removido"

# ── 3. Remover arquivo App.tsx duplicado ──
echo "📦 Removendo pages/App.tsx (duplicado, não importado)..."
rm -f "src/pages/App.tsx"
echo "  ✅ pages/App.tsx removido"

# ── 4. Remover dependências npm não utilizadas ──
echo "📦 Removendo dependências npm mortas..."
DEPS_TO_REMOVE=(
  # Deps usadas APENAS pelos componentes UI deletados
  "cmdk"
  "embla-carousel-react"
  "input-otp"
  "react-day-picker"
  "react-resizable-panels"
  "recharts"
  "react-hook-form"
  "next-themes"
  "vaul"
  # Deps não importadas em lugar nenhum
  "@hookform/resolvers"
  "dotenv"
  # Radix deps dos componentes UI deletados
  "@radix-ui/react-accordion"
  "@radix-ui/react-alert-dialog"
  "@radix-ui/react-aspect-ratio"
  "@radix-ui/react-avatar"
  "@radix-ui/react-checkbox"
  "@radix-ui/react-collapsible"
  "@radix-ui/react-context-menu"
  "@radix-ui/react-dropdown-menu"
  "@radix-ui/react-hover-card"
  "@radix-ui/react-menubar"
  "@radix-ui/react-navigation-menu"
  "@radix-ui/react-popover"
  "@radix-ui/react-progress"
  "@radix-ui/react-radio-group"
  "@radix-ui/react-scroll-area"
  "@radix-ui/react-select"
  "@radix-ui/react-slider"
  "@radix-ui/react-switch"
  "@radix-ui/react-tabs"
  "@radix-ui/react-toast"
  "@radix-ui/react-toggle"
  "@radix-ui/react-toggle-group"
)

npm uninstall "${DEPS_TO_REMOVE[@]}" 2>/dev/null
echo "  ✅ ${#DEPS_TO_REMOVE[@]} dependências removidas"

# ── 5. Resumo ──
echo ""
echo "═══════════════════════════════════════"
echo "✅ Limpeza concluída!"
echo ""
echo "Removidos:"
echo "  • 36 componentes UI shadcn não utilizados"
echo "  • 1 hook não utilizado (use-mobile)"
echo "  • 1 arquivo duplicado (pages/App.tsx)"
echo "  • 33 dependências npm não utilizadas"
echo "  • ~3.400 linhas de código morto"
echo ""
echo "Próximos passos:"
echo "  1. npm install (recriar node_modules)"
echo "  2. npm run build (verificar que nada quebrou)"
echo "  3. Testar o app"
echo "  4. git add . && git commit -m 'cleanup: remove codigo morto e deps nao usadas' && git push"
echo "═══════════════════════════════════════"
