/**
 * Páginas legales públicas: Politica de Privacidad y Terminos y Condiciones.
 *
 * Se sirven sin login (main.jsx las enruta antes de pedir sesión) porque son
 * obligatorias para el usuario: cualquiera debe poder leerlas antes de
 * registrarse o pagar. Si cambian las condiciones se actualiza ACTUALIZADO.
 */

const ACTUALIZADO = "11 de noviembre de 2026";
const MARCA = "3SIXTYBETS";
const DOMINIO = "threesixtybets.xyz";
const CONTACTO = "soporte@threesixtybets.xyz";

const DARK = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  padding: "16px 12px 48px",
  boxSizing: "border-box",
};

const H2 = { fontSize: 15, margin: "22px 0 8px", color: "#4ade80", fontWeight: 800 };
const P = { fontSize: 13.5, lineHeight: 1.65, color: "#c9d1d9", margin: "0 0 10px" };
const LI = { fontSize: 13.5, lineHeight: 1.65, color: "#c9d1d9", marginBottom: 6 };
const LINK = { color: "#4ade80", textDecoration: "underline" };

function Nav() {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
      <a href="/" style={{ ...LINK, fontWeight: 700 }}>← Volver al inicio</a>
      <a href="/privacidad" style={{ ...LINK, fontWeight: 700 }}>Privacidad</a>
      <a href="/terminos" style={{ ...LINK, fontWeight: 700 }}>Términos y Condiciones</a>
    </div>
  );
}

function Privacidad() {
  return (
    <>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Política de Privacidad</h1>
      <p style={{ ...P, color: "#8b95a1", marginBottom: 18 }}>
        Última actualización: {ACTUALIZADO}
      </p>

      <p style={P}>
        Esta política explica qué datos personales trata {MARCA} (en adelante, «la
        Plataforma», «nosotros») en {DOMINIO}, para qué los usa, con quién los
        comparte y cómo puedes ejercer tus derechos.
      </p>

      <h2 style={H2}>1. Responsable del tratamiento</h2>
      <p style={P}>
        El responsable es {MARCA}, con contacto en{" "}
        <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a>. Para cualquier
        consulta sobre tus datos personales, escribe a esa dirección con el asunto
        «Privacidad».
      </p>

      <h2 style={H2}>2. Qué datos recogemos</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}><strong>Datos de cuenta:</strong> correo electrónico, nombre de usuario, contraseña cifrada (hash) y fecha de registro.</li>
        <li style={LI}><strong>Datos de uso:</strong> pronósticos consultados, mensajes enviados al chat, partidos y canales abiertos, y sus fechas.</li>
        <li style={LI}><strong>Datos técnicos:</strong> dirección IP, navegador, dispositivo e identificadores de sesión, necesarios para la seguridad.</li>
        <li style={LI}><strong>Datos de pago:</strong> plan contratado, importe, fecha, estado y la referencia de la pasarela. <strong>No almacenamos números de tarjeta ni claves de billeteras</strong>.</li>
        <li style={LI}><strong>Comunicaciones:</strong> mensajes que nos envías por soporte o recuperación de contraseña.</li>
      </ul>
      <p style={P}>
        No solicitamos datos sensibles (salud, ideología, biometría) y te pedimos
        que no los incluyas en el chat.
      </p>

      <h2 style={H2}>3. Para qué los usamos y con qué base legal</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}><strong>Crear y mantener tu cuenta</strong> y prestarte el servicio — ejecución del contrato.</li>
        <li style={LI}><strong>Cobrar y gestionar planes</strong> — ejecución del contrato y obligaciones contables.</li>
        <li style={LI}><strong>Seguridad y prevención de fraude</strong> (multicuenta, abuso del chat o de la TV) — interés legítimo.</li>
        <li style={LI}><strong>Mejorar el servicio</strong> con estadísticas agregadas, sin perfilado publicitario — interés legítimo.</li>
        <li style={LI}><strong>Avisos del servicio</strong> (recuperación de contraseña, cambios de condiciones) — contrato e interés legítimo.</li>
      </ul>
      <p style={P}>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h2 style={H2}>4. Cookies y almacenamiento local</h2>
      <p style={P}>
        Usamos cookies y almacenamiento local estrictamente necesarios para
        mantener la sesión y recordar preferencias de la interfaz. No empleamos
        cookies publicitarias ni de seguimiento de terceros. Puedes borrarlas
        desde tu navegador, aunque se cerrará la sesión.
      </p>

      <h2 style={H2}>5. Con quién los compartimos</h2>
      <p style={P}>
        Solo con proveedores que nos permiten operar, que actúan como encargados
        del tratamiento y tratan únicamente los datos necesarios:
      </p>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}><strong>Hosting y base de datos:</strong> Railway y Aiven (servidores y base de datos cifrada).</li>
        <li style={LI}><strong>Frontend:</strong> Vercel (entrega del sitio web).</li>
        <li style={LI}><strong>Pagos:</strong> Pagadito y las redes de criptomonedas que elijas, que reciben lo necesario para procesar el cobro.</li>
        <li style={LI}><strong>Inteligencia artificial:</strong> proveedores de modelos de lenguaje que procesan el texto de tus consultas para generar el análisis. No les enviamos tu contraseña ni datos de pago.</li>
        <li style={LI}><strong>Fuentes deportivas y de video:</strong> ESPN, FotMob y repositorios de señales de terceros, con los que no compartimos datos personales.</li>
      </ul>
      <p style={P}>
        También podemos comunicar datos si una autoridad competente lo exige
        legalmente.
      </p>

      <h2 style={H2}>6. Cuánto tiempo los conservamos</h2>
      <p style={P}>
        Mientras tu cuenta esté activa. Si la eliminas, borramos tus datos
        personales salvo los que debamos conservar por obligaciones legales,
        contables o de prevención de fraude (normalmente hasta 5 años desde la
        última operación). Las copias de seguridad se rotan y desaparecen en un
        plazo máximo de 30 días.
      </p>

      <h2 style={H2}>7. Seguridad</h2>
      <p style={P}>
        Las contraseñas se almacenan con hash, el acceso va cifrado por HTTPS y el
        acceso a la base de datos está restringido. Ningún sistema es infalible:
        si detectamos una brecha que te afecte, te lo notificaremos y, cuando
        corresponda, lo comunicaremos a la autoridad competente.
      </p>

      <h2 style={H2}>8. Tus derechos</h2>
      <p style={P}>
        Puedes solicitar en <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a>:
        acceso a tus datos, rectificación, supresión («derecho al olvido»),
        limitación, oposición, portabilidad y retirada del consentimiento. Te
        responderemos en un plazo máximo de 30 días. También puedes reclamar ante
        la autoridad de protección de datos de tu país.
      </p>

      <h2 style={H2}>9. Menores de edad</h2>
      <p style={P}>
        El servicio es exclusivo para mayores de 18 años. No recogemos
        conscientemente datos de menores; si detectamos una cuenta de un menor, la
        cancelaremos y eliminaremos sus datos.
      </p>

      <h2 style={H2}>10. Transferencias internacionales</h2>
      <p style={P}>
        Algunos proveedores están fuera de tu país (Estados Unidos o la Unión
        Europea). Estas transferencias se amparan en cláusulas contractuales tipo u
        otro mecanismo legal equivalente.
      </p>

      <h2 style={H2}>11. Cambios en esta política</h2>
      <p style={P}>
        Podemos actualizarla si cambia el servicio o la ley. Si el cambio es
        sustancial, lo avisaremos en la web o por correo antes de que entre en
        vigor. La fecha de «última actualización» indica la versión vigente.
      </p>

      <h2 style={H2}>12. Contacto</h2>
      <p style={P}>
        ¿Dudas sobre tus datos? Escribe a{" "}
        <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a> o consulta los{" "}
        <a href="/terminos" style={LINK}>Términos y Condiciones</a>.
      </p>
    </>
  );
}

function Terminos() {
  return (
    <>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Términos y Condiciones</h1>
      <p style={{ ...P, color: "#8b95a1", marginBottom: 18 }}>
        Última actualización: {ACTUALIZADO}
      </p>

      <p style={P}>
        Estos términos regulan el uso de {MARCA} ({DOMINIO}). Al crear una cuenta,
        contratar un plan o usar cualquier función aceptas estas condiciones. Si no
        estás de acuerdo, no uses el servicio.
      </p>

      <h2 style={H2}>1. Qué es el servicio</h2>
      <p style={P}>
        {MARCA} es una plataforma de <strong>información y análisis deportivo</strong>:
        pronósticos generados con modelos estadísticos y datos públicos, chat con
        inteligencia artificial, estadísticas de partidos y una sección de TV con
        enlaces a transmisiones de terceros.
      </p>
      <p style={P}>
        <strong>No somos una casa de apuestas</strong>: no aceptamos apuestas, no
        gestionamos dinero de apuestas ni pagamos premios. No estamos afiliados a
        ninguna liga, equipo, cadena de televisión ni casa de apuestas.
      </p>

      <h2 style={H2}>2. Elegibilidad</h2>
      <p style={P}>
        Debes tener al menos 18 años y capacidad legal para contratar. Eres
        responsable de comprobar que el uso de este tipo de servicios es legal en
        tu país. Si resides donde no está permitido, no debes registrarte.
      </p>

      <h2 style={H2}>3. Tu cuenta</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}>Debes dar un correo válido y mantener la contraseña segura.</li>
        <li style={LI}>La cuenta es <strong>personal e intransferible</strong>: compartirla o revenderla puede suponer la cancelación sin reembolso.</li>
        <li style={LI}>Eres responsable de la actividad realizada desde tu cuenta.</li>
        <li style={LI}>Podemos pedir verificación razonable ante indicios de multicuenta o fraude.</li>
      </ul>

      <h2 style={H2}>4. Planes, pagos y devoluciones</h2>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}>Los planes son de duración limitada (por ejemplo 15, 30 o 60 días) y su precio se muestra antes de pagar.</li>
        <li style={LI}>El pago se procesa por Pagadito o por transferencia de criptomonedas a la dirección indicada. La confirmación puede tardar; el acceso se activa al verificarse.</li>
        <li style={LI}>Los pagos en cripto son irreversibles: revisa la red y la dirección antes de enviar.</li>
        <li style={LI}>No hay devolución por el tiempo no utilizado, salvo error imputable a nosotros o fallo técnico que impida usar el servicio y no podamos resolver. Las reclamaciones se atienden en {CONTACTO} dentro de los 7 días siguientes al cobro.</li>
        <li style={LI}>Las operaciones con tarjeta pueden generar comisiones de la entidad emisora, ajenas a la Plataforma.</li>
      </ul>

      <h2 style={H2}>5. Los pronósticos son información, no una garantía</h2>
      <p style={P}>
        Los pronósticos se basan en datos históricos y modelos estadísticos, y
        pueden fallar. <strong>No garantizamos aciertos ni resultados económicos</strong>.
        No son asesoramiento financiero ni una invitación a apostar. Decidir si
        apuestas, cuánto y a qué cuota es responsabilidad exclusiva del usuario, que
        asume íntegramente sus pérdidas.
      </p>

      <h2 style={H2}>6. Uso aceptable</h2>
      <p style={P}>Queda prohibido:</p>
      <ul style={{ paddingLeft: 20, margin: "0 0 10px" }}>
        <li style={LI}>Extraer datos de forma automatizada (scraping, bots) o revender la información.</li>
        <li style={LI}>Compartir, retransmitir o incrustar el contenido de la Plataforma o las señales de TV en otros sitios.</li>
        <li style={LI}>Intentar vulnerar la seguridad, eludir límites de plan o sobrecargar los servidores.</li>
        <li style={LI}>Usar el chat para fines ilícitos, acoso, spam o contenido que infrinja derechos de terceros.</li>
        <li style={LI}>Suplantar la identidad de la Plataforma, sus empleados o de otros usuarios.</li>
      </ul>
      <p style={P}>
        El incumplimiento faculta a suspender o cancelar la cuenta sin reembolso y,
        si procede, a emprender acciones legales.
      </p>

      <h2 style={H2}>7. TV, transmisiones y contenido de terceros</h2>
      <p style={P}>
        La sección de TV muestra enlaces y reproductores que apuntan a fuentes de
        terceros. No alojamos esos archivos ni controlamos su disponibilidad,
        calidad o legalidad en tu país: pueden dejar de funcionar o cambiar en
        cualquier momento. Eres responsable de verificar que puedes acceder a ese
        contenido conforme a la normativa de tu jurisdicción. Si eres titular de
        derechos y consideras que un enlace infringe tus derechos, escríbenos a{" "}
        <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a> y lo retiraremos.
      </p>

      <h2 style={H2}>8. Propiedad intelectual</h2>
      <p style={P}>
        El nombre, el logotipo, el diseño, los textos, los modelos y el software de{" "}
        {MARCA} son de nuestra propiedad o se usan con licencia. No puedes copiarlos,
        modificarlos ni distribuirlos sin autorización escrita. Las marcas y escudos
        deportivos pertenecen a sus titulares y se muestran con fines informativos.
      </p>

      <h2 style={H2}>9. Disponibilidad y cambios del servicio</h2>
      <p style={P}>
        Procuramos mantener el servicio disponible, pero puede haber interrupciones
        por mantenimiento, fallos de proveedores (datos deportivos, IA, pagos,
        hosting) o causas de fuerza mayor. Podemos añadir, modificar o retirar
        funciones. Si un cambio elimina de forma sustancial lo contratado, ofreceremos
        una compensación proporcional.
      </p>

      <h2 style={H2}>10. Límite de responsabilidad</h2>
      <p style={P}>
        En la medida máxima que permita la ley, no respondemos por daños indirectos,
        lucro cesante ni por pérdidas derivadas de decisiones de apuesta, del uso o
        imposibilidad de uso del servicio, de la exactitud de datos de terceros ni
        del contenido de los enlaces de TV. Nuestra responsabilidad total frente a ti
        se limita al importe que hayas pagado en los últimos tres meses.
      </p>

      <h2 style={H2}>11. Suspensión y cancelación</h2>
      <p style={P}>
        Puedes dejar de usar el servicio cuando quieras y solicitar la baja de tu
        cuenta. Podemos suspenderla de forma inmediata si hay impago, fraude, abuso
        o incumplimiento de estos términos. La cancelación por nuestra parte por
        incumplimiento grave no da derecho a reembolso.
      </p>

      <h2 style={H2}>12. Juego responsable</h2>
      <p style={P}>
        Si el juego deja de ser un entretenimiento, busca ayuda. Establece límites de
        tiempo y dinero, no apuestes para recuperar pérdidas y no uses dinero
        destinado a necesidades básicas. Existen líneas de ayuda gratuitas en la
        mayoría de países.
      </p>

      <h2 style={H2}>13. Modificaciones de los términos</h2>
      <p style={P}>
        Podemos actualizar estos términos para reflejar cambios legales o del
        servicio. Publicaremos la versión vigente con su fecha; si el cambio es
        relevante te avisaremos antes de que se aplique. El uso continuado después de
        la entrada en vigor implica aceptación.
      </p>

      <h2 style={H2}>14. Ley aplicable y disputas</h2>
      <p style={P}>
        Estos términos se rigen por la legislación aplicable en el domicilio del
        responsable del servicio. Antes de acudir a la vía judicial, te pedimos que
        nos escribas a <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a> para
        intentar resolver el conflicto de forma amistosa. Nada en esta cláusula limita
        los derechos que te reconozca la ley de consumo de tu país.
      </p>

      <h2 style={H2}>15. Contacto</h2>
      <p style={P}>
        Dudas, reclamaciones o avisos legales:{" "}
        <a href={`mailto:${CONTACTO}`} style={LINK}>{CONTACTO}</a>. Ver también la{" "}
        <a href="/privacidad" style={LINK}>Política de Privacidad</a>.
      </p>
    </>
  );
}

export default function Legal({ tipo = "privacidad" }) {
  const esTerminos = String(tipo).toLowerCase().startsWith("term");
  return (
    <div style={DARK}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Nav />
        {esTerminos ? <Terminos /> : <Privacidad />}
        <p style={{ ...P, color: "#5c6670", marginTop: 28, fontSize: 12 }}>
          {MARCA} · {DOMINIO} · Solo mayores de 18 años. Los pronósticos son
          información estadística y no garantizan resultados.
        </p>
      </div>
    </div>
  );
}

