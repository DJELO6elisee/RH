import { STATE_LOGIN, STATE_SIGNUP } from './components/AuthForm';
import GAListener from './components/GAListener';
import { EmptyLayout, LayoutRoute, MainLayout } from './components/Layout';
import PageSpinner from './components/PageSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage.jsx';
import React from 'react';
import componentQueries from 'react-component-queries';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DRHLanguageProvider } from './contexts/DRHLanguageContext';
import InactivityHandler from './components/InactivityHandler';
import './styles/reduction.scss';
import './styles/ivory-coast-theme.scss';

const AlertPage = React.lazy(() =>
    import('./pages/AlertPage'));
const AuthModalPage = React.lazy(() =>
    import('./pages/AuthModalPage'));
const BadgePage = React.lazy(() =>
    import('./pages/BadgePage'));
const ButtonGroupPage = React.lazy(() =>
    import('./pages/ButtonGroupPage'));
const ButtonPage = React.lazy(() =>
    import('./pages/ButtonPage'));
const CardPage = React.lazy(() =>
    import('./pages/CardPage'));
const ChartPage = React.lazy(() =>
    import('./pages/ChartPage'));
const DashboardPage = React.lazy(() =>
    import('./pages/DashboardPage.jsx'));
const OrganizationDashboardPage = React.lazy(() =>
    import('./pages/OrganizationDashboardPage.jsx'));
const DashboardWrapper = React.lazy(() =>
    import('./components/DashboardWrapper.jsx'));
const DropdownPage = React.lazy(() =>
    import('./pages/DropdownPage'));
const FormPage = React.lazy(() =>
    import('./pages/FormPage'));
const InputGroupPage = React.lazy(() =>
    import('./pages/InputGroupPage'));
const ModalPage = React.lazy(() =>
    import('./pages/ModalPage'));
const ProgressPage = React.lazy(() =>
    import('./pages/ProgressPage'));
const TablePage = React.lazy(() =>
    import('./pages/TablePage'));
const TypographyPage = React.lazy(() =>
    import('./pages/TypographyPage'));
const WidgetPage = React.lazy(() =>
    import('./pages/WidgetPage'));

// Pages de gestion RH
const AgentDashboard = React.lazy(() =>
    import('./pages/AgentDashboard'));
const DRHDashboardPage = React.lazy(() =>
    import('./pages/DRHDashboardPage'));
const DRHBesoinAgentsPage = React.lazy(() =>
    import('./pages/DRHBesoinAgentsPage'));
const NotesDeServicePage = React.lazy(() =>
    import('./pages/NotesDeServicePage'));
const MutationsPage = React.lazy(() =>
    import('./pages/MutationsPage'));
const MutationsValidationPage = React.lazy(() =>
    import('./pages/MutationsValidationPage'));
const AgentsPage = React.lazy(() =>
    import('./pages/AgentsPage'));
const AgentsPositionsPage = React.lazy(() =>
    import('./pages/AgentsPositionsPage'));
const HistoriqueAgentsPage = React.lazy(() =>
    import('./pages/HistoriqueAgentsPage'));
const JoursCongesPage = React.lazy(() =>
    import('./pages/JoursCongesPage'));
const AgentsReportsPage = React.lazy(() =>
    import('./pages/AgentsReportsPage'));
const RetirementProjectionReportsPage = React.lazy(() =>
    import('./pages/RetirementProjectionReportsPage'));
const AgentsByTypeReportPage = React.lazy(() =>
    import('./pages/AgentsByTypeReportPage'));
const AgentsByServiceReportPage = React.lazy(() =>
    import('./pages/AgentsByServiceReportPage'));
const AgentsByDirectionReportPage = React.lazy(() =>
    import('./pages/AgentsByDirectionReportPage'));
const GradesPage = React.lazy(() =>
    import('./pages/GradesPage'));
const DirectionsGeneralesPage = React.lazy(() =>
    import('./pages/DirectionsGeneralesPage'));
const DirectionsPage = React.lazy(() =>
    import('./pages/DirectionsPage'));
const EntitesPage = React.lazy(() =>
    import('./pages/EntitesPage'));
const MinisteresPage = React.lazy(() =>
    import('./pages/MinisteresPage'));
const InstitutionsPage = React.lazy(() =>
    import('./pages/InstitutionsPage'));
const EmploisPage = React.lazy(() =>
    import('./pages/EmploisPage'));
const FonctionsPage = React.lazy(() =>
    import('./pages/FonctionsPage'));
const DiplomesPage = React.lazy(() =>
    import('./pages/DiplomesPage'));
const EchelonsPage = React.lazy(() =>
    import('./pages/EchelonsPage'));
const CategoriesPage = React.lazy(() =>
    import('./pages/CategoriesPage'));
const CivilitesPage = React.lazy(() =>
    import('./pages/CivilitesPage'));
const NationalitesPage = React.lazy(() =>
    import('./pages/NationalitesPage'));
const SituationMatrimonialsPage = React.lazy(() =>
    import('./pages/SituationMatrimonialsPage'));
const TypeDAgentsPage = React.lazy(() =>
    import('./pages/TypeDAgentsPage'));
const RetraitesPage = React.lazy(() =>
    import('./pages/RetraitesPage'));
const VerificationRetraitesPage = React.lazy(() =>
    import('./pages/VerificationRetraitesPage'));
const ProlongementRetraitePage = React.lazy(() =>
    import('./pages/ProlongementRetraitePage'));
const PlanningPrevisionnelCongesPage = React.lazy(() =>
    import('./pages/PlanningPrevisionnelCongesPage'));
const DirectionsEntitesPage = React.lazy(() =>
    import('./pages/DirectionsEntitesPage'));
const ServicesPage = React.lazy(() =>
    import('./pages/ServicesPage'));
const ServicesPageSimple = React.lazy(() =>
    import('./pages/ServicesPageSimple'));
const SousDirectionsPage = React.lazy(() =>
    import('./pages/SousDirectionsPage'));
const GenericManagementPage = React.lazy(() =>
    import('./pages/GenericManagementPage'));
const RouteManagementPage = React.lazy(() =>
    import('./pages/RouteManagementPage'));
const MinistereHomePage = React.lazy(() =>
    import('./pages/MinistereHomePage'));
const InstitutionHomePage = React.lazy(() =>
    import('./pages/InstitutionHomePage'));
const FicheSignaletiquePage = React.lazy(() =>
    import('./pages/FicheSignaletiquePage'));
const FicheSignaletiqueDetailPage = React.lazy(() =>
    import('./pages/FicheSignaletiqueDetailPage'));
const LoginPage = React.lazy(() =>
    import('./pages/LoginPage'));
const OrganizationHomePage = React.lazy(() =>
    import('./pages/OrganizationHomePage'));
const DomainRouter = React.lazy(() =>
    import('./components/DomainRouter'));
const SeminaireFormationPage = React.lazy(() =>
    import('./pages/SeminaireFormationPage'));
const TypeFormationsPage = React.lazy(() =>
    import('./pages/TypeFormationsPage'));
const GestionEvenementsPage = React.lazy(() =>
    import('./pages/GestionEvenementsPage'));
const AgentFonctionsPage = React.lazy(() =>
    import('./pages/AgentFonctionsPage'));
const AgentEmploisPage = React.lazy(() =>
    import('./pages/AgentEmploisPage'));
const AgentGradesPage = React.lazy(() =>
    import('./pages/AgentGradesPage'));
const AgentEchelonsPage = React.lazy(() =>
    import('./pages/AgentEchelonsPage'));
const AgentCategoriesPage = React.lazy(() =>
    import('./pages/AgentCategoriesPage'));
const VieAssociativePage = React.lazy(() =>
    import('./pages/VieAssociativePage'));
const AgentUserAccountsPage = React.lazy(() =>
    import('./pages/AgentUserAccountsPage'));
const AttributionTachesPage = React.lazy(() =>
    import('./pages/AttributionTachesPage'));
const GestionMariagesPage = React.lazy(() =>
    import('./pages/GestionMariagesPage'));
const AgentsMiseADispositionPage = React.lazy(() =>
    import('./pages/AgentsMiseADispositionPage'));
const ParametresPage = React.lazy(() =>
    import('./pages/ParametresPage.jsx'));
const ParametresDRHPage = React.lazy(() =>
    import('./pages/ParametresDRHPage.jsx'));

// Pages de gestion des demandes
const DemandeAbsencePage = React.lazy(() =>
    import('./pages/DemandeAbsencePage'));
const DemandeSortieTerritoirePage = React.lazy(() =>
    import('./pages/DemandeSortieTerritoirePage'));
const DemandeAttestationTravailPage = React.lazy(() =>
    import('./pages/DemandeAttestationTravailPage'));
const AutorisationCongesPage = React.lazy(() =>
    import('./pages/AutorisationCongesPage'));
const AutorisationRetraitePage = React.lazy(() =>
    import('./pages/AutorisationRetraitePage'));
const AutorisationRepriseServicePage = React.lazy(() =>
    import('./pages/AutorisationRepriseServicePage'));
const AttestationPresencePage = React.lazy(() =>
    import('./pages/AttestationPresencePage'));
const NoteServicePage = React.lazy(() =>
    import('./pages/NoteServicePage'));
const CertificatCessationServicePage = React.lazy(() =>
    import('./pages/CertificatCessationServicePage'));
const CertificatNonJouissanceCongePage = React.lazy(() =>
    import('./pages/CertificatNonJouissanceCongePage'));
const DocumentsGeneresPage = React.lazy(() =>
    import('./pages/DocumentsGeneresPage'));
const GenererDocumentsPage = React.lazy(() =>
    import('./pages/GenererDocuments.jsx'));
const CertificatsPriseServicePage = React.lazy(() =>
    import('./pages/CertificatsPriseServicePage'));
const DemandeHistoriquePage = React.lazy(() =>
    import('./pages/DemandeHistoriquePage'));
const EmargementPage = React.lazy(() =>
    import('./pages/EmargementPage'));
const DecisionsPage = React.lazy(() =>
    import('./pages/DecisionsPage.jsx'));

const getBasename = () => {
    return process.env.PUBLIC_URL || '/';
};

class App extends React.Component {
    render() {
        return (
            <AuthProvider>
                <DRHLanguageProvider>
                <BrowserRouter basename={getBasename()}>
                    <InactivityHandler>
                    <GAListener>
                    <Switch>
                        <LayoutRoute exact path="/login"
                            layout={EmptyLayout}
                            component={props => (
                                <AuthPage {...props}
                                    authState={STATE_LOGIN}
                                />
                            )}
                        />
                        <LayoutRoute exact path="/signup"
                            layout={EmptyLayout}
                            component={props => (
                                <AuthPage {...props}
                                    authState={STATE_SIGNUP}
                                />
                            )}
                        />

                        {/* Route par défaut - Redirection vers la page d'accueil du ministère */}
                        <LayoutRoute exact path="/" 
                            layout={EmptyLayout}
                            component={() => <Redirect to="/ministere" />} />
                        
                        {/* Route par défaut - Détection automatique du domaine (seulement pour les utilisateurs non connectés) */}
                        <LayoutRoute exact path="/public" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <DomainRouter {...props} />
                                </React.Suspense>
                            )} />
                        
                        {/* Pages d'accueil publiques - Utilisation du EmptyLayout */}
                        <LayoutRoute exact path="/ministere" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <MinistereHomePage {...props} />
                                </React.Suspense>
                            )} />
                        <LayoutRoute exact path="/institution" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <InstitutionHomePage {...props} />
                                </React.Suspense>
                            )} />
                        <LayoutRoute exact path="/login-page" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <LoginPage {...props} />
                                </React.Suspense>
                            )} />
                        
                        {/* Dashboard agent - Interface dédiée sans sidebar principale */}
                        <LayoutRoute exact path="/agent-dashboard" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <AgentDashboard {...props} />
                                </React.Suspense>
                            )} />
                        
                        {/* Routes dynamiques pour les organisations */}
                        <LayoutRoute exact path="/ministere/:organizationId" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <OrganizationHomePage {...props} />
                                </React.Suspense>
                            )} />
                        <LayoutRoute exact path="/institution/:organizationId" 
                            layout={EmptyLayout}
                            component={props => (
                                <React.Suspense fallback={<PageSpinner />}>
                                    <OrganizationHomePage {...props} />
                                </React.Suspense>
                            )} />

                        <MainLayout breakpoint={this.props.breakpoint}>
                            <React.Suspense fallback={<PageSpinner />}>
                                <ProtectedRoute exact path="/" render={() => <Redirect to="/dashboard" />} />
                                <ProtectedRoute exact path="/dashboard" component={DashboardWrapper} />
                                <ProtectedRoute exact path="/parametres" component={ParametresPage} />
                                <ProtectedRoute exact path="/login-modal" component={AuthModalPage} />
                                <ProtectedRoute exact path="/buttons" component={ButtonPage} />
                                <ProtectedRoute exact path="/cards" component={CardPage} />
                                <ProtectedRoute exact path="/widgets" component={WidgetPage} />
                                <ProtectedRoute exact path="/typography" component={TypographyPage} />
                                <ProtectedRoute exact path="/alerts" component={AlertPage} />
                                <ProtectedRoute exact path="/tables" component={TablePage} />
                                <ProtectedRoute exact path="/badges" component={BadgePage} />
                                <ProtectedRoute exact path="/button-groups" component={ButtonGroupPage} />
                                <ProtectedRoute exact path="/dropdowns" component={DropdownPage} />
                                <ProtectedRoute exact path="/progress" component={ProgressPage} />
                                <ProtectedRoute exact path="/modals" component={ModalPage} />
                                <ProtectedRoute exact path="/forms" component={FormPage} />
                                <ProtectedRoute exact path="/input-groups" component={InputGroupPage} />
                                <ProtectedRoute exact path="/charts" component={ChartPage} />

                                {/* Routes de gestion RH */}
                                <ProtectedRoute exact path="/drh-dashboard" component={DRHDashboardPage} />
                                <ProtectedRoute exact path="/besoins-en-agents" component={DRHBesoinAgentsPage} />
                                <ProtectedRoute exact path="/notes-de-service" component={NotesDeServicePage} />
                                <ProtectedRoute exact path="/drh-parametres" component={ParametresDRHPage} />
                                <ProtectedRoute exact path="/agents" component={AgentsPage} />
                                <ProtectedRoute exact path="/positions-agents" component={AgentsPositionsPage} />
                                <ProtectedRoute exact path="/historique-des-agents" component={HistoriqueAgentsPage} />
                                <ProtectedRoute exact path="/jours-conges" component={JoursCongesPage} />
                                <ProtectedRoute exact path="/agents-reports" component={AgentsReportsPage} />
                                <ProtectedRoute exact path="/projections-retraites" component={RetirementProjectionReportsPage} />
                                <ProtectedRoute exact path="/agents-by-type-report" component={AgentsByTypeReportPage} />
                                <ProtectedRoute exact path="/agents-by-direction-report" component={AgentsByDirectionReportPage} />
                                <ProtectedRoute exact path="/agents-by-service-report" component={AgentsByServiceReportPage} />
                                <ProtectedRoute exact path="/grades" component={GradesPage} />
                                <ProtectedRoute exact path="/directions-generales" component={DirectionsGeneralesPage} />
                                <ProtectedRoute exact path="/directions" component={DirectionsPage} />
                                <ProtectedRoute exact path="/services" component={ServicesPage} />
                                <ProtectedRoute exact path="/services-simple" component={ServicesPageSimple} />
                                <ProtectedRoute exact path="/sous-directions" component={SousDirectionsPage} />
                                <ProtectedRoute exact path="/services-entites-ministres" component={RouteManagementPage} />
                                <ProtectedRoute exact path="/entites" component={RouteManagementPage} />
                                <ProtectedRoute exact path="/ministeres" component={MinisteresPage} />
                                <ProtectedRoute exact path="/institutions" component={InstitutionsPage} />
                                <ProtectedRoute exact path="/emplois" component={EmploisPage} />
                                <ProtectedRoute exact path="/fonctions" component={FonctionsPage} />
                                <ProtectedRoute exact path="/diplomes" component={DiplomesPage} />
                                <ProtectedRoute exact path="/echelons" component={EchelonsPage} />
                                <ProtectedRoute exact path="/categories" component={CategoriesPage} />
                                <ProtectedRoute exact path="/civilites" component={CivilitesPage} />
                                <ProtectedRoute exact path="/nationalites" component={NationalitesPage} />
                                <ProtectedRoute exact path="/situation-matrimoniale" component={SituationMatrimonialsPage} />
                                <ProtectedRoute exact path="/type-d-agents" component={TypeDAgentsPage} />
                                <ProtectedRoute exact path="/retraites" component={RetraitesPage} />
                                <ProtectedRoute exact path="/verification-retraite" component={VerificationRetraitesPage} />
                                <ProtectedRoute exact path="/prolongement-retraite" component={ProlongementRetraitePage} />
                                <ProtectedRoute exact path="/planning-previsionnel-conges" component={PlanningPrevisionnelCongesPage} />
                                <ProtectedRoute exact path="/agent-user-accounts" component={AgentUserAccountsPage} />
                                <ProtectedRoute exact path="/attribution-taches-agents" component={AttributionTachesPage} />
                                <ProtectedRoute exact path="/gestion-mariages" component={GestionMariagesPage} />
                                <ProtectedRoute exact path="/agents-mise-a-disposition" component={AgentsMiseADispositionPage} />
                                <ProtectedRoute exact path="/services-entites" component={DirectionsEntitesPage} />
                                <ProtectedRoute exact path="/positions" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/distinctions" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/specialites" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/langues" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/niveau-langues" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/logiciels" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/niveau-informatiques" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-conges" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/autre-absences" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/mode-entrees" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/motif-departs" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-retraites" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/pays" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/regions" component={RouteManagementPage} />
                                <ProtectedRoute exact path="/departements" component={RouteManagementPage} />
                                <ProtectedRoute exact path="/localites" component={RouteManagementPage} />
                                <ProtectedRoute exact path="/enfants" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/handicaps" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/pathologies" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/nature-accidents" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/sanctions" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/nature-actes" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-documents" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-courriers" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-destinations" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-materiels" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/type-seminaires" component={TypeFormationsPage} />
                                <ProtectedRoute exact path="/seminaire-formation" component={SeminaireFormationPage} />
                                <ProtectedRoute exact path="/gestion-evenements" component={GestionEvenementsPage} />
                                <ProtectedRoute exact path="/type-etablissements" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/unite-administratives" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/sindicats" component={VieAssociativePage} />
                                <ProtectedRoute exact path="/dossiers" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/classeurs" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/tiers" component={GenericManagementPage} />
                                <ProtectedRoute exact path="/auth" component={GenericManagementPage} />

                                {/* Routes nomination */}
                                <ProtectedRoute exact path="/agent-fonctions" component={AgentFonctionsPage} />
                                <ProtectedRoute exact path="/agent-emplois" component={AgentEmploisPage} />
                                <ProtectedRoute exact path="/agent-grades" component={AgentGradesPage} />
                                <ProtectedRoute exact path="/agent-echelons" component={AgentEchelonsPage} />
                                <ProtectedRoute exact path="/agent-categories" component={AgentCategoriesPage} />

                                {/* Routes fiche signalétique */}
                                <ProtectedRoute exact path="/fiche-signaletique" component={FicheSignaletiquePage} />
                                <ProtectedRoute exact path="/fiche-signaletique/:agentId" component={FicheSignaletiqueDetailPage} />

                                {/* Routes de gestion des demandes */}
                                <ProtectedRoute exact path="/demande-absence" component={DemandeAbsencePage} />
                                <ProtectedRoute exact path="/demande-sortie-territoire" component={DemandeSortieTerritoirePage} />
                                <ProtectedRoute exact path="/demande-attestation-travail" component={DemandeAttestationTravailPage} />
                                <ProtectedRoute exact path="/autorisation-conges" component={AutorisationCongesPage} />
                                <ProtectedRoute exact path="/autorisation-retraite" component={AutorisationRetraitePage} />
                                <ProtectedRoute exact path="/attestation-presence" component={AttestationPresencePage} />
                                <ProtectedRoute exact path="/note-service" component={NoteServicePage} />
                                <ProtectedRoute exact path="/certificat-cessation-service" component={CertificatCessationServicePage} />
                                <ProtectedRoute exact path="/autorisation-reprise-service" component={AutorisationRepriseServicePage} />
                                <ProtectedRoute exact path="/certificat-non-jouissance-conge" component={CertificatNonJouissanceCongePage} />
                                <ProtectedRoute exact path="/mutations" component={MutationsPage} />
                                <ProtectedRoute exact path="/mutations-validation" component={MutationsValidationPage} />
                                
                                {/* Routes des documents générés */}
                                <ProtectedRoute exact path="/documents-generes" component={DocumentsGeneresPage} />
                                <ProtectedRoute exact path="/generer-documents" component={GenererDocumentsPage} />
                                <ProtectedRoute exact path="/certificat-prise-service" component={CertificatsPriseServicePage} />
                                <ProtectedRoute exact path="/emargement" component={EmargementPage} />
                                <ProtectedRoute exact path="/historiques-demandes" component={DemandeHistoriquePage} />
                                <ProtectedRoute exact path="/decision" component={DecisionsPage} />

                            </React.Suspense>
                        </MainLayout>
                        <Redirect to="/" />
                    </Switch>
                    </GAListener>
                    </InactivityHandler>
                </BrowserRouter>
                </DRHLanguageProvider>
            </AuthProvider>
        );
    }
}

const query = ({ width }) => {
    if (width < 575) {
        return { breakpoint: 'xs' };
    }

    if (576 < width && width < 767) {
        return { breakpoint: 'sm' };
    }

    if (768 < width && width < 991) {
        return { breakpoint: 'md' };
    }

    if (992 < width && width < 1199) {
        return { breakpoint: 'lg' };
    }

    if (width > 1200) {
        return { breakpoint: 'xl' };
    }

    return { breakpoint: 'xs' };
};

export default componentQueries(query)(App);
