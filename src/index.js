import 'dotenv/config';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import Customer from './models/Customer.js';

const { MONGO_URI, PORT = 4000 } = process.env;

if (!MONGO_URI) {
  console.error(
    "MONGO_URI manquant : ouvrez le fichier .env a la racine du projet et renseignez votre chaine de connexion MongoDB."
  );
  process.exit(1);
}

async function start() {
  await mongoose.connect(MONGO_URI);
  await Customer.init();
  console.log('Connexion a MongoDB etablie.');

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(PORT) },
  });

  console.log(`Serveur GraphQL pret : ${url}`);
}

start().catch((err) => {
  console.error('Erreur au demarrage du serveur :', err.message);
  process.exit(1);
});
