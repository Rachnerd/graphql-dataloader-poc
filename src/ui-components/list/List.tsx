import "./List.scss";
import React, { HTMLAttributes } from "react";
import classnames from "classnames";

export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  highlightOnHover?: boolean;
}

export const List: React.FC<ListProps> = ({
  children,
  highlightOnHover = false,
  className,
  ...htmlProps
}) => (
  <ul
    {...htmlProps}
    className={classnames(
      "poc-list",
      {
        "poc-list--highlight": highlightOnHover
      },
      className
    )}
  >
    {children}
  </ul>
);

export interface ListItemProps {
  onClick?: (event: React.MouseEvent) => void;
}

export const ListItem: React.FC<ListItemProps> = ({ children }) => (
  <li className={"poc-list__item"}>{children}</li>
);
