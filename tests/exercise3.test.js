import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema.js';
import { resolvers } from '../src/resolvers.js';
import Product from '../src/models/Product.js';
import Customer from '../src/models/Customer.js';
import Order from '../src/models/Order.js';

test('Exercice 3 : clients, commandes et stocks sur MongoDB', async t => {
  assert.ok(process.env.MONGO_URI, 'MONGO_URI doit être configuré.');
  const server = new ApolloServer({ typeDefs, resolvers });
  const productIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
  const email = `tp-exo3-${new mongoose.Types.ObjectId()}@example.com`;
  let customerId;
  const createCustomer = `mutation($input: CustomerInput!) {
    createCustomer(input: $input) { id firstName email orders { id } }
  }`;
  const createOrder = `mutation($customerId: ID!, $items: [OrderItemInput!]!) {
    createOrder(customerId: $customerId, items: $items) {
      id status createdAt total customer { id }
      items { quantity product { id name price stock } }
    }
  }`;
  async function run(query, variables) {
    return (await server.executeOperation({ query, variables })).body.singleResult;
  }
  const item = (index, quantity) => ({ productId: productIds[index].toString(), quantity });
  const placeOrder = items => run(createOrder, { customerId, items });
  const stocks = async () => Promise.all(productIds.map(async id => (await Product.findById(id)).stock));

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await Promise.all([Customer.init(), Order.init()]);
    await Product.create([
      { _id: productIds[0], name: 'Test exo3 A', price: 10, stock: 5 },
      { _id: productIds[1], name: 'Test exo3 B', price: 25, stock: 1 },
    ]);

    await t.test('client créé, email unique et normalisé', async () => {
      const input = { firstName: 'Alice', lastName: 'Test', email, address: '10 rue du TP' };
      const result = await run(createCustomer, { input });
      assert.equal(result.errors, undefined);
      customerId = result.data.createCustomer.id;
      assert.deepEqual(result.data.createCustomer.orders, []);
      const duplicate = await run(createCustomer, { input: { ...input, email: email.toUpperCase() } });
      assert.equal(duplicate.errors[0].extensions.code, 'BAD_USER_INPUT');
    });

    await t.test('commande refusée : aucun stock ni commande modifiés', async () => {
      for (const items of [[], [item(0, 0)], [item(0, -1)], [item(0, 1), item(1, 2)], [item(0, 3), item(0, 3)]]) {
        const result = await placeOrder(items);
        assert.equal(result.errors[0].extensions.code, 'BAD_USER_INPUT');
        assert.deepEqual(await stocks(), [5, 1]);
        assert.equal(await Order.countDocuments({ customer: customerId }), 0);
      }
      for (const id of ['abc', new mongoose.Types.ObjectId().toString()]) {
        const missingProduct = await placeOrder([item(0, 1), { productId: id, quantity: 1 }]);
        assert.equal(missingProduct.errors[0].extensions.code, id === 'abc' ? 'BAD_USER_INPUT' : 'NOT_FOUND');
        const missingCustomer = await run(createOrder, { customerId: id, items: [item(0, 1)] });
        assert.equal(missingCustomer.errors[0].extensions.code, id === 'abc' ? 'BAD_USER_INPUT' : 'NOT_FOUND');
      }
      assert.deepEqual(await stocks(), [5, 1]);
      assert.equal(await Order.countDocuments({ customer: customerId }), 0);
    });

    await t.test('échec de sauvegarde : les décréments sont annulés', async () => {
      const stub = t.mock.method(Order, 'create', async () => { throw new Error('Échec de sauvegarde simulé'); });
      try {
        assert.ok((await placeOrder([item(0, 1)])).errors);
        assert.deepEqual(await stocks(), [5, 1]);
        assert.equal(await Order.countDocuments({ customer: customerId }), 0);
      } finally {
        stub.mock.restore();
      }
    });

    await t.test('commande valide, produits répétés, total et relations imbriquées', async () => {
      const result = await placeOrder([item(0, 1), item(0, 1), item(1, 1)]);
      assert.equal(result.errors, undefined);
      const order = result.data.createOrder;
      assert.equal(order.total, 45);
      assert.equal(order.status, 'PENDING');
      assert.equal(order.customer.id, customerId);
      assert.equal(order.createdAt, new Date(order.createdAt).toISOString());
      assert.equal(order.items.length, 2);
      assert.equal(order.items[0].quantity, 2);
      assert.deepEqual(await stocks(), [3, 0]);
      const nested = await run(`query($id: ID!) {
        customer(id: $id) { firstName orders { total items { quantity product { name price } } } }
      }`, { id: customerId });
      assert.equal(nested.errors, undefined);
      assert.equal(nested.data.customer.firstName, 'Alice');
      assert.equal(nested.data.customer.orders[0].total, 45);
    });

    await t.test('deux commandes concurrentes ne peuvent pas dépasser le stock', async () => {
      const results = await Promise.all([placeOrder([item(0, 3)]), placeOrder([item(0, 3)])]);
      assert.equal(results.filter(result => !result.errors).length, 1);
      assert.equal(results.filter(result => result.errors?.[0].extensions.code === 'BAD_USER_INPUT').length, 1);
      assert.deepEqual(await stocks(), [0, 0]);
      assert.equal(await Order.countDocuments({ customer: customerId }), 2);
    });
  } finally {
    if (mongoose.connection.readyState === 1) {
      // Supprimer uniquement les données créées par cette exécution.
      if (customerId) await Order.deleteMany({ customer: customerId });
      await Customer.deleteMany({ email });
      await Product.deleteMany({ _id: { $in: productIds } });
    }
    await server.stop();
    await mongoose.disconnect();
  }
});
