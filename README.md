# Nivo Finance

Application web privée de gestion financière personnelle. React, Vite, TypeScript, Firebase Authentication et Cloud Firestore. Ce n’est pas une PWA : elle s’utilise directement dans un navigateur.

## Démarrer

```sh
npm install
npm run dev
```

La configuration publique de l’application Firebase `finances-f5c06` se trouve dans `src/services/firebase.ts`. Aucun e-mail, identifiant de connexion ou mot de passe n’est présent dans le projet.

## Créer l’unique utilisateur

Dans la [console Firebase](https://console.firebase.google.com/project/finances-f5c06) :

1. Ouvrir **Build → Authentication → Commencer**.
2. Activer le fournisseur **Adresse e-mail/Mot de passe**.
3. Ouvrir l’onglet **Users**, cliquer sur **Add user**, puis créer manuellement votre utilisateur.
4. Ne pas communiquer ce mot de passe et ne l’ajouter à aucun fichier du projet.

L’application ne contient aucune page d’inscription et n’appelle jamais `createUserWithEmailAndPassword`. Elle propose uniquement la connexion, la réinitialisation du mot de passe et la déconnexion.

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

## Fonctionnement de la session

`AuthContext` observe Firebase avec `onAuthStateChanged` dès le lancement. Firebase conserve la session, puis l’application restaure automatiquement l’utilisateur après une actualisation.

- Sans utilisateur : redirection vers `#/login`.
- Avec utilisateur : redirection vers le dashboard.
- Toutes les pages financières sont enveloppées dans `ProtectedRoute`.
- La page de connexion est inaccessible lorsqu’une session est déjà active.

Le `#` est nécessaire pour conserver un routage fiable sur GitHub Pages. La route React reste `/login`.

Firebase Authentication gère entièrement le mot de passe. Le code ne l’enregistre ni dans Firestore, ni dans une variable d’environnement, ni dans `localStorage`. Le navigateur peut néanmoins proposer son propre gestionnaire de mots de passe, indépendamment de l’application.

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

## Architecture d’authentification

```text
src/contexts/AuthContext.tsx     # user, loading, login, logout, resetPassword
src/components/ProtectedRoute.tsx
src/pages/Login.tsx
src/services/firebase.ts         # initialisation Firebase
src/services/database.ts         # accès Firestore sous auth.currentUser.uid
firestore.rules                  # isolation par UID
```

La clé API Firebase Web est publique par conception : elle identifie le projet mais n’accorde aucun accès aux documents. La protection effective repose sur Firebase Authentication et les règles Firestore publiées.

## Limite importante

Masquer la page d’inscription empêche l’inscription depuis l’interface, mais le fournisseur Firebase e-mail/mot de passe expose techniquement une API de création de comptes. Même si un tiers créait un autre compte par cette API, les règles par UID l’empêcheraient d’accéder à vos données. Pour interdire également toute création externe de compte, il faut ajouter ultérieurement une règle d’admission côté serveur, par exemple une fonction Firebase Authentication bloquante ou un contrôle par custom claim.
