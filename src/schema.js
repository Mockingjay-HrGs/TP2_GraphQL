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

  type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product
    deleteProduct(id: ID!): Boolean!
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
  }
`;
