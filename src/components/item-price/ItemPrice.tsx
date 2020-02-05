import React from "react";
import { GQLItemPriceFragment } from "../../../.generated/gql.model";

export interface ItemPriceProps {
  price: GQLItemPriceFragment;
}

export const ItemPrice: React.FC<ItemPriceProps> = ({
  price: { amount, currency }
}) => {
  return (
    <div>
      {amount} {currency}
    </div>
  );
};
