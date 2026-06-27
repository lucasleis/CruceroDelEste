import { Navbar } from "@/components/navigation/Navbar";

export default function NavbarValidation() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: "url('/assets/hero-river.png'), linear-gradient(135deg, #c4a882 0%, #8b7355 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Navbar transparent={true} />
    </div>
  );
}
