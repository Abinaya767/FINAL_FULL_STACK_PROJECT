function question(prompt, options, answer) {
  return { prompt, options, answer };
}

export const webDevelopmentModules = [
  {
    title: "Introduction to Web Development",
    description: "Understand websites, browsers, and how the web delivers pages.",
    lessons: ["Introduction to Websites", "How the Web Works", "Browsers and Web Servers"],
    quiz: [
      question("What is a website?", ["A collection of related web pages", "A computer part", "A database password", "An operating system"], 0),
      question("Which application requests and displays web pages?", ["Compiler", "Web browser", "Spreadsheet", "Text editor"], 1),
      question("What does a web server do?", ["Designs images", "Stores browser history", "Responds to requests for web resources", "Creates CSS selectors"], 2),
      question("Which protocol is commonly used to transfer web pages?", ["FTP only", "SMTP", "SSH", "HTTP"], 3),
      question("What does a URL identify?", ["The address of a resource", "A CSS color", "A JavaScript variable", "A screen resolution"], 0),
    ],
  },
  {
    title: "HTML Fundamentals",
    description: "Build semantic page structure with HTML elements and attributes.",
    lessons: ["HTML Document Structure", "Elements and Attributes", "Semantic HTML"],
    quiz: [
      question("What does HTML stand for?", ["Hyper Text Markup Language", "High Text Machine Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], 0),
      question("Which element represents the largest default heading?", ["<heading>", "<h6>", "<h1>", "<head>"], 2),
      question("Which element creates a hyperlink?", ["<link>", "<a>", "<href>", "<url>"], 1),
      question("Which attribute specifies a link destination?", ["src", "alt", "href", "target"], 2),
      question("Which element displays an image?", ["<image>", "<picture>", "<img>", "<src>"], 2),
    ],
  },
  {
    title: "HTML Forms and Tables",
    description: "Collect user input accessibly and organize data in tables.",
    lessons: ["Form Controls", "Labels and Validation", "Tables and Data"],
    quiz: [
      question("Which element groups controls for submission?", ["<form>", "<fieldset>", "<label>", "<table>"], 0),
      question("Which attribute connects a label with an input id?", ["name", "for", "value", "action"], 1),
      question("Which input type is intended for email addresses?", ["text", "mail", "email", "address"], 2),
      question("Which element defines a table row?", ["<td>", "<th>", "<table-row>", "<tr>"], 3),
      question("Which method normally keeps submitted values out of the URL?", ["POST", "GET", "LINK", "HEAD"], 0),
    ],
  },
  {
    title: "CSS Fundamentals",
    description: "Style web pages with selectors, declarations, and the cascade.",
    lessons: ["CSS Rules and Selectors", "Colors and Typography", "Cascade and Inheritance"],
    quiz: [
      question("What does CSS control?", ["Page structure", "Presentation and layout", "Database records", "Network routing"], 1),
      question("Which symbol begins a class selector?", ["#", ".", "*", ":"], 1),
      question("Which property changes text color?", ["font-style", "background", "color", "text-weight"], 2),
      question("Where are declarations written in a CSS rule?", ["Inside braces", "Inside angle brackets", "After a slash", "Inside parentheses only"], 0),
      question("What does the cascade help determine?", ["Which style declarations take precedence", "The page URL", "The number of HTML elements", "The image format"], 0),
    ],
  },
  {
    title: "CSS Layout and Responsive Design",
    description: "Create flexible layouts that adapt to different screen sizes.",
    lessons: ["Box Model", "Flexbox and Grid", "Responsive Media Queries"],
    quiz: [
      question("Which CSS layout is suited to one-dimensional alignment?", ["Float", "Flexbox", "Table layout", "Inline layout"], 1),
      question("Which layout system uses rows and columns?", ["CSS Grid", "Text flow", "Position static", "Visibility"], 0),
      question("What does box-sizing: border-box include in its width?", ["Content only", "Content and padding", "Content, padding, and border", "Margin only"], 2),
      question("What is a media query commonly used for?", ["Responsive styles based on device or viewport features", "Changing HTML content", "Saving passwords", "Submitting forms"], 0),
      question("Which unit is relative to the root element font size?", ["px", "vh", "rem", "cm"], 2),
    ],
  },
  {
    title: "JavaScript Fundamentals",
    description: "Use values, variables, operators, and control flow in JavaScript.",
    lessons: ["Variables and Data Types", "Operators and Conditions", "Loops and Arrays"],
    quiz: [
      question("Which keyword declares a block-scoped variable that can be reassigned?", ["const", "let", "static", "define"], 1),
      question("Which value represents an intentional absence of an object value?", ["undefined", "false", "null", "NaN"], 2),
      question("Which operator checks strict equality?", ["=", "==", "===", "!="], 2),
      question("Which statement repeats code while a condition is true?", ["if", "while", "switch", "return"], 1),
      question("Which array method adds an item to the end?", ["shift", "pop", "push", "slice"], 2),
    ],
  },
  {
    title: "JavaScript Functions and DOM",
    description: "Create reusable functions and respond to browser events.",
    lessons: ["Functions and Parameters", "DOM Selection", "Events and Updates"],
    quiz: [
      question("What does a function parameter represent?", ["A value accepted by a function", "A browser tab", "An HTML attribute only", "A CSS declaration"], 0),
      question("Which method selects an element by CSS selector?", ["getByClass", "querySelector", "selectHTML", "findNode"], 1),
      question("Which event commonly fires when a form is submitted?", ["change", "load", "submit", "focus"], 2),
      question("What does event.preventDefault() do?", ["Stops the browser's default action", "Deletes an element", "Refreshes CSS", "Creates a new event"], 0),
      question("Which property safely sets plain text on an element?", ["innerHTML", "textContent", "outerHTML", "nodeValueOnly"], 1),
    ],
  },
  {
    title: "Browser APIs and Web Storage",
    description: "Work with browser APIs and understand tab-scoped storage.",
    lessons: ["Browser Events", "Session Storage", "Fetch and JSON Basics"],
    quiz: [
      question("Which API stores string data for the current browser tab session?", ["sessionStorage", "document.cookie only", "window.name only", "Cache-Control"], 0),
      question("What does JSON.parse() do?", ["Converts JSON text into a JavaScript value", "Encodes a URL", "Creates a DOM element", "Sends a request"], 0),
      question("Which browser object provides the current URL?", ["navigator.location", "window.location", "document.url", "history.href"], 1),
      question("What does fetch() return?", ["A Promise", "An HTML element", "A CSS rule", "A storage key"], 0),
      question("Why should sensitive credentials not be stored in frontend storage?", ["Browser storage is accessible to scripts and users", "It disables CSS", "It prevents HTML parsing", "It changes the URL"], 0),
    ],
  },
  {
    title: "Accessibility and Web Standards",
    description: "Improve accessibility with semantic structure and keyboard support.",
    lessons: ["Semantic Landmarks", "Labels and Accessible Names", "Keyboard Interaction"],
    quiz: [
      question("Why use semantic HTML elements?", ["They communicate document meaning and improve accessibility", "They encrypt content", "They replace all CSS", "They prevent all errors"], 0),
      question("What should every form input have?", ["A visible or programmatic label", "A unique color", "A placeholder only", "A click handler"], 0),
      question("Which attribute can provide an accessible name when visible text is absent?", ["aria-label", "data-name", "role-name", "alt-text"], 0),
      question("Which key should activate a focused button by default?", ["Escape only", "Enter or Space", "Tab only", "Shift"], 1),
      question("What is the purpose of sufficient color contrast?", ["Make text and controls easier to perceive", "Make pages load faster", "Reduce HTML size", "Hide decorative images"], 0),
    ],
  },
  {
    title: "Building and Testing a Website",
    description: "Bring web technologies together and verify responsive behavior.",
    lessons: ["Project Structure", "Testing Across Viewports", "Publishing and Review"],
    quiz: [
      question("What should be checked when testing a responsive website?", ["Multiple viewport sizes", "Only the source filename", "Only the desktop wallpaper", "Only the browser history"], 0),
      question("Why validate links and asset paths?", ["To ensure resources resolve correctly", "To change the page title", "To increase font size", "To disable navigation"], 0),
      question("What is a useful first step when a browser script fails?", ["Inspect the console error", "Delete the page", "Disable all styles", "Rename the project"], 0),
      question("Which practice helps keep a site maintainable?", ["Separate structure, styling, and behavior", "Put everything in one URL", "Use unnamed elements only", "Duplicate every stylesheet"], 0),
      question("What should be reviewed before publishing?", ["Functionality, accessibility, and layout", "Only the color of the cursor", "Only browser bookmarks", "Only local storage keys"], 0),
    ],
  },
];

export const webDevelopmentFinalQuestions = webDevelopmentModules.flatMap((module, moduleIndex) =>
  module.quiz.slice(0, moduleIndex < 5 ? 3 : 2).map((item, questionIndex) => ({
    ...item,
    moduleTitle: module.title,
    sourceQuestion: questionIndex + 1,
  })),
);
