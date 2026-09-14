import { useEffect, useRef } from "react";

// Merchant UID de produccion (mismo que usa pagadito_client.py en el backend).
const PAGADITO_MERCHANT = "491a4bb3983be6ebae05d95fa5860d39";

/**
 * Seccion "Pagos aceptados": logos de cripto (los que usa Credits.jsx),
 * tarjetas Visa/Mastercard (via Pagadito) y el sello de comercio certificado
 * de Pagadito (script oficial embebido).
 */
export default function PagosAceptados() {
  const badgeRef = useRef(null);

  // El sello de Pagadito es un <script> externo: React no lo renderiza
  // directo, hay que inyectarlo en el contenedor.
  useEffect(() => {
    const el = badgeRef.current;
    if (!el) return undefined;
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://comercios.pagadito.com/validate/index.php?merchant=${PAGADITO_MERCHANT}&size=m&_idioma=en`;
    el.appendChild(script);
    return () => {
      if (el) el.innerHTML = "";
    };
  }, []);

  return (
    <div className="pagos-aceptados">
      <span className="pagos-titulo">Pagos aceptados:</span>
      <div className="pagos-logos">
        <img src="/payments/usdt.png" alt="USDT (BEP20)" title="USDT (BEP20)" />
        <img src="/payments/btc.png" alt="Bitcoin (BEP20)" title="BTC (BEP20)" />
        <img src="/payments/ltc.png" alt="Litecoin (BEP20)" title="LTC (BEP20)" />
        <img src="/payments/binance.png" alt="Binance ID" title="Binance Pay / ID" />
        <span className="pagos-tarjeta" title="Tarjetas Visa / Mastercard (via Pagadito)">
          <span className="pg-visa">VISA</span>
          <span className="pg-mc" aria-label="Mastercard">
            <svg viewBox="0 0 48 30" width="34" height="22">
              <circle cx="18" cy="15" r="12" fill="#EB001B" />
              <circle cx="30" cy="15" r="12" fill="#F79E1B" fillOpacity="0.92" />
            </svg>
            <span className="pg-mc-txt">Mastercard</span>
          </span>
        </span>
        <span ref={badgeRef} className="pagos-pagadito" title="Comercio certificado por Pagadito" />
      </div>
      <a
        className="pagos-track-link"
        href="https://site--threesixtybetssz--qytms2wflqbs.code.run/track"
        target="_blank"
        rel="noopener noreferrer"
      >
        📊 Ver el track record completo de la IA
      </a>
    </div>
  );
}
