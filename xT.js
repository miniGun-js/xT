/**
 * xT - Extendable PubSub Task & Event Manager for JavaScript
 * 
 * Simple minimal version is statically usable:
 * - on()   -> add task
 * - emit() -> execute task(s)
 * - queue  -> show task array
 * 
 * It's possible to create sub-instances which run as xT core instance tasks
 * // user = new xT('user', [features = {}])
 * 
 * Features mapped to Instance and are tasks in static core instance
 * - basic features: on(), emit(), queue() and internal used and replaceable filter()
 * - additional features which also added as instance properties with core instance task callbacks  
 *
 * // user = new xT('user', [features = { filter: newReplaceFilterCallback }])   // replace default filter
 * 
 * User / sub instances are hookable!
 * // xT.on('$user:emit', (...args) => console.log("DEBUG instance 'user' -> 'emit'", args))
 * 
 * Hook / replace / modify filter
 * // xT.on('$user:filter', newFilterWithRegex, {sort: -10, stop: 1})
 * 
 * Task options
 * - sort: sort < 0 -> hook before, sort > 0 -> hook after
 * - stop: Stop execution and so replace / remove all task with same topic and higher sort value
 * - once: Remove task after first execution
 * 
 * @see {@link constructor} 
 */
class xT {
    /**
     * @param {Array} #queue - static instance task queue
     */
    static #queue = []

    /**
     * Basic String match filter function
     * Used for static instance and base filter for user instances
     * 
     * @param {Array} filterQueue - Tasks to filter  
     * @param {String} topic - Filter argument
     * @returns {Array} Filtered Array with matching items
     */
    static #filter = (filterQueue, topic) => filterQueue.filter(task => task.topic == topic)

    /**
     * Task sort order callback
     *  
     * @param {Object} taskA - Task to compare
     * @param {Object} taskB - Task to compare
     * @returns {Array} Reference to sorted original Array
     */
    static #sortTasksByPriority = (taskA, taskB) => taskA.sort < taskB.sort ? -1 : 1

    /**
     * Internal add task method
     * 
     * @param {Array} currentQueue - Instance queue task will be added
     * @param {String} topic - Event name
     * @param {CallableFunction} cb - Task callback function 
     * @param {Object} [opts] - Optional task properties
     * @returns {Object} Added task object
     */
    static #on = (currentQueue, topic, cb, opts = {}) => {
        let task = { topic, cb, sort: 0, stop: 0, once: 0, ...opts }
        currentQueue.push(task)
        return task
    }

    /**
     * Internal task emit method
     * 
     * @param {Array} currentQueue - Array with instances tasks to execute
     * @param {Array} [args] - Optional task execution arguments 
     * @param {Object} [ctx] - Optional thisArg context
     * @returns {*} Task return value
     */
    static #emit = (currentQueue, args, ctx) => {
        let taskReturn
        for (let task of currentQueue.sort(xT.#sortTasksByPriority)) {
            ctx = ctx ? ctx : task.ctx ? task.ctx : task    // thisArg ctx(@emit) -> task.ctx -> task
            let result = task.cb.call(ctx || task.ctx, ...args)
            taskReturn = result ? result : taskReturn
            if(task.once) {
                removeTask(task)
            }
            if(task.stop) {
                break
            }
        }
        return taskReturn
    }

    /**
     * Static core instance task add method
     * 
     * @param {String} topic - Event name
     * @param {CallableFunction} cb - Task callback function 
     * @param {Object} [opts] - Optional task properties
     * @returns {Object} Added task object
     */
    static on = (topic, cb, opts) => xT.#on(xT.#queue, topic, cb, opts)

    /**
     * Static core instance task emit method
     * 
     * @param {Object} [ctx] - Optional task thisArg
     * @param {String} topic - Topic to execute
     * @param {Array} [args] - Arguments for task execution 
     * @returns {*} Task return value
     */
    static emit = (...args) => {
        let 
        ctx = args[0] instanceof Object ? args.shift() : null,
        topic = args.shift(),
        topicQueue = xT.#filter(xT.#queue, topic)
        return xT.#emit(topicQueue, args, ctx)
    }

    /**
     * @param {Array} queue - Expose core task queue to public
     */
    static queue = xT.#queue

    /**
     * @param {Object} #instances - Existing user instances 
     */
    static #instances = {}
    
    /**
     * Create / retrieve a new user instance 
     * 
     * @param {String} name - User instance name 
     * @param {Object} [features] - Optional user instance features (instanceProperty => callback)
     * @returns {Proxy} User instance with proxied features (as core instance tasks)
     */
    constructor(name, features = {}) {
        if(xT.#instances[name]) {
            console.log("Return existing instance")
            return xT.#instances[name]
        }
        features = {
            filter: xT.#filter,
            ...features,    // optional extend and replace filter
            queue: () => this.queue,
            on: xT.#on.bind(null, this.queue),
            emit: (...args) => {
                let 
                ctx = args[0] instanceof Object ? args.shift() : null,
                topic = args.shift(),
                topicQueue = xT.emit(/*[thisArg,]*/ `$${name}:filter`, this.queue, topic)
                //console.log("THIS::EMIT", `$${name}:filter`, topicQueue, this.queue, topic)
                return xT.#emit(topicQueue, args, ctx)
            }
        }
        // add features to instance
        Object.entries(features).forEach(([prop, action]) => xT.on(`$${name}:${prop}`, action))
        // return and save current instance Proxy
        return xT.#instances[name] = new Proxy(Object.defineProperty(features, 'name', { value: name }), {
            // instance properteies emit @ static core
            get: (target, prop) => {
                if(Object.keys(features).includes(prop)) {
                    return xT.emit.bind(null, `$${name}:${prop}`)
                } else {
                    return xT.#instances[name].emit.bind(prop)
                }
            }
        })
    }
    
    /**
     * @param {Array} queue - User instance task queue 
     */
    queue = []
}
