# Cambios de red de la clínica (A8.20) — `sqlnet.ora` y listener

Corrección manual de **OBS-20** (sesiones sin cifrado de red). El instrumento no puede generarla como SQL porque el cambio vive en un archivo del servidor, así que el script correctivo trae estos mismos pasos como comentarios y aquí se detallan para la demostración.

> En Oracle, el equivalente de `pg_hba.conf` (nombrado como ejemplo en la asignación) no existe: la validación de nodos se configura en `sqlnet.ora` con `TCP.VALIDNODE_CHECKING` y `TCP.INVITED_NODES`.

## Estado "antes" (línea base)

> **Nota:** en esta instalación de Oracle XE el archivo `%ORACLE_HOME%\network\admin\sqlnet.ora` **no existe**. Al crearlo, incluir también `SQLNET.AUTHENTICATION_SERVICES = (NTS)`; sin esa línea `sqlplus / as sysdba` deja de autenticar por el sistema operativo y se pierde el acceso local como SYSDBA. Hasta que se cree, OBS-13 (hashes 11G) marca todas las cuentas, incluida la del auditor.

Guardar una copia del `sqlnet.ora` original en `docs/evidencias/` antes de tocarlo. En la línea base no existen `SQLNET.ENCRYPTION_SERVER` ni `TCP.VALIDNODE_CHECKING`. Ubicación: `%ORACLE_HOME%\network\admin\sqlnet.ora`.

## Cambios a aplicar

```
SQLNET.ENCRYPTION_SERVER = REQUIRED
SQLNET.ENCRYPTION_TYPES_SERVER = (AES256)
SQLNET.CRYPTO_CHECKSUM_SERVER = REQUIRED
TCP.VALIDNODE_CHECKING = YES
TCP.INVITED_NODES = (localhost, 127.0.0.1)
```

Recomendación para la transición: empezar con `REQUESTED` y pasar a `REQUIRED` cuando todos los clientes (SQL Developer, el backend con python-oracledb) conecten bien. python-oracledb en modo *thin* soporta el cifrado nativo de Oracle Net; verificarlo con una conexión de prueba antes de pasar a `REQUIRED`.

## Procedimiento

1. Copia del `sqlnet.ora` original.
2. Aplicar los parámetros.
3. Reiniciar el listener: `lsnrctl stop` y `lsnrctl start`.
4. Probar la conexión desde SQL Developer y desde el instrumento; si falla, revertir con la copia y documentarlo.
5. **Re-observar** con el instrumento. Limitación conocida de OBS-20: una sesión TLS (`tcps`) no muestra el adaptador de cifrado nativo; confirmarla con `SELECT SYS_CONTEXT('USERENV','NETWORK_PROTOCOL') FROM dual;`.
