import { ApolloServer, gql } from "apollo-server";
import * as path from "path";
import * as fs from "fs";
import { SearchService } from "../services/search.service";
import { ItemService } from "../services/item.service";
import { log } from "../utils";
import { PriceService } from "../services/price.service";
import { searchDataLoaderFactory } from "../data-loader/search.data-loader";
import { priceDataLoaderFactory } from "../data-loader/price.data-loader";
import { itemDataLoaderFactory } from "../data-loader/item.data-loader";

const schemaFilePath = path.resolve(__dirname, "../", "schema.graphql");
const schemaString = fs.readFileSync(schemaFilePath, "utf8");

const typeDefs = gql`
  ${schemaString}
`;

const searchService = new SearchService();
const itemService = new ItemService();
const priceService = new PriceService();

const dataloaderServer = new ApolloServer({
  typeDefs,
  context: () => ({
    searchDataLoader: searchDataLoaderFactory(searchService),
    priceDataLoader: priceDataLoaderFactory(priceService),
    itemDataLoader: itemDataLoaderFactory(itemService)
  }),
  resolvers: {
    Query: {
      searchItems: (_, { page, pageSize }, { searchDataLoader }) => {
        log(`Query.searchItems pageSize: ${pageSize}`);
        return searchDataLoader.load({ page, pageSize });
      }
    },
    SearchResults: {
      results: ({ ids }) => {
        log("SearchResults.result");
        return itemService.getByIds(ids);
      }
    },
    Item: {
      price: ({ id }, _, { priceDataLoader }) => {
        log("Item.price");
        return priceDataLoader.load(id);
      }
    }
  }
});

// The `listen` method launches a web server.
dataloaderServer.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
