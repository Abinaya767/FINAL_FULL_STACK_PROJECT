const MAX_DEPTH = 20;

function inspect(value, depth = 0) {
  if (depth > MAX_DEPTH) {
    throw Object.assign(new Error("Request data is nested too deeply."), { status: 400 });
  }
  if (Array.isArray(value)) {
    value.forEach((item) => inspect(item, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".") || key === "__proto__" || key === "prototype" || key === "constructor") {
      throw Object.assign(new Error("Request contains an unsupported field name."), { status: 400 });
    }
    inspect(item, depth + 1);
  }
}

export default function sanitizeInput(request, _response, next) {
  try {
    inspect(request.body);
    inspect(request.query);
    inspect(request.params);
    next();
  } catch (error) {
    next(error);
  }
}
