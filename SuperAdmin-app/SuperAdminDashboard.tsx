import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import Sidebar from '../components/Sidebar';
import DashboardStats from '../components/DashboardStats';
import { dataService } from '../services/dataService';
import { authService } from '../services/authService';
import { User, MenuItem, Produit, FamilleProduit, Direction, SousDirection, BonCommande, BonLivraison } from '../types';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import StoreIcon from '@mui/icons-material/Store';
import { t, languages, Language } from '../utils/i18n';
import { useLanguage } from '../contexts/LanguageContext';
import FamillesProduitsSection from './FamillesProduitsSection';
import './DashboardPages.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [entrepots, setEntrepots] = useState<User[]>([]);
  const [magasins, setMagasins] = useState<User[]>([]);
  const [magasinsCentrale, setMagasinsCentrale] = useState<User[]>([]);
  const [magasinsSecondaire, setMagasinsSecondaire] = useState<User[]>([]);
  const [services, setServices] = useState<User[]>([]);
  const [fournisseurs, setFournisseurs] = useState<User[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [famillesProduits, setFamillesProduits] = useState<FamilleProduit[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [sousDirections, setSousDirections] = useState<SousDirection[]>([]);
  const [editingDirectionId, setEditingDirectionId] = useState<number | null>(null);
  const [editingSousDirectionId, setEditingSousDirectionId] = useState<number | null>(null);
  const [selectedDirectionForService, setSelectedDirectionForService] = useState<number | null>(null);
  const [selectedSousDirectionForService, setSelectedSousDirectionForService] = useState<number | null>(null);
  const [showServiceForm, setShowServiceForm] = useState<boolean>(false);
  const [selectedSousDirectionForDetails, setSelectedSousDirectionForDetails] = useState<number | null>(null);
  const [selectedDirectionForDetails, setSelectedDirectionForDetails] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingProduitId, setEditingProduitId] = useState<number | null>(null);
  const [formType, setFormType] = useState<'entrepot' | 'magasinier' | 'magasin_centrale' | 'magasin_secondaire' | 'prestataire' | 'service'>('entrepot');
  
  // États pour l'inventaire
  const [showCreateInventaireForm, setShowCreateInventaireForm] = useState<boolean>(false);
  const [editingInventaireId, setEditingInventaireId] = useState<number | null>(null);
  const [inventaireFormData, setInventaireFormData] = useState({
    nom: '',
    dateDebut: '',
    dateFin: '',
  });
  const [inventaireType, setInventaireType] = useState<'magasin_centrale' | 'magasin_secondaire' | 'entrepot' | null>(null);
  const [selectedEntiteType, setSelectedEntiteType] = useState<'magasin_centrale' | 'magasin_secondaire' | 'entrepot' | null>(null);
  const [showEntitesDropdown, setShowEntitesDropdown] = useState<boolean>(false);
  const [showEntrepotsListInInventaire, setShowEntrepotsListInInventaire] = useState<boolean>(false);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [selectedProduitsInventaire, setSelectedProduitsInventaire] = useState<number[]>([]);
  const [selectedProduitsParLocation, setSelectedProduitsParLocation] = useState<Record<number, number[]>>({});
  const [produitsDisponiblesParLocation, setProduitsDisponiblesParLocation] = useState<Record<number, number[]>>({});
  const [currentLocationForSelection, setCurrentLocationForSelection] = useState<number | null>(null);
  const [showDetailSelection, setShowDetailSelection] = useState<boolean>(false);
  const [showFichePreparatoire, setShowFichePreparatoire] = useState<boolean>(false);
  const [validatedLocations, setValidatedLocations] = useState<Set<number>>(new Set());
  const [fichePreparatoireLocation, setFichePreparatoireLocation] = useState<{ id: number; nom: string } | null>(null);
  const [inventaires, setInventaires] = useState<Array<{
    id: number;
    nom: string;
    numero_ordre: string;
    date_debut: string;
    date_fin: string;
    statut: 'active' | 'desactive';
    cree_par_nom?: string;
    cree_par_email?: string;
    nombre_entites?: number;
    entites?: Array<{
      id: number;
      entite_id: number;
      entite_type: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot';
      nom_entite?: string;
      email_entite?: string;
    }>;
  }>>([]);
  const [selectedInventaireDetails, setSelectedInventaireDetails] = useState<typeof inventaires[0] | null>(null);
  const [showInventaireDetails, setShowInventaireDetails] = useState<boolean>(false);
  const [currentInventaire, setCurrentInventaire] = useState<typeof inventaires[0] | null>(null);
  const [numeroOrdreInventaire, setNumeroOrdreInventaire] = useState<string>('');
  const [inventaireData, setInventaireData] = useState<Array<{
    locationId: number;
    locationNom: string;
    produitId: number;
    produitNom: string;
    codeProduit: string;
    marque?: string;
    caracteristiques?: string;
    image?: string;
    quantiteActuelle: number;
    quantiteInventaire: number;
    numeroOrdre?: string;
  }>>([]);
  // États pour les écarts d'inventaire
  const [showEcartModal, setShowEcartModal] = useState<boolean>(false);
  const [ecartData, setEcartData] = useState<Array<{
    locationId: number;
    locationNom: string;
    produitId: number;
    produitNom: string;
    codeProduit: string;
    marque?: string;
    image?: string;
    stockActuel: number;
    quantitePhysique: number;
    ecart: number;
    justificatif?: string;
  }>>([]);
  const [showCorrectionEcartModal, setShowCorrectionEcartModal] = useState<boolean>(false);
  // États pour le calcul du stock
  const [bonsCommande, setBonsCommande] = useState<BonCommande[]>([]);
  const [bonsLivraison, setBonsLivraison] = useState<BonLivraison[]>([]);
  // États pour l'archive des fiches préparatoires
  const [archiveFichesPreparatoires, setArchiveFichesPreparatoires] = useState<Array<{
    id: string;
    dateCreation: string;
    numeroOrdre: string;
    locationId: number;
    locationNom: string;
    inventaireType: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot';
    data: Array<{
      locationId: number;
      locationNom: string;
      produitId: number;
      produitNom: string;
      codeProduit: string;
      marque?: string;
      caracteristiques?: string;
      image?: string;
      quantiteActuelle: number;
      quantiteInventaire: number;
      numeroOrdre?: string;
    }>;
    produitsValides?: string[]; // Tableau des clés `${produitId}-${locationId}` des produits validés
    quantitesValidees?: boolean; // Indique si les quantités physiques ont été validées
    dateValidationQuantites?: string; // Date de validation des quantités physiques
  }>>([]);
  const [filtreArchiveDate, setFiltreArchiveDate] = useState<string>('');
  const [filtreArchiveNumeroOrdre, setFiltreArchiveNumeroOrdre] = useState<string>('');
  // États pour la consultation de fiche depuis l'archive
  const [ficheArchiveConsultee, setFicheArchiveConsultee] = useState<typeof archiveFichesPreparatoires[0] | null>(null);
  const [showConsultationFicheModal, setShowConsultationFicheModal] = useState<boolean>(false);
  const [modeComparaison, setModeComparaison] = useState<boolean>(false);
  const [donneesFicheConsultee, setDonneesFicheConsultee] = useState<Array<{
    locationId: number;
    locationNom: string;
    produitId: number;
    produitNom: string;
    codeProduit: string;
    marque?: string;
    image?: string;
    caracteristiques?: string;
    quantiteActuelle: number;
    quantiteInventaire: number; // Quantité totale en unités
    quantiteInventaireLots?: number; // Quantité en lots (pour affichage)
    quantiteInventaireUnites?: number; // Quantité en unités restantes (pour affichage)
    nombreProduitsParCarton?: number; // Nombre de produits par carton/lot
    uniteSaisie?: 'lot' | 'unite'; // Unité de saisie choisie
    numeroOrdre?: string;
    stockActuel?: number;
    ecart?: number;
    justificatif?: File | string; // Fichier de justification
    stockCorrige?: number; // Stock corrigé en unités
    uniteSaisieStockCorrige?: 'lot' | 'unite'; // Unité de saisie pour le stock corrigé
  }>>([]);
  
  // État pour stocker les fichiers de justification (clé: `${produitId}-${locationId}`)
  const [fichiersJustification, setFichiersJustification] = useState<Record<string, File>>({});
  
  // État pour suivre les produits dont le stock corrigé a été validé (clé: `${produitId}-${locationId}`)
  const [stocksCorrigesValides, setStocksCorrigesValides] = useState<Set<string>>(new Set());
  
  // État pour suivre les produits dont la quantité physique a été validée (clé: `${produitId}-${locationId}`)
  const [quantitesPhysiquesValidees, setQuantitesPhysiquesValidees] = useState<Set<string>>(new Set());
  
  // États pour le stock d'entrée
  const [stockEntreeType, setStockEntreeType] = useState<'magasin_centrale' | 'magasin_secondaire' | 'entrepot' | null>(null);
  const [selectedLocationStockEntree, setSelectedLocationStockEntree] = useState<User | null>(null);
  const [showStockEntreeModal, setShowStockEntreeModal] = useState<boolean>(false);
  const [selectedProduitStockEntree, setSelectedProduitStockEntree] = useState<Produit | null>(null);
  const [stockEntreeQuantite, setStockEntreeQuantite] = useState<string>('');
  const [stockEntreeUnite, setStockEntreeUnite] = useState<'unite' | 'lot'>('unite');
  // Stocker les stocks d'entrée déjà saisis (clé: `${locationId}-${produitId}`, valeur: { quantite, unite })
  const [stocksEntreeSaisis, setStocksEntreeSaisis] = useState<Record<string, { quantite: number; unite: string; date?: string }>>({});

  // Obtenir la langue actuelle depuis le contexte
  const { language: currentLang, setLanguage } = useLanguage();

  const menuItems: MenuItem[] = React.useMemo(() => [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: 'dashboard' },
    { 
      id: 'stock', 
      label: 'Stock', 
      icon: '📦',
      children: [
    { id: 'entrepots', label: t('sidebar.warehouses'), icon: '🏭' },
    { id: 'magasins_centrale', label: t('sidebar.stores.centrale'), icon: '🏪' },
    { id: 'magasins_secondaire', label: t('sidebar.stores.secondaire'), icon: '🏬' },
    { id: 'directions', label: 'Directions', icon: '📋' },
    { id: 'sous_directions', label: 'Sous directions', icon: '📁' },
    { id: 'familles_produits', label: t('sidebar.productFamilies'), icon: '🏷️' },
    { id: 'produits', label: t('sidebar.products'), icon: '📦' },
    { id: 'fournisseurs', label: 'Fournisseurs', icon: '🚚' },
    { id: 'inventaire', label: 'Inventaire', icon: '📊' },
    { id: 'archive_fiches_preparatoires', label: 'Archive des fiches préparatoires', icon: '📁' },
    { id: 'stock_entree', label: 'Stock d\'entrée', icon: '📥' },
      ]
    },
    { 
      id: 'patrimoine', 
      label: 'Patrimoine', 
      icon: '🏛️',
      children: [
        { id: 'patrimoine_entrepots', label: t('sidebar.warehouses'), icon: '🏭' },
        { id: 'patrimoine_magasins_centrale', label: t('sidebar.stores.centrale'), icon: '🏪' },
        { id: 'patrimoine_magasins_secondaire', label: t('sidebar.stores.secondaire'), icon: '🏬' },
        { id: 'patrimoine_directions', label: 'Directions', icon: '📋' },
        { id: 'patrimoine_sous_directions', label: 'Sous directions', icon: '📁' },
        { id: 'patrimoine_familles_produits', label: t('sidebar.productFamilies'), icon: '🏷️' },
        { id: 'patrimoine_produits', label: t('sidebar.products'), icon: '📦' },
        { id: 'patrimoine_fournisseurs', label: 'Fournisseurs', icon: '🚚' },
        { id: 'patrimoine_inventaire', label: 'Inventaire', icon: '📊' },
        { id: 'patrimoine_archive_fiches_preparatoires', label: 'Archive des fiches préparatoires', icon: '📁' },
        { id: 'patrimoine_stock_entree', label: 'Stock d\'entrée', icon: '📥' },
      ]
    },
    { id: 'parametres', label: t('sidebar.settings'), icon: 'settings' },
  ], [currentLang]);

  const [formData, setFormData] = useState<{
    nom: string;
    email: string;
    telephone: string;
    telephone2: string;
    adresse: string;
    // Champs spécifiques aux fournisseurs
    siret?: string;
    numero_tva?: string;
    contact_commercial?: string;
    email_commercial?: string;
    telephone_commercial?: string;
    site_web?: string;
    code_postal?: string;
    ville?: string;
    pays?: string;
    note?: string;
    direction_id?: string;
    sous_direction_id?: string;
    // Nouveaux champs pour le premier responsable
    nom_responsable?: string;
    prenom_responsable?: string;
    contact_responsable?: string;
    email_responsable?: string;
    numero_compte_contribuable?: string;
  }>({
    nom: '',
    email: '',
    telephone: '',
    telephone2: '',
    adresse: '',
    siret: '',
    numero_tva: '',
    contact_commercial: '',
    email_commercial: '',
    telephone_commercial: '',
    site_web: '',
    code_postal: '',
    ville: '',
    pays: 'France',
    note: '',
    direction_id: '',
    sous_direction_id: '',
    nom_responsable: '',
    prenom_responsable: '',
    contact_responsable: '',
    email_responsable: '',
    numero_compte_contribuable: '',
  });

  const [produitFormData, setProduitFormData] = useState<{
    nom: string;
    nombre_produits_par_carton: string;
    famille_id: string;
    marque: string;
    caracteristiques: string;
    image: string;
    imageFile: File | null;
  }>({
    nom: '',
    nombre_produits_par_carton: '1',
    famille_id: '',
    marque: '',
    caracteristiques: '',
    image: '',
    imageFile: null,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [produitsPage, setProduitsPage] = useState<number>(1);
  const produitsPerPage = 10;

  const [familleFormData, setFamilleFormData] = useState<{
    nom: string;
    description: string;
  }>({
    nom: '',
    description: '',
  });
  const [directionFormData, setDirectionFormData] = useState<{
    nom: string;
    description: string;
  }>({
    nom: '',
    description: '',
  });
  const [sousDirectionFormData, setSousDirectionFormData] = useState<{
    nom: string;
    description: string;
    direction_id: string;
  }>({
    nom: '',
    description: '',
    direction_id: '',
  });
  const [editingFamilleId, setEditingFamilleId] = useState<number | null>(null);
  const [selectedFamilleIdForView, setSelectedFamilleIdForView] = useState<number | null>(null);
  const [produitsAFamille, setProduitsAFamille] = useState<Array<{
    nom: string;
    code_produit: string;
    nombre_produits_par_carton: string;
    caracteristiques?: string;
    image?: string;
  }>>([]);
  const [nouveauProduit, setNouveauProduit] = useState<{
    nom: string;
    code_produit: string;
    nombre_produits_par_carton: string;
    caracteristiques: string;
    image: string;
    imageFile: File | null;
  }>({
    nom: '',
    code_produit: '',
    nombre_produits_par_carton: '1',
    caracteristiques: '',
    image: '',
    imageFile: null,
  });

  // État pour les paramètres
  const [passwordData, setPasswordData] = useState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string>('');
  const [showQuotationForm, setShowQuotationForm] = useState<boolean>(false);
  const [selectedFamilleId, setSelectedFamilleId] = useState<string>('');
  const [selectedProduits, setSelectedProduits] = useState<number[]>([]);
  const [selectedProduitId, setSelectedProduitId] = useState<string>('');
  const [quantiteProduit, setQuantiteProduit] = useState<string>('1');
  const [uniteQuantite, setUniteQuantite] = useState<string>('unité');
  const [famillePourAjoutProduit, setFamillePourAjoutProduit] = useState<{ id: number; nom: string } | null>(null);
  const [produitsPourFamilleExistante, setProduitsPourFamilleExistante] = useState<Array<{
    nom: string;
    code_produit: string;
    nombre_produits_par_carton: string;
    caracteristiques?: string;
    image?: string;
  }>>([]);

  useEffect(() => {
    // Vérifier que l'utilisateur est un super_admin
    const user = authService.getCurrentUser();
    if (!user || user.type !== 'super_admin') {
      console.error('❌ Accès refusé: Utilisateur non autorisé', user);
      alert('Accès refusé. Vous devez être connecté en tant que super administrateur.');
      navigate('/login');
      return;
    }
    
    console.log('✅ Utilisateur vérifié:', { id: user.id, email: user.email, type: user.type });
    console.log('🔑 Token présent:', !!localStorage.getItem('token'));
    
    // Charger l'archive des fiches préparatoires au montage
    // Charger les fiches préparatoires depuis la base de données au montage
    loadFichesPreparatoires();
    
    loadData();
    if (activeSection === 'produits') {
      loadProduits();
      loadFamillesProduits();
    }
    if (activeSection === 'familles_produits') {
      loadProduits(); // Charger les produits pour les afficher dans le tableau
      loadFamillesProduits();
    }
    if (activeSection === 'quotation') {
      loadProduits();
      loadFamillesProduits();
    }
    if (activeSection === 'fournisseurs') {
      loadData();
    }
    if (activeSection === 'inventaire') {
      loadProduits();
      loadFamillesProduits(); // Charger les familles pour grouper les produits
      loadData(); // Charger aussi les magasins et entrepôts
    }
    
    if (activeSection === 'archive_fiches_preparatoires') {
      // Charger l'archive depuis la base de données
      loadFichesPreparatoires();
    }
    if (activeSection === 'stock_entree') {
      loadProduits();
      loadData(); // Charger les magasins et entrepôts
    }
    if (activeSection === 'directions') {
      loadDirections();
      loadData(); // Charger les services pour afficher ceux liés aux directions
    }
    if (activeSection === 'sous_directions') {
      loadDirections(); // Charger les directions pour le select
      loadSousDirections();
      loadData(); // Charger les services pour afficher ceux liés aux sous-directions
    }
  }, [activeSection, navigate]);

  // Charger tous les inventaires
  const loadInventaires = async (): Promise<void> => {
    try {
      const response = await dataService.getInventaires();
      setInventaires(response.data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des inventaires:', error);
      alert('Erreur lors du chargement des inventaires');
    }
  };

  // Migrer les fiches depuis localStorage vers la base de données
  const migrerFichesDepuisLocalStorage = async (): Promise<void> => {
    const savedArchive = localStorage.getItem('archive_fiches_preparatoires');
    if (!savedArchive) {
      console.log('📦 [MIGRATION] Aucune donnée dans localStorage à migrer');
      return;
    }

    try {
      const parsedArchive = JSON.parse(savedArchive);
      if (!Array.isArray(parsedArchive) || parsedArchive.length === 0) {
        console.log('📦 [MIGRATION] Aucune fiche valide dans localStorage');
        return;
      }

      console.log(`📦 [MIGRATION] Début de la migration de ${parsedArchive.length} fiche(s) depuis localStorage vers la base de données...`);
      let successCount = 0;
      let errorCount = 0;

      for (const fiche of parsedArchive) {
        try {
          // Vérifier que la fiche a les données minimales requises
          if (!fiche.numeroOrdre || !fiche.locationId || !fiche.locationNom || !fiche.inventaireType) {
            console.warn('⚠️ [MIGRATION] Fiche incomplète ignorée:', fiche);
            errorCount++;
            continue;
          }

          await dataService.createFichePreparatoire({
            inventaireId: fiche.inventaireId || null,
            numeroOrdre: fiche.numeroOrdre,
            locationId: fiche.locationId,
            locationNom: fiche.locationNom,
            inventaireType: fiche.inventaireType,
            data: fiche.data || [],
            quantitesValidees: fiche.quantitesValidees || false,
            dateValidationQuantites: fiche.dateValidationQuantites,
            produitsValides: fiche.produitsValides || []
          });
          successCount++;
          console.log(`✅ [MIGRATION] Fiche "${fiche.numeroOrdre}" migrée avec succès`);
        } catch (error: any) {
          errorCount++;
          console.error(`❌ [MIGRATION] Erreur lors de la migration de la fiche "${fiche.numeroOrdre}":`, error);
          console.error('   Détails:', error?.response?.data || error?.message);
          
          // Si l'erreur indique que la table n'existe pas, arrêter la migration
          if (error?.response?.data?.code === 'TABLE_NOT_FOUND' || 
              error?.response?.status === 404 ||
              (error?.response?.data?.error && error?.response?.data?.error.includes('Table')) ||
              (error?.message && error?.message.includes("doesn't exist"))) {
            console.error('❌ [MIGRATION] Les tables n\'existent pas dans la base de données');
            alert(`❌ Migration impossible!\n\nLes tables des fiches préparatoires n'ont pas encore été créées dans la base de données.\n\nVeuillez d'abord exécuter le script SQL :\ngestionsbackend/migrations/create_fiches_preparatoires_table.sql\n\nPuis réessayez la migration.`);
            break; // Arrêter la boucle
          }
        }
      }

      console.log(`📦 [MIGRATION] Migration terminée: ${successCount} succès, ${errorCount} erreurs`);

      // Si au moins une fiche a été migrée avec succès, recharger et nettoyer localStorage
      if (successCount > 0) {
        // Recharger les fiches après migration
        const responseAfterMigration = await dataService.getFichesPreparatoires();
        setArchiveFichesPreparatoires(responseAfterMigration.data || []);
        // Supprimer le localStorage après migration réussie
        localStorage.removeItem('archive_fiches_preparatoires');
        console.log('✅ [MIGRATION] localStorage nettoyé après migration réussie');
        alert(`✅ Migration terminée!\n\n${successCount} fiche(s) migrée(s) avec succès${errorCount > 0 ? `\n${errorCount} erreur(s)` : ''}`);
      } else {
        const errorMessage = errorCount > 0 
          ? `Aucune fiche n'a pu être migrée. ${errorCount} erreur(s) rencontrée(s).\n\nVérifiez la console pour plus de détails.`
          : `Aucune fiche à migrer.`;
        alert(`❌ Migration échouée!\n\n${errorMessage}\n\nLes fiches restent dans le localStorage.`);
      }
    } catch (error) {
      console.error('❌ [MIGRATION] Erreur lors de la migration:', error);
      alert('❌ Erreur lors de la migration des fiches. Vérifiez la console pour plus de détails.');
    }
  };

  // Charger les fiches préparatoires depuis la base de données
  const loadFichesPreparatoires = async (): Promise<void> => {
    try {
      console.log('📁 [LOAD] Chargement des fiches préparatoires depuis la base de données...');
      const response = await dataService.getFichesPreparatoires();
      const fiches = response.data || [];
      console.log(`✅ [LOAD] ${fiches.length} fiche(s) chargée(s) depuis la base de données`);
      setArchiveFichesPreparatoires(fiches);
      
      // Migrer les données du localStorage vers la base de données si nécessaire
      const savedArchive = localStorage.getItem('archive_fiches_preparatoires');
      if (savedArchive && fiches.length === 0) {
        console.log('📦 [LOAD] Des fiches trouvées dans localStorage mais aucune dans la base de données, migration automatique...');
        await migrerFichesDepuisLocalStorage();
      } else if (savedArchive && fiches.length > 0) {
        console.log('⚠️ [LOAD] Des fiches existent à la fois dans localStorage et dans la base de données');
        console.log(`   Base de données: ${fiches.length} fiche(s)`);
        try {
          const parsedArchive = JSON.parse(savedArchive);
          console.log(`   localStorage: ${parsedArchive.length} fiche(s)`);
        } catch (e) {
          console.error('   Erreur lors du parsing localStorage:', e);
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des fiches préparatoires:', error);
      console.error('   Détails:', error?.response?.data || error?.message);
      
      // En cas d'erreur (tables n'existent peut-être pas), essayer de charger depuis localStorage comme fallback
      const savedArchive = localStorage.getItem('archive_fiches_preparatoires');
      if (savedArchive) {
        try {
          const parsedArchive = JSON.parse(savedArchive);
          setArchiveFichesPreparatoires(parsedArchive);
          console.log('⚠️ [FALLBACK] Chargement depuis localStorage en cas d\'erreur API');
          console.log(`   ${parsedArchive.length} fiche(s) chargée(s) depuis localStorage`);
          
          // Afficher un message pour informer l'utilisateur
          if (parsedArchive.length > 0) {
            const shouldMigrate = window.confirm(
              `⚠️ Les fiches préparatoires sont actuellement chargées depuis le localStorage.\n\n` +
              `Pour les sauvegarder dans la base de données, vous devez :\n` +
              `1. Créer les tables dans la base de données (exécuter le script SQL)\n` +
              `2. Cliquer sur "Migrer vers la base de données" ci-dessous\n\n` +
              `Voulez-vous migrer les fiches maintenant ?`
            );
            if (shouldMigrate) {
              await migrerFichesDepuisLocalStorage();
            }
          }
        } catch (e) {
          console.error('❌ Erreur lors du chargement depuis localStorage:', e);
          setArchiveFichesPreparatoires([]);
        }
      } else {
        setArchiveFichesPreparatoires([]);
      }
    }
  };

  // Sauvegarder une fiche préparatoire dans la base de données
  const saveFichePreparatoire = async (fiche: any): Promise<void> => {
    try {
      if (fiche.id) {
        // Mettre à jour la fiche existante
        await dataService.updateFichePreparatoire(fiche.id, {
          quantitesValidees: fiche.quantitesValidees || false,
          dateValidationQuantites: fiche.dateValidationQuantites,
          produitsValides: fiche.produitsValides || [],
          data: fiche.data || []
        });
      } else {
        // Créer une nouvelle fiche
        await dataService.createFichePreparatoire({
          inventaireId: fiche.inventaireId || null,
          numeroOrdre: fiche.numeroOrdre,
          locationId: fiche.locationId,
          locationNom: fiche.locationNom,
          inventaireType: fiche.inventaireType,
          data: fiche.data || [],
          quantitesValidees: fiche.quantitesValidees || false,
          dateValidationQuantites: fiche.dateValidationQuantites,
          produitsValides: fiche.produitsValides || []
        });
      }
      // Recharger les fiches après sauvegarde
      await loadFichesPreparatoires();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la fiche préparatoire:', error);
      throw error;
    }
  };

  // Générer automatiquement les fiches préparatoires pour un inventaire
  const generateFichesPreparatoiresAutomatiquement = async (inventaire: any): Promise<void> => {
    try {
      console.log('📋 [Auto-Génération] Début de la génération automatique des fiches préparatoires...');
      console.log('📋 [Auto-Génération] Inventaire:', inventaire);

      // Charger les produits si nécessaire (pour obtenir les détails complets comme stock_disponible)
      let produitsComplets: any[] = [];
      try {
        if (produits.length === 0) {
          console.log('📋 [Auto-Génération] Chargement des produits...');
          const produitsResponse = await dataService.getProduits();
          produitsComplets = produitsResponse.data || [];
        } else {
          produitsComplets = produits;
        }
      } catch (error) {
        console.warn('⚠️ [Auto-Génération] Erreur lors du chargement des produits, utilisation des données disponibles:', error);
        produitsComplets = produits;
      }

      // Récupérer les détails complets de l'inventaire avec les produits
      const inventaireDetails = await dataService.getInventaire(inventaire.id);
      const inventaireComplet = inventaireDetails.data;
      
      console.log('📋 [Auto-Génération] Inventaire complet récupéré:', inventaireComplet);
      console.log('📋 [Auto-Génération] Nombre d\'entités:', inventaireComplet.entites?.length || 0);

      if (!inventaireComplet.entites || inventaireComplet.entites.length === 0) {
        console.warn('⚠️ [Auto-Génération] Aucune entité trouvée dans l\'inventaire');
        return;
      }

      const numeroOrdre = inventaireComplet.numero_ordre;
      let savedCount = 0;
      let errorCount = 0;
      const fichesCreees: any[] = []; // Stocker les fiches créées pour les afficher ensuite

      // Générer une fiche pour chaque entité
      for (const entite of inventaireComplet.entites) {
        try {
          const locationId = entite.entite_id;
          const locationType = entite.entite_type;
          const locationNom = entite.nom_entite || 'N/A';
          const produitsSelectionnes = entite.produits || [];

          console.log(`📋 [Auto-Génération] Traitement de l'entité: ${locationNom} (${locationId}, ${locationType})`);
          console.log(`📋 [Auto-Génération] Produits sélectionnés:`, produitsSelectionnes.length);

          if (produitsSelectionnes.length === 0) {
            console.warn(`⚠️ [Auto-Génération] Aucun produit pour l'entité ${locationNom}, fiche non créée`);
            continue;
          }

          // Préparer les données de la fiche
          const ficheData = produitsSelectionnes.map((produit: any) => {
            const produitId = produit.produit_id || produit.id;
            const produitComplet = produitsComplets.find((p: any) => p.id === produitId);
            
            return {
              produitId: produitId,
              produitNom: produit.produit_nom || produit.nom || produitComplet?.nom || 'Produit inconnu',
              codeProduit: produit.code_produit || produitComplet?.code_produit || '',
              marque: produit.marque || produitComplet?.marque || null,
              caracteristiques: produit.caracteristiques || produitComplet?.caracteristiques || null,
              image: produit.image || produitComplet?.image || null,
              locationId: locationId,
              locationNom: locationNom,
              quantiteActuelle: produitComplet?.stock_disponible || 0,
              quantiteInventaire: null,
              quantiteInventaireLots: null,
              quantiteInventaireUnites: null,
              nombreProduitsParCarton: produitComplet?.nombre_produits_par_carton || 1,
              stockActuel: produitComplet?.stock_disponible || 0,
              ecart: 0,
              stockCorrige: null,
              justificatif: null,
              numeroOrdre: numeroOrdre
            };
          });

          // Créer la fiche préparatoire
          const fichePreparatoire = {
            inventaireId: inventaire.id,
            numeroOrdre: numeroOrdre,
            locationId: locationId,
            locationNom: locationNom,
            inventaireType: locationType,
            data: ficheData,
            quantitesValidees: false,
            dateValidationQuantites: null,
            produitsValides: []
          };

          // Sauvegarder la fiche et récupérer la réponse
          try {
            const response = await dataService.createFichePreparatoire(fichePreparatoire);
            if (response.data && response.data.fiche) {
              fichesCreees.push(response.data.fiche);
              savedCount++;
              console.log(`✅ [Auto-Génération] Fiche "${locationNom}" créée et sauvegardée avec succès`);
            } else {
              // Si la réponse ne contient pas la fiche, essayer de la récupérer
              await saveFichePreparatoire(fichePreparatoire);
              savedCount++;
              console.log(`✅ [Auto-Génération] Fiche "${locationNom}" sauvegardée (récupération différée)`);
            }
          } catch (saveError: any) {
            // En cas d'erreur, essayer avec saveFichePreparatoire
            try {
              await saveFichePreparatoire(fichePreparatoire);
              savedCount++;
              console.log(`✅ [Auto-Génération] Fiche "${locationNom}" sauvegardée via saveFichePreparatoire`);
            } catch (error2: any) {
              errorCount++;
              console.error(`❌ [Auto-Génération] Erreur lors de la sauvegarde de la fiche pour l'entité ${locationNom}:`, error2);
            }
          }
        } catch (error: any) {
          errorCount++;
          console.error(`❌ [Auto-Génération] Erreur lors de la création de la fiche pour l'entité ${entite.nom_entite}:`, error);
        }
      }

      console.log(`📋 [Auto-Génération] Génération terminée: ${savedCount} fiche(s) créée(s)${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`);
      
      if (savedCount > 0) {
        // Attendre un délai pour s'assurer que toutes les données sont bien sauvegardées en base
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Recharger les fiches préparatoires pour les afficher dans l'archive
        await loadFichesPreparatoires();
        console.log('✅ [Auto-Génération] Fiches préparatoires rechargées dans l\'archive');
        
        // Fonction robuste pour charger et afficher une fiche dans le modal
        const chargerEtAfficherFiche = async (fiche: any) => {
          try {
            console.log('📋 [Auto-Génération] Début du chargement de la fiche pour affichage...', fiche.id);
            
            // Récupérer la fiche complète depuis l'API pour être sûr d'avoir toutes les données
            let ficheComplete = fiche;
            try {
              const ficheResponse = await dataService.getFichePreparatoire(fiche.id);
              ficheComplete = ficheResponse.data;
              console.log('✅ [Auto-Génération] Fiche complète récupérée depuis l\'API');
            } catch (apiError) {
              console.warn('⚠️ [Auto-Génération] Erreur lors de la récupération depuis l\'API, utilisation des données disponibles:', apiError);
              ficheComplete = fiche;
            }
            
            if (!ficheComplete || !ficheComplete.data || ficheComplete.data.length === 0) {
              console.warn('⚠️ [Auto-Génération] Fiche incomplète, utilisation des données disponibles');
              if (!ficheComplete.data) {
                ficheComplete.data = [];
              }
            }
            
            // Préparer les données pour le modal (similaire à la logique existante)
            const locationType = ficheComplete.inventaireType === 'entrepot' 
              ? 'entrepot' 
              : ficheComplete.inventaireType === 'magasin_centrale' 
                ? 'magasin_centrale' 
                : 'magasin_secondaire';
            
            // Charger les données de chaque produit avec le stock actuel
            const donneesPourModal = await Promise.all(ficheComplete.data.map(async (item: any) => {
              const produitId = item.produitId;
              const locationId = item.locationId;
              let stockActuel = 0;
              
              try {
                // Récupérer le stock actuel depuis l'API
                if (locationType === 'entrepot') {
                  const stockResponse = await dataService.getStockEntree(produitId, locationId, locationType);
                  stockActuel = stockResponse.data?.stockEntree || item.quantiteActuelle || 0;
                } else {
                  const stockResponse = await dataService.getStockProduitLocation(produitId, locationId, locationType);
                  stockActuel = stockResponse.data?.stockActuel || item.quantiteActuelle || 0;
                }
              } catch (error) {
                console.warn(`⚠️ [Auto-Génération] Erreur lors de la récupération du stock pour produit ${item.codeProduit}, utilisation de la valeur archivée`);
                stockActuel = item.quantiteActuelle || 0;
              }
              
              // Récupérer les détails du produit
              const produit = produitsComplets.find((p: any) => p.id === produitId);
              const nombreProduitsParCarton = produit?.nombre_produits_par_carton || item.nombreProduitsParCarton || 1;
              
              // Calculer les lots et unités
              const quantiteInventaireExistante = item.quantiteInventaire || 0;
              let quantiteInventaireLots = 0;
              let quantiteInventaireUnites = 0;
              
              if (nombreProduitsParCarton > 1 && quantiteInventaireExistante > 0) {
                quantiteInventaireLots = Math.floor(quantiteInventaireExistante / nombreProduitsParCarton);
                quantiteInventaireUnites = quantiteInventaireExistante % nombreProduitsParCarton;
              } else {
                quantiteInventaireUnites = quantiteInventaireExistante;
              }
              
              return {
                locationId: locationId,
                locationNom: item.locationNom || ficheComplete.locationNom,
                produitId: produitId,
                produitNom: item.produitNom || produit?.nom || 'Produit inconnu',
                codeProduit: item.codeProduit || produit?.code_produit || '',
                marque: item.marque || produit?.marque || undefined,
                image: item.image || produit?.image || undefined,
                caracteristiques: item.caracteristiques || produit?.caracteristiques || '',
                quantiteActuelle: item.quantiteActuelle || 0,
                quantiteInventaire: quantiteInventaireExistante,
                quantiteInventaireLots: quantiteInventaireLots,
                quantiteInventaireUnites: quantiteInventaireUnites,
                nombreProduitsParCarton: nombreProduitsParCarton,
                uniteSaisie: nombreProduitsParCarton > 1 ? 'unite' : undefined,
                numeroOrdre: item.numeroOrdre || ficheComplete.numeroOrdre,
                stockActuel: stockActuel,
                ecart: 0,
                stockCorrige: item.stockCorrige || 0,
                justificatif: item.justificatif || null
              };
            }));
            
            // D'ABORD basculer vers l'onglet Archive des fiches préparatoires
            setActiveSection('archive_fiches_preparatoires');
            console.log('✅ [Auto-Génération] Basculé vers l\'onglet Archive des fiches préparatoires');
            
            // Attendre un court délai pour que React mette à jour l'interface
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // PUIS définir la fiche et les données pour le modal
            setFicheArchiveConsultee(ficheComplete);
            setDonneesFicheConsultee(donneesPourModal);
            setModeComparaison(false);
            
            // Attendre encore un court délai avant d'afficher le modal
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // ENFIN afficher le modal
            setShowConsultationFicheModal(true);
            
            console.log('✅ [Auto-Génération] Fiche chargée et affichée dans le modal:', ficheComplete.locationNom);
            console.log(`✅ [Auto-Génération] ${donneesPourModal.length} produit(s) chargé(s) pour le modal`);
          } catch (error) {
            console.error('❌ [Auto-Génération] Erreur lors du chargement de la fiche pour affichage:', error);
            // En cas d'erreur, afficher quand même la fiche avec les données disponibles
            try {
              setActiveSection('archive_fiches_preparatoires');
              await new Promise(resolve => setTimeout(resolve, 200));
              setFicheArchiveConsultee(fiche);
              setDonneesFicheConsultee(fiche.data || []);
              setModeComparaison(false);
              await new Promise(resolve => setTimeout(resolve, 100));
              setShowConsultationFicheModal(true);
              console.log('✅ [Auto-Génération] Fiche affichée avec les données disponibles (mode fallback)');
            } catch (fallbackError) {
              console.error('❌ [Auto-Génération] Erreur même en mode fallback:', fallbackError);
            }
          }
        };
        
        // Déterminer quelle fiche afficher
        let ficheAAfficher: any = null;
        
        // Si on a des fiches créées directement depuis la réponse, utiliser la première
        if (fichesCreees.length > 0) {
          ficheAAfficher = fichesCreees[0];
          console.log('📋 [Auto-Génération] Utilisation de la fiche créée directement:', ficheAAfficher.id);
        } else {
          // Sinon, récupérer depuis l'API
          try {
            // Récupérer directement depuis l'API
            const response = await dataService.getFichesPreparatoires();
            const toutesLesFiches = response.data || [];
            
            // Filtrer les fiches créées pour cet inventaire
            const fichesTrouvees = toutesLesFiches.filter((fiche: any) => 
              fiche.inventaireId === inventaire.id || fiche.numeroOrdre === numeroOrdre
            );
            
            console.log(`📋 [Auto-Génération] Fiches trouvées pour l'inventaire: ${fichesTrouvees.length}`);
            
            if (fichesTrouvees.length > 0) {
              // Trier par date de création (plus récentes en premier)
              fichesTrouvees.sort((a: any, b: any) => 
                new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
              );
              
              ficheAAfficher = fichesTrouvees[0];
              console.log('📋 [Auto-Génération] Utilisation de la fiche récupérée depuis l\'API:', ficheAAfficher.id);
            } else {
              console.warn('⚠️ [Auto-Génération] Aucune fiche trouvée après création');
            }
          } catch (error) {
            console.error('❌ [Auto-Génération] Erreur lors de la récupération des fiches pour affichage:', error);
          }
        }
        
        // Afficher la fiche si on en a une
        if (ficheAAfficher) {
          await chargerEtAfficherFiche(ficheAAfficher);
        } else {
          console.warn('⚠️ [Auto-Génération] Aucune fiche à afficher');
        }
      }
    } catch (error: any) {
      console.error('❌ [Auto-Génération] Erreur lors de la génération automatique des fiches:', error);
      // Ne pas bloquer la création de l'inventaire si la génération des fiches échoue
    }
  };

  const loadData = async (): Promise<void> => {
    try {
      // Vérifier le token avant de faire les requêtes
      const token = localStorage.getItem('token');
      const user = authService.getCurrentUser();
      
      if (!token) {
        console.error('❌ Token manquant');
        alert('Session expirée. Veuillez vous reconnecter.');
        authService.logout();
        navigate('/login');
        return;
      }
      
      if (!user || user.type !== 'super_admin') {
        console.error('❌ Utilisateur non autorisé:', user);
        alert('Accès refusé. Vous devez être connecté en tant que super administrateur.');
        navigate('/login');
        return;
      }
      
      console.log('🔐 Vérification avant requêtes:', {
        tokenPresent: !!token,
        tokenPreview: token.substring(0, 20) + '...',
        userType: user.type,
        userId: user.id,
        userEmail: user.email
      });
      
      const [entrepotsRes, magasinierRes, magasinCentraleRes, magasinSecondaireRes, prestatairesRes, servicesRes] = await Promise.all([
        dataService.getUsers('entrepot'),
        dataService.getUsers('magasinier'),
        dataService.getUsers('magasin_centrale'),
        dataService.getUsers('magasin_secondaire'),
        dataService.getUsers('prestataire'),
        dataService.getUsers('service'),
      ]);
      console.log('📊 Données chargées:', {
        entrepots: entrepotsRes.data.length,
        magasinier: magasinierRes.data.length,
        magasinCentrale: magasinCentraleRes.data.length,
        magasinSecondaire: magasinSecondaireRes.data.length,
        services: servicesRes.data.length,
        magasinsCentraleData: magasinCentraleRes.data,
        magasinsSecondaireData: magasinSecondaireRes.data,
      });
      setEntrepots(entrepotsRes.data);
      // Combiner tous les types de magasins (pour compatibilité)
      const allMagasins = [
        ...magasinierRes.data,
        ...magasinCentraleRes.data,
        ...magasinSecondaireRes.data,
      ];
      setMagasins(allMagasins);
      // Séparer les magasins par type
      setMagasinsCentrale(magasinCentraleRes.data);
      setMagasinsSecondaire(magasinSecondaireRes.data);
      setFournisseurs(prestatairesRes.data);
      setServices(servicesRes.data);
      
      // Charger les inventaires
      await loadInventaires();
      
      console.log('✅ États mis à jour:', {
        magasinsCentrale: magasinCentraleRes.data.length,
        magasinsSecondaire: magasinSecondaireRes.data.length,
        fournisseurs: prestatairesRes.data.length,
      });
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des données:', error);
      
      // Gérer les erreurs 403 spécifiquement
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || 'Accès refusé';
        const userType = error.response?.data?.userType;
        console.error('🔒 Erreur 403:', {
          message: errorMessage,
          userType: userType,
          currentUser: authService.getCurrentUser()
        });
        
        alert(`Accès refusé: ${errorMessage}\nType d'utilisateur actuel: ${userType || 'inconnu'}\n\nVeuillez vous reconnecter en tant que super administrateur.`);
        
        // Si le token est invalide ou l'utilisateur n'est pas super_admin, rediriger vers login
        authService.logout();
        navigate('/login');
      } else if (error.response?.status === 401) {
        console.error('🔒 Token expiré ou invalide');
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        authService.logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProduits = async (): Promise<Produit[]> => {
    try {
      const response = await dataService.getProduits();
      console.log('📦 Produits chargés:', response.data.length, 'produit(s)');
      console.log('📦 Détails des produits:', response.data);
      setProduits(response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits:', error);
      return [];
    }
  };

  const loadFamillesProduits = async (): Promise<void> => {
    try {
      const response = await dataService.getFamillesProduits();
      setFamillesProduits(response.data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des familles:', error);
    }
  };

  const loadDirections = async (): Promise<void> => {
    try {
      const response = await dataService.getDirections();
      setDirections(response.data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des directions:', error);
    }
  };

  const loadSousDirections = async (): Promise<void> => {
    try {
      const response = await dataService.getSousDirections();
      setSousDirections(response.data);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des sous-directions:', error);
    }
  };

  const loadBonsCommandeEtLivraison = async (): Promise<void> => {
    try {
      const [bcRes, blRes] = await Promise.all([
        dataService.getBonsCommande(),
        dataService.getBonsLivraison(),
      ]);
      setBonsCommande(bcRes.data || []);
      setBonsLivraison(blRes.data || []);
      console.log('📋 Bons de commande chargés:', bcRes.data?.length || 0);
      console.log('📋 Bons de livraison chargés:', blRes.data?.length || 0);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des bons:', error);
    }
  };

  // Fonction pour calculer le stock actuel d'un produit dans un magasin/entrepôt
  const calculerStockActuel = (
    produitId: number,
    locationId: number,
    locationType: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot',
    bonsCommandeToUse?: BonCommande[]
  ): number => {
    try {
      // Utiliser les bons fournis en paramètre ou ceux de l'état
      const bonsToUse = bonsCommandeToUse || bonsCommande;
      
      // Types de magasin valides
      const magasinTypes = ['magasinier', 'magasin_centrale', 'magasin_secondaire'];
      const isMagasin = magasinTypes.includes(locationType);
      const isEntrepot = locationType === 'entrepot';

      let stockTotal = 0;

      // Parcourir tous les bons de commande pour calculer le stock réel
      bonsToUse.forEach(bc => {
        const destinataireId = typeof bc.destinataire_id === 'number' 
          ? bc.destinataire_id 
          : parseInt(String(bc.destinataire_id || 0));
        const expediteurId = typeof bc.expediteur_id === 'number' 
          ? bc.expediteur_id 
          : parseInt(String(bc.expediteur_id || 0));
        const destinataireType = bc.destinataire_type || '';
        const expediteurType = bc.expediteur_type || '';
        const statut = bc.statut || 'en_attente';
        
        // Le bon doit être validé (statut = 'livre' ou 'en_cours' ou 'validé')
        const isValide = statut === 'livre' || statut === 'en_cours' || statut === 'validé';
        
        if (!isValide || !bc.lignes || !Array.isArray(bc.lignes)) {
          return;
        }

        // Vérifier si le magasin/entrepôt est destinataire (entrée de stock)
        const isDestinataire = destinataireId === locationId;
        // Pour les magasins, accepter tous les types de magasins (magasinier, magasin_centrale, magasin_secondaire)
        // Pour les entrepôts, vérifier que le type est 'entrepot'
        // IMPORTANT: Accepter aussi les bons où l'expéditeur est 'super_admin' (pour les stocks d'entrée créés depuis l'inventaire)
        const isTypeDestinataireCorrect = isMagasin 
          ? magasinTypes.includes(destinataireType) || destinataireType === locationType
          : destinataireType === 'entrepot';
        
        // Accepter aussi les bons où l'expéditeur est 'super_admin' (pour les stocks d'entrée créés depuis l'inventaire)
        const isExpediteurSuperAdmin = expediteurType === 'super_admin';

        // Vérifier si le magasin/entrepôt est expéditeur vers un service (sortie de stock)
        const isExpediteur = expediteurId === locationId;
        // Pour les magasins, accepter tous les types de magasins comme expéditeur
        const isExpediteurTypeCorrect = isMagasin 
          ? magasinTypes.includes(expediteurType) || expediteurType === locationType
          : false;
        const isExpediteurVersService = isMagasin && isExpediteur && isExpediteurTypeCorrect && destinataireType === 'service';

        // Parcourir les lignes du bon
        bc.lignes.forEach((ligne: any) => {
          const ligneProduitId = typeof ligne.produit_id === 'number' 
            ? ligne.produit_id 
            : parseInt(String(ligne.produit_id || 0));
          
          const quantiteLivree = parseFloat(String(ligne.quantite_livree || 0)) || 0;
          if (ligneProduitId === produitId && quantiteLivree > 0) {
            // Si le magasin/entrepôt est destinataire : ajouter au stock (entrée)
            // Accepter aussi les bons où l'expéditeur est 'super_admin' (pour les stocks d'entrée créés depuis l'inventaire)
            if (isDestinataire && (isTypeDestinataireCorrect || isExpediteurSuperAdmin)) {
              stockTotal += quantiteLivree;
              console.log(`  ➕ Entrée: +${quantiteLivree} pour produit ${produitId} depuis bon ${bc.id} (expéditeur: ${expediteurType}, destinataire: ${destinataireType}, statut: ${statut})`);
            }
            // Si le magasin est expéditeur vers un service : soustraire du stock (sortie)
            else if (isExpediteurVersService) {
              stockTotal -= quantiteLivree;
              console.log(`  ➖ Sortie: -${quantiteLivree} pour produit ${produitId} depuis bon ${bc.id}`);
            }
          }
        });
      });

      console.log(`📊 Stock calculé pour produit ${produitId} dans location ${locationId} (${locationType}): ${stockTotal}`);
      return Math.max(0, stockTotal);
    } catch (error) {
      console.error('❌ Erreur lors du calcul du stock:', error);
      return 0;
    }
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      // Le mot de passe sera généré automatiquement par le backend et envoyé par email
      const userData: any = {
        nom: formData.nom,
        email: formData.email,
        type: formType,
        telephone: formData.telephone || undefined,
        adresse: formData.adresse || undefined,
      };

      // Pour les fournisseurs, ajouter telephone2 (obligatoire), site_web (optionnel) et les nouveaux champs
      if (formType === 'prestataire') {
        userData.telephone2 = formData.telephone2; // Toujours envoyer, même si vide (le backend validera)
        userData.site_web = formData.site_web || undefined;
        userData.nom_responsable = formData.nom_responsable || undefined;
        userData.prenom_responsable = formData.prenom_responsable || undefined;
        userData.contact_responsable = formData.contact_responsable || undefined;
        userData.email_responsable = formData.email_responsable || undefined;
        userData.numero_compte_contribuable = formData.numero_compte_contribuable || undefined;
      } else if (['magasin_centrale', 'magasin_secondaire'].includes(formType)) {
        // Pour les magasins, ajouter telephone2
        userData.telephone2 = formData.telephone2 || undefined;
      }

      // Pour les services, ajouter direction_id et sous_direction_id
      if (formType === 'service') {
        if ((formData as any).direction_id) {
          userData.direction_id = parseInt((formData as any).direction_id);
        }
        if ((formData as any).sous_direction_id) {
          userData.sous_direction_id = parseInt((formData as any).sous_direction_id);
        }
      }

      console.log('📤 Création d\'un utilisateur:', userData);
      const response = await dataService.createUser(userData);
      console.log('✅ Réponse du serveur:', response);
    const getTypeLabel = (type: string) => {
      if (type === 'entrepot') return 'Entrepôt';
      if (type === 'magasin_centrale') return 'Magasin Central';
      if (type === 'magasin_secondaire') return 'Magasin Secondaire';
      if (type === 'prestataire') return 'Fournisseur';
      if (type === 'service') return 'Service';
      return 'Magasin';
    };
      alert(`${getTypeLabel(formType)} créé avec succès !\n\nLes identifiants de connexion ont été envoyés par email à ${formData.email}`);
      resetForm();
      // Fermer le formulaire de service si c'était un service
      if (formType === 'service') {
        setShowServiceForm(false);
        setSelectedDirectionForService(null);
        setSelectedSousDirectionForService(null);
      }
      // Attendre un peu pour s'assurer que la base de données est à jour
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la création:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la création');
      } else {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleUpdateUser = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const updateData: any = {
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone || undefined,
        adresse: formData.adresse || undefined,
      };
      
      // Pour les fournisseurs, ajouter les nouveaux champs
      if (formType === 'prestataire') {
        updateData.site_web = formData.site_web || undefined;
        updateData.nom_responsable = formData.nom_responsable || undefined;
        updateData.prenom_responsable = formData.prenom_responsable || undefined;
        updateData.contact_responsable = formData.contact_responsable || undefined;
        updateData.email_responsable = formData.email_responsable || undefined;
        updateData.numero_compte_contribuable = formData.numero_compte_contribuable || undefined;
      }
      
      await dataService.updateUser(editingUserId, updateData);
      resetForm();
      alert('Utilisateur mis à jour avec succès !');
      loadData();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la mise à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    }
  };

  const handleToggleUserStatus = async (user: User): Promise<void> => {
    const isActive = user.actif === undefined || user.actif === 1;
    const action = isActive ? 'désactiver' : 'réactiver';
    const userTypeLabel = user.type === 'entrepot' ? 'l\'entrepôt' : user.type === 'magasin_centrale' ? 'le magasin central' : user.type === 'magasin_secondaire' ? 'le magasin secondaire' : user.type === 'prestataire' ? 'le fournisseur' : 'l\'utilisateur';
    
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} ${userTypeLabel} "${user.nom}" ?\n\n${!isActive ? '' : '⚠️ ATTENTION: Tous les acteurs liés à cet entrepôt/magasin seront également désactivés.'}`)) {
      try {
        await dataService.toggleUserStatus(user.id, !isActive);
        alert(`${userTypeLabel.charAt(0).toUpperCase() + userTypeLabel.slice(1)} ${action === 'désactiver' ? 'désactivé' : 'réactivé'} avec succès !`);
        loadData();
      } catch (error) {
        alert('Erreur lors de la modification du statut');
      }
    }
  };

  const handleDeleteUser = async (userId: number, userType: string): Promise<void> => {
    const getTypeLabel = (type: string) => {
      if (type === 'entrepot') return 'entrepôt';
      if (type === 'magasin_centrale') return 'magasin central';
      if (type === 'magasin_secondaire') return 'magasin secondaire';
      if (type === 'service') return 'service';
      if (type === 'prestataire') return 'fournisseur';
      return 'magasin';
    };
    const getTypeLabelCapitalized = (type: string) => {
      if (type === 'entrepot') return 'Entrepôt';
      if (type === 'magasin_centrale') return 'Magasin Central';
      if (type === 'magasin_secondaire') return 'Magasin Secondaire';
      if (type === 'service') return 'Service';
      if (type === 'prestataire') return 'Fournisseur';
      return 'Magasin';
    };
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ce ${getTypeLabel(userType)} ?`)) {
      return;
    }
    try {
      await dataService.deleteUser(userId);
      alert(`${getTypeLabelCapitalized(userType)} supprimé avec succès !`);
      loadData();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la suppression');
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleViewInventory = (userId: number, userType: string, userName: string): void => {
    // TODO: Implémenter la navigation vers la page d'inventaire
    // Pour l'instant, on affiche un message
    alert(`Afficher l'inventaire de ${userName} (${userType === 'entrepot' ? 'Entrepôt' : 'Magasin'})`);
    // Plus tard, on pourra naviguer vers une page d'inventaire dédiée
    // navigate(`/inventaire/${userType}/${userId}`);
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setPasswordError('');

    // Validation
    if (passwordData.newPassword.length < 8) {
      setPasswordError(t('settings.passwordTooShort'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'));
      return;
    }

    try {
      await dataService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      alert(t('settings.passwordChanged'));
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setPasswordError(axiosError.response?.data?.message || 'Erreur lors du changement de mot de passe');
      } else {
        setPasswordError('Erreur lors du changement de mot de passe');
      }
    }
  };

  const handleEditUser = async (userId: number): Promise<void> => {
    try {
      const response = await dataService.getUser(userId);
      const user = response.data;
      setFormData({
        nom: user.nom,
        email: user.email,
        telephone: user.telephone || '',
        telephone2: '',
        adresse: user.adresse || '',
      });
      const userType = user.type as 'entrepot' | 'magasinier' | 'magasin_centrale' | 'magasin_secondaire' | 'service' | 'prestataire';
      setFormType(userType);
      // Si c'est un magasin central ou secondaire, s'assurer qu'on est dans la bonne section
      if (userType === 'magasin_centrale' && activeSection !== 'magasins_centrale') {
        setActiveSection('magasins_centrale');
      } else if (userType === 'magasin_secondaire' && activeSection !== 'magasins_secondaire') {
        setActiveSection('magasins_secondaire');
      } else if (userType === 'service' && activeSection !== 'service') {
        setActiveSection('service');
      } else if (userType === 'prestataire' && activeSection !== 'fournisseurs') {
        setActiveSection('fournisseurs');
      }
      setEditingUserId(userId);
      setShowForm(true);
    } catch (error) {
      alert('Erreur lors du chargement de l\'utilisateur');
    }
  };

  const resetForm = (): void => {
    setShowForm(false);
    setEditingUserId(null);
    setFormData({
      nom: '',
      email: '',
      telephone: '',
      telephone2: '',
      adresse: '',
      siret: '',
      numero_tva: '',
      contact_commercial: '',
      email_commercial: '',
      telephone_commercial: '',
      site_web: '',
      code_postal: '',
      ville: '',
      pays: 'France',
      note: '',
      direction_id: '',
      sous_direction_id: '',
      nom_responsable: '',
      prenom_responsable: '',
      contact_responsable: '',
      email_responsable: '',
      numero_compte_contribuable: '',
    });
    // Réinitialiser le type selon la section active
    if (activeSection === 'magasins_centrale') {
      setFormType('magasin_centrale');
    } else if (activeSection === 'magasins_secondaire') {
      setFormType('magasin_secondaire');
    } else if (activeSection === 'entrepots') {
      setFormType('entrepot');
    } else if (activeSection === 'fournisseurs') {
      setFormType('prestataire');
    } else if (activeSection === 'service') {
      setFormType('service');
    } else {
      setFormType('entrepot');
    }
  };

  const resetProduitForm = (): void => {
    setShowForm(false);
    setEditingProduitId(null);
    setProduitFormData({
      nom: '',
      nombre_produits_par_carton: '1',
      famille_id: '',
      marque: '',
      caracteristiques: '',
      image: '',
      imageFile: null,
    });
  };

  const resetFamilleForm = (): void => {
    setShowForm(false);
    setEditingFamilleId(null);
    setFamilleFormData({
      nom: '',
      description: '',
    });
    setProduitsAFamille([]);
    setNouveauProduit({ nom: '', code_produit: '', nombre_produits_par_carton: '1', caracteristiques: '', image: '', imageFile: null });
  };

  const handleImageUpload = async (file: File): Promise<void> => {
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const response = await dataService.uploadProduitImage(file);
      const imagePath = response.data.imagePath;
      setProduitFormData({ ...produitFormData, image: imagePath, imageFile: file });
    } catch (error: unknown) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de l\'upload de l\'image');
      } else {
        alert('Erreur lors de l\'upload de l\'image');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = (): void => {
    setProduitFormData({ ...produitFormData, image: '', imageFile: null });
  };

  const handleCreateProduit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      const response = await dataService.createProduit({
        nom: produitFormData.nom,
        nombre_produits_par_carton: parseInt(produitFormData.nombre_produits_par_carton) || 1,
        famille_id: produitFormData.famille_id ? parseInt(produitFormData.famille_id) : undefined,
        marque: produitFormData.marque || undefined,
        caracteristiques: produitFormData.caracteristiques || undefined,
        image: produitFormData.image || undefined,
      });
      // Afficher le code produit généré dans le message de succès
      const produitCree = (response.data as any)?.data || response.data;
      const codeProduitGenere = produitCree?.code_produit || 'Généré automatiquement';
      alert(`${t('products.createdSuccess')}\nCode produit: ${codeProduitGenere}`);
      resetProduitForm();
      await loadProduits();
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la création:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la création');
      } else {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleUpdateProduit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingProduitId) return;
    try {
      await dataService.updateProduit(editingProduitId, {
        nom: produitFormData.nom,
        nombre_produits_par_carton: parseInt(produitFormData.nombre_produits_par_carton) || 1,
        famille_id: produitFormData.famille_id ? parseInt(produitFormData.famille_id) : undefined,
        marque: produitFormData.marque || undefined,
        caracteristiques: produitFormData.caracteristiques || undefined,
        image: produitFormData.image || undefined,
      });
      alert(t('products.updatedSuccess'));
      resetProduitForm();
      await loadProduits();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la mise à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    }
  };

  const handleDeleteProduit = async (produitId: number): Promise<void> => {
    try {
      await dataService.deleteProduit(produitId);
      alert(t('products.deletedSuccess'));
      await loadProduits();
      await loadFamillesProduits(); // Recharger aussi les familles
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la suppression');
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditProduit = async (produitId: number): Promise<void> => {
    try {
      const response = await dataService.getProduit(produitId);
      const produit = response.data;
      setProduitFormData({
        nom: produit.nom,
        nombre_produits_par_carton: produit.nombre_produits_par_carton?.toString() || '1',
        famille_id: produit.famille_id?.toString() || '',
        marque: produit.marque || '',
        caracteristiques: produit.caracteristiques || '',
        image: produit.image || '',
        imageFile: null,
      });
      setEditingProduitId(produitId);
      setShowForm(true);
      setActiveSection('produits'); // Aller à la section produits pour éditer
    } catch (error) {
      alert('Erreur lors du chargement du produit');
    }
  };

  const handleAddProduitToFamille = (familleId: number): void => {
    setProduitFormData({
      nom: '',
      nombre_produits_par_carton: '1',
      famille_id: familleId.toString(),
      marque: '',
      caracteristiques: '',
      image: '',
      imageFile: null,
    });
    setEditingProduitId(null);
    setShowForm(true);
    setActiveSection('produits'); // Aller à la section produits pour ajouter
  };

  const handleCreateFamille = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      // Créer la famille de produits
      const familleResponse = await dataService.createFamilleProduit({
        nom: familleFormData.nom,
        description: familleFormData.description || undefined,
      });
      
      // Récupérer l'ID de la famille créée
      const familleId = (familleResponse.data as FamilleProduit)?.id;
      
      // Créer les produits associés à cette famille
      if (produitsAFamille.length > 0 && familleId) {
        console.log(`📦 Création de ${produitsAFamille.length} produit(s) pour la famille ID: ${familleId}`);
        let produitsCrees = 0;
        let produitsErreurs = 0;
        
        for (const produit of produitsAFamille) {
          try {
            console.log(`📦 Création du produit: "${produit.nom}"`);
            const response = await dataService.createProduit({
              nom: produit.nom,
              // code_produit non fourni - sera généré automatiquement par le backend
              famille_id: familleId,
              nombre_produits_par_carton: produit.nombre_produits_par_carton ? parseInt(produit.nombre_produits_par_carton) : undefined,
              caracteristiques: produit.caracteristiques || undefined,
              image: produit.image || undefined,
            });
            console.log('✅ Produit créé avec succès:', response.data);
            const produitCree = (response.data as any)?.data || response.data;
            const codeProduitGenere = produitCree?.code_produit || 'Généré automatiquement';
            console.log(`📝 Code produit généré: ${codeProduitGenere}`);
            produitsCrees++;
          } catch (produitError: any) {
            console.error('❌ Erreur lors de la création du produit:', produitError);
            console.error('❌ Détails de l\'erreur:', {
              message: produitError.message,
              response: produitError.response?.data,
              status: produitError.response?.status
            });
            produitsErreurs++;
            // Afficher une alerte pour chaque erreur
            alert(`Erreur lors de la création du produit "${produit.nom}": ${produitError.response?.data?.message || produitError.message}`);
          }
        }
        
        console.log(`📊 Résumé: ${produitsCrees} produit(s) créé(s), ${produitsErreurs} erreur(s)`);
        
        if (produitsErreurs > 0) {
          alert(`Attention: ${produitsErreurs} produit(s) n'ont pas pu être créé(s). Vérifiez la console pour plus de détails.`);
        }
      }
      
      alert(t('families.createdSuccess') + (produitsAFamille.length > 0 ? ` et ${produitsAFamille.length} produit(s) créé(s).\n\nLes codes produits ont été générés automatiquement et sont visibles dans le tableau.` : ''));
      resetFamilleForm();
      await loadFamillesProduits();
      await loadProduits();
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la création:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la création');
      } else {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleUpdateFamille = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingFamilleId) return;
    try {
      await dataService.updateFamilleProduit(editingFamilleId, {
        nom: familleFormData.nom,
        description: familleFormData.description || undefined,
      });
      alert(t('families.updatedSuccess'));
      resetFamilleForm();
      await loadFamillesProduits();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la mise à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    }
  };

  const handleAjouterProduitsAFamilleExistante = async (): Promise<void> => {
    if (!famillePourAjoutProduit || produitsPourFamilleExistante.length === 0) {
      alert('Veuillez ajouter au moins un produit');
      return;
    }

    try {
      console.log(`📦 Ajout de ${produitsPourFamilleExistante.length} produit(s) à la famille "${famillePourAjoutProduit.nom}" (ID: ${famillePourAjoutProduit.id})`);
      let produitsCrees = 0;
      let produitsErreurs = 0;

      for (const produit of produitsPourFamilleExistante) {
        try {
          console.log(`📦 Création du produit: "${produit.nom}"`);
          const response = await dataService.createProduit({
            nom: produit.nom,
            famille_id: famillePourAjoutProduit.id,
            nombre_produits_par_carton: produit.nombre_produits_par_carton ? parseInt(produit.nombre_produits_par_carton) : undefined,
            caracteristiques: produit.caracteristiques || undefined,
            image: produit.image || undefined,
          });
          console.log('✅ Produit créé avec succès:', response.data);
          produitsCrees++;
        } catch (produitError: any) {
          console.error('❌ Erreur lors de la création du produit:', produitError);
          produitsErreurs++;
          alert(`Erreur lors de la création du produit "${produit.nom}": ${produitError.response?.data?.message || produitError.message}`);
        }
      }

      if (produitsCrees > 0) {
        alert(`${produitsCrees} produit(s) ajouté(s) avec succès à la famille "${famillePourAjoutProduit.nom}"${produitsErreurs > 0 ? `\n${produitsErreurs} erreur(s)` : ''}\n\nLes codes produits ont été générés automatiquement et sont visibles dans le tableau.`);
        setFamillePourAjoutProduit(null);
        setProduitsPourFamilleExistante([]);
        setNouveauProduit({ nom: '', code_produit: '', nombre_produits_par_carton: '1', caracteristiques: '', image: '', imageFile: null });
        await loadProduits();
        await loadFamillesProduits(); // Recharger aussi les familles pour mettre à jour les compteurs
      } else {
        alert('Aucun produit n\'a pu être créé. Vérifiez la console pour plus de détails.');
      }
    } catch (error: unknown) {
      console.error('❌ Erreur lors de l\'ajout des produits:', error);
      alert('Erreur lors de l\'ajout des produits');
    }
  };

  const handleDeleteFamille = async (familleId: number): Promise<void> => {
    if (!window.confirm(t('families.deleteConfirm'))) {
      return;
    }
    try {
      await dataService.deleteFamilleProduit(familleId);
      alert(t('families.deletedSuccess'));
      await loadFamillesProduits();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la suppression');
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditFamille = async (familleId: number): Promise<void> => {
    try {
      const response = await dataService.getFamilleProduit(familleId);
      const famille = response.data;
      setFamilleFormData({
        nom: famille.nom,
        description: famille.description || '',
      });
      setEditingFamilleId(familleId);
      setShowForm(true);
    } catch (error) {
      alert('Erreur lors du chargement de la famille');
    }
  };
  // ========== FONCTIONS POUR LES DIRECTIONS ==========
  const handleCreateDirection = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      await dataService.createDirection({
        nom: directionFormData.nom,
        description: directionFormData.description || undefined,
      });
      alert('Direction créée avec succès !');
      resetDirectionForm();
      await loadDirections();
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la création:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la création');
      } else {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleUpdateDirection = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingDirectionId) return;
    try {
      await dataService.updateDirection(editingDirectionId, {
        nom: directionFormData.nom,
        description: directionFormData.description || undefined,
      });
      alert('Direction mise à jour avec succès !');
      resetDirectionForm();
      await loadDirections();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la mise à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    }
  };

  const handleDeleteDirection = async (directionId: number): Promise<void> => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette direction ?')) {
      return;
    }
    try {
      await dataService.deleteDirection(directionId);
      alert('Direction supprimée avec succès !');
      await loadDirections();
      await loadSousDirections(); // Recharger aussi les sous-directions
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la suppression');
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleToggleDirectionStatus = async (direction: Direction): Promise<void> => {
    const isActive = direction.actif === undefined || direction.actif === 1;
    const action = isActive ? 'désactiver' : 'réactiver';
    
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} la direction "${direction.nom}" ?`)) {
      try {
        await dataService.toggleDirectionStatus(direction.id, !isActive);
        alert(`Direction ${action === 'désactiver' ? 'désactivée' : 'réactivée'} avec succès !`);
        loadDirections();
      } catch (error) {
        alert('Erreur lors de la modification du statut');
      }
    }
  };

  const handleEditDirection = async (directionId: number): Promise<void> => {
    try {
      const response = await dataService.getDirection(directionId);
      const direction = response.data;
      setDirectionFormData({
        nom: direction.nom,
        description: direction.description || '',
      });
      setEditingDirectionId(directionId);
      setShowForm(true);
    } catch (error) {
      alert('Erreur lors du chargement de la direction');
    }
  };

  const resetDirectionForm = (): void => {
    setShowForm(false);
    setEditingDirectionId(null);
    setDirectionFormData({
      nom: '',
      description: '',
    });
  };

  // ========== FONCTIONS POUR LES SOUS-DIRECTIONS ==========
  const handleCreateSousDirection = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!sousDirectionFormData.direction_id) {
      alert('Veuillez sélectionner une direction');
      return;
    }
    try {
      await dataService.createSousDirection({
        nom: sousDirectionFormData.nom,
        description: sousDirectionFormData.description || undefined,
        direction_id: parseInt(sousDirectionFormData.direction_id),
      });
      alert('Sous-direction créée avec succès !');
      resetSousDirectionForm();
      await loadSousDirections();
    } catch (error: unknown) {
      console.error('❌ Erreur lors de la création:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la création');
      } else {
        alert('Erreur lors de la création');
      }
    }
  };

  const handleUpdateSousDirection = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!editingSousDirectionId) return;
    if (!sousDirectionFormData.direction_id) {
      alert('Veuillez sélectionner une direction');
      return;
    }
    try {
      await dataService.updateSousDirection(editingSousDirectionId, {
        nom: sousDirectionFormData.nom,
        description: sousDirectionFormData.description || undefined,
        direction_id: parseInt(sousDirectionFormData.direction_id),
      });
      alert('Sous-direction mise à jour avec succès !');
      resetSousDirectionForm();
      await loadSousDirections();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la mise à jour');
      } else {
        alert('Erreur lors de la mise à jour');
      }
    }
  };

  const handleDeleteSousDirection = async (sousDirectionId: number): Promise<void> => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette sous-direction ?')) {
      return;
    }
    try {
      await dataService.deleteSousDirection(sousDirectionId);
      alert('Sous-direction supprimée avec succès !');
      await loadSousDirections();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Erreur lors de la suppression');
      } else {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleToggleSousDirectionStatus = async (sousDirection: SousDirection): Promise<void> => {
    const isActive = sousDirection.actif === undefined || sousDirection.actif === 1;
    const action = isActive ? 'désactiver' : 'réactiver';
    
    if (window.confirm(`Êtes-vous sûr de vouloir ${action} la sous-direction "${sousDirection.nom}" ?`)) {
      try {
        await dataService.toggleSousDirectionStatus(sousDirection.id, !isActive);
        alert(`Sous-direction ${action === 'désactiver' ? 'désactivée' : 'réactivée'} avec succès !`);
        loadSousDirections();
      } catch (error) {
        alert('Erreur lors de la modification du statut');
      }
    }
  };

  const handleEditSousDirection = async (sousDirectionId: number): Promise<void> => {
    try {
      const response = await dataService.getSousDirection(sousDirectionId);
      const sousDirection = response.data;
      setSousDirectionFormData({
        nom: sousDirection.nom,
        description: sousDirection.description || '',
        direction_id: sousDirection.direction_id.toString(),
      });
      setEditingSousDirectionId(sousDirectionId);
      setShowForm(true);
    } catch (error) {
      alert('Erreur lors du chargement de la sous-direction');
    }
  };

  const resetSousDirectionForm = (): void => {
    setShowForm(false);
    setEditingSousDirectionId(null);
    setSousDirectionFormData({
      nom: '',
      description: '',
      direction_id: '',
    });
  };

  // Fonction pour créer automatiquement un stock d'entrée à partir du stock corrigé
  const creerStockEntreeDepuisStockCorrige = async (
    produitId: number,
    locationId: number,
    locationType: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot',
    quantite: number,
    uniteSaisie: 'lot' | 'unite',
    produit: Produit,
    justificationFile?: File
  ) => {
    console.log('🔵 [CREER_STOCK_ENTREE] Début de la création du stock d\'entrée');
    console.log('🔵 [CREER_STOCK_ENTREE] Paramètres reçus:', {
      produitId,
      locationId,
      locationType,
      quantite,
      uniteSaisie,
      produit: { id: produit.id, nom: produit.nom, code_produit: produit.code_produit }
    });
    
    try {
      // La quantité reçue est toujours en unités (stockCorrige est toujours stocké en unités dans donneesFicheConsultee)
      // Cette quantité corrigée DOIT être directement le stock d'entrée TOTAL dans le magasin/entrepôt (sans calcul, sans bon de commande)
      const stockEntreeFinal = quantite; // Stock corrigé = stock d'entrée directement
      console.log('🔵 [CREER_STOCK_ENTREE] Stock corrigé (stock d\'entrée final en unités):', stockEntreeFinal);
      console.log('🔵 [CREER_STOCK_ENTREE] Ce stock corrigé deviendra DIRECTEMENT le stock d\'entrée pour le produit', produitId, 'dans', locationType, 'ID:', locationId);

      if (stockEntreeFinal < 0) {
        const errorMsg = `La quantité doit être supérieure ou égale à 0 (reçue: ${stockEntreeFinal})`;
        console.error('❌ [CREER_STOCK_ENTREE]', errorMsg);
        throw new Error(errorMsg);
      }

      // Uploader la justification si elle existe
      let justificationPath: string | undefined = undefined;
      if (justificationFile) {
        console.log('🔵 [CREER_STOCK_ENTREE] Upload de la justification...');
        try {
          const uploadResponse = await dataService.uploadJustification(justificationFile);
          justificationPath = uploadResponse.data.justificationPath;
          console.log('✅ [CREER_STOCK_ENTREE] Justification uploadée avec succès:', justificationPath);
        } catch (uploadError: any) {
          console.error('❌ [CREER_STOCK_ENTREE] Erreur lors de l\'upload de la justification:', uploadError);
          throw new Error(`Erreur lors de l'upload de la justification: ${uploadError?.response?.data?.message || uploadError?.message || 'Erreur inconnue'}`);
        }
      }

      // Mettre à jour directement le stock d'entrée via l'API (sans bon de commande)
      console.log('🔵 [CREER_STOCK_ENTREE] Mise à jour directe du stock d\'entrée via l\'API...');
      try {
        const response = await dataService.setStockEntree({
          produitId,
          locationId,
          locationType,
          stockEntree: stockEntreeFinal,
          justificatif: justificationPath
        });
        console.log('✅ [CREER_STOCK_ENTREE] Stock d\'entrée mis à jour avec succès');
        console.log('✅ [CREER_STOCK_ENTREE] Réponse API:', response.data);
        console.log(`✅ [CREER_STOCK_ENTREE] Stock d'entrée défini à ${stockEntreeFinal} unité(s) pour le produit ${produitId} dans la location ${locationId} (${locationType})`);
      } catch (apiError: any) {
        console.error('❌ [CREER_STOCK_ENTREE] ERREUR lors de la mise à jour du stock d\'entrée:', apiError);
        console.error('❌ [CREER_STOCK_ENTREE] Message d\'erreur:', apiError?.message);
        console.error('❌ [CREER_STOCK_ENTREE] Réponse d\'erreur:', apiError?.response?.data);
        throw apiError;
      }
    } catch (error: any) {
      console.error('❌ [CREER_STOCK_ENTREE] Erreur lors de la création automatique du stock d\'entrée:', error);
      console.error('❌ [CREER_STOCK_ENTREE] Détails de l\'erreur:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        stack: error?.stack,
        config: error?.config ? {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data
        } : null
      });
      // Propager l'erreur pour que l'appelant puisse la gérer
      throw error;
    }
  };

  if (loading) return <Dashboard><div className="loading">{t('common.loading')}</div></Dashboard>;

  const handleSelectEntiteType = (type: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot'): void => {
    if (type === 'entrepot') {
      setShowEntrepotsListInInventaire(true);
      setShowEntitesDropdown(false);
    } else {
      setSelectedEntiteType(type);
      setInventaireType(type);
      setShowEntitesDropdown(false);
    }
  };

  const getEntitesByType = (type: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot'): User[] => {
    if (type === 'magasin_centrale') return magasinsCentrale;
    if (type === 'magasin_secondaire') return magasinsSecondaire;
    return entrepots;
  };

  // Fonction pour générer le numéro d'ordre unique pour un inventaire
  const generateNumeroOrdreInventaire = (): string => {
    const anneeCourante = new Date().getFullYear();
    // Pour un inventaire, on génère un numéro unique basé sur le nombre d'inventaires existants
    const numero = inventaires.length + 1;
    return `N'${String(numero).padStart(5, '0')}/${anneeCourante}`;
  };

  // Fonction pour obtenir le numéro d'ordre à utiliser (celui de l'inventaire si disponible)
  const getNumeroOrdreToUse = (): string => {
    if (currentInventaire?.numero_ordre) {
      return currentInventaire.numero_ordre;
    }
    if (numeroOrdreInventaire) {
      return numeroOrdreInventaire;
    }
    // Fallback : générer un numéro d'ordre par défaut
    const anneeCourante = new Date().getFullYear();
    return `N'${String(1).padStart(5, '0')}/${anneeCourante}`;
  };

  // Créer un inventaire
  const handleCreateInventaire = async (): Promise<void> => {
    try {
      if (!inventaireFormData.nom || !inventaireFormData.dateDebut || !inventaireFormData.dateFin) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (!inventaireType && !showEntrepotsListInInventaire && !selectedEntiteType) {
        alert('Veuillez sélectionner au moins une entité');
        return;
      }

      // Le numéro d'ordre sera généré automatiquement par le backend
      // Ne plus générer côté frontend pour éviter les conflits

      // Préparer les entités à sauvegarder
      const entites: Array<{ id: number; type: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot' }> = [];

      if (selectedEntiteType === 'magasin_centrale' || inventaireType === 'magasin_centrale') {
        // Si des locations spécifiques sont sélectionnées, utiliser celles-ci, sinon toutes
        const locations = selectedLocations.length > 0 
          ? magasinsCentrale.filter(m => selectedLocations.includes(m.id))
          : magasinsCentrale;
        entites.push(...locations.map(m => ({ id: m.id, type: 'magasin_centrale' as const })));
      } else if (selectedEntiteType === 'magasin_secondaire' || inventaireType === 'magasin_secondaire') {
        const locations = selectedLocations.length > 0 
          ? magasinsSecondaire.filter(m => selectedLocations.includes(m.id))
          : magasinsSecondaire;
        entites.push(...locations.map(m => ({ id: m.id, type: 'magasin_secondaire' as const })));
      } else if (showEntrepotsListInInventaire || inventaireType === 'entrepot') {
        const locations = selectedLocations.length > 0 
          ? entrepots.filter(e => selectedLocations.includes(e.id))
          : entrepots;
        entites.push(...locations.map(e => ({ id: e.id, type: 'entrepot' as const })));
      }

      if (entites.length === 0) {
        alert('Veuillez sélectionner au moins une entité');
        return;
      }

      // Préparer les produits sélectionnés par entité
      const produits: Record<number, number[]> = {};
      let totalProduitsSelectionnes = 0;
      
      console.log(`📦 [Frontend] ========== PRÉPARATION DES PRODUITS ==========`);
      console.log(`📦 [Frontend] selectedProduitsParLocation complet:`, JSON.stringify(selectedProduitsParLocation, null, 2));
      console.log(`📦 [Frontend] Clés dans selectedProduitsParLocation:`, Object.keys(selectedProduitsParLocation));
      console.log(`📦 [Frontend] Entités à traiter:`, entites.map(e => ({ id: e.id, type: e.type })));
      
      for (const entite of entites) {
        const produitsIds = selectedProduitsParLocation[entite.id] || [];
        console.log(`📦 [Frontend] Entité ${entite.id} (${entite.type}): ${produitsIds.length} produit(s) sélectionné(s)`, produitsIds);
        if (produitsIds && Array.isArray(produitsIds) && produitsIds.length > 0) {
          produits[entite.id] = produitsIds;
          totalProduitsSelectionnes += produitsIds.length;
          console.log(`✅ [Frontend] Produits ajoutés pour l'entité ${entite.id}:`, produitsIds);
        } else {
          console.warn(`⚠️ [Frontend] Aucun produit pour l'entité ${entite.id} (${entite.type})`);
        }
      }
      
      console.log(`📦 [Frontend] Objet produits final:`, JSON.stringify(produits, null, 2));
      console.log(`📦 [Frontend] Nombre de clés dans produits:`, Object.keys(produits).length);
      console.log(`📦 [Frontend] Total produits sélectionnés: ${totalProduitsSelectionnes}`);
      
      // Avertir si aucun produit n'est sélectionné
      if (totalProduitsSelectionnes === 0) {
        const confirmer = window.confirm(`⚠️ ATTENTION: Aucun produit n'a été sélectionné pour cet inventaire!\n\nVoulez-vous continuer quand même?\n\nSi vous continuez, l'inventaire sera créé sans produits et vous devrez les ajouter plus tard.`);
        if (!confirmer) {
          console.log(`📦 [Frontend] Création annulée par l'utilisateur`);
          return; // Annuler la création
        }
        console.warn(`⚠️ [Frontend] L'utilisateur a choisi de continuer sans produits`);
      } else {
        console.log(`✅ [Frontend] ${totalProduitsSelectionnes} produit(s) seront envoyés au backend`);
      }

      // Sauvegarder l'inventaire avec les produits sélectionnés
      // Le numéro d'ordre sera généré automatiquement par le backend
      const requestData = {
        nom: inventaireFormData.nom,
        date_debut: inventaireFormData.dateDebut,
        date_fin: inventaireFormData.dateFin,
        entites: entites,
        produits: produits, // Toujours envoyer, même si vide
      };
      
      console.log(`📦 [Frontend] ========== ENVOI DE LA REQUÊTE ==========`);
      console.log(`📦 [Frontend] Données envoyées:`, {
        nom: requestData.nom,
        date_debut: requestData.date_debut,
        date_fin: requestData.date_fin,
        nombre_entites: requestData.entites.length,
        produits: JSON.stringify(requestData.produits, null, 2),
        nombre_produits: totalProduitsSelectionnes,
        produits_est_vide: Object.keys(requestData.produits).length === 0
      });
      
      const response = await dataService.createInventaire(requestData);

      // Stocker l'inventaire créé pour l'utiliser lors de la génération des fiches préparatoires
      setCurrentInventaire(response.data.inventaire);
      const numeroOrdreGenere = response.data.inventaire.numero_ordre;
      setNumeroOrdreInventaire(numeroOrdreGenere);

      // Générer automatiquement les fiches préparatoires pour cet inventaire
      if (totalProduitsSelectionnes > 0) {
        console.log('📋 [Création Inventaire] Génération automatique des fiches préparatoires...');
        try {
          // Générer les fiches et les afficher automatiquement
          await generateFichesPreparatoiresAutomatiquement(response.data.inventaire);
          console.log('✅ [Création Inventaire] Fiches préparatoires générées et affichées automatiquement');
          
          // Fermer le popup APRÈS avoir affiché la fiche
          setShowCreateInventaireForm(false);
        } catch (error: any) {
          console.error('❌ [Création Inventaire] Erreur lors de la génération automatique des fiches:', error);
          // Fermer le popup même en cas d'erreur
          setShowCreateInventaireForm(false);
          alert(`Inventaire créé avec succès !\n\nNuméro d'ordre: ${numeroOrdreGenere}\n\n⚠️ Attention: Une erreur est survenue lors de la génération automatique des fiches préparatoires. Vous pouvez les générer manuellement depuis les détails de l'inventaire.`);
        }
      } else {
        // Fermer le popup si aucun produit n'est sélectionné
        setShowCreateInventaireForm(false);
        alert(`Inventaire créé avec succès !\n\nNuméro d'ordre: ${numeroOrdreGenere}\n\n⚠️ Aucun produit n'a été sélectionné, donc aucune fiche préparatoire n'a été générée.`);
      }
      setInventaireFormData({
        nom: '',
        dateDebut: '',
        dateFin: '',
      });
      setInventaireType(null);
      setSelectedLocations([]);
      setSelectedEntiteType(null);
      setShowEntitesDropdown(false);
      setShowEntrepotsListInInventaire(false);
      
      // Recharger les inventaires
      await loadInventaires();
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de l\'inventaire:', error);
      alert(error.response?.data?.message || 'Erreur lors de la création de l\'inventaire');
    }
  };

  // Activer/Désactiver un inventaire
  const handleToggleInventaireStatus = async (inventaire: typeof inventaires[0]): Promise<void> => {
    try {
      const newStatut = inventaire.statut === 'active' ? 'desactive' : 'active';
      
      // Afficher un avertissement avant d'activer
      if (newStatut === 'active') {
        const confirmer = window.confirm(
          `⚠️ ATTENTION : ACTIVATION D'INVENTAIRE\n\n` +
          `En activant cet inventaire, tous les produits sélectionnés ne pourront plus avoir de MOUVEMENTS (bons de commande et de livraison) dans les entités concernées.\n\n` +
          `Les produits resteront visibles dans la liste des produits en stock, mais ne pourront plus être inclus dans :\n` +
          `• Les bons de commande (internes ou externes)\n` +
          `• Les bons de livraison (internes ou externes)\n\n` +
          `Pour permettre à nouveau les mouvements, vous devrez désactiver l'inventaire.\n\n` +
          `Voulez-vous continuer ?`
        );
        
        if (!confirmer) {
          return; // L'utilisateur a annulé
        }
      }
      
      const response = await dataService.toggleInventaireStatus(inventaire.id, newStatut);
      await loadInventaires();
      
      // Afficher le message avec l'avertissement si présent
      let message = response.data?.message || `Inventaire ${newStatut === 'active' ? 'activé' : 'désactivé'} avec succès`;
      if ((response.data as any)?.avertissement) {
        message += `\n\n${(response.data as any).avertissement}`;
      }
      
      alert(message);
    } catch (error: any) {
      console.error('❌ Erreur lors de la modification du statut:', error);
      alert(error.response?.data?.message || 'Erreur lors de la modification du statut');
    }
  };

  // Voir les détails d'un inventaire
  const handleViewInventaireDetails = async (inventaireId: number): Promise<void> => {
    try {
      console.log(`📦 [Frontend] ========== RÉCUPÉRATION DÉTAILS INVENTAIRE ==========`);
      console.log(`📦 [Frontend] ID de l'inventaire: ${inventaireId}`);
      const response = await dataService.getInventaire(inventaireId);
      console.log(`📦 [Frontend] Réponse complète de l'API:`, JSON.stringify(response.data, null, 2));
      console.log(`📦 [Frontend] Nombre d'entités:`, response.data.entites?.length || 0);
      
      if (response.data.entites) {
        let totalProduits = 0;
        response.data.entites.forEach((entite: any, index: number) => {
          const nbProduits = entite.produits?.length || 0;
          totalProduits += nbProduits;
          console.log(`📦 [Frontend] Entité ${index + 1}:`, {
            id: entite.id,
            entite_id: entite.entite_id,
            entite_type: entite.entite_type,
            nom_entite: entite.nom_entite,
            key_calculee: `${entite.entite_id}_${entite.entite_type}`,
            nombre_produits: nbProduits,
            produits: entite.produits || [],
            produits_est_array: Array.isArray(entite.produits),
            produits_est_undefined: entite.produits === undefined,
            produits_est_null: entite.produits === null
          });
        });
        console.log(`📦 [Frontend] TOTAL PRODUITS DANS TOUTES LES ENTITÉS: ${totalProduits}`);
        if (totalProduits === 0) {
          console.error(`❌ [Frontend] ⚠️ AUCUN PRODUIT DANS LA RÉPONSE DE L'API!`);
          console.error(`❌ [Frontend] Cela signifie que soit:`);
          console.error(`❌ [Frontend] 1. Les produits n'ont pas été enregistrés lors de la création`);
          console.error(`❌ [Frontend] 2. Les produits ne sont pas récupérés correctement par l'API`);
          console.error(`❌ [Frontend] 3. Les produits ne sont pas assignés correctement aux entités`);
          console.error(`❌ [Frontend] Vérifiez les logs du serveur pour diagnostiquer!`);
        }
      } else {
        console.error(`❌ [Frontend] Aucune entité dans la réponse de l'API!`);
      }
      
      setSelectedInventaireDetails(response.data);
      setShowInventaireDetails(true);
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des détails:', error);
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Réponse d\'erreur:', error.response?.data);
      alert(error.response?.data?.message || 'Erreur lors de la récupération des détails');
    }
  };

  // Modifier un inventaire
  const handleEditInventaire = async (inventaireId: number): Promise<void> => {
    try {
      const response = await dataService.getInventaire(inventaireId);
      const inventaire = response.data;
      
      setEditingInventaireId(inventaireId);
      setInventaireFormData({
        nom: inventaire.nom || '',
        dateDebut: inventaire.date_debut ? inventaire.date_debut.split('T')[0] : '',
        dateFin: inventaire.date_fin ? inventaire.date_fin.split('T')[0] : '',
      });
      
      // Déterminer le type d'entité et les locations sélectionnées
      if (inventaire.entites && inventaire.entites.length > 0) {
        const firstEntite = inventaire.entites[0];
        if (firstEntite.entite_type === 'entrepot') {
          setSelectedEntiteType('entrepot');
          setShowEntrepotsListInInventaire(true);
          setInventaireType('entrepot');
        } else if (firstEntite.entite_type === 'magasin_centrale') {
          setSelectedEntiteType('magasin_centrale');
          setInventaireType('magasin_centrale');
        } else if (firstEntite.entite_type === 'magasin_secondaire') {
          setSelectedEntiteType('magasin_secondaire');
          setInventaireType('magasin_secondaire');
        }
        
        setSelectedLocations(inventaire.entites.map((e: any) => e.entite_id));
      }
      
      setShowCreateInventaireForm(true);
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération de l\'inventaire:', error);
      alert(error.response?.data?.message || 'Erreur lors de la récupération de l\'inventaire');
    }
  };

  // Mettre à jour un inventaire
  const handleUpdateInventaire = async (): Promise<void> => {
    try {
      if (!editingInventaireId) return;
      
      if (!inventaireFormData.nom || !inventaireFormData.dateDebut || !inventaireFormData.dateFin) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Préparer les entités à sauvegarder
      const entites: Array<{ id: number; type: 'magasin_centrale' | 'magasin_secondaire' | 'entrepot' }> = [];

      if (selectedEntiteType === 'magasin_centrale' || inventaireType === 'magasin_centrale') {
        const locations = selectedLocations.length > 0 
          ? magasinsCentrale.filter(m => selectedLocations.includes(m.id))
          : magasinsCentrale;
        entites.push(...locations.map(m => ({ id: m.id, type: 'magasin_centrale' as const })));
      } else if (selectedEntiteType === 'magasin_secondaire' || inventaireType === 'magasin_secondaire') {
        const locations = selectedLocations.length > 0 
          ? magasinsSecondaire.filter(m => selectedLocations.includes(m.id))
          : magasinsSecondaire;
        entites.push(...locations.map(m => ({ id: m.id, type: 'magasin_secondaire' as const })));
      } else if (showEntrepotsListInInventaire || inventaireType === 'entrepot') {
        const locations = selectedLocations.length > 0 
          ? entrepots.filter(e => selectedLocations.includes(e.id))
          : entrepots;
        entites.push(...locations.map(e => ({ id: e.id, type: 'entrepot' as const })));
      }

      if (entites.length === 0) {
        alert('Veuillez sélectionner au moins une entité');
        return;
      }

      // Mettre à jour l'inventaire
      await dataService.updateInventaire(editingInventaireId, {
        nom: inventaireFormData.nom,
        date_debut: inventaireFormData.dateDebut,
        date_fin: inventaireFormData.dateFin,
        entites: entites,
      });

      alert('Inventaire mis à jour avec succès !');
      
      // Réinitialiser le formulaire
      setShowCreateInventaireForm(false);
      setEditingInventaireId(null);
      setInventaireFormData({
        nom: '',
        dateDebut: '',
        dateFin: '',
      });
      setInventaireType(null);
      setSelectedLocations([]);
      setSelectedEntiteType(null);
      setShowEntitesDropdown(false);
      setShowEntrepotsListInInventaire(false);
      
      // Recharger les inventaires
      await loadInventaires();
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour de l\'inventaire:', error);
      alert(error.response?.data?.message || 'Erreur lors de la mise à jour de l\'inventaire');
    }
  };

  const renderContent = (): React.ReactElement | null => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard-page">
            <h2>{t('dashboard.title')}</h2>
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
              <div className="stat-card" style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <WarehouseIcon style={{ fontSize: '40px', color: '#007bff', marginBottom: '10px' }} />
                <div>
                  <h3 style={{ margin: '5px 0', fontSize: '32px', color: '#007bff' }}>{entrepots.length}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>{t('dashboard.warehouses')}</p>
                </div>
              </div>
              <div className="stat-card" style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <StoreIcon style={{ fontSize: '40px', color: '#28a745', marginBottom: '10px' }} />
                <div>
                  <h3 style={{ margin: '5px 0', fontSize: '32px', color: '#28a745' }}>{magasins.length}</h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>{t('dashboard.stores')}</p>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0, color: '#1976d2' }}>{t('dashboard.features')}</h3>
              <ul style={{ lineHeight: '1.8', color: '#333' }}>
                <li>{t('dashboard.feature1')}</li>
                <li>{t('dashboard.feature2')}</li>
                <li>{t('dashboard.feature3')}</li>
              </ul>
            </div>
          </div>
        );

      case 'entrepots':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>{t('warehouses.title')}</h2>
              <button onClick={() => {
                resetForm();
                setFormType('entrepot');
                setShowForm(true);
              }} className="btn-primary">
                {showForm ? t('warehouses.cancel') : t('warehouses.new')}
              </button>
            </div>

            {showForm && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card">
                <h3>{editingUserId ? t('warehouses.edit') : t('warehouses.create')}</h3>
                <div className="form-group">
                  <label>{t('warehouses.name')} *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Entrepôt Central"
                  />
                </div>
                <div className="form-group">
                  <label>{t('warehouses.email')} *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="entrepot@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('warehouses.phone')}</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('warehouses.phone')} 2</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('warehouses.address')}</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder={t('warehouses.address')}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingUserId ? t('warehouses.updateBtn') : t('warehouses.createBtn')}
                </button>
              </form>
            )}

            <div className="table-container">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th>{t('warehouses.name')}</th>
                    <th>{t('warehouses.email')}</th>
                    <th>{t('warehouses.phone')}</th>
                    <th>{t('warehouses.address')}</th>
                    <th>{t('warehouses.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entrepots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">{t('warehouses.empty')}</td>
                    </tr>
                  ) : (
                    entrepots.map((entrepot) => (
                      <tr key={entrepot.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleUserStatus(entrepot)}
                              className={(entrepot.actif === undefined || entrepot.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                              style={{ fontSize: '11px', padding: '4px 8px', minWidth: '80px' }}
                              title={(entrepot.actif === undefined || entrepot.actif === 1) ? 'Désactiver l\'entrepôt' : 'Réactiver l\'entrepôt'}
                            >
                              {(entrepot.actif === undefined || entrepot.actif === 1) ? 'Désactiver' : 'Réactiver'}
                            </button>
                            <strong>{entrepot.nom}</strong>
                          </div>
                        </td>
                        <td>{entrepot.email}</td>
                        <td>{entrepot.telephone || '-'}</td>
                        <td>{entrepot.adresse || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleViewInventory(entrepot.id, 'entrepot', entrepot.nom)}
                            className="btn-small"
                            style={{ marginRight: '5px', backgroundColor: '#28a745', color: 'white' }}
                          >
                            {t('warehouses.inventory')}
                          </button>
                          <button
                            onClick={() => handleEditUser(entrepot.id)}
                            className="btn-small"
                            style={{ marginRight: '5px' }}
                          >
                            {t('warehouses.editBtn')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(entrepot.id, 'entrepot')}
                            className="btn-danger btn-small"
                          >
                            {t('warehouses.deleteBtn')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'magasins_centrale':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>{t('stores.title.centrale')}</h2>
              <button onClick={() => {
                resetForm();
                setFormType('magasin_centrale');
                setShowForm(true);
              }} className="btn-primary" style={{ backgroundColor: '#0066cc' }}>
                {showForm ? t('warehouses.cancel') : `+ ${t('stores.create.centrale')}`}
              </button>
            </div>

            {showForm && formType === 'magasin_centrale' && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card">
                <h3>
                  {editingUserId ? t('stores.edit') : t('stores.create.centrale')}
                </h3>
                {!editingUserId && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#e3f2fd', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '2px solid #0066cc',
                    color: '#1976d2',
                    fontWeight: 'bold'
                  }}>
                    {t('stores.type.centrale')}
                  </div>
                )}
                {editingUserId && (
                  <div className="form-group">
                    <label>{t('stores.type')}</label>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#e3f2fd', 
                      borderRadius: '8px',
                      border: '1px solid #0066cc',
                      color: '#1976d2',
                      fontWeight: '500'
                    }}>
                      {t('stores.type.centrale')}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>{t('stores.name')} *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Magasin Central Principal"
                  />
                </div>
                <div className="form-group">
                  <label>{t('warehouses.email')} *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="magasin.centrale@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('warehouses.phone')}</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('warehouses.phone')} 2</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('warehouses.address')}</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder={t('warehouses.address')}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingUserId ? t('stores.updateBtn') : t('stores.createBtn')}
                </button>
              </form>
            )}

            <div className="table-container">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>N°</th>
                    <th>{t('stores.name')}</th>
                    <th>{t('warehouses.email')}</th>
                    <th>{t('warehouses.phone')}</th>
                    <th>{t('warehouses.address')}</th>
                    <th>{t('warehouses.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {magasinsCentrale.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">{t('stores.empty.centrale')}</td>
                    </tr>
                  ) : (
                    magasinsCentrale.map((magasin, index) => (
                      <tr key={magasin.id}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleUserStatus(magasin)}
                              className={(magasin.actif === undefined || magasin.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                              style={{ fontSize: '11px', padding: '4px 8px', minWidth: '80px' }}
                              title={(magasin.actif === undefined || magasin.actif === 1) ? 'Désactiver le magasin' : 'Réactiver le magasin'}
                            >
                              {(magasin.actif === undefined || magasin.actif === 1) ? 'Désactiver' : 'Réactiver'}
                            </button>
                            <strong>{magasin.nom}</strong>
                          </div>
                        </td>
                        <td>{magasin.email}</td>
                        <td>{magasin.telephone || '-'}</td>
                        <td>{magasin.adresse || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleViewInventory(magasin.id, 'magasin_centrale', magasin.nom)}
                            className="btn-small"
                            style={{ marginRight: '5px', backgroundColor: '#28a745', color: 'white' }}
                          >
                            {t('warehouses.inventory')}
                          </button>
                          <button
                            onClick={() => handleEditUser(magasin.id)}
                            className="btn-small"
                            style={{ marginRight: '5px' }}
                          >
                            {t('warehouses.editBtn')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(magasin.id, 'magasin_centrale')}
                            className="btn-danger btn-small"
                          >
                            {t('warehouses.deleteBtn')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'directions':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>Directions</h2>
              <button onClick={() => {
                resetDirectionForm();
                setShowForm(true);
              }} className="btn-primary" style={{ backgroundColor: '#2196F3' }}>
                {showForm ? 'Annuler' : '+ Créer une direction'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={editingDirectionId ? handleUpdateDirection : handleCreateDirection} className="form-card">
                <h3>
                  {editingDirectionId ? 'Modifier la direction' : 'Créer une nouvelle direction'}
                </h3>
                <div className="form-group">
                  <label>Nom de la direction *</label>
                  <input
                    type="text"
                    value={directionFormData.nom}
                    onChange={(e) => setDirectionFormData({ ...directionFormData, nom: e.target.value })}
                    required
                    placeholder="Ex: Direction des Achats"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={directionFormData.description}
                    onChange={(e) => setDirectionFormData({ ...directionFormData, description: e.target.value })}
                    placeholder="Description de la direction"
                    rows={4}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingDirectionId ? 'Modifier la direction' : 'Créer la direction'}
                </button>
              </form>
            )}

            <div className="table-container">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5', width: '60px' }}>N°</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5' }}>Nom</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5' }}>Statut</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5', width: '140px' }}>Détails</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5', width: '280px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state" style={{ border: '1px solid #ddd', padding: '20px', textAlign: 'center' }}>Aucune direction créée</td>
                    </tr>
                  ) : (
                    directions.map((direction, index) => (
                      <React.Fragment key={direction.id}>
                        <tr>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #ddd', padding: '12px' }}><strong>{direction.nom}</strong></td>
                          <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                            <span className={`statut statut-${(direction.actif === undefined || direction.actif === 1) ? 'actif' : 'inactif'}`}>
                              {(direction.actif === undefined || direction.actif === 1) ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', width: '140px' }}>
                            <button
                              onClick={() => {
                                setSelectedDirectionForDetails(
                                  selectedDirectionForDetails === direction.id ? null : direction.id
                                );
                              }}
                              className="btn-primary btn-small"
                              style={{ fontSize: '11px', padding: '5px 10px', backgroundColor: '#2196F3', whiteSpace: 'nowrap' }}
                            >
                              {selectedDirectionForDetails === direction.id ? 'Masquer' : 'Voir les détails'}
                            </button>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '12px', width: '280px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start' }}>
                              <button
                                onClick={() => handleEditDirection(direction.id)}
                                className="btn-primary btn-small"
                                style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleToggleDirectionStatus(direction)}
                                className={(direction.actif === undefined || direction.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                                style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '85px' }}
                              >
                                {(direction.actif === undefined || direction.actif === 1) ? 'Désactiver' : 'Réactiver'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDirectionForService(direction.id);
                                  setSelectedSousDirectionForService(null);
                                  resetForm();
                                  setFormType('service');
                                  setFormData({
                                    ...formData,
                                    direction_id: direction.id.toString(),
                                    sous_direction_id: undefined,
                                  });
                                  setShowServiceForm(true);
                                }}
                                className="btn-primary btn-small"
                                style={{ fontSize: '11px', padding: '6px 10px', backgroundColor: '#9c27b0', whiteSpace: 'nowrap', minWidth: '80px' }}
                              >
                                + Service
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedDirectionForDetails === direction.id && (
                          <tr>
                            <td colSpan={5} style={{ border: '1px solid #ddd', padding: '20px', backgroundColor: '#f9f9f9' }}>
                              <div style={{ marginTop: '10px' }}>
                                <h4 style={{ color: '#2196F3', marginBottom: '15px' }}>
                                  Services de la direction "{direction.nom}"
                                </h4>
                                {(() => {
                                  const directionServices = services.filter(s => (s as any).direction_id === direction.id);
                                  if (directionServices.length === 0) {
                                    return (
                                      <p style={{ color: '#666', fontStyle: 'italic' }}>
                                        Aucun service lié à cette direction.
                                      </p>
                                    );
                                  }
                                  return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                      <thead>
                                        <tr>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', backgroundColor: '#e3f2fd', width: '60px' }}>N°</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e3f2fd' }}>Nom</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e3f2fd' }}>Email</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e3f2fd' }}>Téléphone</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e3f2fd' }}>Statut</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e3f2fd', width: '280px' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {directionServices.map((service, serviceIndex) => (
                                          <tr key={service.id}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>{serviceIndex + 1}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>{service.nom}</strong></td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>{service.email}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>{service.telephone || '-'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                              <span className={`statut statut-${(service.actif === undefined || service.actif === 1) ? 'actif' : 'inactif'}`}>
                                                {(service.actif === undefined || service.actif === 1) ? 'Actif' : 'Inactif'}
                                              </span>
                                            </td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px', width: '280px' }}>
                                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start' }}>
                                                <button
                                                  onClick={() => {
                                                    setEditingUserId(service.id);
                                                    setSelectedDirectionForService(direction.id);
                                                    setSelectedSousDirectionForService(null);
                                                    setFormData({
                                                      nom: service.nom,
                                                      email: service.email,
                                                      telephone: service.telephone || '',
                                                      telephone2: '',
                                                      adresse: service.adresse || '',
                                                      site_web: '',
                                                      siret: '',
                                                      numero_tva: '',
                                                      contact_commercial: '',
                                                      email_commercial: '',
                                                      telephone_commercial: '',
                                                      code_postal: '',
                                                      ville: '',
                                                      pays: 'France',
                                                      note: '',
                                                      direction_id: direction.id.toString(),
                                                      sous_direction_id: undefined,
                                                    });
                                                    setFormType('service');
                                                    setShowServiceForm(true);
                                                  }}
                                                  className="btn-primary btn-small"
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                                                >
                                                  Modifier
                                                </button>
                                                <button
                                                  onClick={() => handleToggleUserStatus(service)}
                                                  className={(service.actif === undefined || service.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '85px' }}
                                                >
                                                  {(service.actif === undefined || service.actif === 1) ? 'Désactiver' : 'Réactiver'}
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteUser(service.id, 'service')}
                                                  className="btn-danger btn-small"
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                                                >
                                                  Supprimer
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Formulaire de création de service pour une direction */}
            {showServiceForm && selectedDirectionForService && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card" style={{ marginTop: '20px' }}>
                <h3>
                  {editingUserId ? 'Modifier le service' : 'Créer un nouveau service pour la direction'}
                </h3>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '2px solid #2196F3',
                  color: '#1976d2',
                  fontWeight: 'bold'
                }}>
                  Direction: {directions.find(d => d.id === selectedDirectionForService)?.nom || ''}
                </div>
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Service Achat"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="service@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone 2</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary">
                    {editingUserId ? 'Modifier le service' : 'Créer le service'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowServiceForm(false);
                      setSelectedDirectionForService(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        );

      case 'sous_directions':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>Sous directions</h2>
              <button onClick={() => {
                resetSousDirectionForm();
                setShowForm(true);
              }} className="btn-primary" style={{ backgroundColor: '#4CAF50' }}>
                {showForm ? 'Annuler' : '+ Créer une sous-direction'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={editingSousDirectionId ? handleUpdateSousDirection : handleCreateSousDirection} className="form-card">
                <h3>
                  {editingSousDirectionId ? 'Modifier la sous-direction' : 'Créer une nouvelle sous-direction'}
                </h3>
                <div className="form-group">
                  <label>Direction *</label>
                  <select
                    value={sousDirectionFormData.direction_id}
                    onChange={(e) => setSousDirectionFormData({ ...sousDirectionFormData, direction_id: e.target.value })}
                    required
                    disabled={directions.filter(d => d.actif === undefined || d.actif === 1).length === 0}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: directions.filter(d => d.actif === undefined || d.actif === 1).length === 0 ? '#f5f5f5' : 'white',
                      cursor: directions.filter(d => d.actif === undefined || d.actif === 1).length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <option value="">
                      {directions.filter(d => d.actif === undefined || d.actif === 1).length === 0 
                        ? "Aucune direction disponible. Veuillez d'abord créer une direction." 
                        : "Sélectionner une direction"}
                    </option>
                    {directions.filter(d => d.actif === undefined || d.actif === 1).map((direction) => (
                      <option key={direction.id} value={direction.id.toString()}>
                        {direction.nom}
                      </option>
                    ))}
                  </select>
                  {directions.filter(d => d.actif === undefined || d.actif === 1).length === 0 && (
                    <small style={{ color: '#d32f2f', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                      ⚠️ Vous devez créer au moins une direction avant de pouvoir créer une sous-direction.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Nom de la sous-direction *</label>
                  <input
                    type="text"
                    value={sousDirectionFormData.nom}
                    onChange={(e) => setSousDirectionFormData({ ...sousDirectionFormData, nom: e.target.value })}
                    required
                    placeholder="Ex: Sous-direction des Approvisionnements"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={sousDirectionFormData.description}
                    onChange={(e) => setSousDirectionFormData({ ...sousDirectionFormData, description: e.target.value })}
                    placeholder="Description de la sous-direction"
                    rows={4}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingSousDirectionId ? 'Modifier la sous-direction' : 'Créer la sous-direction'}
                </button>
              </form>
            )}

            <div className="table-container">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center', backgroundColor: '#f5f5f5', width: '60px' }}>N°</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5' }}>Direction</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5' }}>Nom</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5' }}>Statut</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5', width: '140px' }}>Détails</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left', backgroundColor: '#f5f5f5', width: '280px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sousDirections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state" style={{ border: '1px solid #ddd', padding: '20px', textAlign: 'center' }}>Aucune sous-direction créée</td>
                    </tr>
                  ) : (
                    sousDirections.map((sousDirection, index) => (
                      <React.Fragment key={sousDirection.id}>
                        <tr>
                          <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                            {directions.find(d => d.id === sousDirection.direction_id)?.nom || 
                             (sousDirection as any).direction_nom || 
                             `Direction ID: ${sousDirection.direction_id}`}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '12px' }}><strong>{sousDirection.nom}</strong></td>
                          <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                            <span className={`statut statut-${(sousDirection.actif === undefined || sousDirection.actif === 1) ? 'actif' : 'inactif'}`}>
                              {(sousDirection.actif === undefined || sousDirection.actif === 1) ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '8px', width: '140px' }}>
                            <button
                              onClick={() => {
                                setSelectedSousDirectionForDetails(
                                  selectedSousDirectionForDetails === sousDirection.id ? null : sousDirection.id
                                );
                              }}
                              className="btn-primary btn-small"
                              style={{ fontSize: '11px', padding: '5px 10px', backgroundColor: '#2196F3', whiteSpace: 'nowrap' }}
                            >
                              {selectedSousDirectionForDetails === sousDirection.id ? 'Masquer' : 'Voir les détails'}
                            </button>
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '12px', width: '280px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start' }}>
                              <button
                                onClick={() => handleEditSousDirection(sousDirection.id)}
                                className="btn-primary btn-small"
                                style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleToggleSousDirectionStatus(sousDirection)}
                                className={(sousDirection.actif === undefined || sousDirection.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                                style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '85px' }}
                              >
                                {(sousDirection.actif === undefined || sousDirection.actif === 1) ? 'Désactiver' : 'Réactiver'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSousDirectionForService(sousDirection.id);
                                  setSelectedDirectionForService(null);
                                  resetForm();
                                  setFormType('service');
                                  setFormData({
                                    ...formData,
                                    sous_direction_id: sousDirection.id.toString(),
                                    direction_id: undefined,
                                  });
                                  setShowServiceForm(true);
                                }}
                                className="btn-primary btn-small"
                                style={{ fontSize: '11px', padding: '6px 10px', backgroundColor: '#9c27b0', whiteSpace: 'nowrap', minWidth: '80px' }}
                              >
                                + Service
                              </button>
                            </div>
                          </td>
                        </tr>
                        {selectedSousDirectionForDetails === sousDirection.id && (
                          <tr>
                            <td colSpan={6} style={{ border: '1px solid #ddd', padding: '20px', backgroundColor: '#f9f9f9' }}>
                              <div style={{ marginTop: '10px' }}>
                                <h4 style={{ color: '#4CAF50', marginBottom: '15px' }}>
                                  Services de la sous-direction "{sousDirection.nom}"
                                </h4>
                                {(() => {
                                  const sousDirectionServices = services.filter(s => (s as any).sous_direction_id === sousDirection.id);
                                  if (sousDirectionServices.length === 0) {
                                    return (
                                      <p style={{ color: '#666', fontStyle: 'italic' }}>
                                        Aucun service lié à cette sous-direction.
                                      </p>
                                    );
                                  }
                                  return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                      <thead>
                                        <tr>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', backgroundColor: '#e8f5e9', width: '60px' }}>N°</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e8f5e9' }}>Nom</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e8f5e9' }}>Email</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e8f5e9' }}>Téléphone</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e8f5e9' }}>Statut</th>
                                          <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e8f5e9', width: '280px' }}>Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {sousDirectionServices.map((service, serviceIndex) => (
                                          <tr key={service.id}>
                                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', fontWeight: 'bold', width: '60px' }}>{serviceIndex + 1}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}><strong>{service.nom}</strong></td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>{service.email}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>{service.telephone || '-'}</td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                                              <span className={`statut statut-${(service.actif === undefined || service.actif === 1) ? 'actif' : 'inactif'}`}>
                                                {(service.actif === undefined || service.actif === 1) ? 'Actif' : 'Inactif'}
                                              </span>
                                            </td>
                                            <td style={{ border: '1px solid #ddd', padding: '10px', width: '280px' }}>
                                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start' }}>
                                                <button
                                                  onClick={() => {
                                                    setEditingUserId(service.id);
                                                    setSelectedSousDirectionForService(sousDirection.id);
                                                    setSelectedDirectionForService(null);
                                                    setFormData({
                                                      nom: service.nom,
                                                      email: service.email,
                                                      telephone: service.telephone || '',
                                                      telephone2: '',
                                                      adresse: service.adresse || '',
                                                      site_web: '',
                                                      siret: '',
                                                      numero_tva: '',
                                                      contact_commercial: '',
                                                      email_commercial: '',
                                                      telephone_commercial: '',
                                                      code_postal: '',
                                                      ville: '',
                                                      pays: 'France',
                                                      note: '',
                                                      sous_direction_id: sousDirection.id.toString(),
                                                      direction_id: undefined,
                                                    });
                                                    setFormType('service');
                                                    setShowServiceForm(true);
                                                  }}
                                                  className="btn-primary btn-small"
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                                                >
                                                  Modifier
                                                </button>
                                                <button
                                                  onClick={() => handleToggleUserStatus(service)}
                                                  className={(service.actif === undefined || service.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '85px' }}
                                                >
                                                  {(service.actif === undefined || service.actif === 1) ? 'Désactiver' : 'Réactiver'}
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteUser(service.id, 'service')}
                                                  className="btn-danger btn-small"
                                                  style={{ fontSize: '11px', padding: '6px 10px', whiteSpace: 'nowrap', minWidth: '70px' }}
                                                >
                                                  Supprimer
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Formulaire de création de service pour une sous-direction */}
            {showServiceForm && selectedSousDirectionForService && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card" style={{ marginTop: '20px' }}>
                <h3>
                  {editingUserId ? 'Modifier le service' : 'Créer un nouveau service pour la sous-direction'}
                </h3>
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '8px', 
                  marginBottom: '20px',
                  border: '2px solid #4CAF50',
                  color: '#2e7d32',
                  fontWeight: 'bold'
                }}>
                  Sous-direction: {sousDirections.find(sd => sd.id === selectedSousDirectionForService)?.nom || ''}
                  <br />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Direction: {directions.find(d => d.id === sousDirections.find(sd => sd.id === selectedSousDirectionForService)?.direction_id)?.nom || ''}
                  </small>
                </div>
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Service Achat"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="service@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone 2</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary">
                    {editingUserId ? 'Modifier le service' : 'Créer le service'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowServiceForm(false);
                      setSelectedSousDirectionForService(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        );

      case 'magasins_secondaire':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>{t('stores.title.secondaire')}</h2>
              <button onClick={() => {
                resetForm();
                setFormType('magasin_secondaire');
                setShowForm(true);
              }} className="btn-primary" style={{ backgroundColor: '#0066cc' }}>
                {showForm ? t('warehouses.cancel') : `+ ${t('stores.create.secondaire')}`}
              </button>
            </div>

            {showForm && formType === 'magasin_secondaire' && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card">
                <h3>
                  {editingUserId ? t('stores.edit') : t('stores.create.secondaire')}
                </h3>
                {!editingUserId && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f3e5f5', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '2px solid #0066cc',
                    color: '#7b1fa2',
                    fontWeight: 'bold'
                  }}>
                    {t('stores.type.secondaire')}
                  </div>
                )}
                {editingUserId && (
                  <div className="form-group">
                    <label>{t('stores.type')}</label>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#f3e5f5', 
                      borderRadius: '8px',
                      border: '1px solid #0066cc',
                      color: '#7b1fa2',
                      fontWeight: '500'
                    }}>
                      {t('stores.type.secondaire')}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>{t('stores.name')} *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Magasin Secondaire Principal"
                  />
                </div>
                <div className="form-group">
                  <label>{t('warehouses.email')} *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="magasin.secondaire@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('warehouses.phone')}</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('warehouses.phone')} 2</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('warehouses.address')}</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder={t('warehouses.address')}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingUserId ? t('stores.updateBtn') : t('stores.createBtn')}
                </button>
              </form>
            )}

            <div className="table-container">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>N°</th>
                    <th>{t('stores.name')}</th>
                    <th>{t('warehouses.email')}</th>
                    <th>{t('warehouses.phone')}</th>
                    <th>{t('warehouses.address')}</th>
                    <th>{t('warehouses.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {magasinsSecondaire.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">{t('stores.empty.secondaire')}</td>
                    </tr>
                  ) : (
                    magasinsSecondaire.map((magasin, index) => (
                      <tr key={magasin.id}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleUserStatus(magasin)}
                              className={(magasin.actif === undefined || magasin.actif === 1) ? "btn-warning btn-small" : "btn-success btn-small"}
                              style={{ fontSize: '11px', padding: '4px 8px', minWidth: '80px' }}
                              title={(magasin.actif === undefined || magasin.actif === 1) ? 'Désactiver le magasin' : 'Réactiver le magasin'}
                            >
                              {(magasin.actif === undefined || magasin.actif === 1) ? 'Désactiver' : 'Réactiver'}
                            </button>
                            <strong>{magasin.nom}</strong>
                          </div>
                        </td>
                        <td>{magasin.email}</td>
                        <td>{magasin.telephone || '-'}</td>
                        <td>{magasin.adresse || '-'}</td>
                        <td>
                          <button
                            onClick={() => handleViewInventory(magasin.id, 'magasin_secondaire', magasin.nom)}
                            className="btn-small"
                            style={{ marginRight: '5px', backgroundColor: '#28a745', color: 'white' }}
                          >
                            {t('warehouses.inventory')}
                          </button>
                          <button
                            onClick={() => handleEditUser(magasin.id)}
                            className="btn-small"
                            style={{ marginRight: '5px' }}
                          >
                            {t('warehouses.editBtn')}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(magasin.id, 'magasin_secondaire')}
                            className="btn-danger btn-small"
                          >
                            {t('warehouses.deleteBtn')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'produits':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2>{t('products.title')}</h2>
              <button onClick={() => {
                if (showForm) {
                  resetProduitForm();
                } else {
                  resetProduitForm();
                  setShowForm(true);
                }
              }} className="btn-primary">
                {showForm ? t('warehouses.cancel') : t('products.new')}
              </button>
            </div>

            {showForm && activeSection === 'produits' && (
              <form onSubmit={editingProduitId ? handleUpdateProduit : handleCreateProduit} className="form-card">
                <h3>{editingProduitId ? t('products.edit') : t('products.create')}</h3>
                <div className="form-group">
                  <label>{t('products.designation')} *</label>
                  <input
                    type="text"
                    value={produitFormData.nom}
                    onChange={(e) => setProduitFormData({ ...produitFormData, nom: e.target.value })}
                    required
                    placeholder="Ex: Produit ABC"
                  />
                </div>
                <div className="form-group">
                  <label>{t('products.nombreUniteLot')} *</label>
                  <input
                    type="number"
                    min="1"
                    value={produitFormData.nombre_produits_par_carton}
                    onChange={(e) => setProduitFormData({ ...produitFormData, nombre_produits_par_carton: e.target.value })}
                    required
                    placeholder="1"
                  />
                </div>
                <div className="form-group">
                  <label>Marque du produit *</label>
                  <input
                    type="text"
                    value={produitFormData.marque}
                    onChange={(e) => setProduitFormData({ ...produitFormData, marque: e.target.value })}
                    required
                    placeholder="Ex: Samsung, Apple, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Caractéristique du produit</label>
                  <textarea
                    value={produitFormData.caracteristiques}
                    onChange={(e) => setProduitFormData({ ...produitFormData, caracteristiques: e.target.value })}
                    placeholder="Ex: Taille, couleur, modèle, etc."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Image du produit</label>
                  {produitFormData.image ? (
                    <div style={{ marginBottom: '10px' }}>
                      <img 
                        src={produitFormData.image.startsWith('http') ? produitFormData.image : `${(process.env.REACT_APP_API_URL || 'https://gestion.trayebernard-primaire.com/api').replace('/api', '')}${produitFormData.image}`}
                        alt="Aperçu"
                        style={{ 
                          maxWidth: '200px', 
                          maxHeight: '200px', 
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          padding: '5px',
                          marginBottom: '10px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Retirer l'image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleImageChange}
                        disabled={uploadingImage}
                        style={{
                          width: '100%',
                          padding: '8px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          cursor: uploadingImage ? 'not-allowed' : 'pointer',
                          opacity: uploadingImage ? 0.6 : 1
                        }}
                      />
                      {uploadingImage && (
                        <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                          Upload en cours...
                        </small>
                      )}
                      <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                        Formats acceptés: JPEG, JPG, PNG, GIF, WebP (max 5MB)
                      </small>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>{t('products.family')}</label>
                  <select
                    value={produitFormData.famille_id}
                    onChange={(e) => setProduitFormData({ ...produitFormData, famille_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">{t('products.noFamily')}</option>
                    {famillesProduits
                      .filter(f => {
                        const fAny = f as any;
                        // Garder seulement les vraies familles (pas les produits sans famille individuels)
                        const isProduit = fAny.is_produit_famille === 1 || 
                                         fAny.is_produit_famille === '1' || 
                                         fAny.is_produit_famille === true ||
                                         String(fAny.is_produit_famille) === '1';
                        return !isProduit;
                      })
                      .map((famille) => (
                        <option key={famille.id} value={famille.id.toString()}>
                          {famille.nom}
                        </option>
                      ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary">
                  {editingProduitId ? t('products.updateBtn') : t('products.createBtn')}
                </button>
              </form>
            )}

            {(() => {
              const totalPages = Math.ceil(produits.length / produitsPerPage);
              const startIndex = (produitsPage - 1) * produitsPerPage;
              const endIndex = startIndex + produitsPerPage;
              const produitsPagines = produits.slice(startIndex, endIndex);
              
              return (
                <>
                  <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1420px', tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'center', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>N°</th>
                          <th style={{ width: '110px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('products.code')}</th>
                          <th style={{ width: '150px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('products.designation')}</th>
                          <th style={{ width: '120px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>Marque</th>
                          <th style={{ width: '150px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>Caractéristique</th>
                          <th style={{ width: '110px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'center', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>Image</th>
                          <th style={{ width: '180px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'left', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('products.family')}</th>
                          <th style={{ width: '200px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'center', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('products.nombreUniteLot')}</th>
                          <th style={{ width: '170px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'center', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('products.createdAt')}</th>
                          <th style={{ width: '130px', whiteSpace: 'nowrap', padding: '10px 6px', textAlign: 'center', backgroundColor: '#f8f9fa', fontWeight: '900', border: '1px solid #dee2e6', fontSize: '12px', color: '#000000' }}>{t('warehouses.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {produitsPagines.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>{t('products.empty')}</td>
                          </tr>
                        ) : (
                          produitsPagines.map((produit, index) => (
                            <tr key={produit.id}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '10px 6px', border: '1px solid #dee2e6', fontSize: '13px', color: '#000000' }}>{startIndex + index + 1}</td>
                        <td style={{ padding: '10px 6px', border: '1px solid #dee2e6', fontSize: '13px', color: '#000000' }}>
                          <strong style={{ color: '#0066cc', fontSize: '13px' }}>
                            {produit.code_produit || `PROD${produit.id.toString().padStart(4, '0')}`}
                          </strong>
                        </td>
                        <td style={{ padding: '10px 6px', border: '1px solid #dee2e6', wordWrap: 'break-word', fontSize: '13px', color: '#000000' }}>{produit.nom}</td>
                        <td style={{ padding: '10px 6px', border: '1px solid #dee2e6', wordWrap: 'break-word', fontSize: '13px', color: '#000000' }}>{produit.marque || '-'}</td>
                        <td style={{ padding: '10px 6px', border: '1px solid #dee2e6', wordWrap: 'break-word', fontSize: '13px', color: '#000000' }}>{produit.caracteristiques || '-'}</td>
                        <td style={{ textAlign: 'center', padding: '10px 6px', border: '1px solid #dee2e6', fontSize: '13px', color: '#000000' }}>
                          {produit.image ? (
                            <img
                              src={produit.image.startsWith('http') 
                                ? produit.image 
                                : `${(process.env.REACT_APP_API_URL || 'https://gestion.trayebernard-primaire.com/api').replace('/api', '')}${produit.image}`}
                              alt={produit.nom}
                              style={{
                                maxWidth: '60px',
                                maxHeight: '60px',
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '4px'
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span style={{ color: '#333', fontSize: '12px' }}>Aucune</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 6px', border: '1px solid #dee2e6', wordWrap: 'break-word', fontSize: '13px', color: '#000000' }}>
                          {(() => {
                            // Récupérer le nom de la famille depuis le JOIN SQL ou l'objet famille
                            const familleNom = (produit as any).famille_nom || produit.famille?.nom;
                            return familleNom ? (
                              familleNom
                            ) : (
                              <span style={{ color: '#333', fontStyle: 'italic', fontSize: '13px' }}>
                                {t('products.noFamily')}
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 6px', border: '1px solid #dee2e6', fontSize: '13px', color: '#000000' }}>{produit.nombre_produits_par_carton || 1}</td>
                        <td style={{ textAlign: 'center', padding: '10px 6px', border: '1px solid #dee2e6', whiteSpace: 'nowrap', fontSize: '13px', color: '#000000' }}>
                          {produit.created_at 
                            ? new Date(produit.created_at).toLocaleString('fr-FR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '-'}
                        </td>
                        <td style={{ textAlign: 'center', padding: '10px 6px', border: '1px solid #dee2e6', fontSize: '13px', color: '#000000' }}>
                          <button
                            onClick={() => handleEditProduit(produit.id)}
                            className="btn-small"
                            style={{ marginRight: '5px' }}
                          >
                            {t('products.editBtn')}
                          </button>
                          <button
                            onClick={() => handleDeleteProduit(produit.id)}
                            className="btn-danger btn-small"
                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                          >
                            {t('products.deleteBtn')}
                          </button>
                        </td>
                      </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {produits.length > produitsPerPage && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '15px', 
                      marginTop: '20px',
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px'
                    }}>
                      <button
                        onClick={() => setProduitsPage(prev => Math.max(1, prev - 1))}
                        disabled={produitsPage === 1}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: produitsPage === 1 ? '#ccc' : '#0066cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: produitsPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        Précédent
                      </button>
                      <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>
                        Page {produitsPage} sur {totalPages} ({produits.length} produit{produits.length > 1 ? 's' : ''})
                      </span>
                      <button
                        onClick={() => setProduitsPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={produitsPage === totalPages}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: produitsPage === totalPages ? '#ccc' : '#0066cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: produitsPage === totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        Suivant
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        );

      case 'familles_produits':
        return (
          <>
            {showForm && activeSection === 'familles_produits' && (
              <form onSubmit={editingFamilleId ? handleUpdateFamille : handleCreateFamille} className="form-card" style={{ marginBottom: '20px' }}>
                <h3>{editingFamilleId ? 'Modifier la famille' : 'Créer une nouvelle famille'}</h3>
                <div className="form-group">
                  <label>Nom de la famille *</label>
                  <input
                    type="text"
                    value={familleFormData.nom}
                    onChange={(e) => setFamilleFormData({ ...familleFormData, nom: e.target.value })}
                    required
                    placeholder="Ex: Matériels de bureau"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={familleFormData.description}
                    onChange={(e) => setFamilleFormData({ ...familleFormData, description: e.target.value })}
                    rows={3}
                    placeholder="Description de la famille de produits (optionnel)"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary">
                    {editingFamilleId ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetFamilleForm();
                      setShowForm(false);
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
            <FamillesProduitsSection
              famillesProduits={famillesProduits}
              produits={produits}
              selectedFamilleId={selectedFamilleIdForView}
              onSelectFamille={setSelectedFamilleIdForView}
              onShowCreateForm={() => {
                resetFamilleForm();
                setShowForm(true);
              }}
              onEditFamille={(famille) => {
                handleEditFamille(famille.id);
              }}
              onDeleteFamille={handleDeleteFamille}
              onEditProduit={(produit) => {
                handleEditProduit(produit.id);
              }}
              onDeleteProduit={handleDeleteProduit}
              onAddProduitToFamille={handleAddProduitToFamille}
            />
          </>
        );

      case 'quotation':
        const produitsFamille = selectedFamilleId
          ? produits.filter((p: Produit) => {
              const familleId = (p as any)?.famille_id || p.famille?.id;
              return familleId === parseInt(selectedFamilleId);
            })
          : [];

        return (
          <div className="dashboard-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2>Demande de quotation</h2>
              {!showQuotationForm && (
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setShowQuotationForm(true);
                    setSelectedFamilleId('');
                    setSelectedProduits([]);
                    setSelectedProduitId('');
                  }}
                >
                  + Nouvelle demande
                </button>
              )}
            </div>

            {showQuotationForm ? (
              <div className="form-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ marginTop: 0, color: '#0066cc' }}>Nouvelle demande de quotation</h3>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setShowQuotationForm(false);
                      setSelectedFamilleId('');
                      setSelectedProduits([]);
                      setSelectedProduitId('');
                    }}
                  >
                    Annuler
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedProduits.length === 0) {
                    alert('Veuillez sélectionner au moins un produit');
                    return;
                  }
                  // TODO: Implémenter la soumission du formulaire
                  alert('Demande de quotation créée avec succès!');
                  setShowQuotationForm(false);
                  setSelectedFamilleId('');
                  setSelectedProduits([]);
                  setSelectedProduitId('');
                }}>
                  <div className="form-group">
                    <label>Famille de produits *</label>
                    <select
                      value={selectedFamilleId}
                      onChange={(e) => {
                        setSelectedFamilleId(e.target.value);
                        setSelectedProduits([]);
                        setSelectedProduitId('');
                        setQuantiteProduit('1');
                        setUniteQuantite('unité');
                      }}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #000',
                        borderRadius: '0',
                        fontSize: '12pt',
                        fontFamily: 'Times New Roman, serif',
                        boxSizing: 'border-box',
                        backgroundColor: 'white',
                      }}
                    >
                      <option value="">Sélectionner une famille de produits</option>
                      {famillesProduits.map((famille) => (
                        <option key={famille.id} value={famille.id}>
                          {famille.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFamilleId && produitsFamille.length > 0 && (
                    <div className="form-group">
                      <label>Produits *</label>
                      <select
                        value={selectedProduitId}
                        onChange={(e) => {
                          setSelectedProduitId(e.target.value);
                          setQuantiteProduit('1');
                          setUniteQuantite('unité');
                        }}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #000',
                          borderRadius: '0',
                          fontSize: '12pt',
                          fontFamily: 'Times New Roman, serif',
                          boxSizing: 'border-box',
                          backgroundColor: 'white',
                        }}
                      >
                        <option value="">Sélectionner un produit</option>
                        {produitsFamille.map((produit) => (
                          <option key={produit.id} value={produit.id}>
                            {produit.nom} - {produit.code_produit}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedProduitId && (
                    <div className="form-group">
                      <label>Quantité *</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={quantiteProduit}
                          onChange={(e) => setQuantiteProduit(e.target.value)}
                          min="1"
                          required
                          style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #000',
                            borderRadius: '0',
                            fontSize: '12pt',
                            fontFamily: 'Times New Roman, serif',
                            boxSizing: 'border-box',
                          }}
                        />
                        <select
                          value={uniteQuantite}
                          onChange={(e) => setUniteQuantite(e.target.value)}
                          style={{
                            padding: '10px',
                            border: '1px solid #000',
                            borderRadius: '0',
                            fontSize: '12pt',
                            fontFamily: 'Times New Roman, serif',
                            boxSizing: 'border-box',
                            backgroundColor: 'white',
                          }}
                        >
                          <option value="unité">Unité</option>
                          <option value="lot">Lot</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Créer la demande
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setShowQuotationForm(false);
                        setSelectedFamilleId('');
                        setSelectedProduits([]);
                        setSelectedProduitId('');
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="form-card">
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Aucune demande de quotation. Cliquez sur "Nouvelle demande" pour en créer une.
                </div>
              </div>
            )}
          </div>
        );

      case 'fournisseurs':
        return (
          <div className="dashboard-page">
            <div className="page-header">
              <h2 style={{ color: '#000', fontWeight: '700', margin: 0 }}>Fournisseurs</h2>
              <button onClick={() => {
                if (showForm) {
                  resetForm(); // Fermer le formulaire
                } else {
                setFormType('prestataire');
                  setShowForm(true); // Ouvrir le formulaire
                }
              }} className="btn-primary" style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}>
                {showForm ? 'Annuler' : '+ Créer un fournisseur'}
              </button>
            </div>

            {showForm && formType === 'prestataire' && (
              <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser} className="form-card">
                <h3>
                  {editingUserId ? 'Modifier le fournisseur' : 'Créer un nouveau fournisseur'}
                </h3>
                {!editingUserId && (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff3e0', 
                    borderRadius: '8px', 
                    marginBottom: '20px',
                    border: '2px solid #ff9800',
                    color: '#e65100',
                    fontWeight: 'bold'
                  }}>
                    Fournisseur
                  </div>
                )}
                {editingUserId && (
                  <div className="form-group">
                    <label>Type</label>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fff3e0', 
                      borderRadius: '8px',
                      border: '1px solid #ff9800',
                      color: '#e65100',
                      fontWeight: '500'
                    }}>
                      Fournisseur
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Ex: Société ABC Fournisseur"
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="fournisseur@example.com"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Téléphone *</label>
                    <input
                      type="text"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      required
                      placeholder="0123456789"
                    />
                  </div>
                  <div className="form-group">
                    <label>Téléphone 2 *</label>
                    <input
                      type="text"
                      value={formData.telephone2}
                      onChange={(e) => setFormData({ ...formData, telephone2: e.target.value })}
                      required
                      placeholder="0987654321"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Adresse du siège *</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    required
                    placeholder="Adresse complète"
                  />
                </div>
                <div className="form-group">
                  <label>Site web</label>
                  <input
                    type="url"
                    value={formData.site_web || ''}
                    onChange={(e) => setFormData({ ...formData, site_web: e.target.value })}
                    placeholder="https://www.example.com"
                  />
                </div>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #e0e0e0' }}>
                  <h4 style={{ marginBottom: '15px', color: '#0066cc' }}>Informations du premier responsable</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nom du responsable *</label>
                      <input
                        type="text"
                        value={formData.nom_responsable || ''}
                        onChange={(e) => setFormData({ ...formData, nom_responsable: e.target.value })}
                        required
                        placeholder="Ex: Dupont"
                      />
                    </div>
                    <div className="form-group">
                      <label>Prénom du responsable *</label>
                      <input
                        type="text"
                        value={formData.prenom_responsable || ''}
                        onChange={(e) => setFormData({ ...formData, prenom_responsable: e.target.value })}
                        required
                        placeholder="Ex: Jean"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact du responsable *</label>
                      <input
                        type="text"
                        value={formData.contact_responsable || ''}
                        onChange={(e) => setFormData({ ...formData, contact_responsable: e.target.value })}
                        required
                        placeholder="Ex: 0123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label>Email du responsable *</label>
                      <input
                        type="email"
                        value={formData.email_responsable || ''}
                        onChange={(e) => setFormData({ ...formData, email_responsable: e.target.value })}
                        required
                        placeholder="Ex: jean.dupont@example.com"
                      />
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label>Numéro de compte contribuable *</label>
                  <input
                    type="text"
                    value={formData.numero_compte_contribuable || ''}
                    onChange={(e) => setFormData({ ...formData, numero_compte_contribuable: e.target.value })}
                    required
                    placeholder="Ex: CC123456789"
                  />
                </div>
                <button type="submit" className="btn-primary">
                  {editingUserId ? 'Modifier le fournisseur' : 'Créer le fournisseur'}
                </button>
              </form>
            )}

            <div className="table-container" style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
              marginTop: '20px'
            }}>
              <table style={{ 
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  }}>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>N°</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Nom</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Email</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Téléphone</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'left',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Adresse</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'center',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Statut</th>
                    <th style={{
                      padding: '12px 15px',
                      textAlign: 'center',
                      color: '#000',
                      fontWeight: '700',
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      borderBottom: 'none'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fournisseurs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '16px',
                        fontStyle: 'italic'
                      }}>Aucun fournisseur créé</td>
                    </tr>
                  ) : (
                    fournisseurs.map((fournisseur, index) => (
                      <tr 
                        key={fournisseur.id}
                        style={{
                          borderBottom: '1px solid #f0f0f0',
                          transition: 'all 0.3s ease',
                          backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f7ff';
                          e.currentTarget.style.transform = 'scale(1.01)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#fafafa';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <td style={{ 
                          padding: '10px 15px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#3b82f6',
                          fontSize: '14px'
                        }}>{index + 1}</td>
                        <td style={{
                          padding: '10px 15px',
                          fontWeight: '600',
                          color: '#333',
                          fontSize: '14px'
                        }}>{fournisseur.nom}</td>
                        <td style={{
                          padding: '10px 15px',
                          color: '#666',
                          fontSize: '13px'
                        }}>{fournisseur.email || '-'}</td>
                        <td style={{
                          padding: '10px 15px',
                          color: '#666',
                          fontSize: '13px'
                        }}>{fournisseur.telephone || '-'}</td>
                        <td style={{
                          padding: '10px 15px',
                          color: '#666',
                          fontSize: '13px',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{fournisseur.adresse || '-'}</td>
                        <td style={{
                          padding: '10px 15px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            backgroundColor: (fournisseur.actif === undefined || fournisseur.actif === 1) ? '#10b981' : '#ef4444',
                            color: '#fff',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}>
                            {(fournisseur.actif === undefined || fournisseur.actif === 1) ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td style={{
                          padding: '10px 15px',
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center',
                          flexWrap: 'wrap'
                        }}>
                          <button
                            onClick={() => {
                              setEditingUserId(fournisseur.id);
                              setFormData({
                                nom: fournisseur.nom,
                                email: fournisseur.email,
                                telephone: fournisseur.telephone || '',
                                telephone2: '',
                                adresse: fournisseur.adresse || '',
                                site_web: (fournisseur as any).site_web || '',
                                siret: (fournisseur as any).siret || '',
                                numero_tva: (fournisseur as any).numero_tva || '',
                                contact_commercial: (fournisseur as any).contact_commercial || '',
                                email_commercial: (fournisseur as any).email_commercial || '',
                                telephone_commercial: (fournisseur as any).telephone_commercial || '',
                                code_postal: (fournisseur as any).code_postal || '',
                                ville: (fournisseur as any).ville || '',
                                pays: (fournisseur as any).pays || 'France',
                                note: (fournisseur as any).note || '',
                                nom_responsable: (fournisseur as any).nom_responsable || '',
                                prenom_responsable: (fournisseur as any).prenom_responsable || '',
                                contact_responsable: (fournisseur as any).contact_responsable || '',
                                email_responsable: (fournisseur as any).email_responsable || '',
                                numero_compte_contribuable: (fournisseur as any).numero_compte_contribuable || '',
                              });
                              setFormType('prestataire');
                              setShowForm(true);
                            }}
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              color: '#fff',
                              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                            }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(fournisseur)}
                            style={{
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              background: (fournisseur.actif === undefined || fournisseur.actif === 1) 
                                ? '#ef4444' 
                                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              boxShadow: (fournisseur.actif === undefined || fournisseur.actif === 1)
                                ? '0 2px 4px rgba(239, 68, 68, 0.3)'
                                : '0 2px 4px rgba(16, 185, 129, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = (fournisseur.actif === undefined || fournisseur.actif === 1)
                                ? '0 4px 8px rgba(239, 68, 68, 0.4)'
                                : '0 4px 8px rgba(16, 185, 129, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = (fournisseur.actif === undefined || fournisseur.actif === 1)
                                ? '0 2px 4px rgba(239, 68, 68, 0.3)'
                                : '0 2px 4px rgba(16, 185, 129, 0.3)';
                            }}
                          >
                            {(fournisseur.actif === undefined || fournisseur.actif === 1) ? 'Désactiver' : 'Réactiver'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'stock_entree':
        return (
          <div className="dashboard-page">
            <h2 style={{ marginBottom: '30px', color: '#0066cc' }}>Stock d'entrée</h2>
            
            {!stockEntreeType ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '30px' }}>
                <button
                  onClick={() => setStockEntreeType('magasin_centrale')}
                  style={{
                    padding: '40px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <span style={{ fontSize: '48px' }}>🏪</span>
                  <div>
                    <div>Magasins Centraux</div>
                    <div style={{ fontSize: '18px', marginTop: '10px', opacity: 0.9 }}>
                      {magasinsCentrale.length} magasin{magasinsCentrale.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setStockEntreeType('magasin_secondaire')}
                  style={{
                    padding: '40px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <span style={{ fontSize: '48px' }}>🏬</span>
                  <div>
                    <div>Magasins Secondaires</div>
                    <div style={{ fontSize: '18px', marginTop: '10px', opacity: 0.9 }}>
                      {magasinsSecondaire.length} magasin{magasinsSecondaire.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setStockEntreeType('entrepot')}
                  style={{
                    padding: '40px',
                    backgroundColor: '#ffc107',
                    color: '#333',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '15px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <span style={{ fontSize: '48px' }}>🏭</span>
                  <div>
                    <div>Entrepôts</div>
                    <div style={{ fontSize: '18px', marginTop: '10px', opacity: 0.9 }}>
                      {entrepots.length} entrepôt{entrepots.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              </div>
            ) : !selectedLocationStockEntree ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#0066cc' }}>
                    {stockEntreeType === 'magasin_centrale' ? 'Magasins Centraux' :
                     stockEntreeType === 'magasin_secondaire' ? 'Magasins Secondaires' :
                     'Entrepôts'}
                  </h3>
                  <button
                    onClick={() => {
                      setStockEntreeType(null);
                      setSelectedLocationStockEntree(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Retour
                  </button>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Téléphone</th>
                        <th>Adresse</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stockEntreeType === 'magasin_centrale' ? magasinsCentrale :
                        stockEntreeType === 'magasin_secondaire' ? magasinsSecondaire :
                        entrepots).map((location) => (
                        <tr key={location.id}>
                          <td>{location.nom}</td>
                          <td>{location.email}</td>
                          <td>{location.telephone || '-'}</td>
                          <td>{location.adresse || '-'}</td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedLocationStockEntree(location);
                                // S'assurer que le type est bien défini pour le calcul du stock d'entrée
                                if (!stockEntreeType) {
                                  // Déterminer le type à partir du type de la location
                                  if (location.type === 'magasinier' || location.type === 'magasin_centrale') {
                                    setStockEntreeType('magasin_centrale');
                                  } else if (location.type === 'magasin_secondaire') {
                                    setStockEntreeType('magasin_secondaire');
                                  } else if (location.type === 'entrepot') {
                                    setStockEntreeType('entrepot');
                                  }
                                }
                              }}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Sélectionner
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#0066cc' }}>
                    Produits - {selectedLocationStockEntree.nom}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedLocationStockEntree(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Retour
                  </button>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>Code Produit</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Nom</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Description</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Marque</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Image</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Quantité</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Stock d'entrée</th>
                        <th style={{ whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produits.map((produit) => {
                        // Calculer le stock d'entrée réel à partir des bons de commande validés
                        // Cela inclut le stock corrigé validé depuis l'inventaire
                        const stockEntreeCalcule = selectedLocationStockEntree && stockEntreeType
                          ? calculerStockActuel(
                              produit.id,
                              selectedLocationStockEntree.id,
                              stockEntreeType
                            )
                          : 0;
                        
                        // Vérifier aussi si un stock d'entrée a été saisi manuellement (pour compatibilité)
                        const stockKey = selectedLocationStockEntree ? `${selectedLocationStockEntree.id}-${produit.id}` : '';
                        const stockSaisi = stockKey ? stocksEntreeSaisis[stockKey] : null;
                        const estDejaSaisi = !!stockSaisi;
                        
                        // Utiliser le stock calculé (qui inclut le stock corrigé validé) ou le stock saisi manuellement
                        const stockEntreeFinal = stockEntreeCalcule > 0 ? stockEntreeCalcule : (stockSaisi?.quantite || 0);
                        const aUnStockEntree = stockEntreeFinal > 0;
                        
                        return (
                          <tr key={produit.id}>
                            <td>{produit.code_produit || 'N/A'}</td>
                            <td>{produit.nom}</td>
                            <td>{produit.description || '-'}</td>
                            <td>{produit.marque || '-'}</td>
                            <td>
                              {produit.image ? (
                                <img
                                  src={produit.image.startsWith('http')
                                    ? produit.image
                                    : `${(process.env.REACT_APP_API_URL || 'https://gestion.trayebernard-primaire.com/api').replace('/api', '')}${produit.image}`}
                                  alt={produit.nom}
                                  style={{
                                    maxWidth: '60px',
                                    maxHeight: '60px',
                                    objectFit: 'contain',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#999', fontSize: '12px' }}>Aucune image</span>
                              )}
                            </td>
                            <td>
                              {produit.unite_stockage || 'unité'}
                            </td>
                            <td>
                              {aUnStockEntree ? (
                                <div style={{ color: '#28a745', fontWeight: 'bold' }}>
                                  {stockEntreeFinal} {produit.unite_stockage === 'lot' ? 'lot(s)' : 'unité(s)'}
                                  {stockEntreeCalcule > 0 && (
                                    <div style={{ fontSize: '11px', color: '#666', fontWeight: 'normal', fontStyle: 'italic' }}>
                                      (Calculé depuis les bons validés)
                                    </div>
                                  )}
                                  {stockSaisi?.date && stockEntreeCalcule === 0 && (
                                    <div style={{ fontSize: '12px', color: '#666', fontWeight: 'normal' }}>
                                      Saisi le {new Date(stockSaisi.date).toLocaleDateString('fr-FR')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>0 {produit.unite_stockage === 'lot' ? 'lot' : 'unité'}</span>
                              )}
                            </td>
                            <td>
                              {estDejaSaisi ? (
                                <button
                                  disabled
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                  }}
                                >
                                  Déjà saisi
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedProduitStockEntree(produit);
                                    setStockEntreeQuantite('');
                                    setStockEntreeUnite(produit.unite_stockage === 'lot' ? 'lot' : 'unite');
                                    setShowStockEntreeModal(true);
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Saisir le stock d'entrée
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Modal pour saisir le stock d'entrée */}
            {showStockEntreeModal && selectedProduitStockEntree && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
              }}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '30px',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  width: '90%',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}>
                  <h3 style={{ marginTop: 0, color: '#0066cc' }}>
                    Saisir le stock d'entrée - {selectedProduitStockEntree.nom}
                  </h3>
                  <p style={{ color: '#666', marginBottom: '10px' }}>
                    Location: {selectedLocationStockEntree?.nom}
                  </p>
                  <div style={{
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #0066cc',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '20px',
                  }}>
                    <p style={{ margin: 0, color: '#0066cc', fontSize: '14px', fontWeight: 'bold' }}>
                      ⚠️ Note importante:
                    </p>
                    <p style={{ margin: '8px 0 0 0', color: '#333', fontSize: '13px' }}>
                      La quantité saisie impactera <strong>immédiatement</strong> le stock du {stockEntreeType === 'entrepot' ? 'entrepôt' : stockEntreeType === 'magasin_centrale' ? 'magasin central' : 'magasin secondaire'} <strong>{selectedLocationStockEntree?.nom}</strong>.
                    </p>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Unité de mesure:
                    </label>
                    <select
                      value={stockEntreeUnite}
                      onChange={(e) => setStockEntreeUnite(e.target.value as 'unite' | 'lot')}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="unite">Unité</option>
                      <option value="lot">Lot</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Quantité:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={stockEntreeQuantite}
                      onChange={(e) => setStockEntreeQuantite(e.target.value)}
                      placeholder="Entrez la quantité"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowStockEntreeModal(false);
                        setSelectedProduitStockEntree(null);
                        setStockEntreeQuantite('');
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (!stockEntreeQuantite || parseFloat(stockEntreeQuantite) <= 0) {
                          alert('Veuillez entrer une quantité valide');
                          return;
                        }
                        
                        try {
                          // Créer un bon de commande pour ajouter le stock
                          const quantite = parseFloat(stockEntreeQuantite);
                          
                          // Calculer la quantité en unités pour le backend
                          // Si c'est en lot, on convertit en unités (quantité * nombre_produits_par_carton)
                          // Si c'est en unité, on utilise directement la quantité
                          let quantiteEnUnites = quantite;
                          if (stockEntreeUnite === 'lot' && selectedProduitStockEntree.nombre_produits_par_carton) {
                            quantiteEnUnites = quantite * selectedProduitStockEntree.nombre_produits_par_carton;
                          }
                          
                          // Créer un bon de commande avec le super admin comme expéditeur et le magasin/entrepôt comme destinataire
                          const user = authService.getCurrentUser();
                          if (!user) {
                            alert('Erreur: Utilisateur non connecté');
                            return;
                          }
                          
                          if (!selectedLocationStockEntree || !stockEntreeType) {
                            alert('Erreur: Location non sélectionnée');
                            return;
                          }
                          
                          const bonCommandeData = {
                            expediteur_id: user.id,
                            expediteur_type: 'super_admin',
                            destinataire_id: selectedLocationStockEntree.id,
                            destinataire_type: stockEntreeType,
                            lignes: [{
                              produit_id: selectedProduitStockEntree.id,
                              quantite_demandee: quantiteEnUnites.toString(),
                              unite_mesure: stockEntreeUnite === 'lot' ? 'lot' : 'unité',
                            }],
                          };
                          
                          // Créer le bon de commande
                          const bcResponse = await dataService.createBonCommande(bonCommandeData);
                          
                          // Récupérer le bon de commande créé avec ses lignes
                          const bcCreated = await dataService.getBonCommande(bcResponse.data.id);
                          
                          // Valider immédiatement le bon de commande pour mettre à jour le stock
                          if (bcCreated.data.lignes && bcCreated.data.lignes.length > 0 && bcCreated.data.lignes[0].id) {
                            await dataService.validerBonCommande(bcResponse.data.id, {
                              validation_type: 'complete',
                              lignes_validees: [{
                                ligne_id: bcCreated.data.lignes[0].id,
                                produit_id: selectedProduitStockEntree.id,
                                quantite: quantiteEnUnites,
                              }],
                            });
                          } else {
                            throw new Error('Aucune ligne trouvée dans le bon de commande créé');
                          }
                          
                          // Enregistrer le stock d'entrée saisi avec la quantité dans l'unité de saisie (lot ou unité)
                          if (selectedLocationStockEntree && selectedProduitStockEntree) {
                            const stockKey = `${selectedLocationStockEntree.id}-${selectedProduitStockEntree.id}`;
                            setStocksEntreeSaisis(prev => ({
                              ...prev,
                              [stockKey]: {
                                quantite: quantite, // Garder la quantité dans l'unité de saisie (lot ou unité)
                                unite: stockEntreeUnite === 'lot' ? 'lot' : 'unite',
                                date: new Date().toISOString(),
                              }
                            }));
                          }
                          
                          alert('Stock d\'entrée ajouté avec succès!');
                          setShowStockEntreeModal(false);
                          setSelectedProduitStockEntree(null);
                          setStockEntreeQuantite('');
                          
                          // Recharger les données si nécessaire
                          if (activeSection === 'stock_entree') {
                            await loadBonsCommandeEtLivraison();
                          }
                        } catch (error: any) {
                          console.error('Erreur lors de l\'ajout du stock d\'entrée:', error);
                          alert('Erreur lors de l\'ajout du stock d\'entrée: ' + (error.response?.data?.message || error.message));
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'archive_fiches_preparatoires':
        // Filtrer les fiches selon les critères
        console.log('🔍 [FILTRAGE] Début du filtrage de l\'archive...');
        console.log('🔍 [FILTRAGE] État de archiveFichesPreparatoires:', {
          nombreFiches: archiveFichesPreparatoires.length,
          fiches: archiveFichesPreparatoires.map((f: any) => ({ 
            id: f.id, 
            numeroOrdre: f.numeroOrdre, 
            locationNom: f.locationNom,
            dateCreation: f.dateCreation 
          }))
        });
        
        // Les fiches sont maintenant chargées depuis la base de données
        
        console.log('🔍 [FILTRAGE] Filtres appliqués:', {
          filtreDate: filtreArchiveDate,
          filtreNumero: filtreArchiveNumeroOrdre
        });
        
        const fichesFiltrees = archiveFichesPreparatoires.filter(fiche => {
          // Convertir la date de création en format YYYY-MM-DD pour la comparaison
          const ficheDate = new Date(fiche.dateCreation).toISOString().split('T')[0];
          const matchDate = !filtreArchiveDate || ficheDate === filtreArchiveDate || fiche.dateCreation.startsWith(filtreArchiveDate);
          const matchNumero = !filtreArchiveNumeroOrdre || 
            fiche.numeroOrdre.toLowerCase().includes(filtreArchiveNumeroOrdre.toLowerCase());
          return matchDate && matchNumero;
        });
        
        console.log('✅ [FILTRAGE] Fiches filtrées:', fichesFiltrees.length);
        console.log('🔍 [FILTRAGE] Détails des fiches filtrées:', fichesFiltrees.map((f: any) => ({ 
          id: f.id, 
          numeroOrdre: f.numeroOrdre, 
          locationNom: f.locationNom,
          dateCreation: f.dateCreation,
          matchDate: !filtreArchiveDate || new Date(f.dateCreation).toISOString().split('T')[0] === filtreArchiveDate,
          matchNumero: !filtreArchiveNumeroOrdre || f.numeroOrdre.toLowerCase().includes(filtreArchiveNumeroOrdre.toLowerCase())
        })));

        // Trier et préparer les fiches pour l'affichage
        const fichesTriees = [...fichesFiltrees].sort((a: any, b: any) => 
          new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
        );

        // Vérifier s'il y a des fiches dans localStorage qui n'ont pas été migrées
        const savedArchive = localStorage.getItem('archive_fiches_preparatoires');
        let fichesDansLocalStorage = 0;
        try {
          if (savedArchive) {
            const parsedArchive = JSON.parse(savedArchive);
            fichesDansLocalStorage = Array.isArray(parsedArchive) ? parsedArchive.length : 0;
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }

        return (
          <div className="dashboard-page">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#0066cc' }}>Archive des fiches préparatoires</h2>
              {fichesDansLocalStorage > 0 && (
                <button
                  onClick={async () => {
                    const confirmer = window.confirm(
                      `📦 Migration des fiches depuis localStorage\n\n` +
                      `${fichesDansLocalStorage} fiche(s) trouvée(s) dans le localStorage.\n\n` +
                      `Voulez-vous les migrer vers la base de données maintenant ?\n\n` +
                      `⚠️ Assurez-vous d'avoir créé les tables dans la base de données avant de migrer.`
                    );
                    if (confirmer) {
                      await migrerFichesDepuisLocalStorage();
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  📦 Migrer {fichesDansLocalStorage} fiche(s) depuis localStorage
                </button>
              )}
            </div>
            
            {/* Filtres */}
            <div style={{ 
              marginBottom: '30px', 
              padding: '20px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0066cc' }}>Filtres</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Filtrer par date :
                  </label>
                  <input
                    type="date"
                    value={filtreArchiveDate}
                    onChange={(e) => setFiltreArchiveDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Filtrer par numéro d'ordre :
                  </label>
                  <input
                    type="text"
                    value={filtreArchiveNumeroOrdre}
                    onChange={(e) => setFiltreArchiveNumeroOrdre(e.target.value)}
                    placeholder="Ex: N'00001/2025"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              {(filtreArchiveDate || filtreArchiveNumeroOrdre) && (
                <button
                  onClick={() => {
                    setFiltreArchiveDate('');
                    setFiltreArchiveNumeroOrdre('');
                  }}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>


            {/* Liste des fiches archivées */}
            {fichesFiltrees.length === 0 ? (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #ddd'
              }}>
                <p style={{ fontSize: '18px', color: '#666', margin: 0 }}>
                  {archiveFichesPreparatoires.length === 0 
                    ? 'Aucune fiche préparatoire archivée pour le moment.'
                    : 'Aucune fiche ne correspond aux critères de filtrage.'}
                </p>
                {archiveFichesPreparatoires.length > 0 && (
                  <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
                    ({archiveFichesPreparatoires.length} fiche{archiveFichesPreparatoires.length > 1 ? 's' : ''} dans l'archive totale)
                  </p>
                )}
                {fichesDansLocalStorage > 0 && archiveFichesPreparatoires.length === 0 && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    backgroundColor: '#fff3cd', 
                    borderRadius: '6px',
                    border: '1px solid #ffc107'
                  }}>
                    <p style={{ fontSize: '14px', color: '#856404', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                      ⚠️ {fichesDansLocalStorage} fiche(s) trouvée(s) dans le localStorage
                    </p>
                    <p style={{ fontSize: '13px', color: '#856404', margin: 0 }}>
                      Pour les afficher ici, vous devez d'abord créer les tables dans la base de données, puis cliquer sur le bouton "Migrer depuis localStorage" ci-dessus.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {fichesTriees.map((fiche: any) => {
                    const uniqueLocations = Array.from(new Set(fiche.data.map((d: any) => d.locationId))) as number[];
                    const locationType = fiche.inventaireType === 'entrepot' ? 'Entrepôt' : 
                                       fiche.inventaireType === 'magasin_centrale' ? 'Magasin Central' : 
                                       'Magasin Secondaire';
                    
                    // Vérifier si les quantités physiques ont été validées
                    const quantitesValidees = fiche.quantitesValidees || false;
                    
                    // Calculer les valeurs pour les boutons avant le return
                    const tousProduitsAvecQuantite = fiche.data && fiche.data.length > 0 && 
                      fiche.data.every((item: any) => item.quantiteInventaire && item.quantiteInventaire > 0);
                    
                    const verifierTousStocksCorriges = () => {
                      try {
                        const produitsValidesSet = new Set(fiche.produitsValides || []);
                        let produitsAvecEcart = 0;
                        let produitsAvecStockCorrige = 0;
                        
                        fiche.data.forEach((item: any) => {
                          const produitKey = `${item.produitId}-${item.locationId}`;
                          const quantitePhysique = item.quantiteInventaire || 0;
                          const stockActuel = item.quantiteActuelle || 0;
                          const ecart = quantitePhysique - stockActuel;
                          
                          if (ecart !== undefined && ecart !== null && ecart !== 0) {
                            produitsAvecEcart++;
                            const estValide = produitsValidesSet.has(produitKey);
                            
                            let stockCorrigeSauvegarde = false;
                            const saveKey = `fiche_sauvegarde_${fiche.id}_${item.locationId}`;
                            try {
                              const savedData = localStorage.getItem(saveKey);
                              if (savedData) {
                                const parsedData = JSON.parse(savedData);
                                const savedItem = parsedData.donnees?.find((s: any) => 
                                  s.produitId === item.produitId && s.locationId === item.locationId
                                );
                                
                                if (savedItem && savedItem.stockCorrige && savedItem.stockCorrige > 0) {
                                  stockCorrigeSauvegarde = true;
                                }
                              }
                            } catch (error) {
                              // Ignorer les erreurs de localStorage
                            }
                            
                            if (estValide || stockCorrigeSauvegarde) {
                              produitsAvecStockCorrige++;
                            }
                          }
                        });
                        
                        return produitsAvecEcart === 0 || (produitsAvecEcart > 0 && produitsAvecEcart === produitsAvecStockCorrige);
                      } catch (error) {
                        console.error('❌ Erreur lors de la vérification des stocks corrigés:', error);
                        return false;
                      }
                    };
                    
                    const tousStocksCorrigesSaisis = verifierTousStocksCorriges();
                    const shouldShowCompareButton = quantitesValidees || tousProduitsAvecQuantite;
                    const buttonLabel = quantitesValidees || tousProduitsAvecQuantite ? '👁️ Consulter les saisies' : '📝 Saisir la quantité physique';
                    const buttonColor = quantitesValidees || tousProduitsAvecQuantite ? '#28a745' : '#007bff';
                    
                    return (
                      <div
                        key={fiche.id}
                        style={{
                          padding: '20px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>
                              {locationType}: {fiche.locationNom}
                            </h3>
                            <p style={{ margin: '5px 0', color: '#666' }}>
                              <strong>N° d'ordre :</strong> {fiche.numeroOrdre}
                            </p>
                            <p style={{ margin: '5px 0', color: '#666' }}>
                              <strong>Date de création :</strong> {new Date(fiche.dateCreation).toLocaleString('fr-FR')}
                            </p>
                            <p style={{ margin: '5px 0', color: '#666' }}>
                              <strong>Nombre de locations :</strong> {uniqueLocations.length}
                            </p>
                            <p style={{ margin: '5px 0', color: '#666' }}>
                              <strong>Nombre de produits :</strong> {fiche.data.length}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={async () => {
                                // Ouvrir le modal de consultation avec les données de la fiche
                                setFicheArchiveConsultee(fiche);
                                setModeComparaison(false);
                                
                                // Restaurer les produits validés depuis l'archive
                                if (fiche.produitsValides && fiche.produitsValides.length > 0) {
                                  setStocksCorrigesValides(new Set(fiche.produitsValides));
                                  // Initialiser aussi les quantités physiques validées
                                  setQuantitesPhysiquesValidees(new Set(fiche.produitsValides));
                                  console.log('✅ Produits validés restaurés depuis l\'archive:', fiche.produitsValides.length, 'produit(s)');
                                } else {
                                  setStocksCorrigesValides(new Set());
                                  setQuantitesPhysiquesValidees(new Set());
                                }
                                
                                console.log('🔄 ========== DÉBUT CHARGEMENT FICHE ==========');
                                console.log('🔄 Chargement de la fiche avec récupération du stock actuel depuis l\'onglet stock...');
                                console.log('📋 Données de la fiche:', {
                                  inventaireType: fiche.inventaireType,
                                  nombreProduits: fiche.data.length,
                                  locationNom: fiche.locationNom || fiche.data[0]?.locationNom
                                });
                                
                                // S'assurer que les produits sont chargés
                                let produitsDisponibles = produits;
                                if (produitsDisponibles.length === 0) {
                                  console.log('⚠️ Aucun produit en mémoire, chargement...');
                                  try {
                                    const produitsRes = await dataService.getProduits();
                                    produitsDisponibles = produitsRes.data || [];
                                    console.log(`✅ ${produitsDisponibles.length} produit(s) chargé(s)`);
                                  } catch (error) {
                                    console.error('❌ Erreur lors du chargement des produits:', error);
                                  }
                                }
                                
                                // Déterminer le type de location
                                const locationType = fiche.inventaireType === 'entrepot' 
                                  ? 'entrepot' 
                                  : fiche.inventaireType === 'magasin_centrale' 
                                    ? 'magasin_centrale' 
                                    : 'magasin_secondaire';
                                
                                console.log('📍 Type de location déterminé:', locationType);
                                console.log('📦 Nombre de produits disponibles dans la liste:', produitsDisponibles.length);
                                
                                // Récupérer le stock actuel directement depuis l'API (comme dans l'onglet stock)
                                // Aucun calcul côté client, juste récupération des données
                                const donneesModifiables = await Promise.all(fiche.data.map(async (item: any, index: number) => {
                                  console.log(`\n🔍 [PRODUIT ${index + 1}/${fiche.data.length}] Traitement du produit...`);
                                  console.log('   Données brutes de l\'item:', {
                                    produitId: item.produitId,
                                    locationId: item.locationId,
                                    codeProduit: item.codeProduit,
                                    quantiteActuelle: item.quantiteActuelle || 0
                                  });
                                  
                                  // Récupérer le produit complet pour obtenir toutes les informations
                                  const produit = produitsDisponibles.find(p => p.id === item.produitId);
                                  
                                  const locationId = item.locationId || 0;
                                  const produitId = item.produitId || 0;
                                  
                                  console.log('   Paramètres pour récupération du stock:', {
                                    produitId,
                                    locationId,
                                    locationType,
                                    inventaireType: fiche.inventaireType
                                  });
                                  
                                  if (produit) {
                                    console.log('   Produit trouvé dans la liste:', {
                                      id: produit.id,
                                      code_produit: produit.code_produit,
                                      nom: produit.nom,
                                      stock_disponible: produit.stock_disponible
                                    });
                                  } else {
                                    console.warn(`   ⚠️ Produit ${item.codeProduit} (ID: ${produitId}) non trouvé dans la liste`);
                                  }
                                  
                                  // Récupérer le stock actuel directement depuis l'API (comme affiché dans l'onglet stock)
                                  let stockActuel = 0;
                                  
                                  try {
                                    if (fiche.inventaireType === 'entrepot') {
                                      // Pour les entrepôts : utiliser stock_disponible directement depuis les produits
                                      // (c'est ce qui est affiché dans l'onglet stock des entrepôts)
                                      if (produit) {
                                        stockActuel = produit.stock_disponible || 0;
                                        console.log(`   ✅ [ENTREPOT] Stock actuel récupéré depuis produits.stock_disponible: ${stockActuel}`);
                                        console.log('   📊 Détails du produit:', {
                                          id: produit.id,
                                          code_produit: produit.code_produit,
                                          stock_disponible: produit.stock_disponible,
                                          stock_minimum: produit.stock_minimum
                                        });
                                      } else {
                                        console.warn(`   ⚠️ Produit non trouvé, utilisation du fallback`);
                                        throw new Error('Produit non trouvé - utilisation du fallback');
                                      }
                                    } else {
                                      // Pour les magasins : récupérer depuis l'API getStockProduitLocation
                                      // (c'est ce qui est affiché dans l'onglet stock des magasins)
                                      console.log(`   📡 Appel API getStockProduitLocation avec:`, {
                                        produitId,
                                        locationId,
                                        locationType
                                      });
                                      
                                      const stockResponse = await dataService.getStockProduitLocation(produitId, locationId, locationType);
                                      
                                      console.log('   📡 Réponse complète de l\'API:', stockResponse);
                                      console.log('   📡 Données de la réponse:', stockResponse.data);
                                      
                                      if (stockResponse && stockResponse.data) {
                                        stockActuel = stockResponse.data.stockActuel || 0;
                                        console.log(`   ✅ [MAGASIN] Stock actuel récupéré depuis API: ${stockActuel}`);
                                        console.log('   📊 Détails de la réponse API:', {
                                          produitId: stockResponse.data.produitId,
                                          locationId: stockResponse.data.locationId,
                                          locationType: stockResponse.data.locationType,
                                          stockActuel: stockResponse.data.stockActuel,
                                          quantiteEntree: stockResponse.data.quantiteEntree,
                                          quantiteSortie: stockResponse.data.quantiteSortie
                                        });
                                      } else {
                                        console.error('   ❌ ERREUR: Réponse API invalide ou vide');
                                        console.error('   Réponse reçue:', stockResponse);
                                        throw new Error('Réponse API invalide');
                                      }
                                    }
                                  } catch (error) {
                                    // Ne logger que les vraies erreurs (pas les erreurs de fallback intentionnelles)
                                    const errorMessage = error instanceof Error ? error.message : String(error);
                                    const isFallbackError = errorMessage.includes('fallback') || errorMessage.includes('non trouvé');
                                    
                                    if (!isFallbackError) {
                                      console.error(`   ❌ ERREUR lors de la récupération du stock:`, error);
                                      console.error('   Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
                                      console.error('   Message d\'erreur:', errorMessage);
                                      if (error && typeof error === 'object' && 'response' in error) {
                                        const axiosError = error as any;
                                        console.error('   Réponse HTTP:', axiosError.response?.status, axiosError.response?.statusText);
                                        console.error('   Données de l\'erreur:', axiosError.response?.data);
                                      }
                                    }
                                    
                                    // Fallback : utiliser la quantité actuelle archivée si disponible
                                    const quantiteActuelleArchivee = item.quantiteActuelle || 0;
                                    if (quantiteActuelleArchivee > 0) {
                                      stockActuel = quantiteActuelleArchivee;
                                      console.log(`   ⚠️ Utilisation de la quantité actuelle archivée comme fallback: ${stockActuel}`);
                                    } else {
                                      console.warn(`   ⚠️ Aucun fallback disponible, stock actuel restera à 0`);
                                    }
                                  }
                                  
                                  console.log(`   ✅ Stock actuel final pour ce produit: ${stockActuel}`);
                                  
                                  // Récupérer le nombre de produits par carton/lot
                                  const nombreProduitsParCarton = produit?.nombre_produits_par_carton || 1;
                                  
                                  // Calculer les lots et unités à partir de la quantité inventaire existante
                                  let quantiteInventaireLots = 0;
                                  let quantiteInventaireUnites = 0;
                                  const quantiteInventaireExistante = item.quantiteInventaire || 0;
                                  
                                  if (nombreProduitsParCarton > 1 && quantiteInventaireExistante > 0) {
                                    quantiteInventaireLots = Math.floor(quantiteInventaireExistante / nombreProduitsParCarton);
                                    quantiteInventaireUnites = quantiteInventaireExistante % nombreProduitsParCarton;
                                  } else {
                                    quantiteInventaireUnites = quantiteInventaireExistante;
                                  }
                                  
                                  // Calculer l'écart : Quantité physique - Quantité en machine
                                  const quantitePhysique = quantiteInventaireExistante;
                                  const ecart = quantitePhysique - stockActuel;

                                  // Normaliser explicitement tous les champs
                                  const donneeNormalisee = {
                                    locationId: locationId,
                                    locationNom: item.locationNom || '',
                                    produitId: produitId,
                                    produitNom: item.produitNom || produit?.nom || '',
                                    codeProduit: item.codeProduit || produit?.code_produit || '',
                                    marque: item.marque || produit?.marque || undefined,
                                    image: item.image || produit?.image || undefined,
                                    caracteristiques: item.caracteristiques || produit?.caracteristiques || '',
                                    quantiteActuelle: item.quantiteActuelle || 0,
                                    quantiteInventaire: quantiteInventaireExistante,
                                    quantiteInventaireLots: quantiteInventaireLots,
                                    quantiteInventaireUnites: quantiteInventaireUnites,
                                    nombreProduitsParCarton: nombreProduitsParCarton,
                                    uniteSaisie: (item as any).uniteSaisie || (nombreProduitsParCarton > 1 ? 'unite' : undefined),
                                    numeroOrdre: item.numeroOrdre || '',
                                    stockActuel: stockActuel,
                                    ecart: ecart
                                  };
                                  
                                  console.log(`   📋 Donnée normalisée créée:`, {
                                    codeProduit: donneeNormalisee.codeProduit,
                                    produitNom: donneeNormalisee.produitNom,
                                    stockActuel: donneeNormalisee.stockActuel,
                                    quantiteActuelle: donneeNormalisee.quantiteActuelle
                                  });
                                  
                                  return donneeNormalisee;
                                }));
                                
                                console.log('\n✅ ========== FIN CHARGEMENT FICHE ==========');
                                console.log(`✅ ${donneesModifiables.length} produit(s) traité(s) avec stock actuel récupéré depuis l'onglet stock`);
                                console.log('📊 Résumé des stocks récupérés:', donneesModifiables.map(d => ({
                                  codeProduit: d.codeProduit,
                                  stockActuel: d.stockActuel
                                })));
                                
                                // Charger les quantités validées depuis l'archive si elles existent
                                let donneesFinales = donneesModifiables;
                                
                                if (fiche.quantitesValidees && fiche.data) {
                                  // Si les quantités ont été validées, utiliser les données de l'archive
                                  console.log('✅ [CHARGEMENT] Quantités validées trouvées dans l\'archive');
                                  donneesFinales = donneesModifiables.map(item => {
                                    const itemArchive = fiche.data.find((a: any) => 
                                      a.produitId === item.produitId && a.locationId === item.locationId
                                    );
                                    
                                    if (itemArchive && itemArchive.quantiteInventaire > 0) {
                                      const nombreProduitsParCarton = item.nombreProduitsParCarton || 1;
                                      const quantiteTotale = itemArchive.quantiteInventaire || 0;
                                      const lots = nombreProduitsParCarton > 1 ? Math.floor(quantiteTotale / nombreProduitsParCarton) : 0;
                                      const unites = nombreProduitsParCarton > 1 ? quantiteTotale % nombreProduitsParCarton : quantiteTotale;
                                      
                                      return {
                                        ...item,
                                        quantiteInventaire: quantiteTotale,
                                        quantiteInventaireLots: lots,
                                        quantiteInventaireUnites: unites,
                                        uniteSaisie: item.uniteSaisie || (nombreProduitsParCarton > 1 ? 'unite' : undefined)
                                      };
                                    }
                                    return item;
                                  });
                                } else {
                                  // Sinon, charger les données sauvegardées temporairement si elles existent
                                  const saveKey = `fiche_sauvegarde_${fiche.id}_${fiche.data[0]?.locationId || 0}`;
                                  try {
                                    const savedData = localStorage.getItem(saveKey);
                                    if (savedData) {
                                      const parsedData = JSON.parse(savedData);
                                      console.log('💾 [CHARGEMENT] Données sauvegardées temporaires trouvées:', parsedData);
                                      
                                      donneesFinales = donneesModifiables.map(item => {
                                        const savedItem = parsedData.donnees.find((s: any) => 
                                          s.produitId === item.produitId && s.locationId === item.locationId
                                        );
                                        
                                        if (savedItem && savedItem.quantiteInventaire > 0) {
                                          console.log(`💾 [CHARGEMENT] Restauration pour produit ${item.codeProduit}: ${savedItem.quantiteInventaire} unité(s)`);
                                          return {
                                            ...item,
                                            quantiteInventaire: savedItem.quantiteInventaire,
                                            quantiteInventaireLots: savedItem.quantiteInventaireLots,
                                            quantiteInventaireUnites: savedItem.quantiteInventaireUnites,
                                            uniteSaisie: savedItem.uniteSaisie
                                          };
                                        }
                                        return item;
                                      });
                                    }
                                  } catch (error) {
                                    console.error('❌ [CHARGEMENT] Erreur lors du chargement des données sauvegardées:', error);
                                  }
                                }
                                
                                // Charger les justifications depuis la base de données pour chaque produit
                                const donneesAvecJustifications = await Promise.all(donneesFinales.map(async (item) => {
                                  try {
                                    const locationType = fiche.inventaireType === 'entrepot' 
                                      ? 'entrepot' 
                                      : fiche.inventaireType === 'magasin_centrale' 
                                        ? 'magasin_centrale' 
                                        : 'magasin_secondaire';
                                    
                                    const stockEntreeResponse = await dataService.getStockEntree(
                                      item.produitId,
                                      item.locationId,
                                      locationType
                                    );
                                    
                                    if (stockEntreeResponse.data && stockEntreeResponse.data.justificatif) {
                                      return {
                                        ...item,
                                        justificatif: stockEntreeResponse.data.justificatif
                                      };
                                    }
                                    return item;
                                  } catch (error) {
                                    console.error(`❌ Erreur lors du chargement de la justification pour produit ${item.codeProduit}:`, error);
                                    return item;
                                  }
                                }));
                                
                                setDonneesFicheConsultee(donneesAvecJustifications);
                                
                                // Vérifier si tous les produits ont une quantité saisie
                                const tousProduitsAvecQuantite = donneesAvecJustifications.length > 0 && 
                                  donneesAvecJustifications.every((item: any) => item.quantiteInventaire && item.quantiteInventaire > 0);
                                
                                // Si tous les produits ont une quantité saisie OU si les quantités sont validées, ouvrir en mode lecture seule
                                if (tousProduitsAvecQuantite || quantitesValidees) {
                                  // Mode lecture seule : on peut seulement consulter et imprimer
                                  setShowConsultationFicheModal(true);
                                  setModeComparaison(false);
                                } else {
                                  // Mode édition : on peut encore saisir les quantités
                                  setShowConsultationFicheModal(true);
                                  setModeComparaison(false);
                                }
                              }}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: buttonColor,
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              {buttonLabel}
                            </button>
                            {shouldShowCompareButton && (
                              <React.Fragment key={`buttons-${fiche.id}`}>
                                <button
                                  onClick={async () => {
                                    // Ouvrir le modal et activer le mode comparaison
                                    setFicheArchiveConsultee(fiche);
                                    setModeComparaison(false);
                                    
                                    // Restaurer les produits validés depuis l'archive
                                    if (fiche.produitsValides && fiche.produitsValides.length > 0) {
                                      setStocksCorrigesValides(new Set(fiche.produitsValides));
                                      // Initialiser aussi les quantités physiques validées
                                      setQuantitesPhysiquesValidees(new Set(fiche.produitsValides));
                                    } else {
                                      setStocksCorrigesValides(new Set());
                                    }
                                    
                                    // Charger les données et activer le mode comparaison
                                    let produitsDisponibles = produits;
                                    if (produitsDisponibles.length === 0) {
                                      try {
                                        const produitsRes = await dataService.getProduits();
                                        produitsDisponibles = produitsRes.data || [];
                                      } catch (error) {
                                        console.error('❌ Erreur lors du chargement des produits:', error);
                                      }
                                    }
                                    
                                    const locationType = fiche.inventaireType === 'entrepot' 
                                      ? 'entrepot' 
                                      : fiche.inventaireType === 'magasin_centrale' 
                                        ? 'magasin_centrale' 
                                        : 'magasin_secondaire';
                                    
                                    // Charger les quantités validées depuis l'archive
                                    const donneesAvecQuantites = await Promise.all(fiche.data.map(async (item: any) => {
                                      let stockActuel = 0;
                                      
                                      try {
                                        if (fiche.inventaireType === 'entrepot') {
                                          const produit = produitsDisponibles.find(p => p.id === item.produitId);
                                          if (produit) {
                                            stockActuel = produit.stock_disponible || 0;
                                          } else {
                                            stockActuel = item.quantiteActuelle || 0;
                                          }
                                        } else {
                                          const stockResponse = await dataService.getStockProduitLocation(
                                            item.produitId, 
                                            item.locationId, 
                                            locationType
                                          );
                                          if (stockResponse && stockResponse.data) {
                                            stockActuel = stockResponse.data.stockActuel || 0;
                                          } else {
                                            stockActuel = item.quantiteActuelle || 0;
                                          }
                                        }
                                      } catch (error) {
                                        stockActuel = item.quantiteActuelle || 0;
                                      }
                                      
                                      const quantitePhysique = item.quantiteInventaire || 0;
                                      const ecart = quantitePhysique - stockActuel;
                                      
                                      const nombreProduitsParCarton = produitsDisponibles.find(p => p.id === item.produitId)?.nombre_produits_par_carton || 1;
                                      const lots = nombreProduitsParCarton > 1 ? Math.floor(quantitePhysique / nombreProduitsParCarton) : 0;
                                      const unites = nombreProduitsParCarton > 1 ? quantitePhysique % nombreProduitsParCarton : quantitePhysique;
                                      
                                      // Charger le stock corrigé depuis localStorage si disponible
                                      const saveKey = `fiche_sauvegarde_${fiche.id}_${item.locationId}`;
                                      let stockCorrige = 0;
                                      let uniteSaisieStockCorrige: 'lot' | 'unite' = 'unite';
                                      try {
                                        const savedData = localStorage.getItem(saveKey);
                                        if (savedData) {
                                          const parsedData = JSON.parse(savedData);
                                          const savedItem = parsedData.donnees?.find((s: any) => 
                                            s.produitId === item.produitId && s.locationId === item.locationId
                                          );
                                          if (savedItem) {
                                            stockCorrige = savedItem.stockCorrige || 0;
                                            uniteSaisieStockCorrige = savedItem.uniteSaisieStockCorrige || 'unite';
                                          }
                                        }
                                      } catch (error) {
                                        // Ignorer les erreurs de localStorage
                                      }
                                      
                                      // Charger la justification depuis la base de données
                                      let justificatif: string | undefined = undefined;
                                      try {
                                        const stockEntreeResponse = await dataService.getStockEntree(
                                          item.produitId,
                                          item.locationId,
                                          locationType
                                        );
                                        if (stockEntreeResponse.data && stockEntreeResponse.data.justificatif) {
                                          justificatif = stockEntreeResponse.data.justificatif;
                                        }
                                      } catch (error) {
                                        console.error(`❌ Erreur lors du chargement de la justification pour produit ${item.codeProduit}:`, error);
                                      }
                                      
                                      return {
                                        locationId: item.locationId,
                                        locationNom: item.locationNom,
                                        produitId: item.produitId,
                                        produitNom: item.produitNom,
                                        codeProduit: item.codeProduit,
                                        marque: item.marque,
                                        image: item.image,
                                        caracteristiques: item.caracteristiques,
                                        quantiteActuelle: item.quantiteActuelle,
                                        quantiteInventaire: quantitePhysique,
                                        quantiteInventaireLots: lots,
                                        quantiteInventaireUnites: unites,
                                        nombreProduitsParCarton: nombreProduitsParCarton,
                                        stockActuel: stockActuel,
                                        ecart: ecart,
                                        stockCorrige: stockCorrige,
                                        uniteSaisieStockCorrige: uniteSaisieStockCorrige,
                                        justificatif: justificatif,
                                        numeroOrdre: item.numeroOrdre
                                      };
                                    }));
                                    
                                    setDonneesFicheConsultee(donneesAvecQuantites);
                                    setShowConsultationFicheModal(true);
                                    setModeComparaison(true);
                                  }}
                                  style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {tousStocksCorrigesSaisis ? '👁️ Voir les stocks corrigés' : '🔍 Comparer'}
                                </button>
                                <button
                                  onClick={() => {
                                    // Générer et imprimer cette fiche
                                    const dateNow = new Date();
                                    const dateStr = dateNow.toLocaleDateString('fr-FR');
                                    const timeStr = dateNow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                                    const locationType = fiche.inventaireType === 'entrepot' 
                                      ? 'entrepot' 
                                      : fiche.inventaireType === 'magasin_centrale' 
                                        ? 'magasin_centrale' 
                                        : 'magasin_secondaire';

                                    const uniqueLocations = Array.from(new Set(fiche.data.map((d: any) => d.locationId))) as number[];

                                    const generateFicheHTML = (locationId: number) => {
                                      const locationData = fiche.data.filter((d: any) => d.locationId === locationId);
                                      const location = locationData[0];
                                      const numeroOrdre = location.numeroOrdre || fiche.numeroOrdre;

                                      let tableRows = '';
                                      locationData.forEach((item) => {
                                        const imageCell = item.image 
                                          ? `<img src="${item.image}" alt="${item.produitNom}" style="max-width: 100px; max-height: 100px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px;" />`
                                          : 'Aucune image';
                                        
                                        tableRows += `
                                          <tr>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: left;">${item.produitNom}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">${item.marque || '-'}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: left;">${item.caracteristiques || '-'}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">${imageCell}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">
                                              <input type="number" min="0" value="${item.quantiteInventaire || ''}" style="width: 100%; padding: 5px; border: 1px solid #333; text-align: center;" />
                                            </td>
                                          </tr>
                                        `;
                                      });

                                      return `
                                        <div style="page-break-after: always; padding: 20px; border: 2px solid #007bff; border-radius: 8px; margin-bottom: 20px;">
                                          <h1 style="text-align: center; margin-bottom: 20px; color: #0066cc;">Fiche Préparatoire d'Inventaire</h1>
                                          <div style="text-align: center; margin-bottom: 20px;">
                                            <h2 style="color: #0066cc; margin-bottom: 10px;">${locationType === 'entrepot' ? 'Entrepôt' : locationType === 'magasin_centrale' ? 'Magasin Central' : 'Magasin Secondaire'}: ${location.locationNom}</h2>
                                            <p style="color: #007bff; font-size: 16px; font-weight: bold; margin: 5px 0;">N° d'ordre : ${numeroOrdre}</p>
                                            <p style="color: #666; margin: 5px 0;">Date : ${dateStr} à ${timeStr}</p>
                                          </div>
                                          
                                          <table class="fiche-preparatoire-table" style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #333;">
                                            <colgroup>
                                              <col style="width: 35%;" />
                                              <col style="width: 12%;" />
                                              <col style="width: 23%;" />
                                              <col style="width: 15%;" />
                                              <col style="width: 15%;" />
                                            </colgroup>
                                            <thead>
                                              <tr style="background-color: #f8f9fa;">
                                                <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: left;">DÉSIGNATION</th>
                                                <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">MARQUE</th>
                                                <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: left;">CARACTÉRISTIQUE</th>
                                                <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">IMAGE</th>
                                                <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">QUANTITÉ PHYSIQUE EN STOCK</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              ${tableRows}
                                            </tbody>
                                          </table>
                                          
                                          <div style="margin-top: 30px;">
                                            <h3 style="color: #0066cc; margin-bottom: 10px;">Instructions :</h3>
                                            <ul style="margin-left: 20px; color: #333;">
                                              <li>Vérifiez physiquement le stock de chaque produit</li>
                                              <li>Notez la quantité physique réelle dans la colonne "Quantité Physique en Stock"</li>
                                              <li>Retournez cette fiche remplie pour saisie dans le système</li>
                                            </ul>
                                          </div>
                                          
                                          <div style="margin-top: 40px; text-align: right;">
                                            <p style="margin: 10px 0;">Signature de l'inventoriste : _________________________</p>
                                            <p style="margin: 10px 0;">Date : _________________________</p>
                                          </div>
                                        </div>
                                      `;
                                    };

                                    const allFichesHTML = uniqueLocations.map((locId: number) => generateFicheHTML(locId)).join('');

                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>Fiche préparatoire - ${fiche.locationNom}</title>
                                            <style>
                                              @media print {
                                                @page { margin: 1cm; }
                                                body { margin: 0; padding: 0; }
                                              }
                                              body { 
                                                font-family: Arial, sans-serif !important; 
                                                margin: 0 !important; 
                                                padding: 20px !important; 
                                              }
                                              .fiche-preparatoire-table { 
                                                width: 100% !important; 
                                                border-collapse: collapse !important; 
                                                table-layout: fixed !important;
                                                border: 2px solid #333 !important;
                                                font-size: 14px !important;
                                              }
                                              .fiche-preparatoire-table th,
                                              .fiche-preparatoire-table td {
                                                padding: 12px !important;
                                                border: 1px solid #333 !important;
                                              }
                                              .fiche-preparatoire-table thead th {
                                                background-color: #f8f9fa !important;
                                                font-weight: bold !important;
                                              }
                                              img {
                                                max-width: 100px !important;
                                                max-height: 100px !important;
                                                object-fit: contain !important;
                                              }
                                            </style>
                                          </head>
                                          <body>
                                            ${allFichesHTML}
                                          </body>
                                        </html>
                                      `);
                                      printWindow.document.close();
                                      setTimeout(() => {
                                        printWindow.print();
                                      }, 500);
                                    }
                                  }}
                                  style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  🖨️ Imprimer
                                </button>
                                <button
                                  onClick={() => {
                                    const dateNow = new Date();
                                    const dateStr = dateNow.toLocaleDateString('fr-FR');
                                    const timeStr = dateNow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                                    const locationType = fiche.inventaireType === 'entrepot' 
                                      ? 'entrepot' 
                                      : fiche.inventaireType === 'magasin_centrale' 
                                        ? 'magasin_centrale' 
                                        : 'magasin_secondaire';

                                    const uniqueLocations = Array.from(new Set(fiche.data.map((d: any) => d.locationId))) as number[];

                                    const generateFicheHTML = (locationId: number) => {
                                      const locationData = fiche.data.filter((d: any) => d.locationId === locationId);
                                      const location = locationData[0];
                                      const numeroOrdre = location.numeroOrdre || fiche.numeroOrdre;

                                      let tableRows = '';
                                      locationData.forEach((item) => {
                                        const imageCell = item.image 
                                          ? `<img src="${item.image}" alt="${item.produitNom}" style="max-width: 100px; max-height: 100px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px;" />`
                                          : 'Aucune image';
                                        
                                        tableRows += `
                                          <tr>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: left;">${item.produitNom}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">${item.marque || '-'}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: left;">${item.caracteristiques || '-'}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">${imageCell}</td>
                                            <td style="padding: 12px; border: 1px solid #333; text-align: center;">
                                              <input type="number" min="0" value="${item.quantiteInventaire || ''}" style="width: 100%; padding: 5px; border: 1px solid #333; text-align: center;" />
                                            </td>
                                          </tr>
                                        `;
                                      });

                                      return `
                                    <div style="page-break-after: always; padding: 20px; border: 2px solid #007bff; border-radius: 8px; margin-bottom: 20px;">
                                      <h1 style="text-align: center; margin-bottom: 20px; color: #0066cc;">Fiche Préparatoire d'Inventaire</h1>
                                      <div style="text-align: center; margin-bottom: 20px;">
                                        <h2 style="color: #0066cc; margin-bottom: 10px;">${locationType === 'entrepot' ? 'Entrepôt' : locationType === 'magasin_centrale' ? 'Magasin Central' : 'Magasin Secondaire'}: ${location.locationNom}</h2>
                                        <p style="color: #007bff; font-size: 16px; font-weight: bold; margin: 5px 0;">N° d'ordre : ${numeroOrdre}</p>
                                        <p style="color: #666; margin: 5px 0;">Date : ${dateStr} à ${timeStr}</p>
                                      </div>
                                      
                                      <table class="fiche-preparatoire-table" style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #333;">
                                        <colgroup>
                                          <col style="width: 35%;" />
                                          <col style="width: 12%;" />
                                          <col style="width: 23%;" />
                                          <col style="width: 15%;" />
                                          <col style="width: 15%;" />
                                        </colgroup>
                                        <thead>
                                          <tr style="background-color: #f8f9fa;">
                                            <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: left;">DÉSIGNATION</th>
                                            <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">MARQUE</th>
                                            <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: left;">CARACTÉRISTIQUE</th>
                                            <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">IMAGE</th>
                                            <th style="padding: 12px; border: 2px solid #333; font-weight: bold; background-color: #f8f9fa; text-align: center;">QUANTITÉ PHYSIQUE EN STOCK</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${tableRows}
                                        </tbody>
                                      </table>
                                      
                                      <div style="margin-top: 30px;">
                                        <h3 style="color: #0066cc; margin-bottom: 10px;">Instructions :</h3>
                                        <ul style="margin-left: 20px; color: #333;">
                                          <li>Vérifiez physiquement le stock de chaque produit</li>
                                          <li>Notez la quantité physique réelle dans la colonne "Quantité Physique en Stock"</li>
                                          <li>Retournez cette fiche remplie pour saisie dans le système</li>
                                        </ul>
                                      </div>
                                      
                                      <div style="margin-top: 40px; text-align: right;">
                                        <p style="margin: 10px 0;">Signature de l'inventoriste : _________________________</p>
                                        <p style="margin: 10px 0;">Date : _________________________</p>
                                      </div>
                                    </div>
                                  `;
                                };

                                const allFichesHTML = uniqueLocations.map((locId: number) => generateFicheHTML(locId)).join('');

                                const fullHTML = `
                                  <!DOCTYPE html>
                                  <html>
                                    <head>
                                      <meta charset="UTF-8">
                                      <title>Fiche préparatoire - ${fiche.locationNom}</title>
                                      <style>
                                        @media print {
                                          @page { margin: 1cm; }
                                          body { margin: 0; padding: 0; }
                                        }
                                        body { 
                                          font-family: Arial, sans-serif !important; 
                                          margin: 0 !important; 
                                          padding: 20px !important; 
                                        }
                                        .fiche-preparatoire-table { 
                                          width: 100% !important; 
                                          border-collapse: collapse !important; 
                                          table-layout: fixed !important;
                                          border: 2px solid #333 !important;
                                          font-size: 14px !important;
                                        }
                                        .fiche-preparatoire-table th,
                                        .fiche-preparatoire-table td {
                                          padding: 12px !important;
                                          border: 1px solid #333 !important;
                                        }
                                        .fiche-preparatoire-table thead th {
                                          background-color: #f8f9fa !important;
                                          font-weight: bold !important;
                                        }
                                        img {
                                          max-width: 100px !important;
                                          max-height: 100px !important;
                                          object-fit: contain !important;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      ${allFichesHTML}
                                    </body>
                                  </html>
                                `;

                                // Créer un blob et télécharger
                                const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `Fiche_Preparatoire_${fiche.numeroOrdre}_${fiche.locationNom.replace(/[^a-z0-9]/gi, '_')}_${dateStr.replace(/\//g, '-')}.html`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);
                              }}
                              style={{
                                padding: '10px 20px',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginLeft: '10px'
                              }}
                            >
                              📥 Télécharger
                            </button>
                              </React.Fragment>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
      
      default:
        return null;
    }
  };

  const user = authService.getCurrentUser();

  return (
    <Dashboard>
      <Sidebar
        menuItems={menuItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userRole={user?.role}
      />
      <div className="main-content">
        {renderContent()}
      </div>
    </Dashboard>
  );
};

export default SuperAdminDashboard;



