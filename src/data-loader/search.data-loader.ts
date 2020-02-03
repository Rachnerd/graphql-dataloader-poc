import * as DataLoader from "dataloader";
import { SearchService } from "../services/search.service";

const toKey = ({ page, pageSize }) => `page:${page}pageSize:${pageSize}`;

/**
 * This is a demonstration of a rather complex case where multiple parameters determine which calls have to be made.
 * The service will be hit with each unique combination of parameters.
 */
export const searchDataLoaderFactory = (searchService: SearchService) =>
  new DataLoader(async (allPageOptions: { page; pageSize }[]) => {
    /**
     * Reduce all page options to a map of unique options + corresponding call supplier.
     */
    const callMap = allPageOptions.reduce(
      (acc, value) => ({
        ...acc,
        [toKey(value)]: () => searchService.search(value.page, value.pageSize)
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
     * Map all page options to corresponding results
     */
    return allPageOptions.map(pageOptions => resultsMap[toKey(pageOptions)]);
  });
