export const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    stock: Int!
    category: String
  }

  input ProductInput {
    name: String!
    description: String
    price: Float!
    stock: Int
    category: String
  }

  type Customer {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    address: String
    orders: [Order!]!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
  }

  type Order {
    id: ID!
    customer: Customer!
    items: [OrderItem!]!
    total: Float!
    status: String!
    createdAt: String!
  }

  input CustomerInput {
    firstName: String!
    lastName: String!
    email: String!
    address: String
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product
    deleteProduct(id: ID!): Boolean!
    createCustomer(input: CustomerInput!): Customer!
    createOrder(customerId: ID!, items: [OrderItemInput!]!): Order!
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
    customer(id: ID!): Customer
  }
`;
