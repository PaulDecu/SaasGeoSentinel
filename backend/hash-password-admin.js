const bcrypt = require('bcrypt');

const password = 'Admin123!';

console.log('🔐 Génération du hash pour:', password);
console.log('');

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Erreur:', err);
    return;
  }
  
  console.log('✅ Hash généré:');
  console.log(hash);
  console.log('');
  
  // Vérifier immédiatement que ça fonctionne
  bcrypt.compare(password, hash, (err2, result) => {
    if (err2) {
      console.error('❌ Erreur de vérification:', err2);
      return;
    }
    
    if (result) {
      console.log('✅ VÉRIFICATION RÉUSSIE - Le hash fonctionne!');
      console.log('');
      console.log('📋 Requête SQL à exécuter dans PostgreSQL:');
      console.log('');
      console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@platform.local';`);
      console.log('');
      console.log('Puis vérifier:');
      console.log(`SELECT email, role, substring(password_hash, 1, 30) as hash FROM users WHERE email = 'admin@platform.local';`);
    } else {
      console.log('❌ ERREUR - Le hash ne fonctionne pas!');
    }
  });
});