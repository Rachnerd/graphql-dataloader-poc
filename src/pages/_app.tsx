import * as React from "react";
import App from "next/app";
import { ApolloProvider } from "@apollo/react-common";
import { BatchHttpLink } from "apollo-link-batch-http";
import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache
} from "apollo-boost";
import "isomorphic-fetch";

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

export default class MyApp extends App {
  public render() {
    const { Component, pageProps } = this.props;

    return (
      <ApolloProvider client={client}>
        <Component {...pageProps} />
      </ApolloProvider>
    );
  }
}
