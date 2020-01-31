import { ApolloClient, gql, HttpLink, InMemoryCache } from "apollo-boost";
import "isomorphic-fetch";
import { BatchHttpLink } from "apollo-link-batch-http";
import { log } from "./src/utils";

const batch = new BatchHttpLink({ uri: "http://localhost:4000" });
const http = new HttpLink({ uri: "http://localhost:4000" });

const client = new ApolloClient({
  link: process.env.BATCH === 'true' ? batch: http,
  cache: new InMemoryCache()
});

client
  .query({
    query: gql`
      {
        searchItems(searchTerm: "", page: 0, pageSize: 5) {
          results {
            id
            price {
              amount
            }
          }
        }
      }
    `
  })
  .then(() => log("Received results"));

client
  .query({
    query: gql`
      {
        searchItems(searchTerm: "", page: 0, pageSize: 5) {
          pagination {
            page
          }
        }
      }
    `
  })
  .then(() => log("Received pagination"));

log("Send queries");
