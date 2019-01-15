import { ApolloServer, gql, makeExecutableSchema } from 'apollo-server-express';
import { WebApp } from 'meteor/webapp';
import { getUser } from 'meteor/apollo';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import typeDefs from '../../imports/api/schema.graphql';
import resolvers from './resolvers.js';

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer({
  schema,
  context: async ({ req }) => ({
    user: await getUser(req.headers.authorization)
  }),
});

server.applyMiddleware({
  app: WebApp.connectHandlers,
  path: '/api/graphql'
});

WebApp.connectHandlers.use('/api/graphql', (req, res) => {
  if (req.method === 'GET') {
    res.end();
  }
});

new SubscriptionServer({
  execute,
  subscribe,
  schema,
  onConnect: async (connectionParams, webSocket) => {
    if(connectionParams.authorization){
      return { user: await getUser(connectionParams.authorization) };
    }
    throw new Error('Missing auth token!');
  },
}, {
  server: WebApp.httpServer,
  path: '/api/subscriptions'
});