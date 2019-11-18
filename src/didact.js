const isProp = key => key !== "children";
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);
const isEvent = key => key.startsWith("on");
const isProperty = key => key !== "children" && !isEvent(key);
const toEventType = name => name.toLowerCase().substring(2);

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      )
    }
  };
}

function createDom(fiber) {
  // create element
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  // add attributes
  Object.keys(fiber.props)
    .filter(isProp)
    .forEach(name => {
      dom[name] = fiber.props[name];
    });

  return dom;
}

let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = [];

function updateDom(dom, prevProps, nextProps) {
  const isDead = isGone(prevProps, nextProps);
  const isNext = isNew(prevProps, nextProps);

  // remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => isDead(key) || isNext(key))
    .forEach(name => {
      const eventType = toEventType(name);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isDead)
    .forEach(name => {
      dom[name] = "";
    });

  // upsert props
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = toEventType(name);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  // recursevely commit tree to DOM
  const domParent = fiber.parent.dom;

  switch (fiber.effectTag) {
    case "PLACEMENT":
      if (fiber.dom != null) domParent.appendChild(fiber.dom);
      break;

    case "UPDATE":
      if (fiber.dom != null)
        updateDom(fiber.dom, fiber.alternate.props, fiber.props);
      break;

    default:
      domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let prevSibling = null;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;

  while (index < elements.lenght || oldFiber !== null) {
    const element = elements[index];
    let newFiber = null;

    const sameType = oldFiber && element && element.type == oldFiber.type;

    // same tagname, just update the node
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      };
    }

    // different type and new element, add it
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }

    // different type and old, remove it
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // and add each fiber to the tree
    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

function performUnitOfWork(fiber) {
  // create dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // for each children, create a new fiber
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);

  // search for the next unit of work
  // first go down on fiber children
  if (fiber.child) {
    return fiber.child;
  }

  // if fiber has no children,
  // check siblings or return to parent
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function workLoop(deadline) {
  let shouldYield = false;

  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // append to DOM if there's no more work
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

const Didact = {
  createElement,
  render
};

export default Didact;
