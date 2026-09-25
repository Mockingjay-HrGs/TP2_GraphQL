# Boutique GraphQL - TP site marchand

Les exercices 1 à 3 sont implémentés : catalogue, clients et commandes avec Apollo Server et Mongoose.
Prérequis : Node.js 20 ou supérieur et MongoDB Atlas (utilisé pour ce TP).
Pour une base locale, un replica set est nécessaire aux transactions de l’exercice 3.

LIEN DU TP : https://docs.google.com/document/d/1XFo0BCYP4qvR0oiZPUKYehg33EVeF9xKScW9CKtic0w/edit?tab=t.0#heading=h.qqxgpg5s9y6o

## Demarrage (3 etapes)

1. Installez les dependances :
   ```bash
   npm install
   ```

2. Si `.env` n’existe pas encore, copiez `.env.example` vers `.env` (`cp .env.example .env`). Renseignez `MONGO_URI` avec votre chaine de
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
- `src/models/Customer.js` : clients avec email unique.
- `src/models/Order.js` : commandes et références vers les clients et produits.
- `src/schema.js` : types, inputs, queries et mutations GraphQL.
- `src/resolvers.js` : lectures, mutations, validations et relations entre les types.
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

## Exercice 3 : clients et commandes

### 1. Créer un client

```graphql
mutation {
  createCustomer(input: {
    firstName: "Alice"
    lastName: "Martin"
    email: "alice.martin@example.com"
    address: "10 rue des Lilas, Paris"
  }) {
    id
    firstName
    lastName
    email
    orders { id }
  }
}
```

Résultat attendu : le client créé et `orders: []`. **Copiez son `id` pour remplacer
`ID_CLIENT` dans les requêtes suivantes.** Une deuxième création avec le même email
est refusée avec `BAD_USER_INPUT`. Les emails sont enregistrés en minuscules et
un index MongoDB garantit leur unicité.

### 2. Choisir un produit disponible

```graphql
query {
  products {
    id
    name
    price
    stock
  }
}
```

Choisissez un produit avec un stock d’au moins 2 et copiez son identifiant pour
remplacer `ID_PRODUIT`. Notez son prix et son stock avant la commande.
Tous les textes `ID_CLIENT` et `ID_PRODUIT` ci-dessous doivent être remplacés par
les identifiants réels, en gardant les guillemets.

### 3. Passer une commande

```graphql
mutation {
  createOrder(
    customerId: "ID_CLIENT"
    items: [{ productId: "ID_PRODUIT", quantity: 2 }]
  ) {
    id
    status
    createdAt
    total
    customer { firstName lastName }
    items {
      quantity
      product { name price stock }
    }
  }
}
```

Résultat attendu : une commande au statut `PENDING`, une date au format ISO,
une quantité de 2 et un total égal à `prix × 2`. Le stock du produit diminue de 2.
Par exemple, deux claviers à 89,90 donnent un total de 179,80.
Chaque exécution réussie crée une nouvelle commande et diminue le stock.

### 4. Lire les commandes du client (requête imbriquée du TP)

```graphql
query {
  customer(id: "ID_CLIENT") {
    firstName
    orders {
      total
      items {
        quantity
        product { name price }
      }
    }
  }
}
```

Résultat attendu : le prénom du client et sa liste de commandes, avec les produits
et le total calculé de chacune. Un identifiant client valide mais absent renvoie
`customer: null`.

### 5. Vérifier le refus d’une commande

Reprenez la mutation `createOrder` avec une quantité **supérieure au stock actuel**.
Vous devez obtenir « Stock insuffisant pour le produit … » avec `BAD_USER_INPUT`.
Relisez le stock et les commandes : ils doivent être inchangés.

Testez également une commande avec deux produits, dont un seul en quantité
insuffisante : toute la commande est refusée. Une liste vide, une quantité nulle
ou négative et un identifiant mal formé sont refusés. Un client ou un produit
absent provoque une erreur `NOT_FOUND`.

**Fonctionnement :** les resolvers `Order.customer`, `OrderItem.product` et
`Customer.orders` suivent les références MongoDB. `Order.total` additionne les
prix multipliés par les quantités. Les lignes portant sur un même produit sont
regroupées avant de contrôler le stock. Une transaction enregistre tous les
décréments et la commande ensemble ; un échec annule les modifications.

**Limite du modèle demandé par le TP :** le total utilise le prix actuel du catalogue,
pas un prix mémorisé lors de l’achat. Modifier ce prix change donc le total calculé
des anciennes commandes. Supprimer un produit référencé rend les champs de commande
correspondants impossibles à résoudre ; conservez les produits utilisés par vos commandes.

### Vérifications automatiques

```bash
npm run test:exercise3
```

Ce test utilise la base configurée dans `.env`. Il crée ses propres produits et
clients temporaires, puis les supprime avec leurs commandes.
Vérifications passées sur Atlas : email unique, relations imbriquées, calcul du total,
statut et date, quantité cumulée des produits répétés, refus sans modification des
stocks, annulation après un échec de sauvegarde et deux commandes concurrentes
sur le même stock. Les données existantes sont conservées.

## Suivi Git

Le TP demande au moins un commit par exercice. Le dépôt est maintenant initialisé.
Les exercices 1 et 2 figurent dans le commit `a97b64d` (`Exercice 1 et 2`).
L’exercice 3 doit faire l’objet d’un commit dédié : `exo3 clients et commandes`.

## Prochaine étape

Exercice 4 : recherche, filtres, tri et pagination des produits.
