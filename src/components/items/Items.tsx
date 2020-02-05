import React from "react";
import { useItemsQuery } from "../../../.generated/gql.model";
import { List, ListItem } from "../../ui-components/list/List";
import { Item } from "../item/Item";

export const Items: React.FC = () => {
  const { data, loading, error } = useItemsQuery({
    context: {
      /**
       *  We don't want to batch this expensive call.
       */
      batch: false
    }
  });

  if (loading) {
    return <p>Loading</p>;
  }

  if (error) {
    return <p>Error</p>;
  }

  return (
    data && (
      <List>
        {data.allItems.map(item => (
          <ListItem key={item.id}>
            <Item
              item={item}
              onAddToCart={id => console.log(`Add item ${id} to the cart`)}
            />
          </ListItem>
        ))}
      </List>
    )
  );
};
