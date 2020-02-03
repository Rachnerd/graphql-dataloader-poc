# Batching DEMO

This repo contains demonstrations of servers with/without [data-loader](https://www.npmjs.com/package/dataloader)
and clients with/without [batching](https://www.npmjs.com/package/apollo-link-batch-http).

Each server example can be called via the playground (http://localhost:4000) or a client.

* [Server performance](#markdown-header-server-side-performance)
  * [Naive server](#markdown-header-naive-server-implementation)
  * [Data-loader server](#markdown-header-data-loader-server-implementation)
  * [Optimized data-loader server](#markdown-header-optimized-data-loader-server-anti-pattern)

* [Client performance](#markdown-header-client-side-performance)
  * [Http client](#markdown-header-http-client)
  * [Batch client](#markdown-header-batch-client)
  * [Http/Batch split client](#markdown-header-httpbatch-split-client)

## Server-side performance

Server concerns:

- A client can send multiple queries in one request.
- Queries (within the same request) can contain parts of a resource split over multiple queries which leads to unnecessary grpc calls.

### Naive server implementation.

[naive.server.ts](./src/servers/naive.server.ts)

```
npm run naive-server
```

The naive server implements resolvers without using data-loader.

```typescript
{
    Query: {
      searchItems: (_, { page, pageSize }) => {
        log("Query.searchItems");
        return searchService.search(page, pageSize);
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
}
```

This works find for a simple query that hits all available resources:

```graphql
{
  searchItems(searchTerm: "", page: 0, pageSize: 5) {
    results {
      id
      price {
        amount
      }
    }
    pagination {
      page
    }
  }
}
```

Server output:

```
13:49:39.839: Query.searchItems
13:49:39.839: Query.allItems
13:49:40.040: SearchService search responded within 200ms
13:49:40.040: SearchResults.result
13:49:40.541: ItemService getByIds responded within 500ms
13:49:40.541: Item.price
13:49:40.541: Item.price
13:49:40.541: Item.price
13:49:40.541: Item.price
13:49:40.541: Item.price
13:49:40.742: PriceService getPrice responded within 200ms
13:49:40.742: PriceService getPrice responded within 200ms
13:49:40.742: PriceService getPrice responded within 200ms
13:49:40.742: PriceService getPrice responded within 200ms
13:49:40.744: PriceService getPrice responded within 200ms
13:49:44.840: ItemService getAll responded within 5000ms
```

```
Total duration: +- 5sec (as fast as slowest call)
Resource sequence:
Search (1 time)
  |---> Items (1 time)
           |---> Price (n times)
           ...
Item (1 time)
```

A good practice in Apollo is to move the queries to component level, so let's split up the query:

SearchResultsComponent

```graphql
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
```

PaginationComponent

```graphql
query SearchPagination {
  searchItems(searchTerm: "", page: 0, pageSize: 5) {
    pagination {
      page
    }
  }
}
```

ItemsComponent

```graphql
query AllItems {
  allItems {
    id
  }
}
```

Executing these queries on page load without batching results in:

Server output:

```
14:09:10.596: Query.searchItems pageSize: 5
14:09:10.596: Query.allItems
14:09:10.597: Query.searchItems pageSize: 5
14:09:10.796: SearchService search responded within 200ms
14:09:10.796: SearchService search responded within 200ms
14:09:10.797: SearchResults.result
14:09:11.297: ItemService getByIds responded within 500ms
14:09:11.297: Item.price
14:09:11.298: Item.price
14:09:11.298: Item.price
14:09:11.298: Item.price
14:09:11.298: Item.price
14:09:11.498: PriceService getPrice responded within 200ms
14:09:11.498: PriceService getPrice responded within 200ms
14:09:11.500: PriceService getPrice responded within 200ms
14:09:11.500: PriceService getPrice responded within 200ms
14:09:11.500: PriceService getPrice responded within 200ms
14:09:15.598: ItemService getAll responded within 5000ms

```

```
Total duration: +- 5sec (as fast as slowest call)
Resource sequence:
Search (2 times)
  |---> Items (1 time)
           |---> Price (n times)
           ...
Item (1 time)
```

Client output:

```
14:09:10.592: Send queries
14:09:10.823: Received pagination
14:09:11.509: Received results
14:09:15.635: Received all items
```

Conclusion:

- Client receives each piece of data as soon as it's resolved.
- Server hits the SearchService twice because of the query split.
- Server hits the PriceService for each item.

When batching is enabled the client output changes to:

```
14:12:12.544: Send queries
14:12:17.600: Received results
14:12:17.600: Received all items
14:12:17.600: Received pagination
```

Conclusion:

- Client receives data as soon as all is resolved.
- Server hits the SearchService twice because of the query split.
- Server hits the PriceService for each item.

_From this point onwards we're going to ignore the slow 5000ms call because parallel execution in combination with batching is already demonstrated._

### Data-loader server implementation.

[data-loader.server.ts](./src/servers/data-loader.server.ts)

```
npm run data-loader-server
```

This server implements data-loader so that services aren't hit more often than needed (only if the client batches or a single request contains multiple queries).

SearchResultsComponent

```graphql
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
```

PaginationComponent

```graphql
query SearchPagination {
  searchItems(searchTerm: "", page: 0, pageSize: 5) {
    pagination {
      page
    }
  }
}
```

Server output:

```
10:02:42.753: Query.searchItems pageSize: 5
10:02:42.754: Query.searchItems pageSize: 5
10:02:42.955: SearchService search responded within 200ms
10:02:42.956: SearchResults.result
10:02:43.457: ItemService getByIds responded within 500ms
10:02:43.458: Item.price
10:02:43.458: Item.price
10:02:43.458: Item.price
10:02:43.458: Item.price
10:02:43.459: Item.price
10:02:43.662: PriceService getPrices responded within 200ms
```

```
Total duration: +- 900ms
Resource sequence:
Search (1 time)
  |---> Items (1 time)
           |---> Price (1 time)
```

Conclusion:

- The server reduces the service calls to a minimum.
- The server still needs to wait for items to be resolved before prices are resolved.

### Optimized data-loader server (anti-pattern)

[optimized-data-loader.server.ts](./src/servers/optimized-data-loader.server.ts)

```
npm run optimized-data-loader-server
```

KrampHub is currently seeing the resource sequence as an issue because Item and Price should be fetched in parallel.
Each normal GQL server implementation will wait for Item to be resolved before fetching the Price. KrampHub doesn't
want to change the schema to fit the MicroService contracts, so **a** way of "solving" this issue without changing the schema, is looking ahead on Query resolver level.

```typescript
{
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
      }
    }
  }
}
```

Server output:

```
13:27:54.907: Query.searchItems pageSize: 5
13:27:55.109: SearchService search responded within 200ms
13:27:55.311: PriceService getPrices responded within 200ms
13:27:55.611: ItemService getByIds responded within 500ms
```

```
Total duration: +- 700ms
Resource sequence:
Search (1 time)
  |---> Items (1 time)
  |---> Price (1 time)
```

## Client-side performance

Client concerns:

- Splitting resources in queries can only be optimized by the server if batched together.
- A client can potentially batch very heavy queries with light queries what result in load times longer than necessary.

For this section the clients will communicate with the "optimized" server to reduce the response times as much as possible.

The following clients will query:

```graphql
query SearchResults {
  searchItems(searchTerm: "", page: 0, pageSize: 5) {
    # 200ms
    results {
      # 500ms
      id
      price {
        # 200ms
        amount
      }
    }
  }
}
```

```graphql
query SearchPagination {
  searchItems(searchTerm: "", page: 0, pageSize: 5) {
    # 200ms
    pagination {
      page
    }
  }
}
```

```graphql
query AllItems {
  allItems {
    # 5000ms
    id
    name
    price {
      # 200ms
      amount
    }
  }
}
```

### Http client

The regular http-link will send a request for each detected query regardless of overlap.

```
npm run http-client
```

```
08:34:07.549: Send queries
08:34:07.779: Received pagination
08:34:08.261: Received results
08:34:12.825: Received all items
```

Conclusion:

- Call for each query.
- Overlap in queries can't be optimized by the server due to the fact that data-loader works on request basis.

### Batch client

The batch-http-link will send one request for all detected queries.

```
npm run batch-client
```

```
08:34:15.404: Send queries
08:34:20.663: Received results
08:34:20.663: Received pagination
08:34:20.663: Received all items
```

Conclusion:

- One call for all queries.
- Response always takes as long as the slowest query.
- Server can optimize the queries because they're sent within the same request.

### Http/batch split client

The most efficient strategy for clients is to combine the http and batch link and manually blacklist queries from batching.
This can be done by using ApolloLink's `split` function:

_Here follows a way (not necessarily the best) to blacklist queries._

We let the `split` function check the `context` of each query to see if it should be excluded from the batch:

```typescript
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
```

Now the slow call of 5000ms can easily be excluded from the batch:

```typescript
client.query({
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
  context: {
    batch: false
  }
});
```

```
npm run split-http-batch-client
```

```
08:34:24.383: Send queries
08:34:25.097: Received results
08:34:25.097: Received pagination
08:34:29.617: Received all items
```

Conclusion:

- One call for (most) queries.
- Client decides which queries should be excluded from the batch to improve performance.
- Server can optimize backend system calls because queries are sent within the same request.
