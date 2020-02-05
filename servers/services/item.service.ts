import { delayedValue, log, tap } from "../utils";

const items = [];

for (let i = 0; i < 200; i++) {
  items.push({
    id: i.toString(),
    name: `Item ${i}`
  });
}

export class ItemService {
  async getAll() {
    const delay = 0;
    return delayedValue(items, delay).then(
      tap(() => log(`ItemService getAll responded within ${delay}ms`))
    );
  }

  async getByIds(ids: string[]) {
    const delay = 500;
    return delayedValue(items.slice(0, ids.length), delay).then(
      tap(() => log(`ItemService getByIds responded within ${delay}ms`))
    );
  }
}
