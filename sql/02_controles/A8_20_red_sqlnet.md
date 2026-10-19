# A8.20 — Seguridad de redes

**Riesgo(s) relacionado(s):** R-CONF-06
**Tarea(s) del DBA:** T-09
**Objetivo:** cifrar el tráfico de red nativo de Oracle y restringir qué nodos pueden conectarse al listener.

> Nota de equivalencia: `pg_hba.conf` (mencionado como ejemplo genérico en la asignación) es de PostgreSQL. En Oracle el control equivalente se configura en `sqlnet.ora` mediante `TCP.VALIDNODE_CHECKING` / `TCP.INVITED_NODES`, no existe un archivo `pg_hba.conf`.

**Evidencia observable (Anexo A):** `V$SESSION_CONNECT_INFO`, `SYS_CONTEXT('USERENV','NETWORK_PROTOCOL')`, contenido de `sqlnet.ora`.
**Prueba de verificación:** P-21

## Cambios a aplicar en `sqlnet.ora` (`$ORACLE_HOME/network/admin/sqlnet.ora`)

```
SQLNET.ENCRYPTION_SERVER = REQUIRED
SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)
SQLNET.CRYPTO_CHECKSUM_SERVER = REQUIRED
TCP.VALIDNODE_CHECKING = YES
TCP.INVITED_NODES = (localhost, 127.0.0.1)
```

TODO:

1. Guardar una copia del `sqlnet.ora` original (estado "antes") en `docs/evidencias/`.
2. Aplicar los parámetros anteriores.
3. Reiniciar el listener: `lsnrctl stop` / `lsnrctl start`.
4. Probar la conexión desde SQL Developer tras el cambio; si falla, revertir y documentarlo.
5. Verificar con `SELECT SYS_CONTEXT('USERENV','NETWORK_PROTOCOL') FROM DUAL;` y `V$SESSION_CONNECT_INFO` que la sesión usa cifrado.
