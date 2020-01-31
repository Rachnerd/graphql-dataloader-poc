import * as DataLoader from "dataloader";
import { PriceService } from "../services/price.service";

/**
 * This is a demonstration of a simple case where simple calls can easily be batched.
 */
export const priceDataLoaderFactory = (priceService: PriceService) =>
  new DataLoader(async (ids: string[]): Promise<{ id: string }[]> => {
    return priceService.getPrices(ids);
  });
