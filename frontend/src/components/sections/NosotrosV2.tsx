import { Heading } from "@/components/core/Heading"
import { BodyText } from "@/components/core/BodyText"
import { NosotrosCardV2 } from "@/components/nosotros/NosotrosCardV2"

export function NosotrosV2() {
  return (
    <section
      style={{
        background: "white",
        paddingTop: "80px",
        paddingBottom: "80px",
        paddingLeft: "32px",
        paddingRight: "32px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "16px",
            marginBottom: "64px",
          }}
        >
          <Heading as="h2" size="xl" color="navy">
            Sobre nosotros
          </Heading>

          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <BodyText color="body" size="md">
              Conocé nuestra historia, nuestros valores y el compromiso que nos impulsa a conectar destinos todos los días.
            </BodyText>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px",
          }}
        >
          <NosotrosCardV2
            imageSrc="/assets/nosotros/empresa.jpg"
            imageAlt="Nuestra empresa"
            title="Nuestra empresa"
            description="Más de 60 años conectando Argentina y Paraguay con seguridad, experiencia y servicio de calidad."
          />
          <NosotrosCardV2
            imageSrc="/assets/nosotros/destinos.jpg"
            imageAlt="Nuestros destinos"
            title="Nuestros destinos"
            description="Una extensa red de rutas que une ciudades y personas en Argentina y Paraguay con frecuencias diarias."
          />
          <NosotrosCardV2
            imageSrc="/assets/nosotros/equipo.jpg"
            imageAlt="Nuestro equipo"
            title="Nuestro equipo"
            description="Profesionales comprometidos que trabajan cada día para brindar un viaje seguro, cómodo y puntual."
          />
          <NosotrosCardV2
            imageSrc="/assets/nosotros/compromiso.jpg"
            imageAlt="Nuestro compromiso"
            title="Nuestro compromiso"
            description={
              <>
                Ponemos a las personas en el centro de todo lo que hacemos, cuidando <strong>cada detalle</strong> para
                que tu experiencia sea siempre la mejor.
              </>
            }
          />
        </div>
      </div>
    </section>
  )
}
