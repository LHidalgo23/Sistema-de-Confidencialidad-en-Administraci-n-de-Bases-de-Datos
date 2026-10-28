SELECT d.username       AS usuario,
       u.account_status AS estado
FROM   dba_users_with_defpwd d
JOIN   dba_users u ON u.username = d.username
WHERE  u.account_status = 'OPEN'
ORDER  BY d.username
