import 'dotenv/config';
import mongoose from 'mongoose';
import Product from './models/Product.js';

const products = [
  { name: 'Clavier mécanique', description: 'Clavier USB rétroéclairé.', price: 89.9, stock: 15, category: 'informatique' },
  { name: 'Souris sans fil', description: 'Souris ergonomique Bluetooth.', price: 29.9, stock: 30, category: 'informatique' },
  { name: 'Écran 24 pouces', description: 'Écran Full HD pour le bureau.', price: 179, stock: 8, category: 'informatique' },
  { name: 'Casque audio', description: 'Casque avec microphone intégré.', price: 59.9, stock: 0, category: 'informatique' },
  { name: 'Lampe de bureau', description: 'Lampe LED orientable.', price: 34.9, stock: 12, category: 'maison' },
  { name: 'Bouilloire', description: 'Bouilloire électrique de 1,7 litre.', price: 44.9, stock: 10, category: 'maison' },
  { name: 'Coussin', description: 'Coussin en coton pour canapé.', price: 19.9, stock: 25, category: 'maison' },
  { name: 'Tapis de yoga', description: 'Tapis antidérapant de 6 mm.', price: 24.9, stock: 20, category: 'sport' },
  { name: 'Ballon de football', description: 'Ballon taille 5.', price: 22, stock: 18, category: 'sport' },
  { name: 'Corde à sauter', description: 'Corde réglable pour entraînement.', price: 12.5, stock: 35, category: 'sport' },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI manquant : renseignez le fichier .env.');
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    // Une relance conserve les produits existants et leurs modifications.
    for (const product of products) {
      await Product.updateOne(
        { name: product.name },
        { $setOnInsert: product },
        { upsert: true, runValidators: true },
      );
    }
    console.log('Seed terminé : les 10 produits de test sont disponibles.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Erreur pendant le seed :', error.message);
  process.exitCode = 1;
});
