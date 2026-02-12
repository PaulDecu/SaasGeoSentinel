const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin123!';
  
  console.log('🔐 Génération du hash pour:', password);
  console.log('');
  
  try {
    const hash = await bcrypt.hash(password, 10);
    
    console.log('✅ Hash généré:');
    console.log(hash);
    console.log('');
    
    // Vérification
    const isValid = await bcrypt.compare(password, hash);
    
    if (isValid) {
      console.log('✅ Vérification: Le hash est VALIDE');
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 COPIE CETTE COMMANDE ET EXÉCUTE-LA:');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('psql -U postgres -d risks_geo_saas -c "UPDATE users SET password_hash = \'' + hash + '\' WHERE email = \'admin@platform.local\';"');
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('Ou dans psql directement:');
      console.log('');
      console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@platform.local';`);
      console.log('');
      
      // Test avec l'ancien hash qui ne fonctionne pas
      const oldHash = '$2b$10$CwTycUXWue0Thq9StjUM0uJ4TvVWvX.KJTvVYMsGvk.QZJ5JqJ5Oi';
      const testOld = await bcrypt.compare(password, oldHash);
      console.log('🔍 Test ancien hash:', testOld ? '✅ Valide' : '❌ Invalide (normal)');
      
    } else {
      console.log('❌ ERREUR: Le hash généré ne valide pas!');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

generateHash();