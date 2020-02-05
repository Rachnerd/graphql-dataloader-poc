import { ApolloClient, gql } from "apollo-boost";
import { log } from "../../../servers/utils";

export const queryServer = (
  client: ApolloClient<any>,
  batchEnabled = false
) => {
  client
    .query({
      query: gql`
        query SearchResults {
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
        query SearchPagination {
          searchItems(searchTerm: "", page: 0, pageSize: 5) {
            pagination {
              page
            }
          }
        }
      `
    })
    .then(() => log("Received pagination"));

  client
    .query({
      query: gql`
        query AllItems {
          allItems {
            id
            name
            price {
              amount
            }
          }
        }
      `,
      context: batchEnabled
        ? {
            batch: false
          }
        : {}
    })
    .then(() => log("Received all items"));

  log("Send queries");
};
