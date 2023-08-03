# xT
Extendable PubSub Task &amp; Event Manager for JavaScript

## Simple minimal version is statically usable:
- on()   -> add task
- emit() -> execute task(s)
- queue  -> show task array
  
## It's possible to create sub-instances which run as xT core instance tasks
```
user = new xT('user', [features = {}])
```

Features mapped to Instance and are tasks in static core instance
- basic features: on(), emit(), queue() and internal used and replaceable filter()
- additional features which also added as instance properties with core instance task callbacks  
```
user = new xT('user', [features = { filter: newReplaceFilterCallback }])   // replace default filter
```

Example wildcard filter
```
user = new $("user", { filter: (filterQueue, topic) => {
    console.log("$user:filter", "WILDCARD", topic, filterQueue, this)
    if(topic[topic.length -1] == '*') {
        return filterQueue.filter(task => task.topic.startsWith(topic.slice(0, -1)))
    }
    return filterQueue.filter(task => task.topic == topic)
}})
```

User / sub instances are hookable!
```
xT.on('$user:emit', (...args) => console.log("DEBUG instance 'user' -> 'emit'", args))
```

Hook / replace / modify filter
```
xT.on('$user:filter', newFilterWithRegex, {sort: -10, stop: 1})
```

Task options
- sort: sort < 0 -> hook before, sort > 0 -> hook after
- stop: Stop execution and so replace / remove all task with same topic and higher sort value
- once: Remove task after first execution
