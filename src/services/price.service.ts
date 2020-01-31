import { delayedValue, log, tap } from "../utils";

export class PriceService {
  async getPrice() {
    const delay = 200;
    return delayedValue(
      {
        currency: "EUR",
        amount: Math.random()
      },
      delay
    ).then(tap(() => log(`PriceService getPrice responded within ${delay}ms`)));
  }

  async getPrices(ids: string[]) {
    const delay = 200;
    return delayedValue(
      ids.map(id => ({
        id,
        currency: "EUR",
        amount: Math.random()
      })),
      delay
    ).then(
      tap(() => log(`PriceService getPrices responded within ${delay}ms`))
    );
  }
}
