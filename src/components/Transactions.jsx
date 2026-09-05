import { useEffect, useState } from "react";
import { fetchTransactions, transactionInvoiceUrl } from "../services/api";

const STATUS_STYLES = {
  APROBADO: { background: "#1d3a26", color: "#4ade80" },
  PENDIENTE: { background: "#3a311d", color: "#facc15" },
  CANCELADO: { background: "#3a1d1d", color: "#f87171" },
  RECHAZADO: { background: "#3a1d1d", color: "#f87171" },
  FALLIDO: { background: "#3a1d1d", color: "#f87171" },
  EXPIRADO: { background: "#262636", color: "#a5b4fc" },
};

function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-SV", { dateStyle: "medium", timeStyle: "short" });
}

function Transactions({ session }) {
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  async function load() {
    setError("");
    setTransactions(null);
    try {
      const data = await fetchTransactions(session);
      setTransactions(data?.transactions || []);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el historial de transacciones.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  function downloadInvoice(tx) {
    const url = transactionInvoiceUrl(tx.ern, session);
    setDownloading(tx.ern);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo descargar la factura.");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `factura-${tx.ern}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      })
      .catch((err) => alert(err.message || "Error al descargar la factura."))
      .finally(() => setDownloading(""));
  }

  const styles = {
    wrap: { padding: "24px", maxWidth: "900px", margin: "0 auto", color: "#e8e8e8" },
    title: { color: "#f5b942", margin: "0 0 6px", fontSize: "24px" },
    subtitle: { color: "#8b93a5", margin: "0 0 20px", fontSize: "14px" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", background: "#141821", borderRadius: "12px", overflow: "hidden" },
    th: { textAlign: "left", color: "#8b93a5", fontWeight: 600, padding: "10px 12px", borderBottom: "1px solid #2a3040", whiteSpace: "nowrap" },
    td: { padding: "12px", borderBottom: "1px solid #1e2430", verticalAlign: "middle" },
    pdfBtn: { background: "#f5b942", border: "none", color: "#111", fontWeight: 700, padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" },
    empty: { textAlign: "center", color: "#8b93a5", padding: "40px 10px", fontSize: "14px", background: "#141821", borderRadius: "12px" },
    err: { textAlign: "center", color: "#f87171", padding: "40px 10px", fontSize: "14px", background: "#141821", borderRadius: "12px" },
    refresh: { background: "none", border: "1px solid #2a3040", color: "#8b93a5", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", marginBottom: "12px" },
  };

  function badgeStyle(label) {
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: 700,
      whiteSpace: "nowrap",
      ...(STATUS_STYLES[label] || { background: "#262636", color: "#a5b4fc" }),
    };
  }

  return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>Historial de transacciones</h2>
      <p style={styles.subtitle}>
        Aqui puedes ver las membresias que compraste y el estado de cada pago (aprobado, pendiente, cancelado, expirado, etc.).
      </p>
      <button style={styles.refresh} type="button" onClick={load}>
        Actualizar
      </button>
      {error && <div style={styles.err}>{error}</div>}
      {!error && transactions === null && <div style={styles.empty}>Cargando...</div>}
      {!error && transactions && transactions.length === 0 && (
        <div style={styles.empty}>
          Aun no tienes transacciones registradas.
          <br />
          Cuando compres una membresia aparecera aqui con su factura.
        </div>
      )}
      {!error && transactions && transactions.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Fecha</th>
              <th style={styles.th}>Membresia</th>
              <th style={styles.th}>Monto</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>No. Aprobacion</th>
              <th style={styles.th}>Transaccion</th>
              <th style={styles.th}>Factura</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.ern}>
                <td style={styles.td}>{fmtDate(tx.created_at)}</td>
                <td style={styles.td}>{tx.plan_code}</td>
                <td style={styles.td}>
                  {tx.currency || "USD"} {Number(tx.amount).toFixed(2)}
                </td>
                <td style={styles.td}>
                  <span style={badgeStyle(tx.status_label)}>{tx.status_label}</span>
                </td>
                <td style={styles.td}>{tx.approval_number || "-"}</td>
                <td style={{ ...styles.td, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.ern}>
                  {tx.ern}
                </td>
                <td style={styles.td}>
                  <button
                    style={{ ...styles.pdfBtn, opacity: downloading === tx.ern ? 0.5 : 1 }}
                    type="button"
                    onClick={() => downloadInvoice(tx)}
                    disabled={downloading === tx.ern}
                  >
                    {downloading === tx.ern ? "Descargando..." : "Factura PDF"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Transactions;
