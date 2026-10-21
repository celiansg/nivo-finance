# Nivo 2.0 — socle produit

Cette première phase transforme les données déjà présentes dans Firebase en un espace de pilotage exploitable, sans modifier le modèle de sécurité existant.

## Fonctionnalités livrées

- `/gerer-mon-argent` rassemble le disponible à dépenser, les charges fixes, les dépenses variables, l’épargne planifiée, les abonnements et les objectifs.
- Les récurrences sont détectées localement à partir des dépenses des douze derniers mois. Le moteur compare les libellés normalisés, les intervalles calendaires et la stabilité du montant.
- Une détection reste une proposition. Une confirmation crée un document `subscriptions` sous le compte Firebase courant ; ignorer une proposition ne supprime aucune opération.
- Les scénarios d’épargne sont en lecture seule. Ils affichent la faisabilité et l’impact annuel sans écrire dans Firestore.
- `/assistant` conserve l’import de captures bancaires et propose désormais une conversation locale déterministe. Les réponses affichent leurs sources et ne peuvent pas modifier les données.
- La navigation principale est réduite à Accueil, Transactions, Gérer mon argent et Assistant. Les pages spécialisées restent accessibles dans « Plus ».

## Limites assumées et prochaines intégrations

- Une détection locale ne remplace pas une validation bancaire : une facture, un loyer ou un restaurant récurrent est volontairement exclu des suggestions d’abonnement.
- La connexion Gmail est affichée comme future fonctionnalité. Elle devra passer par OAuth, avec un scope minimal, un écran de consentement, une révocation et une suppression des données importées. Une adresse e-mail seule ne donne aucun accès.
- Une future conversation générative devra passer par une fonction serveur authentifiée avec la clé Gemini côté serveur. Le moteur déterministe reste la source des calculs ; le modèle ne pourra jamais écrire sans confirmation.
- L’Open Banking reste hors périmètre tant qu’aucun fournisseur AISP/PSD2 et aucune validation juridique ne sont choisis.

## Vérifications

Les tests déterministes couvrent la détection d’une récurrence, l’exclusion des dépenses non assimilées aux abonnements, le calcul du disponible et une simulation d’épargne. Les commandes à rejouer avant déploiement sont `npm test`, `npm run lint` et `npm run build`.
