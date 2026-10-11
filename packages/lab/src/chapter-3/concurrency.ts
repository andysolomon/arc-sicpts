/**
 * Programs of §3.4, shared by the Book's examples and the Laboratory's tests.
 *
 * A serializer takes a function of any number of arguments and returns one
 * that takes the same arguments, as in SICP: `protect(withdraw)` is a
 * serialized withdrawal. `concurrent_execute` takes functions of none.
 */

/** §3.4.1: Peter and Paul withdraw from a joint account at the same time. */
export const jointAccountProgram = `let balance = 100;

const withdraw = (amount: number): number | string => {
    if (balance >= amount) {
        balance = balance - amount;
        return balance;
    } else {
        return "Insufficient funds";
    }
};

concurrent_execute(() => withdraw(10),   // Peter
                   () => withdraw(25));  // Paul
balance;
`;

/** §3.4.1: a deposit and a withdrawal of half the money; two serial orders, two right answers. */
export const peterPaulDepositProgram = `let balance = 100;

concurrent_execute(() => { balance = balance + 40; },             // Peter deposits $40
                   () => { balance = balance - balance / 2; });  // Paul withdraws half
balance;
`;

/**
 * §3.4.1: the same two withdrawals as async functions. They can interleave
 * only where one of them awaits, so the program needs no seed: Peter's
 * withdrawal is lost every time.
 */
export const awaitInterleavingProgram = `let balance = 100;

const withdraw = async (amount: number): Promise<number> => {
    const current = balance;
    await null;                    // other work may run here
    balance = current - amount;
    return balance;
};

const peter = withdraw(10);
const paul = withdraw(25);
await peter;
await paul;
balance;
`;

/** §3.4.2: every way to interleave two processes of three steps each. */
export const interleavingCountProgram = `const interleave = <T>(xs: List<T>, ys: List<T>): List<List<T>> =>
    is_null(xs)
    ? list(ys)
    : is_null(ys)
    ? list(xs)
    : append(map(rest => pair(head(xs), rest), interleave(tail(xs), ys)),
             map(rest => pair(head(ys), rest), interleave(xs, tail(ys))));

const orders = interleave(list("a", "b", "c"), list("x", "y", "z"));
for_each(order => display(accumulate((step, rest) => step + rest, "", order)),
         orders);
length(orders);
`;

/** §3.4.2: two unserialized threads change x; five final values are possible. */
export const squareIncrementProgram = `let x = 10;

concurrent_execute(() => { x = x * x; },
                   () => { x = x + 1; });
x;
`;

/** §3.4.2: a mutex built on the atomic test_and_set. */
export const mutexDefinitions = `type Mutex = (m: "acquire" | "release") => void;

const make_mutex = (): Mutex => {
    const cell = list(false);
    const the_mutex = (m: "acquire" | "release"): true | void =>
        m === "acquire"
        ? test_and_set(cell)
          ? the_mutex("acquire")  // retry
          : true
        : m === "release"
        ? clear(cell)
        : error(m, "unknown request -- mutex");
    return the_mutex;
};

const clear = (cell: List<boolean>): void => {
    set_head(cell, false);
};
`;

/** §3.4.2: a serializer is a mutex shared by every function it protects. */
export const serializerDefinitions = `${mutexDefinitions}
type Serializer = <R>(f: (...args: List<unknown>) => R) => (...args: List<unknown>) => R;

const make_serializer = (): Serializer => {
    const mutex = make_mutex();
    return f => {
               const serialized_f = (...args: List<unknown>): unknown => {
                   mutex("acquire");
                   const val = f(...args);
                   mutex("release");
                   return val;
               };
               return serialized_f;
           };
};
`;

/** §3.4.2: the same two threads, serialized by one serializer: only 101 and 121 remain. */
export const serializedSquareIncrementProgram = `${serializerDefinitions}
let x = 10;
const s = make_serializer();

concurrent_execute(s(() => { x = x * x; }),
                   s(() => { x = x + 1; }));
x;
`;

/** §3.4.2: a bank account whose withdrawals and deposits are serialized. */
export const serializedAccountDefinitions = `type Transaction = (amount: number) => number | string;
type Account = (m: "withdraw" | "deposit" | "balance") => Transaction | number;

const make_account = (balance: number): Account => {
    const withdraw = (amount: number): number | string => {
        if (balance >= amount) {
            balance = balance - amount;
            return balance;
        } else {
            return "Insufficient funds";
        }
    };
    const deposit = (amount: number): number => {
        balance = balance + amount;
        return balance;
    };
    const protect = make_serializer();
    const dispatch = (m: "withdraw" | "deposit" | "balance"): Transaction | number =>
        m === "withdraw"
        ? protect(withdraw)
        : m === "deposit"
        ? protect(deposit)
        : m === "balance"
        ? balance
        : error(m, "unknown request -- make_account");
    return dispatch;
};
`;

export const serializedAccountProgram = `${serializerDefinitions}
${serializedAccountDefinitions}
const account = make_account(100);

concurrent_execute(() => account("withdraw")(10),   // Peter
                   () => account("withdraw")(25));  // Paul
account("balance");
`;

/** §3.4.2: exchanging the balances of two accounts, serialized only account by account. */
export const accountExchangeDefinitions = `const exchange = (account1: Account, account2: Account): void => {
    const difference = account1("balance") - account2("balance");
    account1("withdraw")(difference);
    account2("deposit")(difference);
};
`;

/** The three balances as one short string, for the histogram of outcomes. */
const balancesOf = `stringify(a("balance")) + " " + stringify(b("balance")) + " " + stringify(c("balance"));`;

export const unserializedExchangeProgram = `${serializerDefinitions}
${serializedAccountDefinitions}
${accountExchangeDefinitions}
const a = make_account(10);
const b = make_account(20);
const c = make_account(30);

concurrent_execute(() => exchange(a, b),   // Peter
                   () => exchange(a, c));  // Paul
${balancesOf}
`;

/** §3.4.2: an account that exports its serializer, so that exchange can hold both accounts. */
export const accountSerializerDefinitions = `type Transaction = (amount: number) => number | string;
type Account = (m: "withdraw" | "deposit" | "balance" | "serializer") => Transaction | number | Serializer;

const make_account_and_serializer = (balance: number): Account => {
    const withdraw = (amount: number): number | string => {
        if (balance >= amount) {
            balance = balance - amount;
            return balance;
        } else {
            return "Insufficient funds";
        }
    };
    const deposit = (amount: number): number => {
        balance = balance + amount;
        return balance;
    };
    const balance_serializer = make_serializer();
    return m => m === "withdraw"
                ? withdraw
                : m === "deposit"
                ? deposit
                : m === "balance"
                ? balance
                : m === "serializer"
                ? balance_serializer
                : error(m, "unknown request -- make_account");
};

const serialized_exchange = (account1: Account, account2: Account): void => {
    const serializer1 = account1("serializer");
    const serializer2 = account2("serializer");
    return serializer1(serializer2(exchange))(account1, account2);
};
`;

export const serializedExchangeProgram = `${serializerDefinitions}
${accountSerializerDefinitions}
${accountExchangeDefinitions}
const a = make_account_and_serializer(10);
const b = make_account_and_serializer(20);
const c = make_account_and_serializer(30);

concurrent_execute(() => serialized_exchange(a, b),   // Peter
                   () => serialized_exchange(a, c));  // Paul
${balancesOf}
`;

/** §3.4.2: three serialized increments; the mutex makes them take turns. */
export const mutexCounterProgram = `${serializerDefinitions}
let count = 0;
const s = make_serializer();
const increment = (): void => {
    count = count + 1;
};

concurrent_execute(s(increment), s(increment), s(increment));
count;
`;

/** §3.4.2: Peter exchanges a with b while Paul exchanges b with a. Sometimes neither finishes. */
export const exchangeDeadlockProgram = `${serializerDefinitions}
${accountSerializerDefinitions}
${accountExchangeDefinitions}
const a = make_account_and_serializer(10);
const b = make_account_and_serializer(20);

concurrent_execute(() => serialized_exchange(a, b),   // Peter
                   () => serialized_exchange(b, a));  // Paul
stringify(a("balance")) + " " + stringify(b("balance"));
`;
