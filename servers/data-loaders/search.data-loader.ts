import * as DataLoader from "dataloader";
import { SearchService } from "../services/search.service";

interface SearchOptions {
  searchTerm: string;
  page: number;
  pageSize: number;
}

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
