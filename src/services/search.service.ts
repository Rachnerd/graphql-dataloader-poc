import { delayedValue, log, tap } from "../utils";

const ids = [];

for (let i = 0; i < 200; i++) {
  ids.push(i.toString());
}

export class SearchService {
  async search(page: number, pageSize: number) {
    const delay = 200;
    return delayedValue(
      {
        ids: ids.slice(0, pageSize),
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(200 / pageSize),
          totalElements: 200
        }
      },
      delay
    ).then(tap(() => log(`SearchService search responded within ${delay}ms`)));
  }
}
