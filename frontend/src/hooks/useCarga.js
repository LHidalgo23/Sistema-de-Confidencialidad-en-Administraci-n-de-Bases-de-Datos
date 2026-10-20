import { useCallback, useEffect, useEffectEvent, useState } from "react";

/**
 * Carga datos al montar y cuando cambian las dependencias; descarta respuestas obsoletas.
 * `dependencias` solo debe contener valores primitivos (ids, textos, números).
 * Mientras recarga conserva los últimos datos y reporta `cargando`.
 */
export function useCarga(funcion, dependencias) {
  const clave = JSON.stringify(dependencias);
  const [recarga, setRecarga] = useState(0);
  const [estado, setEstado] = useState({ clave: null, recarga: 0, datos: null, error: null });
  const obtener = useEffectEvent(funcion);

  useEffect(() => {
    let activo = true;
    let promesa;
    try {
      promesa = Promise.resolve(obtener());
    } catch (error) {
      promesa = Promise.reject(error);
    }
    promesa.then(
      (datos) => activo && setEstado({ clave, recarga, datos, error: null }),
      (error) => activo && setEstado({ clave, recarga, datos: null, error: error.message }),
    );
    return () => {
      activo = false;
    };
  }, [clave, recarga]);

  const cargando = estado.clave !== clave || estado.recarga !== recarga;
  const recargar = useCallback(() => setRecarga((n) => n + 1), []);
  return { datos: estado.datos, error: cargando ? null : estado.error, cargando, recargar };
}

/** Envuelve una operación manual (botón) con estado de carga y error. */
export function useAccion(funcion) {
  const [estado, setEstado] = useState({ resultado: null, error: null, cargando: false });

  const ejecutar = useCallback(
    async (...argumentos) => {
      setEstado({ resultado: null, error: null, cargando: true });
      try {
        const resultado = await funcion(...argumentos);
        setEstado({ resultado, error: null, cargando: false });
        return resultado;
      } catch (error) {
        setEstado({ resultado: null, error: error.message, cargando: false });
        return null;
      }
    },
    [funcion],
  );

  return { ...estado, ejecutar };
}
