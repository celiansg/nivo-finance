# Nivo Finance

Application web privée de gestion financière personnelle. React, Vite, TypeScript, Firebase Authentication et Cloud Firestore. Nivo est aussi une PWA installable depuis un navigateur mobile ou un ordinateur.

## Démarrer

```sh
npm install
npm run dev
```

La configuration publique de l’application Firebase `finances-f5c06` se trouve dans `src/services/firebase.ts`. Aucun e-mail, identifiant de connexion ou mot de passe n’est présent dans le projet.

## Activer les comptes privés

Dans la [console Firebase](https://console.firebase.google.com/project/finances-f5c06) :

1. Ouvrir **Build → Authentication → Commencer**.
2. Activer le fournisseur **Adresse e-mail/Mot de passe**.
3. Ouvrir l’onglet **Users**, puis ajouter manuellement un utilisateur si vous voulez conserver un compte déjà créé.
4. Ne pas communiquer un mot de passe et ne l’ajouter à aucun fichier du projet.

La page `/login` propose maintenant la connexion et la création d’un compte. Une création réussie envoie un e-mail de vérification, puis déconnecte immédiatement le nouvel utilisateur jusqu’à ce qu’il confirme son adresse. Le mot de passe est transmis directement à Firebase Authentication et n’est jamais écrit par Nivo.

Dans **Authentication → Settings → Authorized domains**, ajouter `127.0.0.1` pour le développement local et `VOTRE_COMPTE.github.io` pour GitHub Pages.

## Créer Firestore et protéger les données

1. Dans Firebase, ouvrir **Build → Firestore Database**.
2. Créer une base en mode production.
3. Ouvrir l’onglet **Rules**.
4. Copier le contenu de `firestore.rules`, puis cliquer sur **Publish**.

Ces règles refusent toute requête non authentifiée. Pour chaque document, `request.auth.uid` doit être identique à l’UID présent dans le chemin. Toutes les données suivent cette structure :

```text
users/{uid}/accounts/{accountId}
users/{uid}/transactions/{transactionId}
users/{uid}/categories/{categoryId}
users/{uid}/subscriptions/{subscriptionId}
users/{uid}/budgets/{budgetId}
users/{uid}/budgetCategories/{budgetCategoryId}
users/{uid}/savingsGoals/{goalId}
users/{uid}/goalTransactions/{goalTransactionId}
users/{uid}/recurringTransactions/{recurringId}
users/{uid}/settings/preferences
```

L’UID est toujours lu depuis `auth.currentUser` dans `src/services/database.ts`. L’adresse e-mail ne sert jamais de chemin Firestore.

Les règles vérifient aussi la forme des documents, les types, les montants, les tailles de texte et les valeurs autorisées. Après une mise à jour du fichier, il faut republier les règles dans la console Firebase pour que la protection soit active en ligne.

### Activer Firebase App Check

Pour réduire les requêtes automatisées provenant d’autres sites :

1. Dans Firebase, ouvrir **Build → App Check** et enregistrer l’application Web avec reCAPTCHA v3.
2. Copier la clé publique du site dans un fichier local `.env.local` :

```text
VITE_FIREBASE_APPCHECK_SITE_KEY=votre_cle_publique_recaptcha
```

3. Construire et publier de nouveau l’application, puis activer progressivement l’application des règles App Check dans Firebase.

Cette clé reCAPTCHA est publique. Aucun mot de passe ni secret Firebase ne doit être placé dans ce fichier.

Les règles peuvent aussi être publiées depuis un terminal :

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project finances-f5c06
```

## Checklist de mise en ligne

Les vérifications opérationnelles suivantes sont intégrées au projet :

- **Requêtes et affichage** : les collections sont écoutées une seule fois par session avec `onSnapshot`. La page
  Transactions trie et affiche les résultats par tranches de 25 afin d’éviter une longue liste à l’écran. Les champs
  et montants sont validés avant chaque écriture.
- **Appels IA** : l’endpoint `/api/analyze-expenses` exige un jeton Firebase, limite les appels à 10 par fenêtre de
  10 minutes et par adresse source sur une instance Vercel, refuse les images trop lourdes, impose un délai maximal
  et limite la réponse à 100 opérations. La clé Gemini reste uniquement côté serveur.
- **États d’attente et d’échec** : les boutons d’envoi sont désactivés pendant une écriture ou une analyse, les
  erreurs Firebase/API sont affichées avec une action Réessayer, et les erreurs React non récupérées présentent un
  écran de reprise.
- **Doublons et paiements** : Nivo ne déclenche aucun paiement externe ; il enregistre uniquement des opérations.
  Les écritures sont désactivées pendant leur traitement, les occurrences récurrentes utilisent un identifiant
  déterministe et les imports refusent les lignes déjà présentes.
- **Mémoire et fichiers** : les aperçus d’images libèrent leurs `ObjectURL`, les images bancaires sont redimensionnées
  et compressées dans le navigateur, les captures sont limitées à 8 Mo et les sauvegardes JSON à 10 Mo.
- **Sauvegardes** : une copie JSON automatique est téléchargée avant chaque restauration ; l’import est validé avant
  toute écriture et les données existantes sont remplacées seulement après confirmation.
- **Index Firestore** : les requêtes actuelles portent sur une collection utilisateur sans filtre composé ; Firestore
  crée donc les index simples automatiquement. Aucun index composite artificiel n’est ajouté tant qu’une requête ne le
  nécessite pas.
- **En-têtes et cache** : Vercel applique `nosniff`, une politique de référent stricte, l’interdiction d’iframe, une
  politique de permissions minimale, HSTS, le cache immutable des assets versionnés et `no-store` pour l’API.
- **Surveillance** : `.github/workflows/uptime.yml` vérifie les URLs Vercel et GitHub Pages toutes les 15 minutes.
  Les erreurs serveur et client sont structurées dans les logs Vercel sans enregistrer de capture bancaire ni de mot de
  passe.

La limite IA en mémoire protège chaque instance Vercel et absorbe les doubles clics ou abus courants. Pour une limite
globale stricte entre plusieurs instances, activez aussi les protections anti-abus/App Check Firebase et une règle WAF
ou un stockage de compteur partagé sur Vercel.

## Fonctionnement de la session

`AuthContext` observe Firebase avec `onAuthStateChanged` dès le lancement. Firebase conserve la session, puis l’application restaure automatiquement l’utilisateur après une actualisation.

- Sans utilisateur : redirection vers `#/login`.
- Avec utilisateur : redirection vers le dashboard.
- Toutes les pages financières sont enveloppées dans `ProtectedRoute`.
- La page de connexion est inaccessible lorsqu’une session est déjà active.

Le `#` est nécessaire pour conserver un routage fiable sur GitHub Pages. La route React reste `/login`.

Firebase Authentication gère entièrement le mot de passe. Le code ne l’enregistre ni dans Firestore, ni dans une variable d’environnement, ni dans `localStorage`. Le navigateur peut néanmoins proposer son propre gestionnaire de mots de passe, indépendamment de l’application.

## Installer Nivo comme une application

Le manifeste `public/manifest.webmanifest`, les icônes Nivo et `public/sw.js` rendent l’application installable. Le service worker met en cache l’interface et les assets afin que la coquille de l’application puisse s’ouvrir sans réseau ; les données Firebase et les opérations d’écriture nécessitent toujours une connexion pour rester synchronisées.

- Sur iPhone/iPad : ouvrir Nivo dans Safari, toucher **Partager**, puis **Sur l’écran d’accueil**.
- Sur Android : ouvrir Nivo dans Chrome, ouvrir le menu, puis choisir **Installer l’application** ou **Ajouter à l’écran d’accueil**.
- Sur ordinateur : utiliser l’icône d’installation dans la barre d’adresse de Chrome ou Edge.

## Publier sur GitHub Pages

1. Créer un dépôt GitHub et envoyer les fichiers du projet.
2. Dans **Settings → Pages → Source**, choisir **GitHub Actions**.
3. Pousser la branche `main`.

Le workflow `.github/workflows/deploy.yml` lance les contrôles et publie automatiquement le dossier `dist/`. Aucun secret Firebase n’est nécessaire pour la configuration Web publique.

## Vérifications

```sh
npm run lint
npm test
npm run build
```

## Sauvegarder et restaurer

La page **Réglages** permet d’exporter toutes les collections dans un fichier JSON. Pour restaurer une sauvegarde, sélectionner ce fichier, vérifier le nombre d’éléments affiché, puis confirmer. Le fichier est contrôlé avant tout envoi et les nouvelles données sont écrites avant la suppression des anciens éléments.

## Salaire mensuel automatique

Le bouton d’ajout rapide propose **Mon salaire mensuel**. Après avoir choisi le montant, le compte et la prochaine date de versement, Nivo crée automatiquement le revenu à chaque échéance mensuelle et avance la date suivante. Chaque occurrence possède un identifiant déterministe afin d’empêcher les doublons.

Le traitement s’exécute à l’ouverture de l’application. Si Nivo était fermé le jour du versement, les occurrences manquantes sont ajoutées lors de la prochaine connexion.

## Import bancaire avec Nivo IA

La page **Nivo IA** permet d’envoyer une capture d’écran d’un historique bancaire. L’image est préparée dans le navigateur, envoyée à une fonction Vercel protégée par la session Firebase, puis analysée par Gemini. Nivo rapproche les opérations détectées avec celles déjà présentes et les affiche pour validation avant tout enregistrement.

Une capture partielle ne supprime jamais une opération existante. Les opérations déjà présentes sont simplement signalées comme ignorées.

Pour activer l’analyse sur Vercel, ajouter ces variables privées au projet **nivo** :

```text
GEMINI_API_KEY=votre_cle_Gemini
FIREBASE_API_KEY=votre_cle_Web_Firebase
```

`GEMINI_MODEL` est facultative et vaut `gemini-3.5-flash-lite` par défaut. La clé Gemini ne doit jamais être préfixée par `VITE_`, car les variables `VITE_*` sont intégrées dans le JavaScript public. Les captures bancaires ne sont pas enregistrées par l’application après l’analyse.

## Architecture d’authentification

```text
src/contexts/AuthContext.tsx     # user, loading, login, createAccount, logout, resetPassword
src/components/ProtectedRoute.tsx
src/pages/Login.tsx
src/services/firebase.ts         # initialisation Firebase
src/services/database.ts         # accès Firestore sous auth.currentUser.uid
firestore.rules                  # isolation par UID
```

La clé API Firebase Web est publique par conception : elle identifie le projet mais n’accorde aucun accès aux documents. La protection effective repose sur Firebase Authentication et les règles Firestore publiées.

Chaque compte Firebase possède un UID différent. Les règles Firestore refusent toute lecture ou écriture si ce UID ne correspond pas au chemin `users/{uid}` ; un autre utilisateur ne peut donc pas consulter vos comptes, transactions ou réglages. Pour réduire les abus d’inscription, vous pouvez aussi activer les protections anti-abus Firebase et App Check depuis la console.
