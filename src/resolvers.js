import Product from './models/Product.js';
import mongoose from 'mongoose';
import { GraphQLError } from 'graphql';

function validateId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new GraphQLError('Identifiant de produit invalide.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function validateProduct(input) {
  if (!input.name.trim()) {
    throw new GraphQLError('Le nom du produit est obligatoire.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (input.price <= 0) {
    throw new GraphQLError('Le prix doit être strictement positif.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (input.stock === null || (input.stock !== undefined && input.stock < 0)) {
    throw new GraphQLError('Le stock doit être un entier positif ou nul.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

function requireProduct(product) {
  if (!product) {
    throw new GraphQLError('Produit introuvable.', {
      extensions: { code: 'NOT_FOUND' },
    });
  }
  return product;
}

export const resolvers = {
  Query: {
    products: () => Product.find().exec(),
    product: (_, { id }) => Product.findById(id).exec(),
  },
  Mutation: {
    createProduct: async (_, { input }) => {
      validateProduct(input);
      return Product.create(input);
    },
    updateProduct: async (_, { id, input }) => {
      validateId(id);
      validateProduct(input);
      const product = await Product.findByIdAndUpdate(id, { $set: input }, {
        new: true,
        runValidators: true,
      }).exec();
      return requireProduct(product);
    },
    deleteProduct: async (_, { id }) => {
      validateId(id);
      const product = await Product.findByIdAndDelete(id).exec();
      requireProduct(product);
      return true;
    },
  },
};
