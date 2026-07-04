import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Viajes", to: "/viajes" },
  { label: "Reservas", to: "/reservas" },
  { label: "Reembolsos", to: "/reembolsos" },
  { label: "Contracargos", to: "/contracargos" },
  { label: "Configuración", to: "/configuracion" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("admin_token");
    navigate("/login", { replace: true });
  }

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-[#E2E4F0] bg-white">
      <div className="px-4 py-4">
        <p className="text-sm font-semibold text-neutral-900">Expreso Río Paraná</p>
        <p className="text-xs text-neutral-600">Admin</p>
      </div>

      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm ${
                isActive
                  ? "bg-primary-light font-medium text-primary"
                  : "text-neutral-600"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-neutral-600"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
