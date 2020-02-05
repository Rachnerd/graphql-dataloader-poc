import { ApolloServer, gql } from "apollo-server";
import * as path from "path";
import * as fs from "fs";
import { SearchService } from "./services/search.service";
import { ItemService } from "./services/item.service";
import { log } from "./utils";
import { PriceService } from "./services/price.service";

const schemaFilePath = path.resolve(__dirname, "./", "schema.graphql");
const schemaString = fs.readFileSync(schemaFilePath, "utf8");

const typeDefs = gql`
  ${schemaString}
`;

const searchService = new SearchService();
const itemService = new ItemService();
const priceService = new PriceService();

const naiveServer = new ApolloServer({
  typeDefs,
  resolvers: {
    Query: {
      searchItems: (_, { searchTerm, page, pageSize }) => {
        log(`Query.searchItems pageSize: ${pageSize}`);
        return searchService.search(searchTerm, page, pageSize);
      },
      allItems: () => {
        log("Query.allItems");
        return itemService.getAll();
      }
    },
    SearchResults: {
      results: ({ ids }) => {
        log("SearchResults.result");
        return itemService.getByIds(ids);
      }
    },
    Item: {
      price: () => {
        log("Item.price");
        return priceService.getPrice();
      }
    }
  }
});

// The `listen` method launches a web server.
naiveServer.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
