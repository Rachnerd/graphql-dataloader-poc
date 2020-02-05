# Batching DEMO

This repo contains demonstrations of servers with/without [data-loader](https://www.npmjs.com/package/dataloader), 
clients with/without [batching](https://www.npmjs.com/package/apollo-link-batch-http) and a Next app with a few components
that demonstrate separation of concerns in combination with GraphQL + TypeScript.

All servers and clients use the same [schema.graphql](servers/schema.graphql)

Each server example can be called via the playground (http://localhost:4000) or a client.

- [Data-loader](#markdown-header-data-loader-server)
- [Server performance](#markdown-header-server-side-performance)
    - [Naive server](#markdown-header-naive-server-implementation)
    - [Data-loader server](#markdown-header-data-loader-server-implementation)
    - [Optimized data-loader server](#markdown-header-optimized-data-loader-server-anti-pattern)

- [Client performance](#markdown-header-client-side-performance)
    - [Http client](#markdown-header-http-client)
    - [Batch client](#markdown-header-batch-client)
    - [Http/Batch split client](#markdown-header-httpbatch-split-client)
- [Client components](#markdown-header-client-components)
    - [UI components](#markdown-header-ui-components)
    - [Dumb/presenter components](#markdown-header-dumbpresenter-components)
    - [Smart/container components](#markdown-header-smartcontainer-components)
    
## Data-loader (server)

Data-loader is a tool by GraphQL that groups single calls to a service/system into one batch request. A data-loader collects
all arguments it receives from callers within 1 tick of the event loop (NodeJS) and passes them to a batch function. The batch
function is responsible for fetching the requested data and returning it in a collection that matches the order of the input arguments.

**_Each data-loader instance caches its returned values, so it is important to reinstantiate data-loaders on each request._**

Each incoming request creates a new GraphQL context, so this is a good place to instantiate data-loaders:

```typescript
const server = new ApolloServer({
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
  resolvers: { ... }
}
```

Looking at our schema we can identify 2 use-cases for data-loader:

- Simple: A price is fetched for each Item, which means that 10 items will trigger 10 calls to the price service.
- Complex: The `searchItems` query can be split by the frontend into separate queries (which is considered a good practice).
  This means that conditional batching based on sets of arguments is required to minimize the amount of calls.

#### Simple data-loader

The easiest use-case for data-loader is batching single `getById` calls into one `getByIds` call.

[price.data-loader.ts](servers/data-loaders/price.data-loader.ts)

```typescript
export const priceDataLoaderFactory = (priceService: PriceService) =>
  new DataLoader(
    async (ids: string[]): Promise<{ id: string }[]> =>
      priceService.getPrices(ids)
  );
```

_The factory wrapper around the data-loader makes it easier to reinstantiate the data-loader and isolate/provide the
dependencies used by the batch function. This is a personal preference._

Resolvers call the `load` function of the data-loader to get a price asynchronously:

```typescript
{
    ...
    Item: {
      price: ({ id }, _, { priceDataLoader }) => {
        log("Item.price");
        return priceDataLoader.load(id);
      }
    }
}
```

The price resolver gets called by each resolved item.

So if 3 items are resolved:

- The price resolver gets called 3 times with item 1, 2 and 3.
- Each price resolver calls the price data-loader with the item id.
- Event loop is incremented by 1 tick (NodeJS).
- The data-loader batch function gets called with: `['1', '2', '3']` and calls `priceService.getPrices(ids)` asynchronously.
- The prices are returned in the same order as the input arguments: `[price1, price2, price3]`.

**_Your service or data-loader implementation is responsible for matching the results order with the input order._**

#### Complex data-loader

In more complex cases input arguments determine if calls can be batched together or not. This results in multiple batches of
calls with identical arguments within one data-loader.

Steps to achieve multiple conditional batches within one data-loader:

- Group calls by unique sets of arguments.
- Perform the batch for each group (in parallel).
- Flatten and sort the results to match the input order.

[search.data-loader.ts](servers/data-loaders/search.data-loader.ts)

```typescript
/**
 * Create a key representing combinations of arguments.
 */
const toUniqueArgumentsKey = ({ searchTerm, page, pageSize }: SearchOptions) =>
  `searchTerm:${searchTerm},page:${page},pageSize:${pageSize}`;

/**
 * Data-loader that batches calls based on their arguments.
 */
export const searchDataLoaderFactory = (searchService: SearchService) =>
  new DataLoader(async (allSearchOptions: SearchOptions[]) => {
    /**
     * Reduce all search options to a map of unique options + corresponding call supplier.
     */
    const callsMap = allSearchOptions.reduce(
      (acc, searchOptions) => ({
        ...acc,
        [toUniqueArgumentsKey(searchOptions)]: () =>
          searchService.search(
            searchOptions.searchTerm,
            searchOptions.page,
            searchOptions.pageSize
          )
      }),
      {}
    );

    /**
     * Execute calls and reduce them to a map of key and result
     */
    const resultsMap = (
      await Promise.all(
        Object.keys(callsMap).map(key =>
          callsMap[key]().then(result => ({ result, key }))
        )
      )
    ).reduce(
      (acc, { result, key }) => ({
        ...acc,
        [key]: result
      }),
      {}
    );

    /**
     * Map all search options to corresponding results
     */
    return allSearchOptions.map(
      searchOptions => resultsMap[toUniqueArgumentsKey(searchOptions)]
    );
  });
```

Here's a step by step visualisation of the data transformations happening inside the search data-loader:

```

# arguments
[
    { searchTerm: 'Hello', page: 0, pageSize: 10 },
    { searchTerm: 'World', page: 0, pageSize: 10 },
    { searchTerm: 'Hello', page: 0, pageSize: 10 },
    { searchTerm: 'World', page: 0, pageSize: 10 }
]

# callsMap
{
    'searchTerm:Hello,page:0,pageSize:10': () => searchService.search("Hello", 0, 10),
    'searchTerm:World,page:0,pageSize:10': () => searchService.search("World", 0, 10)
}

# resultsMap
{
    'searchTerm:Hello,page:0,pageSize:10': { searchTerm: 'Hello', pagination: { ... }, results: [ ... ] },
    'searchTerm:World,page:0,pageSize:10': { searchTerm: 'World', pagination: { ... }, results: [ ... ] },
}

# output
[
    { searchTerm: 'Hello', pagination: { ... }, results: [ ... ] },
    { searchTerm: 'World', pagination: { ... }, results: [ ... ] },
    { searchTerm: 'Hello', pagination: { ... }, results: [ ... ] },
    { searchTerm: 'World', pagination: { ... }, results: [ ... ] }
]
```

## Server-side performance

Server concerns:

- A client can send multiple queries in one request.
- Queries (within the same request) can contain overlapping resources which results in more service calls than needed.

### Naive server implementation.

[naive.server.ts](servers/naive.server.ts)

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

This works fine for a simple query that hits all available resources:

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

[data-loader.server.ts](servers/data-loader.server.ts)

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

[optimized-data-loader.server.ts](servers/optimized-data-loader.server.ts)

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

- Splitting resources in queries can only be optimized by the server if they're batched together.
- A client can potentially batch very heavy queries with light queries what results in load times longer than necessary.

For this section the clients will communicate with the "optimized" server to reduce the response times as much as possible.

The following clients will query:

[client.queries.ts](src/clients/queries/client.queries.ts)

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

[http.client.ts](src/clients/http.client.ts)

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

[batch.client.ts](src/clients/batch.client.ts)

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

[split-http-batch.client.ts](src/clients/split-http-batch.client.ts)

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

## Client components
This chapter will demonstrate how to add separation of concerns to components in combination with GraphQL.

The following examples only work with the `data-loader-server` because the `opimized-loader-server` hacky implementation
does not support Fragments (it could if more effort is put into it).

Generate code based on `.graphql` files.

```
npm run gen
```

Run the server:
```
npm run data-loader-server
```

Run the app:

```
npm start
```


### UI components

Properties:

- Data input (props)
- Event output
- No business logic
- Focuses on 1 concern only
- Reusable by other projects

Basically these components are similar to the components provided by Bootstrap, Material etc.

Currently Sabre is an example of a custom lib of UI components.

If the goal is to replace an existing HTML element with a UI component, it's possible to extend the
interface of the HTML element.

#### List example

Custom [List](src/ui-components/list/List.tsx) example:

```typescript
export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  highlightOnHover?: boolean;
}

export const List: React.FC<ListProps> = ({
  children,
  highlightOnHover = false,
  className,
  ...htmlProps
}) => (
  <ul
    {...htmlProps}
    className={classnames(
      "poc-list",
      {
        "poc-list--highlight": highlightOnHover
      },
      className
    )}
  >
    {children}
  </ul>
);
```

Simple list (styled according to house style)

```typescript 
<List>
  <ListItem>Item 1</ListItem>
  <ListItem>Item 2</ListItem>
  <ListItem>Item 3</ListItem>
</List>
```

List with custom functionality

```typescript 
<List highlightOnHover={true}>
  <ListItem>Yo</ListItem>
  <ListItem>Yo</ListItem>
</List>
```

List with \<ul> functionality

```typescript 
<List onClick={() => {}} onMouseOver={() => {}}>
  <ListItem>Yo</ListItem>
  <ListItem>Yo</ListItem>
</List>
```

### Dumb/presenter components

Properties:

- Data input (props)
- Handles events of UI components
- Event output (usually more explicit than `click`, `hover` etc)
- Composition of UI components
- Visualizes a functional (specific) part of the application

Since this is the first presenter layer that is coupled to requirements, it is a good idea to couple its Props interface
with GraphQL.

#### Item example

The Item is defined in the GraphQL schema as follows:

```graphql
type Item {
  id: ID!
  name: String!
  price: Price!
}

type Price {
  currency: String!
  amount: Float!
}
```

This schema can be visualized by making 2 dumb components.
Because the smart/container component is in charge of fetching the data, the dumb components need to be coupled to
the query definition. This way components can detect at compile-time if their required fields are queried.

The item component will visualize the item name with price (amount + currency) which means that the smart/container component
needs to retrieve these values.

First we need to define `Fragments` that represent the dumb components data requirements:

[ItemPrice fragment](src/components/item-price/item-price.fragment.graphql)

```graphql
fragment ItemPrice on Price {
  amount
  currency
}
```

[Item fragment](src/components/item/item.fragment.graphql)

```graphql
fragment ItemFull on Item {
  id
  name
  price {
    ...ItemPrice
  }
}
```

`@graphql-codegen` will generate fragment types that can be used in the props interface of the dumb components. This creates
compile-time coupling between fields required by the components and query definitions.

Codegen output:

```typescript
export type GQLItemPriceFragment = { __typename?: "Price" } & Pick<
  GQLPrice,
  "amount" | "currency"
>;

export type GQLItemFullFragment = { __typename?: "Item" } & Pick<
  GQLItem,
  "id" | "name"
> & { price: { __typename?: "Price" } & GQLItemPriceFragment };
```

These fragment types can now be used in the coupled components:

```typescript 
export interface ItemPriceProps {
  price: GQLItemPriceFragment;
}

export const ItemPrice: React.FC<ItemPriceProps> = ({
  price: { amount, currency }
}) => {
  return (
    <div>
      {amount} {currency}
    </div>
  );
};
```

```typescript 
interface ItemProps {
  item: GQLItemFullFragment;
  onAddToCart: (id: string) => void;
}

export const Item: React.FC<ItemProps> = ({
  item: { price, ...item },
  onAddToCart
}) => {
  return (
    <div>
      <h4>{item.name}</h4>
      <ItemPrice price={price} />
      <button onClick={() => onAddToCart(item.id)}>Add to cart</button>
    </div>
  );
};

```

As soon as a fragment or query gets updated, TypeScript can immediately detect if the changes are compatible with
component implementations.

### Smart/container components

Properties:

- Queries/mutates data via GraphQL
- Is coupled to query/mutation files (.graphql)
- Composition of Dumb/UI components
- Handles events of Dumb/UI components

#### Item example

To show a `List` of `Items` and `ItemPrices` a smart component needs make sure the data requirements of the children are
met by including the fragments in the query.

[Item query](src/components/item-price/item-price.fragment.graphql)

```graphql
query Items {
  allItems {
    ...ItemFull # This fragment also contains the ItemPrice
  }
}
```

The `@graphql-codegen` generates a Hook for this query which will be used by the `Items` component:

```typescript 
export function useItemsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GQLItemsQuery, GQLItemsQueryVariables>) {
        return ApolloReactHooks.useQuery<GQLItemsQuery, GQLItemsQueryVariables>(ItemsDocument, baseOptions);
```

Now all the smart component needs to do is compose the UI / dumb components, bind the data to the dumb children and handle
the loading / error states of the query.

```typescript 
export const Items: React.FC = () => {
  const { data, loading, error } = useItemsQuery({
    context: {
      /**
       *  We don't want to batch this expensive call.
       */
      batch: false
    }
  });

  if (loading) {
    return <p>Loading</p>;
  }

  if (error) {
    return <p>Error</p>;
  }

  return (
    data && (
      <List>
        {data.allItems.map(item => (
          <ListItem key={item.id}>
            <Item item={item} />
          </ListItem>
        ))}
      </List>
    )
  );
};
```
If TypeScript compiles, we can be sure that everything connects properly.
