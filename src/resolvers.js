import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Order from './models/Order.js';
import mongoose from 'mongoose';
import { GraphQLError } from 'graphql';

function validateId(id, entity = 'produit') {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new GraphQLError(`Identifiant de ${entity} invalide.`, {
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
    customer: (_, { id }) => {
      validateId(id, 'client');
      return Customer.findById(id).exec();
    },
  },
  Mutation: {
    createCustomer: async (_, { input }) => {
      if (!input.firstName.trim() || !input.lastName.trim() || !input.email.trim()) {
        throw new GraphQLError('Le prénom, le nom et l’email sont obligatoires.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      try {
        return await Customer.create(input);
      } catch (error) {
        if (error.code === 11000) {
          throw new GraphQLError('Un client utilise déjà cet email.', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        throw error;
      }
    },
    createOrder: async (_, { customerId, items }) => {
      validateId(customerId, 'client');
      if (items.length === 0) {
        throw new GraphQLError('La commande doit contenir au moins un produit.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Regrouper les doublons pour vérifier la quantité totale de chaque produit.
      const quantities = new Map();
      for (const item of items) {
        validateId(item.productId);
        if (item.quantity <= 0) {
          throw new GraphQLError('La quantité doit être strictement positive.', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        const id = item.productId.toLowerCase();
        quantities.set(id, (quantities.get(id) ?? 0) + item.quantity);
        if (quantities.get(id) > 2147483647) {
          throw new GraphQLError('La quantité totale dépasse la limite GraphQL Int.', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      // Atlas prend en charge les transactions : stocks et commande sont validés ensemble.
      const order = await mongoose.connection.transaction(async session => {
        const customer = await Customer.findById(customerId).session(session).exec();
        if (!customer) {
          throw new GraphQLError('Client introuvable.', { extensions: { code: 'NOT_FOUND' } });
        }

        const orderItems = [];
        for (const [productId, quantity] of quantities) {
          const product = requireProduct(await Product.findById(productId).session(session).exec());
          if (product.stock < quantity) {
            throw new GraphQLError(`Stock insuffisant pour le produit « ${product.name} ».`, {
              extensions: { code: 'BAD_USER_INPUT' },
            });
          }
          orderItems.push({ product: product._id, quantity });
        }

        for (const item of orderItems) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { stock: -item.quantity } },
            { session },
          ).exec();
        }
        const [created] = await Order.create([{ customer: customer._id, items: orderItems }], { session });
        return created;
      });
      order.$session(null);
      return order;
    },
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
  Customer: {
    orders: customer => Order.find({ customer: customer._id }).exec(),
  },
  Order: {
    customer: order => Customer.findById(order.customer).exec(),
    total: async order => {
      const products = await Product.find({ _id: { $in: order.items.map(item => item.product) } }).exec();
      const byId = new Map(products.map(product => [product.id, product]));
      return order.items.reduce((total, item) => {
        const product = requireProduct(byId.get(item.product.toString()));
        return total + product.price * item.quantity;
      }, 0);
    },
    createdAt: order => order.createdAt.toISOString(),
  },
  OrderItem: {
    product: item => Product.findById(item.product).exec(),
  },
};
