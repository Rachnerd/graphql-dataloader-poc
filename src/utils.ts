import { GraphQLResolveInfo } from "graphql";

const timestamp = () => new Date().toISOString().substr(11, 12);

export const log = value => console.log(`${timestamp()}: ${value}`);

export const delayedValue = <T>(value: T, delay: number) =>
  new Promise(resolve => {
    setTimeout(() => resolve(value), delay);
  });

export const tap = (cb: () => void) => value => {
  cb();
  return value;
};

export const hasQueried = (pathString: string, info: GraphQLResolveInfo) => {
  const path = pathString.split(".");
  let validatedPath = info.fieldNodes[0].selectionSet.selections;

  for (let i = 0; i < path.length; i++) {
    const fields = validatedPath.find(
      ({ name: { value } }: any) => value === path[i]
    );
    if (!fields) {
      return false;
    }
    if (i !== path.length - 1) {
      validatedPath = (fields as any).selectionSet.selections;
    }
  }
  return true;
};

export const normalize = <T extends Record<"id", string>>(
  array: T[]
): { [key: string]: T } =>
  array.reduce(
    (acc, value) => ({
      ...acc,
      [value.id]: value
    }),
    {}
  );
