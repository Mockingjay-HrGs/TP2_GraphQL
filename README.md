# Boutique GraphQL - TP site marchand

Les exercices 1 et 2 sont implémentés : lecture et gestion du catalogue avec Apollo Server et Mongoose.
Prérequis : Node.js 20 ou supérieur et une base MongoDB locale ou Atlas accessible.

LIEN DU TP : https://docs.google.com/document/d/1XFo0BCYP4qvR0oiZPUKYehg33EVeF9xKScW9CKtic0w/edit?tab=t.0#heading=h.qqxgpg5s9y6o

## Demarrage (3 etapes)

1. Installez les dependances :
   ```bash
   npm install
   ```

2. Copiez `.env.example` vers `.env` (`cp .env.example .env`), puis renseignez `MONGO_URI` avec votre chaine de
   connexion MongoDB (locale ou MongoDB Atlas) :
   ```
   MONGO_URI=mongodb://localhost:27017/boutique
   ```

3. Remplissez la base avec les 10 produits de test, puis lancez le serveur :
   ```bash
   npm run seed
   npm start
   ```

Ouvrez ensuite http://localhost:4000 : l'interface Apollo Sandbox doit s'afficher, et la
console doit afficher "Connexion a MongoDB etablie." et "Serveur GraphQL pret : ...".

## Fichiers du projet

- `src/index.js` : connexion MongoDB et démarrage d’Apollo Server.
- `src/models/Product.js` : modèle Mongoose des produits.
- `src/schema.js` : type Product, input ProductInput, queries et mutations.
- `src/resolvers.js` : lectures, mutations et validation des produits.
- `src/seed.js` : 10 produits répartis entre informatique, maison et sport.

Le seed ajoute les produits absents en les recherchant par nom. Une relance ne supprime
aucune donnée et ne modifie pas les produits déjà présents.

## Exercice 1 : requêtes dans Apollo Sandbox

Liste avec uniquement le nom et le prix :

```graphql
query {
  products {
    name
    price
  }
}
```

Pour récupérer un identifiant réel, exécutez `{ products { id name } }`, puis remplacez
`ID_DU_PRODUIT` dans la requête suivante :

```graphql
query {
  product(id: "ID_DU_PRODUIT") {
    id
    name
    description
    price
    stock
    category
  }
}
```

Recherche avec un identifiant au format ObjectId valide, mais absent de la base :

```graphql
query {
  product(id: "000000000000000000000000") {
    id
    name
  }
}
```

Résultat attendu si cet identifiant n’existe pas :

```json
{ "data": { "product": null } }
```

**Observation :** findById renvoie null si aucun document ne correspond. Le champ
`product` est nullable dans le schéma, donc GraphQL accepte cette réponse sans erreur.
Dans la query `product`, un identifiant mal formé (par exemple `abc`) provoque une erreur de
conversion Mongoose. La sélection GraphQL détermine les champs retournés au client.

**Vérifications réalisées :** validations obligatoires et valeurs par défaut du modèle,
exécution Apollo des requêtes de liste, de détail et de produit absent avec les accès
MongoDB simulés. La syntaxe du script de seed a également été vérifiée.
Vérification sur MongoDB Atlas effectuée : seed de 10 produits dans `boutique`, puis
exécution des requêtes GraphQL de liste, de détail et de produit absent via Apollo Server.
Les trois cas passent. Les mêmes requêtes peuvent être exécutées dans Apollo Sandbox.
Les resolvers utilisent `.exec()` pour retourner une Promise et éviter une double
exécution des requêtes Mongoose.

## Exercice 2 : gérer le catalogue

Exécutez les mutations une par une dans Apollo Sandbox. Si nécessaire, redémarrez
le serveur avec `npm start`.

### 1. Créer un produit

```graphql
mutation {
  createProduct(input: {
    name: "Produit test exercice 2"
    description: "Produit temporaire pour tester les mutations."
    price: 25
    stock: 5
    category: "sport"
  }) {
    id
    name
    price
    stock
  }
}
```

Résultat attendu : `data.createProduct` contient le nouveau produit avec un prix de
25 et un stock de 5. **Copiez son `id` : remplacez `ID_COPIE` dans les mutations
suivantes par cet identifiant réel, en gardant les guillemets.**
Vérifiez sa présence avec `{ products { id name price } }`.
Si le stock est omis à la création, il vaut 0.

### 2. Modifier son prix

```graphql
mutation {
  updateProduct(id: "ID_COPIE", input: {
    name: "Produit test exercice 2"
    price: 30
  }) {
    id
    name
    price
    stock
  }
}
```

Résultat attendu : `data.updateProduct` contient le même identifiant, le nouveau prix
30 et le stock inchangé à 5. L’option `{ new: true }` renvoie le document après
modification. Les champs optionnels omis conservent leur valeur.

**Pourquoi fournir le nom ?** Le TP utilise le même `ProductInput` pour la création
et la modification : `name` et `price` sont donc obligatoires dans les deux mutations.

### 3. Refuser un prix négatif

```graphql
mutation {
  createProduct(input: {
    name: "Produit invalide"
    price: -10
  }) {
    id
  }
}
```

Résultat attendu : `errors` contient le message « Le prix doit être strictement
positif. » et `extensions.code: "BAD_USER_INPUT"`. Aucun produit n’est créé.
Comme `createProduct` est non nullable, la réponse contient `data: null`.
Le prix 0 est également refusé. Pour vérifier le stock, utilisez un prix valide
et ajoutez `stock: -1` : la mutation doit aussi être refusée.
Un stock explicitement `null` est refusé ; omettez-le pour utiliser la valeur par défaut.

### 4. Supprimer le produit créé

```graphql
mutation {
  deleteProduct(id: "ID_COPIE")
}
```

Résultat attendu :

```json
{ "data": { "deleteProduct": true } }
```

Vérifiez que ce produit a disparu de la liste. Exécutez à nouveau la suppression
avec le même identifiant : vous obtenez « Produit introuvable. » avec le code
`NOT_FOUND`. Une modification de ce produit supprimé renvoie la même erreur.
Les mutations refusent aussi les identifiants mal formés avec `BAD_USER_INPUT`.
La query de lecture `product` continue de renvoyer `null` pour un identifiant valide absent.

**Vérifications réalisées sur Atlas :** création et présence dans la liste, stock par
défaut, modification du prix, refus des prix négatifs ou nuls, des stocks négatifs
ou null, des identifiants mal formés et des produits absents, puis suppression.
Les validations ont été vérifiées en création et en modification ; une modification
refusée conserve le prix précédent. Le produit temporaire de test a été supprimé.

## Suivi Git

Le TP demande au moins un commit par exercice. Le dossier fourni ne contient pas de
dépôt Git à ce stade. Après initialisation du dépôt et validation de l’exercice 1,
le message prévu est `exo1 catalogue produits`.

## Prochaine étape

Exercice 3 : clients, commandes et relations entre les types GraphQL.
