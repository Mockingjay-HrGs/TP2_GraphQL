# Modèles Mongoose

- `Product.js` : catalogue, prix strictement positif et stock non négatif.
- `Customer.js` : prénom, nom, email unique normalisé et adresse.
- `Order.js` : référence client, lignes produit/quantité, statut PENDING par défaut
  et date de création. Les quantités sont des entiers strictement positifs.

La création d’une commande et les décréments de stock utilisent une transaction
MongoDB (Atlas ou replica set local).
