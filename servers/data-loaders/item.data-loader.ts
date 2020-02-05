import * as DataLoader from "dataloader";
import { ItemService } from "../services/item.service";

/**
 * This is a demonstration of a simple case where simple calls can easily be batched.
 */
export const itemDataLoaderFactory = (itemService: ItemService) =>
  new DataLoader(async (ids: string[]) => {
    return itemService.getByIds(ids);
  });
