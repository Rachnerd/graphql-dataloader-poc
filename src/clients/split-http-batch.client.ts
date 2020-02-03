import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "apollo-boost";
import "isomorphic-fetch";
import { BatchHttpLink } from "apollo-link-batch-http";
import { queryServer } from "./queries/client.queries";

const batch = new BatchHttpLink({ uri: "http://localhost:4000" });
const http = new HttpLink({ uri: "http://localhost:4000" });

const client = new ApolloClient({
  link: ApolloLink.split(
    ({ getContext }) => getContext().batch !== false,
    batch,
    http
  ),
  cache: new InMemoryCache()
});

queryServer(client, true);
