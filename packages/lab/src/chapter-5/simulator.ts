import { onlyDeclarations, withoutDeclarations } from './pieces.ts';

/**
 * Section 5.2: the register-machine simulator, written in Source as the book
 * writes it. Each export is the code of one subsection; `simulatorSource` is
 * all of it. A program that declares these functions shadows the Laboratory's
 * own `make_machine` and runs machines on this simulator instead.
 */

export const machineModelSource = `const make_machine = (register_names, ops, controller) => {
    const machine = make_new_machine();
    for_each(register_name =>
               machine("allocate_register")(register_name),
             register_names);
    machine("install_operations")(ops);
    machine("install_instruction_sequence")
           (assemble(controller, machine));
    return machine;
};

const make_register = (name) => {
    let contents = "*unassigned*";
    const dispatch = (message) =>
        message === "get"
               ? contents
               : message === "set"
               ? value => { contents = value; }
               : error(message, "unknown request -- make_register");
    return dispatch;
};

const get_contents = (register) =>
    register("get");

const set_contents = (register, value) =>
    register("set")(value);

const make_stack = () => {
    let stack = null;
    let frame = null;
    let number_pushes = 0;
    let max_depth = 0;
    let current_depth = 0;
    const push = (x) => {
        stack = pair(x, stack);
        number_pushes = number_pushes + 1;
        current_depth = current_depth + 1;
        max_depth = math_max(current_depth, max_depth);
        return "done";
    };
    const pop = () => {
        if (is_null(stack)) {
            error("empty stack -- pop");
        } else {
            const top = head(stack);
            stack = tail(stack);
            current_depth = current_depth - 1;
            return top;
        }
    };
    const push_marker = () => {
        frame = pair(pair(stack, current_depth), frame);
        return "done";
    };
    const pop_marker = () => {
        stack = head(head(frame));
        current_depth = tail(head(frame));
        frame = tail(frame);
        return "done";
    };
    const initialize = () => {
        stack = null;
        frame = null;
        number_pushes = 0;
        max_depth = 0;
        current_depth = 0;
        return "done";
    };
    const print_statistics = () => {
        display("total pushes = " + stringify(number_pushes));
        display("maximum depth = " + stringify(max_depth));
    };
    const dispatch = (message) =>
        message === "push"
               ? push
               : message === "pop"
               ? pop()
               : message === "push_marker"
               ? push_marker()
               : message === "pop_marker"
               ? pop_marker()
               : message === "initialize"
               ? initialize()
               : message === "print_statistics"
               ? print_statistics()
               : error(message, "unknown request -- stack");
    return dispatch;
};

const pop = (stack) =>
    stack("pop");

const push = (stack, value) =>
    stack("push")(value);

const push_marker = (stack) =>
    stack("push_marker");

const pop_marker = (stack) =>
    stack("pop_marker");

const make_new_machine = () => {
    const pc = make_register("pc");
    const flag = make_register("flag");
    const stack = make_stack();
    let the_instruction_sequence = null;
    let the_ops = list(list("initialize_stack",
                            () => stack("initialize")),
                       list("print_stack_statistics",
                            () => stack("print_statistics")));
    let register_table = list(list("pc", pc), list("flag", flag));
    const allocate_register = (name) => {
        if (is_undefined(assoc(name, register_table))) {
            register_table = pair(list(name, make_register(name)),
                                  register_table);
        } else {
            error(name, "multiply defined register");
        }
        return "register allocated";
    };
    const lookup_register = (name) => {
        const val = assoc(name, register_table);
        return is_undefined(val)
               ? error(name, "unknown register")
               : head(tail(val));
    };
    const execute = () => {
        const insts = get_contents(pc);
        if (is_null(insts)) {
            return "done";
        } else {
            inst_execution_fun(head(insts))();
            return execute();
        }
    };
    const dispatch = (message) => {
        const start = () => {
            set_contents(pc, the_instruction_sequence);
            return execute();
        };
        return message === "start"
               ? start()
               : message === "install_instruction_sequence"
               ? seq => { the_instruction_sequence = seq; }
               : message === "allocate_register"
               ? allocate_register
               : message === "get_register"
               ? lookup_register
               : message === "install_operations"
               ? ops => { the_ops = append(the_ops, ops); }
               : message === "stack"
               ? stack
               : message === "operations"
               ? the_ops
               : error(message, "unknown request -- machine");
    };
    return dispatch;
};

const start = (machine) =>
    machine("start");

const get_register_contents = (machine, register_name) =>
    get_contents(get_register(machine, register_name));

const set_register_contents = (machine, register_name, value) => {
    set_contents(get_register(machine, register_name), value);
    return "done";
};

const get_register = (machine, reg_name) =>
    machine("get_register")(reg_name);
`;

export const assemblerSource = `const assemble = (controller, machine) =>
    extract_labels(controller,
                          (insts, labels) => {
                              update_insts(insts, labels, machine);
                              return insts;
                          });

const extract_labels = (controller, receive) =>
    is_null(controller)
           ? receive(null, null)
           : extract_labels(
                 tail(controller),
                 (insts, labels) => {
                     const next_element = head(controller);
                     return is_string(next_element)
                            ? receive(insts,
                                      pair(make_label_entry(next_element,
                                                            insts),
                                           labels))
                            : receive(pair(make_inst(next_element),
                                           insts),
                                      labels);
                 });

const update_insts = (insts, labels, machine) => {
    const pc = get_register(machine, "pc");
    const flag = get_register(machine, "flag");
    const stack = machine("stack");
    const ops = machine("operations");
    return for_each(inst => set_inst_execution_fun(
                                inst,
                                make_execution_function(
                                    inst_controller_instruction(inst),
                                    labels, machine, pc,
                                    flag, stack, ops)),
                    insts);
};

const make_inst = (inst_controller_instruction) =>
    pair(inst_controller_instruction, null);

const inst_controller_instruction = (inst) =>
    head(inst);

const inst_execution_fun = (inst) =>
    tail(inst);

const set_inst_execution_fun = (inst, fun) => {
    set_tail(inst, fun);
};

const make_label_entry = (label_name, insts) =>
    pair(label_name, insts);

const lookup_label = (labels, label_name) => {
    const val = assoc(label_name, labels);
    return is_undefined(val)
           ? error(label_name, "undefined label -- assemble")
           : tail(val);
};
`;

export const executionSource = `const make_execution_function = (inst, labels, machine,
                                 pc, flag, stack, ops) =>
    type(inst) === "assign"
           ? make_assign_ef(inst, machine, labels, ops, pc)
           : type(inst) === "test"
           ? make_test_ef(inst, machine, labels, ops, flag, pc)
           : type(inst) === "branch"
           ? make_branch_ef(inst, machine, labels, flag, pc)
           : type(inst) === "go_to"
           ? make_go_to_ef(inst, machine, labels, pc)
           : type(inst) === "save"
           ? make_save_ef(inst, machine, stack, pc)
           : type(inst) === "restore"
           ? make_restore_ef(inst, machine, stack, pc)
           : type(inst) === "push_marker_to_stack"
           ? make_push_marker_to_stack_ef(machine, stack, pc)
           : type(inst) === "revert_stack_to_marker"
           ? make_revert_stack_to_marker_ef(machine, stack, pc)
           : type(inst) === "perform"
           ? make_perform_ef(inst, machine, labels, ops, pc)
           : error(inst, "unknown instruction type -- assemble");

const type = (instruction) => head(instruction);

const make_assign_ef = (inst, machine, labels, operations, pc) => {
    const target = get_register(machine, assign_reg_name(inst));
    const value_exp = assign_value_exp(inst);
    const value_fun =
        is_operation_exp(value_exp)
        ? make_operation_exp_ef(value_exp, machine, labels, operations)
        : make_primitive_exp_ef(value_exp, machine, labels);
    return () => {
               set_contents(target, value_fun());
               advance_pc(pc);
           };
};

const assign = (register_name, source) =>
    list("assign", register_name, source);
const assign_reg_name = (assign_instruction) =>
    head(tail(assign_instruction));
const assign_value_exp = (assign_instruction) =>
    head(tail(tail(assign_instruction)));

const advance_pc = (pc) => {
    set_contents(pc, tail(get_contents(pc)));
};

const make_test_ef = (inst, machine, labels, operations, flag, pc) => {
    const condition = test_condition(inst);
    if (is_operation_exp(condition)) {
        const condition_fun = make_operation_exp_ef(
                                  condition, machine,
                                  labels, operations);
        return () => {
                   set_contents(flag, condition_fun());
                   advance_pc(pc);
               };
    } else {
        error(inst, "bad test instruction -- assemble");
    }
};

const test = (condition) => list("test", condition);
const test_condition = (test_instruction) =>
    head(tail(test_instruction));

const make_branch_ef = (inst, machine, labels, flag, pc) => {
    const dest = branch_dest(inst);
    if (is_label_exp(dest)) {
        const insts = lookup_label(labels, label_exp_label(dest));
        return () => {
                   if (get_contents(flag)) {
                       set_contents(pc, insts);
                   } else {
                       advance_pc(pc);
                   }
               };
    } else {
        error(inst, "bad branch instruction -- assemble");
    }
};

const branch = (label) => list("branch", label);
const branch_dest = (branch_instruction) =>
    head(tail(branch_instruction));

const make_go_to_ef = (inst, machine, labels, pc) => {
    const dest = go_to_dest(inst);
    if (is_label_exp(dest)) {
        const insts = lookup_label(labels, label_exp_label(dest));
        return () => set_contents(pc, insts);
    } else if (is_register_exp(dest)) {
        const reg = get_register(machine, register_exp_reg(dest));
        return () => set_contents(pc, get_contents(reg));
    } else {
        error(inst, "bad go_to instruction -- assemble");
    }
};

const go_to = (label) => list("go_to", label);
const go_to_dest = (go_to_instruction) =>
    head(tail(go_to_instruction));

const make_save_ef = (inst, machine, stack, pc) => {
    const reg = get_register(machine, stack_inst_reg_name(inst));
    return () => {
               push(stack, get_contents(reg));
               advance_pc(pc);
           };
};

const make_restore_ef = (inst, machine, stack, pc) => {
    const reg = get_register(machine, stack_inst_reg_name(inst));
    return () => {
               set_contents(reg, pop(stack));
               advance_pc(pc);
           };
};

const save = (reg) => list("save", reg);
const restore = (reg) => list("restore", reg);
const stack_inst_reg_name = (stack_instruction) =>
    head(tail(stack_instruction));

const make_push_marker_to_stack_ef = (machine, stack, pc) =>
    () => {
               push_marker(stack);
               advance_pc(pc);
           };

const make_revert_stack_to_marker_ef = (machine, stack, pc) =>
    () => {
               pop_marker(stack);
               advance_pc(pc);
           };

const push_marker_to_stack = () => list("push_marker_to_stack");
const revert_stack_to_marker = () => list("revert_stack_to_marker");

const make_perform_ef = (inst, machine, labels, operations, pc) => {
    const action = perform_action(inst);
    if (is_operation_exp(action)) {
        const action_fun = make_operation_exp_ef(action, machine,
                                                 labels, operations);
        return () => {
                   action_fun();
                   advance_pc(pc);
               };
    } else {
        error(inst, "bad perform instruction -- assemble");
    }
};

const perform = (action) => list("perform", action);
const perform_action = (perform_instruction) =>
    head(tail(perform_instruction));

const make_primitive_exp_ef = (exp, machine, labels) => {
    if (is_constant_exp(exp)) {
        const c = constant_exp_value(exp);
        return () => c;
    } else if (is_label_exp(exp)) {
        const insts = lookup_label(labels, label_exp_label(exp));
        return () => insts;
    } else if (is_register_exp(exp)) {
        const r = get_register(machine, register_exp_reg(exp));
        return () => get_contents(r);
    } else {
        error(exp, "unknown expression type -- assemble");
    }
};

const reg = (name) => list("reg", name);
const is_register_exp = (exp) => is_tagged_list(exp, "reg");
const register_exp_reg = (exp) => head(tail(exp));
const constant = (value) => list("constant", value);
const is_constant_exp = (exp) =>
    is_tagged_list(exp, "constant");
const constant_exp_value = (exp) => head(tail(exp));
const label = (name) => list("label", name);
const is_label_exp = (exp) => is_tagged_list(exp, "label");
const label_exp_label = (exp) => head(tail(exp));

const make_operation_exp_ef = (exp, machine, labels, operations) => {
    const op = lookup_prim(operation_exp_op(exp), operations);
    const afuns = map(e => make_primitive_exp_ef(e, machine, labels),
                      operation_exp_operands(exp));
    return () => apply_in_underlying_javascript(
                     op, map(f => f(), afuns));
};

const op = (name) => list("op", name);
const is_operation_exp = (exp) =>
    is_pair(exp) && is_tagged_list(head(exp), "op");
const operation_exp_op = (op_exp) => head(tail(head(op_exp)));
const operation_exp_operands = (op_exp) => tail(op_exp);

const lookup_prim = (symbol, operations) => {
    const val = assoc(symbol, operations);
    return is_undefined(val)
           ? error(symbol, "unknown operation -- assemble")
           : head(tail(val));
};
`;

/** The complete simulator of §5.2. */
export const simulatorSource = [machineModelSource, assemblerSource, executionSource].join('\n');

/**
 * The simulator without the named functions: the context for an exercise in
 * which the reader supplies those functions, in the same frame, so that the
 * rest of the simulator calls the reader's versions.
 */
export const simulatorWithout = (names: readonly string[]): string => withoutDeclarations(simulatorSource, names);

/** Just the named functions of the simulator, in the order the simulator declares them. */
export const simulatorFunctions = (names: readonly string[]): string => onlyDeclarations(simulatorSource, names);
