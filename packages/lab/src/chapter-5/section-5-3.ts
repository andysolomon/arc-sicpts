/**
 * Programs for the examples of section 5.3. Each is an ordinary program; the
 * memory scenes lay out the pairs it allocates (`memory.ts`), and the
 * garbage-collection scene then runs the book's collector on them.
 */

/**
 * The computation the section uses to show how much garbage a program makes:
 * two lists built only to be summed.
 */
export const memoryGarbageProgram = `function is_odd(n) {
    return n % 2 === 1;
}

const sum = accumulate((x, y) => x + y,
                       0,
                       filter(is_odd, enum_list(0, 6)));
`;

/** The list of the book's figure in §5.3.1. */
export const memoryFigureProgram = `const x = list(list(1, 2), 3, 4);
`;

/** A stack represented as a list of the saved values (§5.3.1). */
export const memoryStackProgram = `let the_stack = null;

function save(value) {
    the_stack = pair(value, the_stack);
}

function restore() {
    const value = head(the_stack);
    the_stack = tail(the_stack);
    return value;
}

save(1);
save(2);
restore();
save(3);
`;

/** Garbage made by rebinding a name, and structure shared by two pointers (§5.3.2). */
export const garbageCollectionProgram = `let xs = list(1, 2, 3);
const shared = pair(4, 5);
xs = list(shared, shared);
`;
