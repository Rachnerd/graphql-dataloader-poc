import * as DataLoader from "dataloader";
import { SearchService } from "../services/search.service";

interface SearchArguments {
  searchTerm: string;
  page: number;
  pageSize: number;
}

/**
 * Create a key representing combinations of arguments.
 */
const toUniqueArgumentsKey = ({
  searchTerm,
  page,
  pageSize
}: SearchArguments) =>
  `searchTerm:${searchTerm},page:${page},pageSize:${pageSize}`;

/**
 * Data-loader that batches calls based on their arguments.
 */
export const searchDataLoaderFactory = (searchService: SearchService) =>
  new DataLoader(async (allSearchArguments: SearchArguments[]) => {
    /**
     * Reduce all search options to a map of unique options + corresponding call supplier.
     */
    const callMap = allSearchArguments.reduce(
      (acc, searchArguments) => ({
        ...acc,
        [toUniqueArgumentsKey(searchArguments)]: () =>
          searchService.search(
            searchArguments.searchTerm,
            searchArguments.page,
            searchArguments.pageSize
          )
      }),
      {}
    );

    /**
     * Execute calls and reduce them to a map of key and result
     */
    const resultsMap = (
      await Promise.all(
        Object.keys(callMap).map(key =>
          callMap[key]().then(result => ({ result, key }))
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
    return allSearchArguments.map(
      searchOptions => resultsMap[toUniqueArgumentsKey(searchOptions)]
    );
  });
