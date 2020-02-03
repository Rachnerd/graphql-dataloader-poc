import { ApolloServer, gql } from "apollo-server";
import * as path from "path";
import * as fs from "fs";
import { SearchService } from "../services/search.service";
import { ItemService } from "../services/item.service";
import { hasQueried, log, normalize } from "../utils";
import { PriceService } from "../services/price.service";
import { searchDataLoaderFactory } from "../data-loaders/search.data-loader";
import { priceDataLoaderFactory } from "../data-loaders/price.data-loader";
import { itemDataLoaderFactory } from "../data-loaders/item.data-loader";

const schemaFilePath = path.resolve(__dirname, "../", "schema.graphql");
const schemaString = fs.readFileSync(schemaFilePath, "utf8");

const typeDefs = gql`
  ${schemaString}
`;

const naiveServer = new ApolloServer({
  typeDefs,
  context: () => {
    const searchService = new SearchService();
    const itemService = new ItemService();
    const priceService = new PriceService();

    return {
      itemService,
      searchDataLoader: searchDataLoaderFactory(searchService),
      priceDataLoader: priceDataLoaderFactory(priceService),
      itemDataLoader: itemDataLoaderFactory(itemService)
    };
  },
  resolvers: {
    Query: {
      searchItems: async (
        _,
        { page, pageSize },
        { searchDataLoader, priceDataLoader, itemDataLoader },
        info
      ) => {
        log(`Query.searchItems pageSize: ${pageSize}`);
        const { ids, pagination } = await searchDataLoader.load({
          page,
          pageSize
        });
        const [items, prices] = await Promise.all([
          Promise.all<Record<"id", string>>(
            hasQueried("results.id", info)
              ? ids.map(id => itemDataLoader.load(id))
              : []
          ),
          Promise.all<Record<"id", string>>(
            hasQueried("results.price", info)
              ? ids.map(id => priceDataLoader.load(id))
              : []
          )
        ]);
        const normalizedItems = normalize(items);
        const normalizedPrices = normalize(prices);
        return {
          pagination,
          results: ids.map(id => ({
            ...(normalizedItems[id] || {}),
            price: normalizedPrices[id]
          }))
        };
      },
      allItems: async (_, __, { priceDataLoader, itemService }, info) => {
        let items = await itemService.getAll();

        if (hasQueried("price", info)) {
          const prices = await Promise.all<Record<"id", string>>(
            items.map(({ id }) => priceDataLoader.load(id))
          );

          const normalizedPrices = normalize(prices);
          items = items.map(item => ({
            ...item,
            price: normalizedPrices[item.id]
          }));
        }

        return items;
      }
    }
  }
});

// The `listen` method launches a web server.
naiveServer.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
