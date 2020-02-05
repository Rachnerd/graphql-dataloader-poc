import React from "react";
import { GQLItemFullFragment } from "../../../.generated/gql.model";
import { ItemPrice } from "../item-price/ItemPrice";

interface ItemProps {
  item: GQLItemFullFragment;
  onAddToCart: (id: string) => void;
}

export const Item: React.FC<ItemProps> = ({
  item: { price, ...item },
  onAddToCart
}) => {
  return (
    <div>
      <h4>{item.name}</h4>
      <ItemPrice price={price} />
      <button onClick={() => onAddToCart(item.id)}>Add to cart</button>
    </div>
  );
};
