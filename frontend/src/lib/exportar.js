// Exportación CSV del lado del cliente para las vistas de Resultados que no tienen
// un endpoint propio de CSV en el backend (la matriz de evaluación sí lo tiene: ver api.urlMatrizCsv).

/** Igual que _celda_segura en reportes.py: evita que un valor con =+-@ se interprete como fórmula. */
function celdaSegura(valor) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

function celdaCsv(valor) {
  const texto = celdaSegura(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** `columnas`: [[clave, título], ...]. `filas`: arreglo de objetos con esas claves. */
export function csvDesdeFilas(columnas, filas) {
  const encabezado = columnas.map(([, titulo]) => celdaCsv(titulo)).join(",");
  const cuerpo = filas.map((fila) => columnas.map(([clave]) => celdaCsv(fila[clave])).join(",")).join("\r\n");
  return `${encabezado}\r\n${cuerpo}`;
}

export function descargarCsv(nombreArchivo, columnas, filas) {
  // BOM al inicio: sin él, Excel abre los acentos del CSV como texto corrupto.
  const blob = new Blob(["\ufeff" + csvDesdeFilas(columnas, filas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
