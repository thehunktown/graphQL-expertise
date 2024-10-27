# GraphQL User Management System

## Overview

This project demonstrates a simple User Management System using GraphQL. It allows fetching, creating, and updating user data with the use of queries and mutations.

## Definitions

### Query
- **Definition**: A query is a request to fetch data from the server. It does not modify any data.
- **Use Case**: Use queries when you want to retrieve information, such as a list of users or a specific user by their ID.
- **Example**:
  ```graphql
  query {
    getUser(id: "1") {
      name
      email
    }
  }
  ```
  This query fetches the name and email of the user with ID "1".

### Mutation
- **Definition**: A mutation is a request to modify data on the server. It can create, update, or delete data.
- **Use Case**: Use mutations when you want to change information, such as adding a new user or updating an existing user's details.
- **Example**:
  ```graphql
  mutation {
    updateUser(id: "1", input: { name: "John Doe", city: "New York" }) {
      id
      name
    }
  }
  ```
  This mutation updates the user with ID "1" and sets their name to "John Doe".

### Resolver
- **Definition**: A resolver is a function that processes a query or mutation and returns the corresponding data. It retrieves or modifies data as specified by the query or mutation.
- **Use Case**: Resolvers are used to implement the logic behind each query or mutation, such as fetching data from a database or performing calculations.
- **Example**:
  ```javascript
  const resolvers = {
    Query: {
      getUser: async (parent, { id }) => {
        // Fetch user from the database based on ID
        return await User.findById(id);
      },
    },
    Mutation: {
      updateUser: async (parent, { id, input }) => {
        // Update user in the database
        return await User.findByIdAndUpdate(id, input, { new: true });
      },
    },
  };
  ```

## Case Study: User Management System

Let's consider a User Management System where we can perform various operations on user data. We'll cover:

- Fetching users based on conditions (e.g., by city)
- Updating user information
- Nested queries to fetch related data (e.g., user trips)
- Conditional updates based on specific criteria

### GraphQL Schema
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  city: String!
  trips: [Trip]
}

type Trip {
  id: ID!
  destination: String!
  userId: ID!
}

input UserInput {
  name: String
  email: String
  city: String
}

type Query {
  getAllUsers: [User]
  getUsersByCity(city: String!): [User]
  getUser(id: ID!): User
}

type Mutation {
  addUser(input: UserInput!): User
  updateUser(id: ID!, input: UserInput!): User
}
```

### Resolvers
```javascript
const resolvers = {
  Query: {
    getAllUsers: async () => {
      // Fetch all users from the database
      return await User.find({});
    },
    getUsersByCity: async (parent, { city }) => {
      // Fetch users based on the city parameter
      return await User.find({ city });
    },
    getUser: async (parent, { id }) => {
      // Fetch a single user by ID
      return await User.findById(id);
    },
  },
  Mutation: {
    addUser: async (parent, { input }) => {
      // Add a new user to the database
      const user = new User(input);
      return await user.save();
    },
    updateUser: async (parent, { id, input }) => {
      // Update user information based on ID
      return await User.findByIdAndUpdate(id, input, { new: true });
    },
  },
};
```

### Use Cases with Examples

- **Non-Parameter Based Query**: Fetch all users.
  ```graphql
  query {
    getAllUsers {
      id
      name
      email
    }
  }
  ```

- **Parameter Based Query**: Fetch users from a specific city.
  ```graphql
  query {
    getUsersByCity(city: "New York") {
      id
      name
      city
    }
  }
  ```

- **Conditional Fetching**: If you want to fetch users only if they belong to a specific city:
  - The `getUsersByCity` resolver handles this conditionally by querying the database with the provided city parameter.

- **Non-Parameter Based Mutation**: Add a new user.
  ```graphql
  mutation {
    addUser(input: { name: "Alice", email: "alice@example.com", city: "Los Angeles" }) {
      id
      name
    }
  }
  ```

- **Parameter Based Mutation**: Update a user's information.
  ```graphql
  mutation {
    updateUser(id: "1", input: { name: "Alice Smith", city: "San Francisco" }) {
      id
      name
    }
  }
  ```

### Nested Queries and Updates

- **Nested Queries**: Fetch a user and their trips.
  ```graphql
  query {
    getUser(id: "1") {
      name
      trips {
        id
        destination
      }
    }
  }
  ```

- **Conditional Update**: Update a user only if they live in a specific city.
  ```javascript
  const resolvers = {
    Mutation: {
      updateUser: async (parent, { id, input }) => {
        const user = await User.findById(id);
        if (user.city === "New York") {
          return await User.findByIdAndUpdate(id, input, { new: true });
        }
        throw new Error("User not in New York, cannot update.");
      },
    },
  };
  ```

## Summary
- **Queries**: Used to fetch data (either all or filtered by parameters).
- **Mutations**: Used to modify data (create or update) with or without parameters.
- **Resolvers**: Implement the logic to handle queries and mutations.
- **Parameter and Conditional Operations**: Utilize arguments to filter data and enforce conditions during data retrieval or updates.
- **Nested Queries**: Allow fetching related data (e.g., user trips) within a single query.
