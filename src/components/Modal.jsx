/**
 * Modal reutilizable: notificacion centrada con un boton "Aceptar".
 * Se usa para canje de codigos (exito / error) y para bloqueo premium.
 *
 * Props:
 *  - open: boolean (si mostrar o no)
 *  - title: string (titulo grande)
 *  - message: string (cuerpo del mensaje)
 *  - onClose: function (al tocar Aceptar o el overlay)
 *  - variant: "success" | "error" | "premium" (color del acento)
 *  - children: nodos extra (ej. precios y formas de pago)
 *  - acceptLabel: string (texto del boton, default "Aceptar")
 */
function Modal({
  open,
  title,
  message,
  onClose,
  variant = "success",
  children,
  acceptLabel = "Aceptar",
}) {
  if (!open) return null;

  const colors = {
    success: { accent: "#4ade80", bg: "#1f4738", border: "#34745c" },
    error: { accent: "#f87171", bg: "#3b1d1d", border: "#7f1d1d" },
    premium: { accent: "#fbbf24", bg: "#2a2410", border: "#78550f" },
  };
  const c = colors[variant] || colors.success;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#151922",
          border: `1px solid ${c.border}`,
          borderRadius: "18px",
          padding: "28px 24px",
          boxShadow: `0 24px 70px rgba(0,0,0,0.5), 0 0 30px ${c.accent}22`,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ margin: 0, color: c.accent, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
          {title}
        </h2>

        {message && (
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {message}
          </p>
        )}

        {children}

        <button
          onClick={onClose}
          style={{
            marginTop: 4,
            padding: "13px",
            border: "none",
            borderRadius: "12px",
            background: c.accent,
            color: "#07110b",
            fontWeight: 800,
            fontSize: 16,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {acceptLabel}
        </button>
      </div>
    </div>
  );
}

export default Modal;
