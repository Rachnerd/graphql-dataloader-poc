import gql from 'graphql-tag';
import * as React from 'react';
import * as ApolloReactCommon from '@apollo/react-common';
import * as ApolloReactComponents from '@apollo/react-components';
import * as ApolloReactHooks from '@apollo/react-hooks';
export type Maybe<T> = T | null;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string,
  String: string,
  Boolean: boolean,
  Int: number,
  Float: number,
};

export type GQLItem = {
   __typename?: 'Item',
  id: Scalars['ID'],
  name: Scalars['String'],
  price: GQLPrice,
};

export type GQLPagination = {
   __typename?: 'Pagination',
  page: Scalars['Int'],
  pageSize: Scalars['Int'],
  totalPages: Scalars['Int'],
  totalResults: Scalars['Int'],
};

export type GQLPrice = {
   __typename?: 'Price',
  currency: Scalars['String'],
  amount: Scalars['Float'],
};

export type GQLQuery = {
   __typename?: 'Query',
  searchItems: GQLSearchResults,
  allItems: Array<GQLItem>,
};


export type GQLQuerySearchItemsArgs = {
  searchTerm: Scalars['String'],
  page: Scalars['Int'],
  pageSize: Scalars['Int']
};

export type GQLSearchResults = {
   __typename?: 'SearchResults',
  results: Array<GQLItem>,
  pagination: GQLPagination,
};

export type GQLItemPriceFragment = (
  { __typename?: 'Price' }
  & Pick<GQLPrice, 'amount' | 'currency'>
);

export type GQLItemFullFragment = (
  { __typename?: 'Item' }
  & Pick<GQLItem, 'id' | 'name'>
  & { price: (
    { __typename?: 'Price' }
    & GQLItemPriceFragment
  ) }
);

export type GQLItemsQueryVariables = {};


export type GQLItemsQuery = (
  { __typename?: 'Query' }
  & { allItems: Array<(
    { __typename?: 'Item' }
    & GQLItemFullFragment
  )> }
);

export type GQLSearchResultsQueryVariables = {
  searchTerm: Scalars['String'],
  page: Scalars['Int'],
  pageSize: Scalars['Int']
};


export type GQLSearchResultsQuery = (
  { __typename?: 'Query' }
  & { searchItems: (
    { __typename?: 'SearchResults' }
    & { results: Array<(
      { __typename?: 'Item' }
      & Pick<GQLItem, 'id'>
      & { price: (
        { __typename?: 'Price' }
        & Pick<GQLPrice, 'amount'>
      ) }
    )> }
  ) }
);

export const ItemPriceFragmentDoc = gql`
    fragment ItemPrice on Price {
  amount
  currency
}
    `;
export const ItemFullFragmentDoc = gql`
    fragment ItemFull on Item {
  id
  name
  price {
    ...ItemPrice
  }
}
    ${ItemPriceFragmentDoc}`;
export const ItemsDocument = gql`
    query Items {
  allItems {
    ...ItemFull
  }
}
    ${ItemFullFragmentDoc}`;
export type ItemsComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GQLItemsQuery, GQLItemsQueryVariables>, 'query'>;

    export const ItemsComponent = (props: ItemsComponentProps) => (
      <ApolloReactComponents.Query<GQLItemsQuery, GQLItemsQueryVariables> query={ItemsDocument} {...props} />
    );
    

/**
 * __useItemsQuery__
 *
 * To run a query within a React component, call `useItemsQuery` and pass it any options that fit your needs.
 * When your component renders, `useItemsQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useItemsQuery({
 *   variables: {
 *   },
 * });
 */
export function useItemsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GQLItemsQuery, GQLItemsQueryVariables>) {
        return ApolloReactHooks.useQuery<GQLItemsQuery, GQLItemsQueryVariables>(ItemsDocument, baseOptions);
      }
export function useItemsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GQLItemsQuery, GQLItemsQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GQLItemsQuery, GQLItemsQueryVariables>(ItemsDocument, baseOptions);
        }
export type ItemsQueryHookResult = ReturnType<typeof useItemsQuery>;
export type ItemsLazyQueryHookResult = ReturnType<typeof useItemsLazyQuery>;
export type ItemsQueryResult = ApolloReactCommon.QueryResult<GQLItemsQuery, GQLItemsQueryVariables>;
export const SearchResultsDocument = gql`
    query SearchResults($searchTerm: String!, $page: Int!, $pageSize: Int!) {
  searchItems(searchTerm: $searchTerm, page: $page, pageSize: $pageSize) {
    results {
      id
      price {
        amount
      }
    }
  }
}
    `;
export type SearchResultsComponentProps = Omit<ApolloReactComponents.QueryComponentOptions<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>, 'query'> & ({ variables: GQLSearchResultsQueryVariables; skip?: boolean; } | { skip: boolean; });

    export const SearchResultsComponent = (props: SearchResultsComponentProps) => (
      <ApolloReactComponents.Query<GQLSearchResultsQuery, GQLSearchResultsQueryVariables> query={SearchResultsDocument} {...props} />
    );
    

/**
 * __useSearchResultsQuery__
 *
 * To run a query within a React component, call `useSearchResultsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchResultsQuery` returns an object from Apollo Client that contains loading, error, and data properties 
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchResultsQuery({
 *   variables: {
 *      searchTerm: // value for 'searchTerm'
 *      page: // value for 'page'
 *      pageSize: // value for 'pageSize'
 *   },
 * });
 */
export function useSearchResultsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>) {
        return ApolloReactHooks.useQuery<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>(SearchResultsDocument, baseOptions);
      }
export function useSearchResultsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>) {
          return ApolloReactHooks.useLazyQuery<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>(SearchResultsDocument, baseOptions);
        }
export type SearchResultsQueryHookResult = ReturnType<typeof useSearchResultsQuery>;
export type SearchResultsLazyQueryHookResult = ReturnType<typeof useSearchResultsLazyQuery>;
export type SearchResultsQueryResult = ApolloReactCommon.QueryResult<GQLSearchResultsQuery, GQLSearchResultsQueryVariables>;