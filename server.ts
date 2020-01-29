import { ApolloServer, gql } from 'apollo-server';

const typeDefs = gql`
    type A {
        b: B!
    }

    type B {
        c: C!
    }

    type C {
        test: String!
    }

    type X {
        test: String!
    }

    type Query {
        a: A!
        x: X!
    }
`;

const timestamp = () => new Date().toISOString().substr(11, 12);

const log = value => console.log(`${timestamp()}: ${value}`);

const respondWithDelay = (value: any, cb: () => void, delay = 0) => new Promise(resolve => {
    setTimeout(() => {
        resolve(value);
        cb();
    }, delay)
});

const server = new ApolloServer({
    typeDefs, resolvers: {
        Query: {
            a: () => {
                const delay = 500;
                log(`Called Query a (delay: ${delay}ms)`);
                return respondWithDelay({}, () => log(`Resolved Query a `), delay);
            },
            x: () => {
                const delay = 5000;
                log(`Called Query x (delay: ${delay}ms)`);
                return respondWithDelay({test: 'x'}, () => log(`Resolved Query x`), delay);
            }
        },
        A: {
            b: () => {
                const delay = 500;
                log(`Called A.b (delay: ${delay}ms)`);
                return respondWithDelay({}, () => log(`Resolved A.b `), delay);
            }
        },
        B: {
            c: () => {
                const delay = 500;
                log(`Called B.c (delay: ${delay}ms)`);
                return respondWithDelay({test: 'c'}, () => log(`Resolved B.c `), delay);
            }
        }

    }
});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
    console.log(`🚀  Server ready at ${url}`);
});