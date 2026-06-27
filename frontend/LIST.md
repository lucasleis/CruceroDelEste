Pasos para crear un design system + landing en Next.js con validación visual en cada paso:

1. Scaffolding del proyecto
- Crear el proyecto Next.js con TypeScript + Tailwind
- Definir estructura de carpetas (components/, styles/, public/assets/)

2. Tokens del design system
- Colores (#132691, #e3000f, #ffffff, #a3dadf, navy)
- Tipografía (fuentes, pesos, tamaños)
- Espaciado, radios, sombras
- Configurarlos como variables CSS + extenderlos en Tailwind config

3. Componentes base (uno por uno, validando cada uno)
- Button (variantes: primary, secondary, ghost)
- Badge
- Icon
- Field / Select

4. Componentes de navegación
- Navbar

5. Componentes específicos del negocio
- SearchBar
- DestinationCard
- AmenityBadge
- TripCard

6. Secciones de la landing (una por una)
- Hero
- Destinos
- Nosotros
- CTA
- Footer

7. Ensamblado final
- page.tsx con todas las secciones
- Build limpio