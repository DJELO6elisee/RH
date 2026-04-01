SELECT u.id,
       u.username,
       u.email,
       u.password_hash,
       a.nom,
       a.prenom,
       a.date_de_naissance
FROM utilisateurs u
LEFT JOIN agents a ON a.id = u.id_agent
WHERE u.id_agent IS NOT NULL
ORDER BY u.id;