
// Script de test pour vérifier les sous-directions dans le frontend
// À exécuter dans la console du navigateur

console.log('🧪 Test des sous-directions dans le frontend...');

// 1. Vérifier le token d'authentification
const token = localStorage.getItem('token');
console.log('🔐 Token présent:', !!token);
if (token) {
    console.log('   Token (premiers caractères):', token.substring(0, 20) + '...');
} else {
    console.log('   ❌ Aucun token trouvé - l'utilisateur n'est pas connecté');
    return;
}

// 2. Tester l'API directement
fetch('http://localhost:5000/api/sous-directions', {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
})
.then(response => {
    console.log('📡 Réponse API:', response.status, response.statusText);
    return response.json();
})
.then(data => {
    console.log('📄 Données reçues:', data);
    if (data.success && data.data) {
        console.log(`✅ ${data.data.length} sous-direction(s) récupérée(s)`);
        data.data.forEach((sd, index) => {
            console.log(`   ${index + 1}. ID: ${sd.id}, Libellé: "${sd.libelle}"`);
        });
    } else {
        console.log('❌ Erreur API:', data.message);
    }
})
.catch(error => {
    console.error('❌ Erreur de requête:', error);
});

// 3. Vérifier les options dynamiques dans le composant
console.log('🔍 Vérification des options dynamiques...');
// Note: Cette partie nécessite d'être dans le contexte React
