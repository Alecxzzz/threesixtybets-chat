import { useState } from "react";
import { logoFor } from "../data/logos";

/**
 * Logo de un canal.
 * - Si el canal tiene logo en el mapa, muestra la imagen.
 * - Si no, o si la imagen falla al cargar, muestra un badge con las iniciales
 *   y un color estable derivado del nombre (para que nunca se vea roto).
 */
function ChannelLogo({ name }) {
  const url = logoFor(name);
  const [broken, setBroken] = useState(false);

  const initials = (name || "?")
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Color estable a partir del nombre.
  let hash = 0;
  for (let i = 0; i < (name || "").length; i += 1) {
    hash = (hash * 31 + (name || "").charCodeAt(i)) % 360;
  }

  if (url && !broken) {
    return (
      <img
        className="channel-logo"
        src={url}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="channel-logo channel-logo--fallback"
      style={{ background: `hsl(${hash} 55% 30%)` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export default ChannelLogo;
