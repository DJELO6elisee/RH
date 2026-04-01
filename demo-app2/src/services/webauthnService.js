// Service pour gérer l'authentification WebAuthn (empreinte digitale)

const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'https://tourisme.2ise-groupe.com';
  }
  return 'https://tourisme.2ise-groupe.com';
};

// Vérifier si WebAuthn est supporté
export const isWebAuthnSupported = () => {
  const isSupported = typeof window !== 'undefined' && 
         typeof window.PublicKeyCredential !== 'undefined' &&
         typeof navigator !== 'undefined' &&
         navigator.credentials !== undefined;
  
  if (!isSupported) {
    console.warn('⚠️ WebAuthn n\'est pas supporté:', {
      hasWindow: typeof window !== 'undefined',
      hasPublicKeyCredential: typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined',
      hasNavigator: typeof navigator !== 'undefined',
      hasCredentials: typeof navigator !== 'undefined' && navigator.credentials !== undefined
    });
  }
  
  return isSupported;
};

// Convertir ArrayBuffer en base64url
const arrayBufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// Convertir base64url en ArrayBuffer
const base64UrlToArrayBuffer = (base64url) => {
  try {
    // Si c'est déjà un ArrayBuffer, le retourner tel quel
    if (base64url instanceof ArrayBuffer) {
      return base64url;
    }
    
    // Si c'est un Uint8Array, convertir en ArrayBuffer
    if (base64url instanceof Uint8Array) {
      return base64url.buffer;
    }
    
    // Si c'est null ou undefined, lancer une erreur
    if (base64url === null || base64url === undefined) {
      throw new Error('Valeur null ou undefined reçue');
    }
    
    // Si c'est une chaîne, la convertir
    if (typeof base64url === 'string') {
      // Vérifier que la chaîne n'est pas vide
      if (base64url.length === 0) {
        throw new Error('Chaîne vide reçue');
      }
      
      // Ajouter le padding si nécessaire
      let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4;
      if (padding !== 0) {
        base64 += '='.repeat(4 - padding);
      }
      
      try {
        const binary = atob(base64);
        const buffer = new ArrayBuffer(binary.length);
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return buffer;
      } catch (atobError) {
        throw new Error(`Erreur atob: ${atobError.message}. Chaîne reçue: ${base64url.substring(0, 50)}...`);
      }
    }
    
    // Si c'est un nombre, le convertir en ArrayBuffer
    if (typeof base64url === 'number') {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint32(0, base64url, false);
      return buffer;
    }
    
    // Si c'est un objet, essayer de le convertir en chaîne
    if (typeof base64url === 'object') {
      console.warn('Tentative de conversion d\'un objet:', base64url);
      // Si c'est un objet avec une propriété data ou value
      if (base64url.data) {
        return base64UrlToArrayBuffer(base64url.data);
      }
      if (base64url.value) {
        return base64UrlToArrayBuffer(base64url.value);
      }
      // Essayer de convertir en JSON puis en chaîne
      const jsonString = JSON.stringify(base64url);
      throw new Error(`Type objet non supporté: ${jsonString.substring(0, 100)}`);
    }
    
    throw new Error(`Type non supporté pour la conversion: ${typeof base64url}. Valeur: ${String(base64url).substring(0, 100)}`);
  } catch (error) {
    console.error('Erreur lors de la conversion base64url:', error);
    console.error('Type de la valeur:', typeof base64url);
    console.error('Valeur complète:', base64url);
    throw new Error('Erreur lors de la conversion des données: ' + error.message);
  }
};

// Enregistrer une nouvelle empreinte digitale
export const registerFingerprint = async (username, deviceName = null) => {
  try {
    if (!isWebAuthnSupported()) {
      throw new Error('L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil');
    }

    const apiUrl = getApiUrl();

    // 1. Obtenir le challenge d'enregistrement
    const challengeResponse = await fetch(`${apiUrl}/api/auth/webauthn/register/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });

    const challengeData = await challengeResponse.json();

    if (!challengeData.success) {
      throw new Error(challengeData.message || 'Erreur lors de la génération du challenge');
    }

    // 2. Préparer les options pour le navigateur
    // Le backend envoie maintenant les données en base64url (chaînes)
    // Convertir le challenge en ArrayBuffer
    const challengeString = challengeData.options.challenge || challengeData.challenge;
    const challengeBuffer = base64UrlToArrayBuffer(challengeString);
    
    // Convertir l'ID utilisateur en ArrayBuffer
    const userIdString = challengeData.options.user.id;
    const userIdBuffer = base64UrlToArrayBuffer(userIdString);
    
    // Déterminer le rpId correct basé sur le domaine actuel
    const currentHostname = window.location.hostname;
    let rpId = currentHostname;
    
    // Pour localhost, utiliser 'localhost'
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      rpId = 'localhost';
    } else if (currentHostname.includes('.')) {
      // Pour les domaines, utiliser le domaine de base (sans sous-domaine si nécessaire)
      rpId = currentHostname;
    }
    
    // S'assurer que les options sont correctement formatées
    const publicKeyCredentialCreationOptions = {
      challenge: challengeBuffer,
      rp: {
        id: rpId, // Utiliser le domaine détecté
        name: challengeData.options.rp?.name || 'Ministère RH'
      },
      user: {
        id: userIdBuffer,
        name: challengeData.options.user.name,
        displayName: challengeData.options.user.displayName || challengeData.options.user.name
      },
      pubKeyCredParams: challengeData.options.pubKeyCredParams || [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        // Forcer l'utilisation de l'authentificateur intégré (empreinte digitale) plutôt qu'une passkey
        authenticatorAttachment: 'platform', // Utiliser uniquement l'authentificateur intégré (empreinte digitale)
        userVerification: 'required', // Requis pour l'empreinte digitale
        requireResidentKey: false // Ne pas exiger de clé résidente (évite la création de passkey)
        // Ne pas inclure residentKey pour éviter que le navigateur propose une passkey
      },
      timeout: 60000,
      attestation: 'none', // 'none' pour éviter les demandes de passkey
      excludeCredentials: [], // Liste vide pour forcer une nouvelle création locale
      // Extensions pour désactiver certaines fonctionnalités de passkey
      extensions: {
        // Désactiver la création automatique de passkey
        credProps: false
      }
    };
    
    console.log('🔐 Options WebAuthn préparées:', {
      rpId: publicKeyCredentialCreationOptions.rp.id,
      currentHostname: currentHostname,
      userName: publicKeyCredentialCreationOptions.user.name,
      userVerification: publicKeyCredentialCreationOptions.authenticatorSelection.userVerification,
      hasChallenge: !!publicKeyCredentialCreationOptions.challenge,
      hasUserId: !!publicKeyCredentialCreationOptions.user.id
    });

    // 3. Demander au navigateur de créer le credential
    // Le navigateur affichera automatiquement une interface pour scanner l'empreinte
    // L'utilisateur doit placer son doigt sur le capteur de son appareil
    console.log('🔐 Démarrage de l\'enregistrement WebAuthn...');
    console.log('🔐 Options complètes:', JSON.stringify({
      rpId: publicKeyCredentialCreationOptions.rp?.id,
      rpName: publicKeyCredentialCreationOptions.rp?.name,
      userName: publicKeyCredentialCreationOptions.user?.name,
      userVerification: publicKeyCredentialCreationOptions.authenticatorSelection?.userVerification,
      hasChallenge: !!publicKeyCredentialCreationOptions.challenge,
      challengeLength: publicKeyCredentialCreationOptions.challenge?.byteLength,
      hasUserId: !!publicKeyCredentialCreationOptions.user?.id,
      userIdLength: publicKeyCredentialCreationOptions.user?.id?.byteLength
    }, null, 2));
    
    // Vérifier que le navigateur peut créer des credentials
    if (!navigator.credentials || !navigator.credentials.create) {
      throw new Error('L\'API Credentials n\'est pas disponible. Utilisez un navigateur moderne (Chrome, Edge, Firefox, Safari).');
    }
    
    console.log('🔐 Appel de navigator.credentials.create()...');
    console.log('🔐 Le navigateur devrait maintenant demander de scanner l\'empreinte digitale');
    
    let credential;
    try {
      // L'appel à navigator.credentials.create() déclenchera automatiquement
      // la demande de scan d'empreinte digitale par le navigateur
      credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });
      
      if (!credential) {
        throw new Error('Aucun credential créé - l\'utilisateur a peut-être annulé ou le scan a échoué');
      }
      
      console.log('✅ Credential créé avec succès');
      console.log('✅ Type:', credential.type);
      console.log('✅ ID:', credential.id ? 'Présent' : 'Manquant');
    } catch (error) {
      console.error('❌ Erreur WebAuthn détaillée:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Améliorer les messages d'erreur avec plus de détails
      if (error.name === 'NotAllowedError') {
        throw new Error('L\'enregistrement a été annulé ou refusé. Veuillez réessayer et autoriser l\'accès au capteur d\'empreinte digitale quand demandé.');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('Cette empreinte digitale est déjà enregistrée pour cet utilisateur.');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil ou navigateur. Vérifiez que votre appareil a un capteur d\'empreinte digitale.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Erreur de sécurité. Assurez-vous d\'utiliser HTTPS ou localhost. Vérifiez aussi que WEBAUTHN_RP_ID correspond à votre domaine.');
      } else if (error.name === 'UnknownError') {
        throw new Error('Erreur inconnue lors du scan. Vérifiez que votre capteur d\'empreinte digitale fonctionne correctement.');
      } else if (error.name === 'ConstraintError') {
        throw new Error('Contrainte non respectée. Vérifiez que votre appareil supporte les paramètres demandés.');
      } else if (error.message) {
        throw new Error(`Erreur: ${error.message}`);
      }
      throw error;
    }

    if (!credential) {
      throw new Error('Aucun credential créé');
    }

    // 4. Préparer les données pour l'envoi au serveur
    const response = credential.response;
    const clientDataJSON = arrayBufferToBase64Url(response.clientDataJSON);
    const attestationObject = arrayBufferToBase64Url(response.attestationObject);
    const credentialId = arrayBufferToBase64Url(credential.rawId);

    // 5. Envoyer les données au serveur
    const registerResponse = await fetch(`${apiUrl}/api/auth/webauthn/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        credential: {
          id: credentialId,
          type: credential.type
        },
        clientDataJSON,
        attestationObject,
        deviceName: deviceName || navigator.userAgent
      })
    });

    const registerData = await registerResponse.json();

    if (!registerData.success) {
      throw new Error(registerData.message || 'Erreur lors de l\'enregistrement');
    }

    return {
      success: true,
      message: 'Empreinte digitale enregistrée avec succès'
    };

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'empreinte digitale:', error);
    
    // Gérer les erreurs spécifiques de WebAuthn
    if (error.name === 'NotAllowedError') {
      throw new Error('L\'enregistrement a été annulé ou refusé');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Cette empreinte digitale est déjà enregistrée');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil');
    } else if (error.name === 'SecurityError') {
      throw new Error('Erreur de sécurité lors de l\'enregistrement');
    }
    
    throw error;
  }
};

// Authentifier avec une empreinte digitale
export const authenticateWithFingerprint = async (username, organizationId = null, organizationType = null) => {
  try {
    if (!isWebAuthnSupported()) {
      throw new Error('L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil');
    }

    const apiUrl = getApiUrl();

    // 1. Obtenir le challenge d'authentification
    const challengeResponse = await fetch(`${apiUrl}/api/auth/webauthn/authenticate/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });

    const challengeData = await challengeResponse.json();

    if (!challengeData.success) {
      throw new Error(challengeData.message || 'Erreur lors de la génération du challenge');
    }

    // 2. Préparer les options pour le navigateur
    // Le backend envoie maintenant les données en base64url (chaînes)
    // Convertir le challenge en ArrayBuffer
    const challengeString = challengeData.options.challenge || challengeData.challenge;
    const challengeBuffer = base64UrlToArrayBuffer(challengeString);
    
    // Convertir les credentials IDs (ils sont déjà en base64url depuis la base de données)
    const allowCredentials = challengeData.options.allowCredentials.map(cred => {
      const idBuffer = base64UrlToArrayBuffer(cred.id);
      return {
        ...cred,
        id: idBuffer
      };
    });
    
    const publicKeyCredentialRequestOptions = {
      ...challengeData.options,
      challenge: challengeBuffer,
      allowCredentials: allowCredentials
    };

    // 3. Demander au navigateur de s'authentifier
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    if (!assertion) {
      throw new Error('Authentification annulée');
    }

    // 4. Préparer les données pour l'envoi au serveur
    const response = assertion.response;
    const clientDataJSON = arrayBufferToBase64Url(response.clientDataJSON);
    const authenticatorData = arrayBufferToBase64Url(response.authenticatorData);
    const signature = arrayBufferToBase64Url(response.signature);
    const credentialId = arrayBufferToBase64Url(assertion.rawId);

    // 5. Envoyer les données au serveur
    const authResponse = await fetch(`${apiUrl}/api/auth/webauthn/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        credential: {
          id: credentialId,
          type: assertion.type
        },
        clientDataJSON,
        authenticatorData,
        signature,
        organizationId,
        organizationType
      })
    });

    const authData = await authResponse.json();

    if (!authData.success) {
      throw new Error(authData.message || 'Erreur lors de l\'authentification');
    }

    return {
      success: true,
      token: authData.data.token,
      user: authData.data.user,
      message: 'Authentification par empreinte digitale réussie'
    };

  } catch (error) {
    console.error('Erreur lors de l\'authentification par empreinte digitale:', error);
    
    // Gérer les erreurs spécifiques de WebAuthn
    if (error.name === 'NotAllowedError') {
      throw new Error('L\'authentification a été annulée ou refusée');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Aucune empreinte digitale enregistrée pour cet utilisateur');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil');
    } else if (error.name === 'SecurityError') {
      throw new Error('Erreur de sécurité lors de l\'authentification');
    }
    
    throw error;
  }
};

// Vérifier si un utilisateur a des empreintes digitales enregistrées
export const hasRegisteredFingerprints = async (username) => {
  try {
    const apiUrl = getApiUrl();
    
    const response = await fetch(`${apiUrl}/api/auth/webauthn/authenticate/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    return data.success;

  } catch (error) {
    console.error('Erreur lors de la vérification des empreintes digitales:', error);
    return false;
  }
};

