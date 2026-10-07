/**
 * The table of contents: every chapter, section and subsection of the book,
 * plus the flat reading order that prev/next, search and the sidebar share.
 */

export interface Subsection {
  id: string;
  title: string;
}

export interface Section {
  id: string;
  title: string;
  blurb: string;
  /** First and last exercise number within the chapter, where known. */
  exercises: readonly [first: number, last: number] | null;
  subsections: Subsection[];
}

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  readingTime: string | null;
  sections: Section[];
}

export interface Appendix {
  letter: string;
  slug: string;
  title: string;
}

const subs = (sectionId: string, titles: string[]): Subsection[] =>
  titles.map((title, i) => ({ id: `${sectionId}.${i + 1}`, title }));

export const chapters: Chapter[] = [
  {
    id: '1',
    title: 'Building Abstractions with Functions',
    blurb:
      'We start with the smallest possible language and ask what a program does when it runs. By the end of the chapter, functions are values, processes have shapes, and we can measure how they grow.',
    readingTime: '~3 h reading',
    sections: [
      {
        id: '1.1',
        title: 'The Elements of Programming',
        blurb:
          'Expressions, naming, functions, and the substitution model. Square roots by Newton’s method as the first real program.',
        exercises: [1, 8],
        subsections: subs('1.1', [
          'Expressions',
          'Naming and the Environment',
          'Evaluating Operator Combinations',
          'Compound Functions',
          'The Substitution Model for Function Application',
          'Conditional Expressions and Predicates',
          'Example: Square Roots by Newton’s Method',
          'Functions as Black-Box Abstractions',
        ]),
      },
      {
        id: '1.2',
        title: 'Functions and the Processes They Generate',
        blurb:
          'Recursive versus iterative processes, tree recursion, orders of growth, and the first measurements of a running program.',
        exercises: [9, 28],
        subsections: subs('1.2', [
          'Linear Recursion and Iteration',
          'Tree Recursion',
          'Orders of Growth',
          'Exponentiation',
          'Greatest Common Divisors',
          'Example: Testing for Primality',
        ]),
      },
      {
        id: '1.3',
        title: 'Formulating Abstractions with Higher-Order Functions',
        blurb:
          'Functions as arguments and as return values. Fixed points, Newton’s method generalised, and abstractions as first-class values.',
        exercises: [29, 46],
        subsections: subs('1.3', [
          'Functions as Arguments',
          'Constructing Functions using Lambda Expressions',
          'Functions as General Methods',
          'Functions as Returned Values',
        ]),
      },
    ],
  },
  {
    id: '2',
    title: 'Building Abstractions with Data',
    blurb:
      'Compound data lets a program talk about rational numbers, pictures and polynomials instead of bare numbers. The chapter is about the walls we build between how data is used and how it is represented.',
    readingTime: '~4 h reading',
    sections: [
      {
        id: '2.1',
        title: 'Introduction to Data Abstraction',
        blurb: 'Constructors and selectors as a contract, and what it means for something to be data at all.',
        exercises: [1, 16],
        subsections: subs('2.1', [
          'Example: Arithmetic Operations for Rational Numbers',
          'Abstraction Barriers',
          'What Is Meant by Data?',
          'Extended Exercise: Interval Arithmetic',
        ]),
      },
      {
        id: '2.2',
        title: 'Hierarchical Data and the Closure Property',
        blurb: 'Pairs that hold pairs: lists, trees, and sequence operations as a shared interface between program parts.',
        exercises: [17, 52],
        subsections: subs('2.2', [
          'Representing Sequences',
          'Hierarchical Structures',
          'Sequences as Conventional Interfaces',
          'Example: A Picture Language',
        ]),
      },
      {
        id: '2.3',
        title: 'Symbolic Data',
        blurb: 'Strings as symbols: differentiation of expressions, sets in three representations, and Huffman codes.',
        exercises: [53, 72],
        subsections: subs('2.3', [
          'Strings',
          'Example: Symbolic Differentiation',
          'Example: Representing Sets',
          'Example: Huffman Encoding Trees',
        ]),
      },
      {
        id: '2.4',
        title: 'Multiple Representations for Abstract Data',
        blurb: 'Two representations of complex numbers living side by side, kept apart by type tags and dispatch tables.',
        exercises: [73, 76],
        subsections: subs('2.4', [
          'Representations for Complex Numbers',
          'Tagged data',
          'Data-Directed Programming and Additivity',
        ]),
      },
      {
        id: '2.5',
        title: 'Systems with Generic Operations',
        blurb: 'One arithmetic package over many kinds of number, with coercion between types and polynomials on top.',
        exercises: [77, 97],
        subsections: subs('2.5', [
          'Generic Arithmetic Operations',
          'Combining Data of Different Types',
          'Example: Symbolic Algebra',
        ]),
      },
    ],
  },
  {
    id: '3',
    title: 'Modularity, Objects, and State',
    blurb:
      'Assignment gives objects a history, and takes away the substitution model. We rebuild our understanding of evaluation around environments, then meet two answers to the problem of time: concurrency and streams.',
    readingTime: '~4 h reading',
    sections: [
      {
        id: '3.1',
        title: 'Assignment and Local State',
        blurb: 'What a program gains when a name can change its value, and exactly what it loses.',
        exercises: [1, 8],
        subsections: subs('3.1', [
          'Local State Variables',
          'The Benefits of Introducing Assignment',
          'The Costs of Introducing Assignment',
        ]),
      },
      {
        id: '3.2',
        title: 'The Environment Model of Evaluation',
        blurb: 'Frames, bindings and enclosing environments: the model that explains closures and local state.',
        exercises: [9, 11],
        subsections: subs('3.2', [
          'The Rules for Evaluation',
          'Applying Simple Functions',
          'Frames as the Repository of Local State',
          'Internal Declarations',
        ]),
      },
      {
        id: '3.3',
        title: 'Modeling with Mutable Data',
        blurb: 'Mutable pairs, queues and tables, then two simulators built from them: digital circuits and constraints.',
        exercises: [12, 37],
        subsections: subs('3.3', [
          'Mutable List Structure',
          'Representing Queues',
          'Representing Tables',
          'A Simulator for Digital Circuits',
          'Propagation of Constraints',
        ]),
      },
      {
        id: '3.4',
        title: 'Concurrency: Time Is of the Essence',
        blurb: 'Interleaved processes sharing state, the orders in which they can go wrong, and serializers to tame them.',
        exercises: [38, 49],
        subsections: subs('3.4', [
          'The Nature of Time in Concurrent Systems',
          'Mechanisms for Controlling Concurrency',
        ]),
      },
      {
        id: '3.5',
        title: 'Streams',
        blurb: 'Delayed lists model a whole history as one value, so state can be described without assignment.',
        exercises: [50, 82],
        subsections: subs('3.5', [
          'Streams Are Delayed Lists',
          'Infinite Streams',
          'Exploiting the Stream Paradigm',
          'Streams and Delayed Evaluation',
          'Modularity of Functional Programs and Modularity of Objects',
        ]),
      },
    ],
  },
  {
    id: '4',
    title: 'Metalinguistic Abstraction',
    blurb:
      'The most powerful abstraction is a new language. We write an evaluator for our own language, then change its rules: lazy evaluation, nondeterministic search, and logic programming.',
    readingTime: '~4 h reading',
    sections: [
      {
        id: '4.1',
        title: 'The Metacircular Evaluator',
        blurb: 'Evaluate and apply, written in the language they implement.',
        exercises: [1, 22],
        subsections: subs('4.1', [
          'The Core of the Evaluator',
          'Representing Components',
          'Evaluator Data Structures',
          'Running the Evaluator as a Program',
          'Data as Programs',
          'Internal Declarations',
          'Separating Syntactic Analysis from Execution',
        ]),
      },
      {
        id: '4.2',
        title: 'Lazy Evaluation',
        blurb: 'An evaluator that delays arguments until they are needed, and the streams that fall out of it.',
        exercises: [23, 32],
        subsections: subs('4.2', [
          'Normal Order and Applicative Order',
          'An Interpreter with Lazy Evaluation',
          'Streams as Lazy Lists',
        ]),
      },
      {
        id: '4.3',
        title: 'Nondeterministic Computing',
        blurb: 'Programs that state requirements and let the evaluator search for values that satisfy them.',
        exercises: [33, 52],
        subsections: subs('4.3', [
          'Search and amb',
          'Examples of Nondeterministic Programs',
          'Implementing the amb Evaluator',
        ]),
      },
      {
        id: '4.4',
        title: 'Logic Programming',
        blurb: 'A query language where rules describe what is true and the system works out how to find it.',
        exercises: [53, 76],
        subsections: subs('4.4', [
          'Deductive Information Retrieval',
          'How the Query System Works',
          'Is Logic Programming Mathematical Logic?',
          'Implementing the Query System',
        ]),
      },
    ],
  },
  {
    id: '5',
    title: 'Computing with Register Machines',
    blurb:
      'We remove the last mystery: how the evaluator itself runs. Registers, a stack and a controller are enough to interpret our language, to manage its memory, and to compile it.',
    readingTime: null,
    sections: [
      {
        id: '5.1',
        title: 'Designing Register Machines',
        blurb: 'Data paths and controllers, subroutines, and a stack to implement recursion.',
        exercises: null,
        subsections: subs('5.1', [
          'A Language for Describing Register Machines',
          'Abstraction in Machine Design',
          'Subroutines',
          'Using a Stack to Implement Recursion',
          'Instruction Summary',
        ]),
      },
      {
        id: '5.2',
        title: 'A Register-Machine Simulator',
        blurb: 'An assembler and a simulator that run any machine we can describe, and count what it does.',
        exercises: null,
        subsections: subs('5.2', [
          'The Machine Model',
          'The Assembler',
          'Instructions and Their Execution Functions',
          'Monitoring Machine Performance',
        ]),
      },
      {
        id: '5.3',
        title: 'Storage Allocation and Garbage Collection',
        blurb: 'Pairs as cells in two vectors, and a stop-and-copy collector that keeps memory looking infinite.',
        exercises: null,
        subsections: subs('5.3', ['Memory as Vectors', 'Maintaining the Illusion of Infinite Memory']),
      },
      {
        id: '5.4',
        title: 'The Explicit-Control Evaluator',
        blurb: 'The evaluator of Chapter 4 as a register machine, with every stack operation in view.',
        exercises: null,
        subsections: subs('5.4', [
          'The Dispatcher and Basic Evaluation',
          'Evaluating Function Applications',
          'Blocks, Assignments, and Declarations',
          'Running the Evaluator',
        ]),
      },
      {
        id: '5.5',
        title: 'Compilation',
        blurb: 'Translating programs into register-machine instructions, and comparing compiled runs with interpreted ones.',
        exercises: null,
        subsections: subs('5.5', [
          'Structure of the Compiler',
          'Compiling Components',
          'Compiling Applications and Return Statements',
          'Combining Instruction Sequences',
          'An Example of Compiled Code',
          'Lexical Addressing',
          'Interfacing Compiled Code to the Evaluator',
        ]),
      },
    ],
  },
];

export const appendices: Appendix[] = [
  { letter: 'A', slug: 'grammar', title: 'Source grammar' },
  { letter: 'B', slug: 'laboratory-api', title: 'Laboratory API' },
  { letter: 'C', slug: 'repl', title: 'REPL reference' },
];

export type Page =
  | { kind: 'front'; path: string; crumb: string; title: string }
  | { kind: 'chapter'; path: string; crumb: string; title: string; chapter: Chapter }
  | { kind: 'section'; path: string; crumb: string; title: string; chapter: Chapter; section: Section }
  | {
      kind: 'subsection';
      path: string;
      crumb: string;
      title: string;
      chapter: Chapter;
      section: Section;
      subsection: Subsection;
    }
  | { kind: 'appendix'; path: string; crumb: string; title: string; appendix: Appendix };

export const FRONT_PATH = '/front';

/** Every page in reading order. */
export const pages: Page[] = [
  { kind: 'front', path: FRONT_PATH, crumb: 'front', title: 'How to use this book' },
  ...chapters.flatMap((chapter): Page[] => [
    { kind: 'chapter', path: `/${chapter.id}`, crumb: `ch ${chapter.id}`, title: chapter.title, chapter },
    ...chapter.sections.flatMap((section): Page[] => [
      {
        kind: 'section',
        path: `/${chapter.id}/${section.id}`,
        crumb: section.id,
        title: section.title,
        chapter,
        section,
      },
      ...section.subsections.map(
        (subsection): Page => ({
          kind: 'subsection',
          path: `/${chapter.id}/${subsection.id}`,
          crumb: subsection.id,
          title: subsection.title,
          chapter,
          section,
          subsection,
        }),
      ),
    ]),
  ]),
  ...appendices.map(
    (appendix): Page => ({
      kind: 'appendix',
      path: `/appendix/${appendix.slug}`,
      crumb: appendix.letter,
      title: appendix.title,
      appendix,
    }),
  ),
];

const byPath = new Map(pages.map((page) => [page.path, page]));

export function findPage(pathname: string): Page | null {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return byPath.get(normalised) ?? null;
}

/** The route for a chapter, section or subsection id such as `1`, `1.2` or `1.2.1`. */
export function pathOf(id: string): string {
  const chapter = id.split('.')[0] ?? id;
  return id === chapter ? `/${chapter}` : `/${chapter}/${id}`;
}

export function neighbours(page: Page): { previous: Page | null; next: Page | null } {
  const index = pages.indexOf(page);
  return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

/** The sidebar row that should be marked current for a page. */
export function sidebarPath(page: Page): string {
  return page.kind === 'subsection' ? pathOf(page.section.id) : page.path;
}

export function exerciseCount(section: Section): number | null {
  return section.exercises === null ? null : section.exercises[1] - section.exercises[0] + 1;
}
