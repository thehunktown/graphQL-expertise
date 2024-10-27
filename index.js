import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import axios from 'axios';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import Redis from 'redis';
import { Kafka } from 'kafkajs';
import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

// Database and service connections
const postgresPool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

const mongoClient = new MongoClient(process.env.MONGO_URI);

const redisClient = Redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER] });
const kafkaProducer = kafka.producer();

let rabbitChannel;
(async () => {
  const rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL);
  rabbitChannel = await rabbitConnection.createChannel();
})();

// GraphQL Schema
const typeDefs = `
type User {
    id: ID!
    name: String!
    username: String!
    email: String!
    phone: String!
    website: String!
}

type Trip {
    id: ID!
    destination: String!
    startDate: String!
    endDate: String!
}

type Query {
    getAllUsers: [User]
    getUser(id: ID!): User
    getAllTrips: [Trip]
    getTrip(id: ID!): Trip
}

type Mutation {
    addUser(name: String!, username: String!, email: String!, phone: String!, website: String!): User
    updateUser(id: ID!, name: String, email: String, phone: String, website: String): User
    deleteUser(id: ID!): String
    addTrip(destination: String!, startDate: String!, endDate: String!): Trip
    updateTrip(id: ID!, destination: String, startDate: String, endDate: String): Trip
    deleteTrip(id: ID!): String
}
`;

// Resolvers
/*
A resolver is a function that resolves a value for a field in your GraphQL schema.
Each field in a query, mutation, or subscription can have its own resolver.
Resolvers take the following parameters:
parent: The result of the previous resolver, allowing nested queries.
args: An object containing the arguments passed to the field.
context: A context object shared across all resolvers for a particular query, often used for authentication or database connections.
info: Information about the execution state of the query.
*/
const resolvers = {
  Query: {
    getAllUsers: async () => {
      const result = await postgresPool.query('SELECT * FROM users');
      return result.rows;
    },
    getUser: async (_, { id }) => {
      const result = await postgresPool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    },
    getAllTrips: async () => {
      const collection = mongoClient.db('travel').collection('trips');
      return await collection.find().toArray();
    },
    getTrip: async (_, { id }) => {
      const collection = mongoClient.db('travel').collection('trips');
      return await collection.findOne({ id });
    },
  },
  
  // a mutation is a type of operation used to modify data on the server. 
  Mutation: {
    addUser: async (_, { name, username, email, phone, website }) => {
      const result = await postgresPool.query(
        'INSERT INTO users (name, username, email, phone, website) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, username, email, phone, website]
      );
      await redisClient.set(`user:${result.rows[0].id}`, JSON.stringify(result.rows[0]));
      return result.rows[0];
    },
    updateUser: async (_, { id, name, email, phone, website }) => {
      const result = await postgresPool.query(
        'UPDATE users SET name = $1, email = $2, phone = $3, website = $4 WHERE id = $5 RETURNING *',
        [name, email, phone, website, id]
      );
      await redisClient.set(`user:${id}`, JSON.stringify(result.rows[0]));
      return result.rows[0];
    },
    deleteUser: async (_, { id }) => {
      await postgresPool.query('DELETE FROM users WHERE id = $1', [id]);
      await redisClient.del(`user:${id}`);
      return `User with ID ${id} deleted successfully`;
    },
    addTrip: async (_, { destination, startDate, endDate }) => {
      const collection = mongoClient.db('travel').collection('trips');
      const result = await collection.insertOne({ destination, startDate, endDate });
      await kafkaProducer.send({
        topic: 'trips',
        messages: [{ value: JSON.stringify(result.ops[0]) }],
      });
      return result.ops[0];
    },
    updateTrip: async (_, { id, destination, startDate, endDate }) => {
      const collection = mongoClient.db('travel').collection('trips');
      await collection.updateOne(
        { id },
        { $set: { destination, startDate, endDate } }
      );
      return await collection.findOne({ id });
    },
    deleteTrip: async (_, { id }) => {
      const collection = mongoClient.db('travel').collection('trips');
      await collection.deleteOne({ id });
      return `Trip with ID ${id} deleted successfully`;
    },
  },
};

// Start Server
async function startServer() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  app.use('/graphql', expressMiddleware(server));

  app.listen(8000, () => {
    console.log('🚀 Server started at http://localhost:8000/graphql');
  });
}

startServer();
